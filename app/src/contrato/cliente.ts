// @ts-nocheck
// Generado desde el contrato con: stellar contract bindings typescript. No editar a mano.
import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import { AssembledTransaction, Client as ContractClient, Spec as ContractSpec } from "@stellar/stellar-sdk/contract";
import type { ClientOptions as ContractClientOptions, MethodOptions, Result } from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const Errors = {
  /**
   * Ya hay una huella con ese identificador.
   */
  1: {message:"YaExiste"},
  /**
   * No hay ninguna huella con ese identificador.
   */
  2: {message:"NoExiste"},
  /**
   * La huella fue retirada.
   */
  3: {message:"Retirada"},
  /**
   * El autor no permite comentarios sobre esa huella.
   */
  4: {message:"NoAdmiteRespuestas"},
  /**
   * Esa moneda no tiene precios cargados.
   */
  5: {message:"MonedaNoAceptada"},
  /**
   * El monto de un apoyo tiene que ser mayor que cero.
   */
  6: {message:"MontoInvalido"},
  /**
   * No hay saldo para cobrar.
   */
  7: {message:"NadaParaCobrar"},
  /**
   * Solo el autor puede hacer esto.
   */
  8: {message:"NoEsElAutor"},
  /**
   * El porcentaje del artista tiene que estar entre el piso y el 100%.
   */
  9: {message:"PorcentajeInvalido"},
  /**
   * Un precio tiene que ser mayor que cero.
   */
  10: {message:"PrecioInvalido"},
  /**
   * Una suma se pasó del máximo.
   */
  11: {message:"Desborde"},
  /**
   * No hay ninguna sala con ese identificador.
   */
  12: {message:"SalaNoExiste"},
  /**
   * Esa cuenta ya fue invitada a esa sala.
   */
  13: {message:"YaInvitada"},
  /**
   * El precio vigente es mayor que el máximo que aceptó quien paga.
   */
  14: {message:"PrecioSuperado"},
  /**
   * Las fechas de la muestra no sirven: ya pasó, dura más de 90 días o
   * la sala tiene otra muestra que todavía no terminó.
   */
  15: {message:"MuestraInvalida"},
  /**
   * El fondo de la sala no alcanza para ese retiro.
   */
  16: {message:"FondoInsuficiente"}
}



export interface Huella {
  activa: boolean;
  admite_respuestas: boolean;
  /**
 * Cantidad de apoyos voluntarios recibidos.
 */
apoyos: u32;
  /**
 * Quien abrió la obra de la que desciende esta huella. En la obra
 * original es el mismo autor. Es el único que cobra, en toda la cadena.
 */
artista: string;
  autor: string;
  /**
 * Fecha del ledger en que se registró.
 */
creada: u64;
  /**
 * SHA-256 del documento exacto. El contenido vive fuera de la red.
 */
digest: Buffer;
  /**
 * Huella de la que nació, si es un comentario.
 */
padre: Option<Buffer>;
  respuestas: u32;
  /**
 * Sala de museo a la que pertenece, si pertenece a alguna.
 */
sala: Option<Buffer>;
}


/**
 * Muestra con fecha de una sala. Las fechas son segundos desde 1970.
 */
export interface Muestra {
  desde: u64;
  hasta: u64;
  /**
 * Parte de cada continuación que recibe la sala, en puntos básicos.
 */
parte_sala_bps: u32;
}


/**
 * Precios en la unidad mínima de la moneda (7 decimales en XLM y USDC).
 */
export interface Precios {
  comentario: i128;
  huella: i128;
}














