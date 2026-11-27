// Los pasos completos de cada acción con pago: borrador → firma y pago → publicar.
import { Buffer } from "buffer";
import { guardarBorrador, publicar, subirArchivo, type Huella } from "./base";
import { firmar, firmarMensaje } from "./billetera";
import { codigoDe, codigoDeArchivo, continuar, dejarHuella, idDe, type Documento } from "./umbral";

export type Avance = (texto: string) => void;

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
  const recibo = await continuar(cuenta, firmar, padre, doc, precio, moneda);
  avance("Pago hecho. Publicando…");
  await publicar(id, recibo.hash);
  return { ...recibo, id };
}

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

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
  const { foto, audio } = archivos;
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
  const recibo = await dejarHuella(cuenta, firmar, completo, precio, moneda, sala);
  avance("Pago hecho. Publicando…");
  await publicar(id, recibo.hash);
  return { ...recibo, id };
}

export const fotoValida = (f: File) => f.size <= 5 * 1024 * 1024 && f.type in EXTENSION;

const EXTENSION_AUDIO: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};
/** El navegador a veces agrega el códec ("audio/webm;codecs=opus"): se mira solo el tipo. */
export const tipoAudio = (f: File) => f.type.split(";")[0];
export const audioValido = (f: File) => f.size <= 5 * 1024 * 1024 && tipoAudio(f) in EXTENSION_AUDIO;

/** Firma para favoritos: se pide una vez y sirve unas horas (el servidor acepta 12). */
export async function firmaDeFavoritos(cuenta: string): Promise<{ fecha: string; firma: string }> {
  const clave = `umbral-firma-${cuenta}`;
  try {
    const guardada = JSON.parse(sessionStorage.getItem(clave) ?? "null") as { fecha: string; firma: string } | null;
    if (guardada && Date.now() - Date.parse(guardada.fecha) < 11 * 3_600_000) return guardada;
  } catch {
    /* se vuelve a pedir */
  }
  const fecha = new Date().toISOString();
  const firmada = await firmarMensaje(`UMBRAL: entrar a mis favoritos\n${cuenta}\n${fecha}`, cuenta);
  // Algunas billeteras devuelven hexadecimal, otras base64: el servidor acepta las dos.
  const firma = /^[0-9a-f]{128}$/i.test(firmada) ? firmada : Buffer.from(firmada, "base64").toString("base64");
  const nueva = { fecha, firma };
  sessionStorage.setItem(clave, JSON.stringify(nueva));
  return nueva;
}
