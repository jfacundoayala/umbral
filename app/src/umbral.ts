// Puente entre las pantallas y el contrato de UMBRAL.
// Cada acción: arma el pedido, lo simula, pide la firma a la billetera, lo manda y devuelve el comprobante.
import { Buffer } from "buffer";
import { Address, rpc, scValToNative, StrKey } from "@stellar/stellar-sdk";
import { Client } from "./contrato/cliente";
import { CONTRATO_ID, MONEDA_ID, RED, UNIDAD } from "./config";
import { nuevaSal, PagoSinConfirmar } from "./sin-red";
export { nuevaSal, PagoSinConfirmar };

/** Función que firma un pedido con la billetera de la persona. */
export type Firmar = (xdr: string) => Promise<{ signedTxXdr: string }>;

export type Comprobante = { hash: string; enlace: string };

/** Lo que se guarda fuera de la red. Su código (SHA-256) es lo único que va al contrato.
 *  Una obra lleva título, descripción y, si quiere, foto, audio o enlace. Una respuesta lleva solo texto. */
/** Lo que declara quien expone una obra sobre sus derechos. Solo en obras; en continuaciones va vacío. */
export type Derechos = "autoria" | "dominio_publico" | "autorizacion";

export type Documento = {
  texto: string;
  nombre: string;
  titulo?: string;
  descripcion?: string;
  /** Código (SHA-256, en hexadecimal) del archivo de la foto. Así la foto tampoco se puede cambiar sin que se note. */
  foto?: string;
  /** Código (SHA-256, en hexadecimal) del archivo de audio. */
  audio?: string;
  enlace?: string;
  derechos?: Derechos;
  creado: string; // fecha ISO
  /** Texto al azar. Sin esto, alguien podría adivinar un texto corto probando hasta dar con el código.
   *  Al borrar el contenido de la base, el código que queda en la red ya no se puede vincular con nada. */
  sal: string;
};


/** Código de un archivo (foto o audio): SHA-256 de sus bytes, en hexadecimal. */
export async function codigoDeArchivo(archivo: Blob): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", await archivo.arrayBuffer());
  return Buffer.from(d).toString("hex");
}

/** El documento tal como se firma: siempre las mismas claves, en orden alfabético.
 *  El servidor repite esta misma cuenta antes de publicar. Si se cambia acá, hay que cambiarla allá. */
export function documentoOrdenado(doc: Documento): string {
  // normalize("NFC"): el mismo texto escrito en otro dispositivo da el mismo código.
  const t = (x?: string) => (x ?? "").normalize("NFC");
  return JSON.stringify({
    audio: doc.audio ?? "",
    creado: doc.creado,
    derechos: doc.derechos ?? "",
    descripcion: t(doc.descripcion),
    enlace: doc.enlace ?? "",
    foto: doc.foto ?? "",
    nombre: t(doc.nombre),
    sal: doc.sal,
    texto: t(doc.texto),
    titulo: t(doc.titulo),
  });
}

/** Código del contenido: SHA-256 del documento ordenado. */
export async function codigoDe(doc: Documento): Promise<Buffer> {
  const bytes = new TextEncoder().encode(documentoOrdenado(doc));
  return Buffer.from(await crypto.subtle.digest("SHA-256", bytes));
}

function cliente(cuenta?: string, firmar?: Firmar) {
  return new Client({
    contractId: CONTRATO_ID,
    rpcUrl: RED.rpcUrl,
    networkPassphrase: RED.frase,
    publicKey: cuenta,
    signTransaction: firmar,
  });
}

const comprobante = (hash: string): Comprobante => ({ hash, enlace: `${RED.explorador}/tx/${hash}` });

/** Identificador de una huella, igual al que calcula el contrato (`id_de`):
 *  SHA-256 de la cuenta del autor (en XDR) seguida del código del contenido.
 *  Se calcula acá para conocerlo antes de pagar, sin otra consulta a la red. */
export async function idDe(cuenta: string, digest: Buffer): Promise<Buffer> {
  const autor = new Address(cuenta).toScVal().toXDR();
  const datos = new Uint8Array(autor.length + digest.length);
  datos.set(autor, 0);
  datos.set(digest, autor.length);
  return Buffer.from(await crypto.subtle.digest("SHA-256", datos));
}

/** Los errores del contrato, en palabras. El número es el del contrato. */
const ERRORES: Record<number, string> = {
  1: "Ya dejaste esta huella.",
  2: "Esa huella no existe.",
  3: "Esa huella fue retirada.",
  4: "Esa huella no admite continuaciones.",
  5: "Esa moneda no está aceptada.",
  6: "El monto tiene que ser mayor que cero.",
  7: "No tenés nada para cobrar.",
  8: "Solo quien dejó la huella puede retirarla.",
  11: "El monto es demasiado grande.",
  12: "Esa sala no existe.",
  14: "El precio cambió mientras decidías. Volvé a intentar para ver el precio nuevo.",
};

