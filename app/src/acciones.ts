// Los pasos completos de cada acción con pago: borrador → firma y pago → publicar.
import { Buffer } from "buffer";
import { guardarBorrador, publicar, subirArchivo, type Huella } from "./base";
import { firmar, firmarMensaje } from "./billetera";
import { codigoDe, codigoDeArchivo, continuar, dejarHuella, idDe, PagoSinConfirmar, RechazadaPorLaRed, type AlEnviar, type Comprobante, type Documento } from "./umbral";
import { anotar, anotarSiFalta, estaAnotada, quitar } from "./pendientes";
import { enlaceTx } from "./comun";
import { achicarFoto } from "./achicar";
import { EXTENSION, EXTENSION_AUDIO, PESO_MAX, tipoAudio } from "./archivos";
export { audioValido, fotoValida, tipoAudio } from "./archivos";

const YA_PAGADA = "Ya dejaste esta huella.";

export type Avance = (texto: string) => void;

/** Paga y publica. El comprobante se anota apenas el pago sale hacia la red, antes de saber cómo terminó:
 *  si algo falla después (se corta la conexión, se cierra la pestaña), la huella se publica sola
 *  la próxima vez que se abra UMBRAL, sin volver a pagar. */
export async function pagarYPublicar<T extends Comprobante>(id: string, pagar: (alEnviar: AlEnviar) => Promise<T>, avance: Avance): Promise<T> {
  let recibo: T;
  // Si un intento anterior quedó anotado, puede estar pagado: esa nota no se borra por un rechazo de este.
  const yaAnotada = estaAnotada(id);
  let salio = false;
  try {
    recibo = await pagar((hash) => {
      salio = true;
      anotar(id, hash);
    });
  } catch (e) {
    if (e instanceof PagoSinConfirmar) anotar(id, e.hash);
    // La red la rechazó: no se cobró. Se saca la nota que dejó este intento.
    if (e instanceof RechazadaPorLaRed && salio && !yaAnotada) quitar(id);
    // "Ya dejaste esta huella": se pagó en un intento anterior que no llegó a publicarse.
    // El contrato ya la tiene, así que se publica sin volver a pagar.
    if (e instanceof Error && e.message === YA_PAGADA) {
      avance("Esta huella ya estaba pagada. Publicando…");
      // Se anota antes: si publicar falla ahora, se reintenta sola la próxima vez que se abra UMBRAL.
      anotarSiFalta(id);
      const hash = await publicar(id);
      quitar(id);
      return { hash: hash ?? "", enlace: hash ? enlaceTx(hash) : "" } as T;
    }
    throw e;
  }
  anotar(id, recibo.hash);
  avance("Pago hecho. Publicando…");
  try {
    await publicar(id, recibo.hash);
  } catch {
    throw new Error(
      `El pago quedó hecho y no se cobra de nuevo. Falta publicar: lo volvemos a intentar solo cada vez que abras UMBRAL. Comprobante: ${recibo.enlace}`,
    );
  }
  quitar(id);
  return recibo;
}

async function idYCodigo(cuenta: string, doc: Documento) {
  const digest = await codigoDe(doc);
  const id = await idDe(cuenta, digest);
  return { id: id.toString("hex"), digest: digest.toString("hex") };
}

/** Continuar una huella: solo texto. Devuelve el comprobante y el id de la huella nueva. */
export async function continuarHuella(cuenta: string, obra: Huella, padre: string, doc: Documento, precio: bigint, moneda: string, avance: Avance) {
  const { id, digest } = await idYCodigo(cuenta, doc);
  avance("Guardando tu texto…");
  // La huella hereda la sala de la obra (si la obra llegó invitada por una sala, la base lo exige).
  await guardarBorrador({ id, digest, autor: cuenta, artista: obra.artista, moneda, padre, sala: obra.sala ?? null }, doc);
  avance("Firmá en tu billetera…");
  const recibo = await pagarYPublicar(id, (alEnviar) => continuar(cuenta, firmar, padre, doc, precio, moneda, alEnviar), avance);
  return { ...recibo, id };
}


/** Abrir una obra nueva, con foto y audio si hay. Con `sala`, la obra se abre por invitación de esa sala. */
export async function abrirObra(
  cuenta: string,
  doc: Documento,
  archivos: { foto: File | null; audio: File | null },
  precio: bigint,
  moneda: string,
  avance: Avance,
  sala?: string,
) {
  const { audio } = archivos;
  // La foto se achica antes de calcular su código: lo que se hashea es exactamente lo que se sube.
  if (archivos.foto) avance("Preparando la foto…");
  const foto = archivos.foto ? await achicarFoto(archivos.foto) : null;
  if (foto && foto.size > PESO_MAX) throw new Error("La foto pesa demasiado y no pudimos achicarla. Probá con otra de hasta 5 MB.");
  // El código de cada archivo entra en el documento: así no se pueden cambiar sin que se note.
  const completo: Documento = {
    ...doc,
    ...(foto ? { foto: await codigoDeArchivo(foto) } : {}),
    ...(audio ? { audio: await codigoDeArchivo(audio) } : {}),
  };
  const { id, digest } = await idYCodigo(cuenta, completo);
  const foto_ruta = foto ? `${id}/foto.${EXTENSION[foto.type]}` : null;
  const audio_ruta = audio ? `${id}/audio.${EXTENSION_AUDIO[tipoAudio(audio)]}` : null;
  avance("Guardando tu obra…");
  await guardarBorrador({ id, digest, autor: cuenta, artista: cuenta, moneda, padre: null, sala: sala ?? null, foto_ruta, audio_ruta }, completo);
  if (foto && foto_ruta) {
    avance("Subiendo la foto…");
    await subirArchivo("obras", foto_ruta, foto);
  }
  if (audio && audio_ruta) {
    avance("Subiendo el audio…");
    await subirArchivo("audios", audio_ruta, audio);
  }
  avance("Firmá en tu billetera…");
  const recibo = await pagarYPublicar(id, (alEnviar) => dejarHuella(cuenta, firmar, completo, precio, moneda, sala, alEnviar), avance);
  return { ...recibo, id };
}


/** El mensaje que firma la billetera para un favorito. El servidor arma exactamente este texto
 *  (supabase/functions/favoritos/firma.ts): si se cambia acá, hay que cambiarlo allá. */
export const mensajeFavorito = (accion: "guardar" | "quitar", huella: string, cuenta: string, fecha: string) =>
  `UMBRAL: ${accion} favorito\n${huella}\n${cuenta}\n${fecha}`;

/** Firma para guardar o quitar UN favorito. Vale solo para esa acción sobre esa huella y por unos minutos:
 *  no se guarda, se pide cada vez. */
export async function firmaDeFavoritos(cuenta: string, accion: "guardar" | "quitar", huella: string): Promise<{ fecha: string; firma: string }> {
  const fecha = new Date().toISOString();
  const firmada = await firmarMensaje(mensajeFavorito(accion, huella, cuenta, fecha), cuenta);
  // Algunas billeteras devuelven hexadecimal, otras base64: el servidor acepta las dos.
  const firma = /^[0-9a-f]{128}$/i.test(firmada) ? firmada : Buffer.from(firmada, "base64").toString("base64");
  return { fecha, firma };
}