export interface Client {
  /**
   * Construct and simulate a fondo transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cuánto queda en el fondo de patrocinio de una sala.
   */
  fondo: ({sala, moneda}: {sala: Buffer, moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a id_de transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Identificador de una huella: SHA-256 de la cuenta del autor seguida del
   * código del contenido. Lo calcula el contrato, así nadie puede ocupar el
   * identificador de otro ni quedar como autor de un envío ajeno.
   */
  id_de: ({autor, digest}: {autor: string, digest: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a saldo transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  saldo: ({autor, moneda}: {autor: string, moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a apoyar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Apoyo voluntario de monto libre sobre cualquier huella. El 80% queda a
   * nombre del artista que abrió la obra (lo retira con `cobrar`) y el 20%
   * va a Umbral. Quien escribió una respuesta no cobra.
   */
  apoyar: ({quien, id, moneda, monto}: {quien: string, id: Buffer, moneda: string, monto: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cobrar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El artista retira lo que juntó en una moneda. Devuelve el monto cobrado.
   */
  cobrar: ({autor, moneda}: {autor: string, moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a tesoro transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  tesoro: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a invitar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El museo que abrió la sala invita a una cuenta: el fondo de la sala le
   * paga una huella, una sola vez. Solo el museo decide a quién invita, así
   * nadie puede vaciar el fondo creando cuentas.
   */
  invitar: ({sala, cuenta}: {sala: Buffer, cuenta: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a moderar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Moderación: el administrador de Umbral retira una huella. No borra el
   * registro y el aviso dice que fue por moderación.
   */
  moderar: ({id}: {id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * La muestra de una sala, si alguna vez tuvo una.
   */
  muestra: ({sala}: {sala: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Muestra>>>

  /**
   * Construct and simulate a obtener transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  obtener: ({id}: {id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Huella>>>

  /**
   * Construct and simulate a precios transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  precios: ({moneda}: {moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Precios>>>

  /**
   * Construct and simulate a renovar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cualquiera puede renovar la vigencia de una huella para que no se
   * archive por falta de movimiento. No cambia ningún dato.
   */
  renovar: ({id}: {id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a retirar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El autor retira su huella: deja de admitir comentarios y apoyos.
   * El registro histórico no se borra.
   */
  retirar: ({autor, id}: {autor: string, id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a comentar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Continúa una huella existente. Una parte del pago queda a nombre del
   * artista que abrió la obra (sea cual sea el nivel de la cadena) y el
   * resto va a Umbral. Quien escribió la huella continuada no cobra.
   * `precio_max`: lo máximo que acepta pagar quien firma.
   */
  comentar: ({autor, digest, padre, admite_respuestas, moneda, precio_max}: {autor: string, digest: Buffer, padre: Buffer, admite_respuestas: boolean, moneda: string, precio_max: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a invitada transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Si una cuenta tiene una invitación sin usar en una sala.
   */
  invitada: ({sala, cuenta}: {sala: Buffer, cuenta: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a museo_de transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Quién abrió una sala.
   */
  museo_de: ({sala}: {sala: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a abrir_sala transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Un museo o institución abre su sala dentro de Umbral.
   */
  abrir_sala: ({museo, sala}: {museo: string, sala: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a actualizar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Reemplaza el código del contrato por uno ya subido a la red, sin
   * perder huellas, saldos ni fondos. Solo el administrador.
   */
  actualizar: ({wasm_hash}: {wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a patrocinar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cualquiera (el museo o quien lo apoye) pone plata en el fondo de una
   * sala. Ese fondo paga una huella a cada visitante que el museo invitó.
   */
  patrocinar: ({quien, sala, moneda, monto}: {quien: string, sala: Buffer, moneda: string, monto: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a parte_autor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  parte_autor: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a dejar_huella transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deja una huella nueva. El precio completo va al museo Umbral.
   * Si la huella va a una sala con fondo y el museo invitó a esa cuenta,
   * paga el fondo y no el autor. Devuelve `true` si la pagó el fondo.
   * El identificador lo calcula el contrato (ver `id_de`).
   * `precio_max`: lo máximo que acepta pagar quien firma. Si el precio
   * cambió y es mayor, la acción falla en vez de cobrar de más.
   */
  dejar_huella: ({autor, digest, admite_respuestas, moneda, precio_max, sala}: {autor: string, digest: Buffer, admite_respuestas: boolean, moneda: string, precio_max: i128, sala: Option<Buffer>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a abrir_muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Umbral abre la muestra con fecha de una sala, a pedido de su museo.
   * Mientras dura, cada continuación sobre una obra de esa sala le deja
   * a la sala `parte_sala_bps` (de 0 a 40%), que se acuerda para cada
   * muestra y queda publicado. El artista nunca baja del piso. Dura como
   * mucho 90 días y una sala no puede tener dos muestras a la vez.
   */
  abrir_muestra: ({sala, desde, hasta, parte_sala_bps}: {sala: Buffer, desde: u64, hasta: u64, parte_sala_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a fijar_precios transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Carga o cambia los precios de una moneda. Con esto la moneda pasa a ser aceptada.
   */
  fijar_precios: ({moneda, precios}: {moneda: string, precios: Precios}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a retirar_fondo transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El museo de la sala retira plata del fondo que no se usó. No vuelve a
   * quien patrocinó: va al museo, que es quien decide a quién invita.
   */
  retirar_fondo: ({sala, moneda, monto}: {sala: Buffer, moneda: string, monto: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a acepto_muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Si un artista aceptó la muestra que esa sala tiene cargada.
   */
  acepto_muestra: ({sala, artista}: {sala: Buffer, artista: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a aceptar_muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El artista acepta, con su firma, el reparto de la muestra de una sala
   * para sus obras de esa sala. Sin esta firma, sus obras siguen con el
   * reparto de siempre aunque la sala esté en muestra. `desde`, `hasta` y
   * `parte_sala_bps` son la muestra que el artista vio: si no coinciden, falla.
   */
  aceptar_muestra: ({artista, sala, desde, hasta, parte_sala_bps}: {artista: string, sala: Buffer, desde: u64, hasta: u64, parte_sala_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a fijar_parte_autor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cambia la parte que recibe el artista. Nunca por debajo del piso.
   */
  fijar_parte_autor: ({parte_autor_bps}: {parte_autor_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, tesoro, parte_autor_bps}: {admin: string, tesoro: string, parte_autor_bps: u32},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, tesoro, parte_autor_bps}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAEAAAAChZYSBoYXkgdW5hIGh1ZWxsYSBjb24gZXNlIGlkZW50aWZpY2Fkb3IuAAAACFlhRXhpc3RlAAAAAQAAACxObyBoYXkgbmluZ3VuYSBodWVsbGEgY29uIGVzZSBpZGVudGlmaWNhZG9yLgAAAAhOb0V4aXN0ZQAAAAIAAAAXTGEgaHVlbGxhIGZ1ZSByZXRpcmFkYS4AAAAACFJldGlyYWRhAAAAAwAAADFFbCBhdXRvciBubyBwZXJtaXRlIGNvbWVudGFyaW9zIHNvYnJlIGVzYSBodWVsbGEuAAAAAAAAEk5vQWRtaXRlUmVzcHVlc3RhcwAAAAAABAAAACVFc2EgbW9uZWRhIG5vIHRpZW5lIHByZWNpb3MgY2FyZ2Fkb3MuAAAAAAAAEE1vbmVkYU5vQWNlcHRhZGEAAAAFAAAAMkVsIG1vbnRvIGRlIHVuIGFwb3lvIHRpZW5lIHF1ZSBzZXIgbWF5b3IgcXVlIGNlcm8uAAAAAAANTW9udG9JbnZhbGlkbwAAAAAAAAYAAAAZTm8gaGF5IHNhbGRvIHBhcmEgY29icmFyLgAAAAAAAA5OYWRhUGFyYUNvYnJhcgAAAAAABwAAAB9Tb2xvIGVsIGF1dG9yIHB1ZWRlIGhhY2VyIGVzdG8uAAAAAAtOb0VzRWxBdXRvcgAAAAAIAAAAQkVsIHBvcmNlbnRhamUgZGVsIGFydGlzdGEgdGllbmUgcXVlIGVzdGFyIGVudHJlIGVsIHBpc28geSBlbCAxMDAlLgAAAAAAElBvcmNlbnRhamVJbnZhbGlkbwAAAAAACQAAACdVbiBwcmVjaW8gdGllbmUgcXVlIHNlciBtYXlvciBxdWUgY2Vyby4AAAAADlByZWNpb0ludmFsaWRvAAAAAAAKAAAAHlVuYSBzdW1hIHNlIHBhc8OzIGRlbCBtw6F4aW1vLgAAAAAACERlc2JvcmRlAAAACwAAACpObyBoYXkgbmluZ3VuYSBzYWxhIGNvbiBlc2UgaWRlbnRpZmljYWRvci4AAAAAAAxTYWxhTm9FeGlzdGUAAAAMAAAAJkVzYSBjdWVudGEgeWEgZnVlIGludml0YWRhIGEgZXNhIHNhbGEuAAAAAAAKWWFJbnZpdGFkYQAAAAAADQAAAEFFbCBwcmVjaW8gdmlnZW50ZSBlcyBtYXlvciBxdWUgZWwgbcOheGltbyBxdWUgYWNlcHTDsyBxdWllbiBwYWdhLgAAAAAAAA5QcmVjaW9TdXBlcmFkbwAAAAAADgAAAHpMYXMgZmVjaGFzIGRlIGxhIG11ZXN0cmEgbm8gc2lydmVuOiB5YSBwYXPDsywgZHVyYSBtw6FzIGRlIDkwIGTDrWFzIG8KbGEgc2FsYSB0aWVuZSBvdHJhIG11ZXN0cmEgcXVlIHRvZGF2w61hIG5vIHRlcm1pbsOzLgAAAAAAD011ZXN0cmFJbnZhbGlkYQAAAAAPAAAAL0VsIGZvbmRvIGRlIGxhIHNhbGEgbm8gYWxjYW56YSBwYXJhIGVzZSByZXRpcm8uAAAAABFGb25kb0luc3VmaWNpZW50ZQAAAAAAABA=",
        "AAAABQAAAAAAAAAAAAAABUNvYnJvAAAAAAAAAQAAAAVjb2JybwAAAAAAAAMAAAAAAAAABWF1dG9yAAAAAAAAEwAAAAEAAAAAAAAABm1vbmVkYQAAAAAAEwAAAAAAAAAAAAAABW1vbnRvAAAAAAAACwAAAAAAAAAC",
        "AAAAAQAAAAAAAAAAAAAABkh1ZWxsYQAAAAAACgAAAAAAAAAGYWN0aXZhAAAAAAABAAAAAAAAABFhZG1pdGVfcmVzcHVlc3RhcwAAAAAAAAEAAAApQ2FudGlkYWQgZGUgYXBveW9zIHZvbHVudGFyaW9zIHJlY2liaWRvcy4AAAAAAAAGYXBveW9zAAAAAAAEAAAAh1F1aWVuIGFicmnDsyBsYSBvYnJhIGRlIGxhIHF1ZSBkZXNjaWVuZGUgZXN0YSBodWVsbGEuIEVuIGxhIG9icmEKb3JpZ2luYWwgZXMgZWwgbWlzbW8gYXV0b3IuIEVzIGVsIMO6bmljbyBxdWUgY29icmEsIGVuIHRvZGEgbGEgY2FkZW5hLgAAAAAHYXJ0aXN0YQAAAAATAAAAAAAAAAVhdXRvcgAAAAAAABMAAAAlRmVjaGEgZGVsIGxlZGdlciBlbiBxdWUgc2UgcmVnaXN0csOzLgAAAAAAAAZjcmVhZGEAAAAAAAYAAABAU0hBLTI1NiBkZWwgZG9jdW1lbnRvIGV4YWN0by4gRWwgY29udGVuaWRvIHZpdmUgZnVlcmEgZGUgbGEgcmVkLgAAAAZkaWdlc3QAAAAAA+4AAAAgAAAALUh1ZWxsYSBkZSBsYSBxdWUgbmFjacOzLCBzaSBlcyB1biBjb21lbnRhcmlvLgAAAAAAAAVwYWRyZQAAAAAAA+gAAAPuAAAAIAAAAAAAAAAKcmVzcHVlc3RhcwAAAAAABAAAADhTYWxhIGRlIG11c2VvIGEgbGEgcXVlIHBlcnRlbmVjZSwgc2kgcGVydGVuZWNlIGEgYWxndW5hLgAAAARzYWxhAAAD6AAAA+4AAAAg",
        "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",
        "AAAAAAAAAItgcGFydGVfYXV0b3JfYnBzYDogcXXDqSBwYXJ0ZSBkZSB1bmEgY29udGludWFjacOzbiB2YSBhbCBhcnRpc3RhIHF1ZQphYnJpw7MgbGEgb2JyYSwgZW4gcHVudG9zIGLDoXNpY29zICg1MDAwID0gNTAlKS4gRWwgcmVzdG8gdmEgYSBVbWJyYWwuAAAAAA1fX2NvbnN0cnVjdG9yAAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZ0ZXNvcm8AAAAAABMAAAAAAAAAD3BhcnRlX2F1dG9yX2JwcwAAAAAEAAAAAA==",
        "AAAAAAAAAU9VbWJyYWwgYWJyZSBsYSBtdWVzdHJhIGNvbiBmZWNoYSBkZSB1bmEgc2FsYSwgYSBwZWRpZG8gZGUgc3UgbXVzZW8uCk1pZW50cmFzIGR1cmEsIGNhZGEgY29udGludWFjacOzbiBzb2JyZSB1bmEgb2JyYSBkZSBlc2Egc2FsYSBsZSBkZWphCmEgbGEgc2FsYSBgcGFydGVfc2FsYV9icHNgIChkZSAwIGEgNDAlKSwgcXVlIHNlIGFjdWVyZGEgcGFyYSBjYWRhCm11ZXN0cmEgeSBxdWVkYSBwdWJsaWNhZG8uIEVsIGFydGlzdGEgbnVuY2EgYmFqYSBkZWwgcGlzby4gRHVyYSBjb21vCm11Y2hvIDkwIGTDrWFzIHkgdW5hIHNhbGEgbm8gcHVlZGUgdGVuZXIgZG9zIG11ZXN0cmFzIGEgbGEgdmV6LgAAAAANYWJyaXJfbXVlc3RyYQAAAAAAAAQAAAAAAAAABHNhbGEAAAPuAAAAIAAAAAAAAAAFZGVzZGUAAAAAAAAGAAAAAAAAAAVoYXN0YQAAAAAAAAYAAAAAAAAADnBhcnRlX3NhbGFfYnBzAAAAAAAEAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==",
        "AAAAAAAAAFFDYXJnYSBvIGNhbWJpYSBsb3MgcHJlY2lvcyBkZSB1bmEgbW9uZWRhLiBDb24gZXN0byBsYSBtb25lZGEgcGFzYSBhIHNlciBhY2VwdGFkYS4AAAAAAAANZmlqYXJfcHJlY2lvcwAAAAAAAAIAAAAAAAAABm1vbmVkYQAAAAAAEwAAAAAAAAAHcHJlY2lvcwAAAAfQAAAAB1ByZWNpb3MAAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==",
        "AAAAAAAAAIpFbCBtdXNlbyBkZSBsYSBzYWxhIHJldGlyYSBwbGF0YSBkZWwgZm9uZG8gcXVlIG5vIHNlIHVzw7MuIE5vIHZ1ZWx2ZSBhCnF1aWVuIHBhdHJvY2luw7M6IHZhIGFsIG11c2VvLCBxdWUgZXMgcXVpZW4gZGVjaWRlIGEgcXVpw6luIGludml0YS4AAAAAAA1yZXRpcmFyX2ZvbmRvAAAAAAAAAwAAAAAAAAAEc2FsYQAAA+4AAAAgAAAAAAAAAAZtb25lZGEAAAAAABMAAAAAAAAABW1vbnRvAAAAAAAACwAAAAEAAAPpAAAAAgAAB9AAAAAFRXJyb3IAAAA=",
        "AAAAAAAAADxTaSB1biBhcnRpc3RhIGFjZXB0w7MgbGEgbXVlc3RyYSBxdWUgZXNhIHNhbGEgdGllbmUgY2FyZ2FkYS4AAAAOYWNlcHRvX211ZXN0cmEAAAAAAAIAAAAAAAAABHNhbGEAAAPuAAAAIAAAAAAAAAAHYXJ0aXN0YQAAAAATAAAAAQAAAAE=",
        "AAAAAAAAARxFbCBhcnRpc3RhIGFjZXB0YSwgY29uIHN1IGZpcm1hLCBlbCByZXBhcnRvIGRlIGxhIG11ZXN0cmEgZGUgdW5hIHNhbGEKcGFyYSBzdXMgb2JyYXMgZGUgZXNhIHNhbGEuIFNpbiBlc3RhIGZpcm1hLCBzdXMgb2JyYXMgc2lndWVuIGNvbiBlbApyZXBhcnRvIGRlIHNpZW1wcmUgYXVucXVlIGxhIHNhbGEgZXN0w6kgZW4gbXVlc3RyYS4gYGRlc2RlYCwgYGhhc3RhYCB5CmBwYXJ0ZV9zYWxhX2Jwc2Agc29uIGxhIG11ZXN0cmEgcXVlIGVsIGFydGlzdGEgdmlvOiBzaSBubyBjb2luY2lkZW4sIGZhbGxhLgAAAA9hY2VwdGFyX211ZXN0cmEAAAAABQAAAAAAAAAHYXJ0aXN0YQAAAAATAAAAAAAAAARzYWxhAAAD7gAAACAAAAAAAAAABWRlc2RlAAAAAAAABgAAAAAAAAAFaGFzdGEAAAAAAAAGAAAAAAAAAA5wYXJ0ZV9zYWxhX2JwcwAAAAAABAAAAAEAAAPpAAAAAgAAB9AAAAAFRXJyb3IAAAA=",
        "AAAAAAAAAEFDYW1iaWEgbGEgcGFydGUgcXVlIHJlY2liZSBlbCBhcnRpc3RhLiBOdW5jYSBwb3IgZGViYWpvIGRlbCBwaXNvLgAAAAAAABFmaWphcl9wYXJ0ZV9hdXRvcgAAAAAAAAEAAAAAAAAAD3BhcnRlX2F1dG9yX2JwcwAAAAAEAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    fondo: this.txFromJSON<i128>,
        id_de: this.txFromJSON<Buffer>,
        saldo: this.txFromJSON<i128>,
        apoyar: this.txFromJSON<Result<void>>,
        cobrar: this.txFromJSON<Result<i128>>,
        tesoro: this.txFromJSON<string>,
        invitar: this.txFromJSON<Result<void>>,
        moderar: this.txFromJSON<Result<void>>,
        muestra: this.txFromJSON<Option<Muestra>>,
        obtener: this.txFromJSON<Result<Huella>>,
        precios: this.txFromJSON<Result<Precios>>,
        renovar: this.txFromJSON<Result<void>>,
        retirar: this.txFromJSON<Result<void>>,
        comentar: this.txFromJSON<Result<void>>,
        invitada: this.txFromJSON<boolean>,
        museo_de: this.txFromJSON<Result<string>>,
        abrir_sala: this.txFromJSON<Result<void>>,
        actualizar: this.txFromJSON<null>,
        patrocinar: this.txFromJSON<Result<void>>,
        parte_autor: this.txFromJSON<u32>,
        dejar_huella: this.txFromJSON<Result<boolean>>,
        abrir_muestra: this.txFromJSON<Result<void>>,
        fijar_precios: this.txFromJSON<Result<void>>,
        retirar_fondo: this.txFromJSON<Result<void>>,
        acepto_muestra: this.txFromJSON<boolean>,
        aceptar_muestra: this.txFromJSON<Result<void>>,
        fijar_parte_autor: this.txFromJSON<Result<void>>
  }
}