export function enPalabras(e: unknown): Error {
  const texto = e instanceof Error ? e.message : String(e);
  const m = texto.match(/Error\(Contract, #(\d+)\)/);
  if (m && ERRORES[Number(m[1])]) return new Error(ERRORES[Number(m[1])]);
  if (/trustline|TrustlineMissing|#13\b/i.test(texto)) return new Error("Tu cuenta no tiene USDC habilitado. Elegí pagar en XLM arriba y volvé a intentar.");
  if (/balance is not sufficient|insufficient|underfunded|#10\b/i.test(texto)) return new Error('No te alcanza el saldo. Si tu cuenta es nueva, tocá "Cargar fondos de prueba" arriba.');
  if (/account not found|does not exist|\b404\b/i.test(texto)) return new Error('Tu cuenta todavía no existe en la red de pruebas. Tocá "Cargar fondos de prueba" arriba y volvé a intentar.');
  if (/declin|reject|cancel|denied|closed|dismiss/i.test(texto)) return new Error("Cancelaste la firma en tu billetera. No se cobró nada.");
  if (/failed to fetch|networkerror|timeout|timed out|ECONN|load failed/i.test(texto)) return new Error("No pudimos hablar con la red de pruebas. Revisá tu conexión y probá de nuevo en un minuto.");
  if (/Error\(|HostError|simulat|xdr|wasm|invoke/i.test(texto) || texto.length > 160) {
    console.error(e);
    return new Error("La red de pruebas rechazó la acción. Probá de nuevo; si vuelve a pasar, avisanos.");
  }
  return e instanceof Error ? e : new Error(texto);
}

type Enviado = {
  sendTransactionResponse?: { hash: string };
  getTransactionResponse?: { status: string };
};

/** Firma y manda. Solo devuelve comprobante si la red aceptó la acción. */
type Vigia = { onSubmitted?: (r?: { hash?: string }) => void };

async function enviar(armar: () => Promise<{ signAndSend: (o?: { watcher?: Vigia }) => Promise<Enviado> }>): Promise<Comprobante> {
  let enviado: Enviado;
  // El comprobante se conoce apenas sale la acción, antes de saber si salió bien.
  let mandada = "";
  try {
    const tx = await armar(); // acá se simula: si el contrato va a rechazar, falla antes de firmar
    enviado = await tx.signAndSend({ watcher: { onSubmitted: (r) => (mandada = r?.hash ?? "") } });
  } catch (e) {
    // Si ya se mandó, cualquier error en la espera (red cortada, "Load failed" en Safari, 503…)
    // no es un rechazo: puede haberse cobrado. Se anota para no perder la huella.
    if (mandada) throw new PagoSinConfirmar(mandada);
    throw enPalabras(e);
  }
  const hash = enviado.sendTransactionResponse?.hash;
  if (!hash) throw new Error("La red no devolvió un comprobante.");
  const estado = enviado.getTransactionResponse?.status;
  // Solo FAILED es un rechazo seguro. Sin respuesta o NOT_FOUND, la red todavía no decidió.
  if (estado === "FAILED") {
    throw new Error(`La red rechazó la acción. Podés ver el detalle en ${RED.explorador}/tx/${hash}`);
  }
  if (estado !== "SUCCESS") throw new PagoSinConfirmar(hash);
  return comprobante(hash);
}

/** Precios vigentes, en la unidad mínima de la moneda. No pide firma. */
export async function preciosVigentes(moneda: string = MONEDA_ID): Promise<{ huella: bigint; continuar: bigint }> {
  const p = (await cliente().precios({ moneda })).result.unwrap();
  return { huella: BigInt(p.huella), continuar: BigInt(p.comentario) };
}

/** Abre una obra nueva. `precioMax` es el precio que la persona vio en pantalla:
 *  si cambió y es mayor, el contrato rechaza la acción en vez de cobrar de más. */
/** `salaHex`: si la obra se abre por invitación de una sala, su fondo paga la obra (si la cuenta está invitada y hay fondos). */
export async function dejarHuella(cuenta: string, firmar: Firmar, doc: Documento, precioMax: bigint, moneda: string = MONEDA_ID, salaHex?: string) {
  const c = cliente(cuenta, firmar);
  const digest = await codigoDe(doc);
  const id = await idDe(cuenta, digest);
  const recibo = await enviar(() =>
    c.dejar_huella({ autor: cuenta, digest, admite_respuestas: true, moneda, precio_max: precioMax, sala: salaHex ? Buffer.from(salaHex, "hex") : undefined }),
  );
  return { ...recibo, id: id.toString("hex"), digest: digest.toString("hex") };
}

/** Continúa una huella que ya existe. */
export async function continuar(cuenta: string, firmar: Firmar, padreHex: string, doc: Documento, precioMax: bigint, moneda: string = MONEDA_ID) {
  const c = cliente(cuenta, firmar);
  const digest = await codigoDe(doc);
  const id = await idDe(cuenta, digest);
  const recibo = await enviar(() =>
    c.comentar({
      autor: cuenta,
      digest,
      padre: Buffer.from(padreHex, "hex"),
      admite_respuestas: true,
      moneda,
      precio_max: precioMax,
    }),
  );
  return { ...recibo, id: id.toString("hex"), digest: digest.toString("hex") };
}

/** Apoyo voluntario, en unidades enteras de la moneda (por ejemplo 2 = 2 USDC). El 70% va al artista de la obra. */
export async function apoyar(cuenta: string, firmar: Firmar, idHex: string, monto: number, moneda: string = MONEDA_ID) {
  const c = cliente(cuenta, firmar);
  const enMinimas = BigInt(Math.round(monto * 100)) * (UNIDAD / 100n);
  return enviar(() => c.apoyar({ quien: cuenta, id: Buffer.from(idHex, "hex"), moneda, monto: enMinimas }));
}

/** El artista retira lo que juntó. */
export async function cobrar(cuenta: string, firmar: Firmar, moneda: string = MONEDA_ID) {
  const c = cliente(cuenta, firmar);
  return enviar(() => c.cobrar({ autor: cuenta, moneda }));
}

/** Cuánto tiene para cobrar una cuenta, en unidades enteras. No pide firma. */
export async function saldoDe(cuenta: string, moneda: string = MONEDA_ID): Promise<number> {
  const r = (await cliente().saldo({ autor: cuenta, moneda })).result;
  return Number(r) / Number(UNIDAD);
}

/** El autor retira su huella. El comprobante en la red no se borra; el contenido se borra después en la base. */
export async function retirar(cuenta: string, firmar: Firmar, idHex: string) {
  const c = cliente(cuenta, firmar);
  return enviar(() => c.retirar({ autor: cuenta, id: Buffer.from(idHex, "hex") }));
}

// ---------- Salas ----------

/** Cuenta del museo que abrió una sala, o null si la sala no existe. */
export async function museoDe(salaHex: string): Promise<string | null> {
  const r = (await cliente().museo_de({ sala: Buffer.from(salaHex, "hex") })).result;
  return r.isOk() ? r.unwrap() : null;
}

/** La cuenta que abrió la sala invita a otra: su fondo le paga una huella, una vez. Firma la sala. */
export async function invitar(museo: string, firmar: Firmar, salaHex: string, invitada: string) {
  const c = cliente(museo, firmar);
  return enviar(() => c.invitar({ sala: Buffer.from(salaHex, "hex"), cuenta: invitada }));
}

/** Si la sala invitó a esta cuenta (y la invitación no se usó) y cuánto le queda al fondo. No pide firma. */
export async function invitacion(salaHex: string, cuenta: string, moneda: string = MONEDA_ID) {
  const sala = Buffer.from(salaHex, "hex");
  const [inv, fondo] = await Promise.all([cliente().invitada({ sala, cuenta }), cliente().fondo({ sala, moneda })]);
  return { invitada: Boolean(inv.result), fondo: BigInt(fondo.result) };
}

/** `true` si el fondo de una sala pagó esa transacción (el contrato deja el aviso "fondo_usado"). */
export async function pagadaPorSala(txHash: string): Promise<boolean> {
  const t = await new rpc.Server(RED.rpcUrl).getTransaction(txHash);
  if (t.status !== "SUCCESS") return false;
  // Se busca el evento "fondo_usado" emitido por este contrato (no el texto suelto en el registro,
  // que el dueño de una sala podría meter en el id de su sala).
  return t.events.contractEventsXdr.flat().some((e) => {
    if (!e.contractId || StrKey.encodeContract(Buffer.from(String(e.contractId), "hex")) !== CONTRATO_ID) return false;
    const [nombre] = e.body.v0.topics.map((x) => scValToNative(x));
    return nombre === "fondo_usado";
  });
}

/** El reparto que el contrato aplica hoy: parte de quien hizo la obra (en %) y la cuenta de UMBRAL. No pide firma. */
export async function repartoVigente(): Promise<{ autor: number; tesoro: string }> {
  const c = cliente();
  const [parte, tesoro] = await Promise.all([c.parte_autor(), c.tesoro()]);
  return { autor: Number(parte.result) / 100, tesoro: String(tesoro.result) };
}
