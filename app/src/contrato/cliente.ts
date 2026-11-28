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
   * Ya hay una huella (o una sala) con ese identificador.
   */
  1: {message:"YaExiste"},
  /**
   * No hay ninguna huella (o dato) con ese identificador.
   */
  2: {message:"NoExiste"},
  /**
   * La huella, o la obra raíz de su cadena, fue retirada.
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
   * Esa cuenta ya tiene una invitación sin usar en esa sala.
   */
  13: {message:"YaInvitada"},
  /**
   * El precio vigente es mayor que el máximo que aceptó quien paga.
   */
  14: {message:"PrecioSuperado"},
  /**
   * Las fechas de la muestra no sirven: ya pasó, empieza muy lejos, dura
   * más de 180 días, la sala tiene otra que todavía no terminó, o no hay
   * muestra en curso para cerrar.
   */
  15: {message:"MuestraInvalida"},
  /**
   * El fondo de la sala no alcanza para ese retiro.
   */
  16: {message:"FondoInsuficiente"},
  /**
   * El plazo de aviso tiene que estar entre 1 hora y 90 días.
   */
  17: {message:"PlazoInvalido"},
  /**
   * Todavía no pasó el plazo de aviso de esa propuesta.
   */
  18: {message:"PlazoNoCumplido"},
  /**
   * No hay ninguna propuesta de ese tipo pendiente.
   */
  19: {message:"NoHayPropuesta"},
  /**
   * Esa cuenta no puede hacer esto.
   */
  20: {message:"NoAutorizado"},
  /**
   * La propuesta venció sin aplicarse: hay que volver a proponerla.
   */
  21: {message:"PropuestaVencida"}
}


/**
 * Un cambio sensible con su valor nuevo.
 */
export type Cambio = {tag: "Codigo", values: readonly [Buffer]} | {tag: "ParteAutor", values: readonly [u32]} | {tag: "Admin", values: readonly [string]} | {tag: "Tesoro", values: readonly [string]};


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
  /**
 * `true` solo si la pagó el fondo de la sala por una invitación del
 * museo (una huella o una continuación): prueba que la persona estuvo ahí.
 */
presencial: boolean;
  /**
 * Obra con la que empezó la cadena. En la obra original es su propio
 * identificador. Si la raíz se retira, la cadena entera deja de admitir
 * continuaciones y apoyos.
 */
raiz: Buffer;
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
 * Número de apertura en esa sala (1, 2, 3...). Sube cada vez que se
 * abre una muestra, así reabrir una igual no revive acuerdos viejos.
 */
numero: u32;
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


/**
 * Un cambio propuesto y entre qué fechas se puede aplicar (segundos desde
 * 1970, ambas incluidas).
 */
export interface Propuesta {
  aplicable_desde: u64;
  aplicable_hasta: u64;
  cambio: Cambio;
}

/**
 * Tipo de cambio sensible. Hay como mucho una propuesta pendiente por tipo.
 */
export type TipoCambio = {tag: "Codigo", values: void} | {tag: "ParteAutor", values: void} | {tag: "Admin", values: void} | {tag: "Tesoro", values: void};



















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
   * Apoyo voluntario de monto libre sobre cualquier huella activa de una
   * obra activa. El 80% queda a nombre del artista que abrió la obra (lo
   * retira con `cobrar`) y el 20% va a Umbral, que también se queda con
   * lo que sobra del redondeo. Quien escribió una respuesta no cobra.
   */
  apoyar: ({quien, id, moneda, monto}: {quien: string, id: Buffer, moneda: string, monto: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cobrar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El artista retira lo que juntó en una moneda. Devuelve el monto cobrado.
   * Funciona aunque la moneda ya no se acepte para pagos nuevos.
   */
  cobrar: ({autor, moneda}: {autor: string, moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a tesoro transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  tesoro: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a id_sala transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Identificador de una sala: SHA-256 de los bytes "sala", seguidos de la
   * cuenta del museo (en XDR, como en `id_de`) y de la semilla. El prefijo
   * lo separa de los identificadores de huellas.
   */
  id_sala: ({museo, semilla}: {museo: string, semilla: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a invitar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El museo que abrió la sala invita a una cuenta: el fondo de la sala le
   * paga una huella en la sala o una continuación sobre una obra de la
   * sala (que no sea suya), una sola vez por invitación. Solo el museo decide a
   * quién invita, así nadie puede vaciar el fondo creando cuentas. Una
   * invitación ya usada se puede renovar para otro encuentro.
   */
  invitar: ({sala, cuenta}: {sala: Buffer, cuenta: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a moderar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Moderación: el administrador de Umbral retira una huella. No borra el
   * registro y el aviso dice que fue por moderación. Si es una obra raíz,
   * toda su cadena deja de admitir continuaciones y apoyos.
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
   * Falla si la huella continuada o la obra raíz fueron retiradas.
   * Si la obra es de una sala, el museo invitó a quien comenta, el fondo
   * alcanza y no es su propia obra, paga el fondo de la sala (con el
   * mismo reparto) y la continuación queda marcada como presencial. Si
   * falta algo de eso, paga quien comenta y la invitación no se gasta.
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
   * Construct and simulate a propuesta transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * La propuesta pendiente de un tipo, si hay.
   */
  propuesta: ({tipo}: {tipo: TipoCambio}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Propuesta>>>

  /**
   * Construct and simulate a abrir_sala transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Un museo o institución abre su sala dentro de Umbral. El identificador
   * lo calcula el contrato a partir de la cuenta del museo y una `semilla`
   * (ver `id_sala`), así nadie puede ocupar el de otro. Lo devuelve.
   */
  abrir_sala: ({museo, semilla}: {museo: string, semilla: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Buffer>>>

  /**
   * Construct and simulate a patrocinar transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cualquiera (el museo o quien lo apoye) pone plata en el fondo de una
   * sala. Ese fondo le paga a cada visitante que el museo invitó una
   * huella en la sala o una continuación sobre una obra de la sala.
   */
  patrocinar: ({quien, sala, moneda, monto}: {quien: string, sala: Buffer, moneda: string, monto: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a parte_autor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  parte_autor: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a plazo_aviso transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Segundos entre proponer un cambio sensible y poder aplicarlo.
   */
  plazo_aviso: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a dejar_huella transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deja una huella nueva. El precio completo va al museo Umbral.
   * Para nombrar una sala hace falta un vínculo real con ella: una
   * invitación sin usar, ser el museo que la abrió o haber aceptado su
   * muestra (en curso o por empezar). Si no, falla con `NoAutorizado`.
   * Con invitación y fondo suficiente paga el fondo de la sala y no el
   * autor, y la huella queda marcada como presencial. Si el fondo no
   * alcanza y la invitación es su único vínculo, falla con
   * `FondoInsuficiente` en vez de cobrarle; el museo y el artista con
   * muestra aceptada pagan ellos y la invitación queda sin gastar.
   * Devuelve `true` si la pagó el fondo.
   * El identificador lo calcula el contrato (ver `id_de`).
   * `precio_max`: lo máximo que acepta pagar quien firma. Si el precio
   * cambió y es mayor, la acción falla en vez de cobrar de más.
   */
  dejar_huella: ({autor, digest, admite_respuestas, moneda, precio_max, sala}: {autor: string, digest: Buffer, admite_respuestas: boolean, moneda: string, precio_max: i128, sala: Option<Buffer>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a renovar_sala transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cualquiera puede renovar la vigencia de una sala y de su muestra.
   */
  renovar_sala: ({sala}: {sala: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a abrir_muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Umbral abre la muestra con fecha de una sala, a pedido de su museo.
   * Mientras dura, cada continuación sobre una obra de esa sala le deja
   * a la sala `parte_sala_bps` (de 0 a 40%), que se acuerda para cada
   * muestra y queda publicado. El artista nunca baja del piso. Empieza
   * como mucho 1 día antes de hoy y 365 días después, dura como mucho 180
   * días y una sala no puede tener dos muestras a la vez.
   */
  abrir_muestra: ({sala, desde, hasta, parte_sala_bps}: {sala: Buffer, desde: u64, hasta: u64, parte_sala_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a administrador transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  administrador: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a aplicar_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Aplica el administrador propuesto, si ya pasó el plazo. Lo firma el
   * administrador nuevo, para no entregarle el contrato a una cuenta que
   * nadie controla. Borra las demás propuestas pendientes (código, tesoro
   * y parte del artista): el administrador nuevo empieza sin herencias.
   */
  aplicar_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a fijar_precios transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Carga o cambia los precios de una moneda. Con esto la moneda pasa a ser aceptada.
   */
  fijar_precios: ({moneda, precios}: {moneda: string, precios: Precios}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a quitar_moneda transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deja de aceptar una moneda para pagos nuevos (huellas, continuaciones,
   * apoyos y patrocinios). No toca lo ya guardado: los saldos se siguen
   * cobrando y los fondos se siguen retirando.
   */
  quitar_moneda: ({moneda}: {moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a renovar_fondo transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cualquiera puede renovar la vigencia del fondo de una sala en una moneda.
   */
  renovar_fondo: ({sala, moneda}: {sala: Buffer, moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a renovar_saldo transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cualquiera puede renovar la vigencia del saldo de una cuenta en una
   * moneda. No cambia el monto.
   */
  renovar_saldo: ({autor, moneda}: {autor: string, moneda: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
   * Construct and simulate a aplicar_tesoro transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Aplica el tesoro propuesto, si ya pasó el plazo. Solo el administrador.
   */
  aplicar_tesoro: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cerrar_muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cierra ya la muestra de una sala (en curso o por empezar). La firma el
   * museo de la sala o el administrador. Los acuerdos firmados con esa
   * muestra dejan de valer solos y la sala puede abrir otra enseguida.
   */
  cerrar_muestra: ({quien, sala}: {quien: string, sala: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a proponer_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propone un administrador nuevo (por ejemplo, una cuenta multifirma).
   */
  proponer_admin: ({nuevo}: {nuevo: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a aceptar_muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El artista acepta, con su firma, el reparto de la muestra de una sala
   * para sus obras de esa sala. Sin esta firma, sus obras siguen con el
   * reparto de siempre aunque la sala esté en muestra. `numero`, `desde`,
   * `hasta` y `parte_sala_bps` son la muestra que el artista vio: si no
   * coinciden, falla.
   */
  aceptar_muestra: ({artista, sala, numero, desde, hasta, parte_sala_bps}: {artista: string, sala: Buffer, numero: u32, desde: u64, hasta: u64, parte_sala_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a proponer_tesoro transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propone una cuenta nueva para el tesoro de Umbral.
   */
  proponer_tesoro: ({nuevo}: {nuevo: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a renovar_acuerdo transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cualquiera puede renovar la vigencia del acuerdo de un artista con la
   * muestra de una sala: hasta el fin de esa muestra, y como mínimo la
   * vida de siempre.
   */
  renovar_acuerdo: ({sala, artista}: {sala: Buffer, artista: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a salir_de_muestra transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El artista se sale de la muestra de una sala que había aceptado. Desde
   * ese momento sus obras de esa sala vuelven al reparto de siempre. Puede
   * volver a aceptarla con `aceptar_muestra`. Falla si no tiene acuerdo.
   */
  salir_de_muestra: ({artista, sala}: {artista: string, sala: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancelar_propuesta transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * El administrador cancela una propuesta pendiente.
   */
  cancelar_propuesta: ({tipo}: {tipo: TipoCambio}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a aplicar_parte_autor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Aplica la parte del artista propuesta, si ya pasó el plazo. Los saldos
   * ya anotados no cambian.
   */
  aplicar_parte_autor: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a proponer_parte_autor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propone cambiar la parte que recibe el artista. Nunca por debajo del piso.
   */
  proponer_parte_autor: ({parte_autor_bps}: {parte_autor_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a aplicar_actualizacion transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Aplica la actualización propuesta, si ya pasó el plazo. Sin perder
   * huellas, saldos ni fondos. Solo el administrador.
   */
  aplicar_actualizacion: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a proponer_actualizacion transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propone reemplazar el código del contrato por uno ya subido a la red.
   * Devuelve desde cuándo se puede aplicar.
   */
  proponer_actualizacion: ({wasm_hash}: {wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, tesoro, parte_autor_bps, plazo_aviso}: {admin: string, tesoro: string, parte_autor_bps: u32, plazo_aviso: u64},
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
    return ContractClient.deploy({admin, tesoro, parte_autor_bps, plazo_aviso}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAFQAAADVZYSBoYXkgdW5hIGh1ZWxsYSAobyB1bmEgc2FsYSkgY29uIGVzZSBpZGVudGlmaWNhZG9yLgAAAAAAAAhZYUV4aXN0ZQAAAAEAAAA1Tm8gaGF5IG5pbmd1bmEgaHVlbGxhIChvIGRhdG8pIGNvbiBlc2UgaWRlbnRpZmljYWRvci4AAAAAAAAITm9FeGlzdGUAAAACAAAANkxhIGh1ZWxsYSwgbyBsYSBvYnJhIHJhw616IGRlIHN1IGNhZGVuYSwgZnVlIHJldGlyYWRhLgAAAAAACFJldGlyYWRhAAAAAwAAADFFbCBhdXRvciBubyBwZXJtaXRlIGNvbWVudGFyaW9zIHNvYnJlIGVzYSBodWVsbGEuAAAAAAAAEk5vQWRtaXRlUmVzcHVlc3RhcwAAAAAABAAAACVFc2EgbW9uZWRhIG5vIHRpZW5lIHByZWNpb3MgY2FyZ2Fkb3MuAAAAAAAAEE1vbmVkYU5vQWNlcHRhZGEAAAAFAAAAMkVsIG1vbnRvIGRlIHVuIGFwb3lvIHRpZW5lIHF1ZSBzZXIgbWF5b3IgcXVlIGNlcm8uAAAAAAANTW9udG9JbnZhbGlkbwAAAAAAAAYAAAAZTm8gaGF5IHNhbGRvIHBhcmEgY29icmFyLgAAAAAAAA5OYWRhUGFyYUNvYnJhcgAAAAAABwAAAB9Tb2xvIGVsIGF1dG9yIHB1ZWRlIGhhY2VyIGVzdG8uAAAAAAtOb0VzRWxBdXRvcgAAAAAIAAAAQkVsIHBvcmNlbnRhamUgZGVsIGFydGlzdGEgdGllbmUgcXVlIGVzdGFyIGVudHJlIGVsIHBpc28geSBlbCAxMDAlLgAAAAAAElBvcmNlbnRhamVJbnZhbGlkbwAAAAAACQAAACdVbiBwcmVjaW8gdGllbmUgcXVlIHNlciBtYXlvciBxdWUgY2Vyby4AAAAADlByZWNpb0ludmFsaWRvAAAAAAAKAAAAHlVuYSBzdW1hIHNlIHBhc8OzIGRlbCBtw6F4aW1vLgAAAAAACERlc2JvcmRlAAAACwAAACpObyBoYXkgbmluZ3VuYSBzYWxhIGNvbiBlc2UgaWRlbnRpZmljYWRvci4AAAAAAAxTYWxhTm9FeGlzdGUAAAAMAAAAOUVzYSBjdWVudGEgeWEgdGllbmUgdW5hIGludml0YWNpw7NuIHNpbiB1c2FyIGVuIGVzYSBzYWxhLgAAAAAAAApZYUludml0YWRhAAAAAAANAAAAQUVsIHByZWNpbyB2aWdlbnRlIGVzIG1heW9yIHF1ZSBlbCBtw6F4aW1vIHF1ZSBhY2VwdMOzIHF1aWVuIHBhZ2EuAAAAAAAADlByZWNpb1N1cGVyYWRvAAAAAAAOAAAArExhcyBmZWNoYXMgZGUgbGEgbXVlc3RyYSBubyBzaXJ2ZW46IHlhIHBhc8OzLCBlbXBpZXphIG11eSBsZWpvcywgZHVyYQptw6FzIGRlIDE4MCBkw61hcywgbGEgc2FsYSB0aWVuZSBvdHJhIHF1ZSB0b2RhdsOtYSBubyB0ZXJtaW7DsywgbyBubyBoYXkKbXVlc3RyYSBlbiBjdXJzbyBwYXJhIGNlcnJhci4AAAAPTXVlc3RyYUludmFsaWRhAAAAAA8AAAAvRWwgZm9uZG8gZGUgbGEgc2FsYSBubyBhbGNhbnphIHBhcmEgZXNlIHJldGlyby4AAAAAEUZvbmRvSW5zdWZpY2llbnRlAAAAAAAAEAAAADpFbCBwbGF6byBkZSBhdmlzbyB0aWVuZSBxdWUgZXN0YXIgZW50cmUgMSBob3JhIHkgOTAgZMOtYXMuAAAAAAANUGxhem9JbnZhbGlkbwAAAAAAABEAAAA1VG9kYXbDrWEgbm8gcGFzw7MgZWwgcGxhem8gZGUgYXZpc28gZGUgZXNhIHByb3B1ZXN0YS4AAAAAAAAPUGxhem9Ob0N1bXBsaWRvAAAAABIAAAAvTm8gaGF5IG5pbmd1bmEgcHJvcHVlc3RhIGRlIGVzZSB0aXBvIHBlbmRpZW50ZS4AAAAADk5vSGF5UHJvcHVlc3RhAAAAAAATAAAAH0VzYSBjdWVudGEgbm8gcHVlZGUgaGFjZXIgZXN0by4AAAAADE5vQXV0b3JpemFkbwAAABQAAABATGEgcHJvcHVlc3RhIHZlbmNpw7Mgc2luIGFwbGljYXJzZTogaGF5IHF1ZSB2b2x2ZXIgYSBwcm9wb25lcmxhLgAAABBQcm9wdWVzdGFWZW5jaWRhAAAAFQ==",
        "AAAABQAAAAAAAAAAAAAABUNvYnJvAAAAAAAAAQAAAAVjb2JybwAAAAAAAAMAAAAAAAAABWF1dG9yAAAAAAAAEwAAAAEAAAAAAAAABm1vbmVkYQAAAAAAEwAAAAAAAAAAAAAABW1vbnRvAAAAAAAACwAAAAAAAAAC",
        "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",
        "AAAAAQAAAGBVbiBjYW1iaW8gcHJvcHVlc3RvIHkgZW50cmUgcXXDqSBmZWNoYXMgc2UgcHVlZGUgYXBsaWNhciAoc2VndW5kb3MgZGVzZGUKMTk3MCwgYW1iYXMgaW5jbHVpZGFzKS4AAAAAAAAACVByb3B1ZXN0YQAAAAAAAAMAAAAAAAAAD2FwbGljYWJsZV9kZXNkZQAAAAAGAAAAAAAAAA9hcGxpY2FibGVfaGFzdGEAAAAABgAAAAAAAAAGY2FtYmlvAAAAAAfQAAAABkNhbWJpbwAA",
        "AAAAAgAAAElUaXBvIGRlIGNhbWJpbyBzZW5zaWJsZS4gSGF5IGNvbW8gbXVjaG8gdW5hIHByb3B1ZXN0YSBwZW5kaWVudGUgcG9yIHRpcG8uAAAAAAAAAAAAAApUaXBvQ2FtYmlvAAAAAAAEAAAAAAAAAAAAAAAGQ29kaWdvAAAAAAAAAAAAAAAAAApQYXJ0ZUF1dG9yAAAAAAAAAAAAAAAAAAVBZG1pbgAAAAAAAAAAAAAAAAAABlRlc29ybwAA",
        "AAAABQAAAE9FbCBmb25kbyBkZSB1bmEgc2FsYSBwYWfDsyBsYSBodWVsbGEgbyBsYSBjb250aW51YWNpw7NuIGRlIHVuYSBjdWVudGEgaW52aXRhZGEuAAAAAAAAAAAKRm9uZG9Vc2FkbwAAAAAAAQAAAAtmb25kb191c2FkbwAAAAAEAAAAAAAAAARzYWxhAAAD7gAAACAAAAABAAAAAAAAAAZjdWVudGEAAAAAABMAAAAAAAAAAAAAAAZtb25lZGEAAAAAABMAAAAAAAAAAAAAAAVtb250bwAAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC1NhbGFBYmllcnRhAAAAAAEAAAAMc2FsYV9hYmllcnRhAAAAAgAAAAAAAAAEc2FsYQAAA+4AAAAgAAAAAQAAAAAAAAAFbXVzZW8AAAAAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADEh1ZWxsYURlamFkYQAAAAEAAAANaHVlbGxhX2RlamFkYQAAAAAAAAYAAAAAAAAAAmlkAAAAAAPuAAAAIAAAAAEAAAAAAAAABWF1dG9yAAAAAAAAEwAAAAAAAAAAAAAAB2FydGlzdGEAAAAAEwAAAAAAAAAAAAAABmRpZ2VzdAAAAAAD7gAAACAAAAAAAAAAAAAAAAVwYWRyZQAAAAAAA+gAAAPuAAAAIAAAAAAAAAAAAAAABHNhbGEAAAPoAAAD7gAAACAAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADUZvbmRvUmV0aXJhZG8AAAAAAAABAAAADmZvbmRvX3JldGlyYWRvAAAAAAAEAAAAAAAAAARzYWxhAAAD7gAAACAAAAABAAAAAAAAAAVtdXNlbwAAAAAAABMAAAAAAAAAAAAAAAZtb25lZGEAAAAAABMAAAAAAAAAAAAAAAVtb250bwAAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADUh1ZWxsYUFwb3lhZGEAAAAAAAABAAAADmh1ZWxsYV9hcG95YWRhAAAAAAAEAAAAAAAAAAJpZAAAAAAD7gAAACAAAAABAAAAAAAAAAVxdWllbgAAAAAAABMAAAAAAAAAAAAAAAZtb25lZGEAAAAAABMAAAAAAAAAAAAAAAVtb250bwAAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAIZVbmEgbW9uZWRhIGRlasOzIGRlIGFjZXB0YXJzZSBwYXJhIHBhZ29zIG51ZXZvcy4gTG9zIHNhbGRvcyB5IGZvbmRvcyB5YQpndWFyZGFkb3MgZW4gZXNhIG1vbmVkYSBzZSBwdWVkZW4gc2VndWlyIGNvYnJhbmRvIHkgcmV0aXJhbmRvLgAAAAAAAAAAAA1Nb25lZGFRdWl0YWRhAAAAAAAAAQAAAA5tb25lZGFfcXVpdGFkYQAAAAAAAQAAAAAAAAAGbW9uZWRhAAAAAAATAAAAAQAAAAI=",
        "AAAABQAAADhTZSBhcGxpY8OzIHVuIGNhbWJpbyBzZW5zaWJsZSBxdWUgaGFiw61hIHNpZG8gcHJvcHVlc3RvLgAAAAAAAAAOQ2FtYmlvQXBsaWNhZG8AAAAAAAEAAAAPY2FtYmlvX2FwbGljYWRvAAAAAAEAAAAAAAAABmNhbWJpbwAAAAAH0AAAAAZDYW1iaW8AAAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADkh1ZWxsYVJldGlyYWRhAAAAAAABAAAAD2h1ZWxsYV9yZXRpcmFkYQAAAAACAAAAAAAAAAJpZAAAAAAD7gAAACAAAAABAAAAR2B0cnVlYCBzaSBsYSByZXRpcsOzIGxhIG1vZGVyYWNpw7NuIGRlIFVtYnJhbCwgYGZhbHNlYCBzaSBmdWUgc3UgYXV0b3IuAAAAAA5wb3JfbW9kZXJhY2lvbgAAAAAAAQAAAAAAAAAC",
        "AAAABQAAAHJVbmEgc2FsYSB0aWVuZSB1bmEgbXVlc3RyYSBjb24gZmVjaGE6IG1pZW50cmFzIGR1cmEsIHJlY2liZSB1bmEgcGFydGUgZGUKY2FkYSBjb250aW51YWNpw7NuIGhlY2hhIHNvYnJlIHN1cyBvYnJhcy4AAAAAAAAAAAAOTXVlc3RyYUFiaWVydGEAAAAAAAEAAAAPbXVlc3RyYV9hYmllcnRhAAAAAAUAAAAAAAAABHNhbGEAAAPuAAAAIAAAAAEAAAAAAAAABm51bWVybwAAAAAABAAAAAAAAAAAAAAABWRlc2RlAAAAAAAABgAAAAAAAAAAAAAABWhhc3RhAAAAAAAABgAAAAAAAAAAAAAADnBhcnRlX3NhbGFfYnBzAAAAAAAEAAAAAAAAAAI=",
        "AAAABQAAAHtMYSBtdWVzdHJhIGRlIHVuYSBzYWxhIHNlIGNlcnLDsyBhbnRlcyBkZSB0aWVtcG8uIGBxdWllbmAgZXMgZWwgbXVzZW8gbyBlbAphZG1pbmlzdHJhZG9yOyBgaGFzdGFgIGVzIGxhIG51ZXZhIGZlY2hhIGRlIGZpbi4AAAAAAAAAAA5NdWVzdHJhQ2VycmFkYQAAAAAAAQAAAA9tdWVzdHJhX2NlcnJhZGEAAAAAAwAAAAAAAAAEc2FsYQAAA+4AAAAgAAAAAQAAAAAAAAAFcXVpZW4AAAAAAAATAAAAAAAAAAAAAAAFaGFzdGEAAAAAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADlByZWNpb3NGaWphZG9zAAAAAAABAAAAD3ByZWNpb3NfZmlqYWRvcwAAAAADAAAAAAAAAAZtb25lZGEAAAAAABMAAAABAAAAAAAAAAZodWVsbGEAAAAAAAsAAAAAAAAAAAAAAApjb21lbnRhcmlvAAAAAAALAAAAAAAAAAI=",
        "AAAABQAAAFxTZSBwcm9wdXNvIHVuIGNhbWJpbyBzZW5zaWJsZS4gU2UgcHVlZGUgYXBsaWNhciBlbnRyZSBgYXBsaWNhYmxlX2Rlc2RlYAp5IGBhcGxpY2FibGVfaGFzdGFgLgAAAAAAAAAPQ2FtYmlvUHJvcHVlc3RvAAAAAAEAAAAQY2FtYmlvX3Byb3B1ZXN0bwAAAAMAAAAAAAAABmNhbWJpbwAAAAAH0AAAAAZDYW1iaW8AAAAAAAAAAAAAAAAAD2FwbGljYWJsZV9kZXNkZQAAAAAGAAAAAAAAAAAAAAAPYXBsaWNhYmxlX2hhc3RhAAAAAAYAAAAAAAAAAg==",
        "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",
        "AAAAAAAAAlJDb250aW7DumEgdW5hIGh1ZWxsYSBleGlzdGVudGUuIFVuYSBwYXJ0ZSBkZWwgcGFnbyBxdWVkYSBhIG5vbWJyZSBkZWwKYXJ0aXN0YSBxdWUgYWJyacOzIGxhIG9icmEgKHNlYSBjdWFsIHNlYSBlbCBuaXZlbCBkZSBsYSBjYWRlbmEpIHkgZWwKcmVzdG8gdmEgYSBVbWJyYWwuIFF1aWVuIGVzY3JpYmnDsyBsYSBodWVsbGEgY29udGludWFkYSBubyBjb2JyYS4KRmFsbGEgc2kgbGEgaHVlbGxhIGNvbnRpbnVhZGEgbyBsYSBvYnJhIHJhw616IGZ1ZXJvbiByZXRpcmFkYXMuClNpIGxhIG9icmEgZXMgZGUgdW5hIHNhbGEsIGVsIG11c2VvIGludml0w7MgYSBxdWllbiBjb21lbnRhLCBlbCBmb25kbwphbGNhbnphIHkgbm8gZXMgc3UgcHJvcGlhIG9icmEsIHBhZ2EgZWwgZm9uZG8gZGUgbGEgc2FsYSAoY29uIGVsCm1pc21vIHJlcGFydG8pIHkgbGEgY29udGludWFjacOzbiBxdWVkYSBtYXJjYWRhIGNvbW8gcHJlc2VuY2lhbC4gU2kKZmFsdGEgYWxnbyBkZSBlc28sIHBhZ2EgcXVpZW4gY29tZW50YSB5IGxhIGludml0YWNpw7NuIG5vIHNlIGdhc3RhLgpgcHJlY2lvX21heGA6IGxvIG3DoXhpbW8gcXVlIGFjZXB0YSBwYWdhciBxdWllbiBmaXJtYS4AAAAAAAhjb21lbnRhcgAAAAYAAAAAAAAABWF1dG9yAAAAAAAAEwAAAAAAAAAGZGlnZXN0AAAAAAPuAAAAIAAAAAAAAAAFcGFkcmUAAAAAAAPuAAAAIAAAAAAAAAARYWRtaXRlX3Jlc3B1ZXN0YXMAAAAAAAABAAAAAAAAAAZtb25lZGEAAAAAABMAAAAAAAAACnByZWNpb19tYXgAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAADlTaSB1bmEgY3VlbnRhIHRpZW5lIHVuYSBpbnZpdGFjacOzbiBzaW4gdXNhciBlbiB1bmEgc2FsYS4AAAAAAAAIaW52aXRhZGEAAAACAAAAAAAAAARzYWxhAAAD7gAAACAAAAAAAAAABmN1ZW50YQAAAAAAEwAAAAEAAAAB",
        "AAAAAAAAABdRdWnDqW4gYWJyacOzIHVuYSBzYWxhLgAAAAAIbXVzZW9fZGUAAAABAAAAAAAAAARzYWxhAAAD7gAAACAAAAABAAAD6QAAABMAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAACpMYSBwcm9wdWVzdGEgcGVuZGllbnRlIGRlIHVuIHRpcG8sIHNpIGhheS4AAAAAAAlwcm9wdWVzdGEAAAAAAAABAAAAAAAAAAR0aXBvAAAH0AAAAApUaXBvQ2FtYmlvAAAAAAABAAAD6AAAB9AAAAAJUHJvcHVlc3RhAAAA",
        "AAAAAAAAANBVbiBtdXNlbyBvIGluc3RpdHVjacOzbiBhYnJlIHN1IHNhbGEgZGVudHJvIGRlIFVtYnJhbC4gRWwgaWRlbnRpZmljYWRvcgpsbyBjYWxjdWxhIGVsIGNvbnRyYXRvIGEgcGFydGlyIGRlIGxhIGN1ZW50YSBkZWwgbXVzZW8geSB1bmEgYHNlbWlsbGFgCih2ZXIgYGlkX3NhbGFgKSwgYXPDrSBuYWRpZSBwdWVkZSBvY3VwYXIgZWwgZGUgb3Ryby4gTG8gZGV2dWVsdmUuAAAACmFicmlyX3NhbGEAAAAAAAIAAAAAAAAABW11c2VvAAAAAAAAEwAAAAAAAAAHc2VtaWxsYQAAAAPuAAAAIAAAAAEAAAPpAAAD7gAAACAAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAAMdDdWFscXVpZXJhIChlbCBtdXNlbyBvIHF1aWVuIGxvIGFwb3llKSBwb25lIHBsYXRhIGVuIGVsIGZvbmRvIGRlIHVuYQpzYWxhLiBFc2UgZm9uZG8gbGUgcGFnYSBhIGNhZGEgdmlzaXRhbnRlIHF1ZSBlbCBtdXNlbyBpbnZpdMOzIHVuYQpodWVsbGEgZW4gbGEgc2FsYSBvIHVuYSBjb250aW51YWNpw7NuIHNvYnJlIHVuYSBvYnJhIGRlIGxhIHNhbGEuAAAAAApwYXRyb2NpbmFyAAAAAAAEAAAAAAAAAAVxdWllbgAAAAAAABMAAAAAAAAABHNhbGEAAAPuAAAAIAAAAAAAAAAGbW9uZWRhAAAAAAATAAAAAAAAAAVtb250bwAAAAAAAAsAAAABAAAD6QAAAAIAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAAAAAAAALcGFydGVfYXV0b3IAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAD1TZWd1bmRvcyBlbnRyZSBwcm9wb25lciB1biBjYW1iaW8gc2Vuc2libGUgeSBwb2RlciBhcGxpY2FybG8uAAAAAAAAC3BsYXpvX2F2aXNvAAAAAAAAAAABAAAABg==",
        "AAAAAAAAAyZEZWphIHVuYSBodWVsbGEgbnVldmEuIEVsIHByZWNpbyBjb21wbGV0byB2YSBhbCBtdXNlbyBVbWJyYWwuClBhcmEgbm9tYnJhciB1bmEgc2FsYSBoYWNlIGZhbHRhIHVuIHbDrW5jdWxvIHJlYWwgY29uIGVsbGE6IHVuYQppbnZpdGFjacOzbiBzaW4gdXNhciwgc2VyIGVsIG11c2VvIHF1ZSBsYSBhYnJpw7MgbyBoYWJlciBhY2VwdGFkbyBzdQptdWVzdHJhIChlbiBjdXJzbyBvIHBvciBlbXBlemFyKS4gU2kgbm8sIGZhbGxhIGNvbiBgTm9BdXRvcml6YWRvYC4KQ29uIGludml0YWNpw7NuIHkgZm9uZG8gc3VmaWNpZW50ZSBwYWdhIGVsIGZvbmRvIGRlIGxhIHNhbGEgeSBubyBlbAphdXRvciwgeSBsYSBodWVsbGEgcXVlZGEgbWFyY2FkYSBjb21vIHByZXNlbmNpYWwuIFNpIGVsIGZvbmRvIG5vCmFsY2FuemEgeSBsYSBpbnZpdGFjacOzbiBlcyBzdSDDum5pY28gdsOtbmN1bG8sIGZhbGxhIGNvbgpgRm9uZG9JbnN1ZmljaWVudGVgIGVuIHZleiBkZSBjb2JyYXJsZTsgZWwgbXVzZW8geSBlbCBhcnRpc3RhIGNvbgptdWVzdHJhIGFjZXB0YWRhIHBhZ2FuIGVsbG9zIHkgbGEgaW52aXRhY2nDs24gcXVlZGEgc2luIGdhc3Rhci4KRGV2dWVsdmUgYHRydWVgIHNpIGxhIHBhZ8OzIGVsIGZvbmRvLgpFbCBpZGVudGlmaWNhZG9yIGxvIGNhbGN1bGEgZWwgY29udHJhdG8gKHZlciBgaWRfZGVgKS4KYHByZWNpb19tYXhgOiBsbyBtw6F4aW1vIHF1ZSBhY2VwdGEgcGFnYXIgcXVpZW4gZmlybWEuIFNpIGVsIHByZWNpbwpjYW1iacOzIHkgZXMgbWF5b3IsIGxhIGFjY2nDs24gZmFsbGEgZW4gdmV6IGRlIGNvYnJhciBkZSBtw6FzLgAAAAAADGRlamFyX2h1ZWxsYQAAAAYAAAAAAAAABWF1dG9yAAAAAAAAEwAAAAAAAAAGZGlnZXN0AAAAAAPuAAAAIAAAAAAAAAARYWRtaXRlX3Jlc3B1ZXN0YXMAAAAAAAABAAAAAAAAAAZtb25lZGEAAAAAABMAAAAAAAAACnByZWNpb19tYXgAAAAAAAsAAAAAAAAABHNhbGEAAAPoAAAD7gAAACAAAAABAAAD6QAAAAEAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAAEFDdWFscXVpZXJhIHB1ZWRlIHJlbm92YXIgbGEgdmlnZW5jaWEgZGUgdW5hIHNhbGEgeSBkZSBzdSBtdWVzdHJhLgAAAAAAAAxyZW5vdmFyX3NhbGEAAAABAAAAAAAAAARzYWxhAAAD7gAAACAAAAABAAAD6QAAAAIAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAAPxgcGFydGVfYXV0b3JfYnBzYDogcXXDqSBwYXJ0ZSBkZSB1bmEgY29udGludWFjacOzbiB2YSBhbCBhcnRpc3RhIHF1ZQphYnJpw7MgbGEgb2JyYSwgZW4gcHVudG9zIGLDoXNpY29zICg1MDAwID0gNTAlKS4gRWwgcmVzdG8gdmEgYSBVbWJyYWwuCmBwbGF6b19hdmlzb2A6IHNlZ3VuZG9zIGVudHJlIHByb3BvbmVyIHVuIGNhbWJpbyBzZW5zaWJsZSB5IHBvZGVyCmFwbGljYXJsbyAoZW50cmUgMzYwMCB5IDkwIGTDrWFzKS4gUXVlZGEgZmlqby4AAAANX19jb25zdHJ1Y3RvcgAAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGdGVzb3JvAAAAAAATAAAAAAAAAA9wYXJ0ZV9hdXRvcl9icHMAAAAABAAAAAAAAAALcGxhem9fYXZpc28AAAAABgAAAAA=",
        "AAAAAAAAAY1VbWJyYWwgYWJyZSBsYSBtdWVzdHJhIGNvbiBmZWNoYSBkZSB1bmEgc2FsYSwgYSBwZWRpZG8gZGUgc3UgbXVzZW8uCk1pZW50cmFzIGR1cmEsIGNhZGEgY29udGludWFjacOzbiBzb2JyZSB1bmEgb2JyYSBkZSBlc2Egc2FsYSBsZSBkZWphCmEgbGEgc2FsYSBgcGFydGVfc2FsYV9icHNgIChkZSAwIGEgNDAlKSwgcXVlIHNlIGFjdWVyZGEgcGFyYSBjYWRhCm11ZXN0cmEgeSBxdWVkYSBwdWJsaWNhZG8uIEVsIGFydGlzdGEgbnVuY2EgYmFqYSBkZWwgcGlzby4gRW1waWV6YQpjb21vIG11Y2hvIDEgZMOtYSBhbnRlcyBkZSBob3kgeSAzNjUgZMOtYXMgZGVzcHXDqXMsIGR1cmEgY29tbyBtdWNobyAxODAKZMOtYXMgeSB1bmEgc2FsYSBubyBwdWVkZSB0ZW5lciBkb3MgbXVlc3RyYXMgYSBsYSB2ZXouAAAAAAAADWFicmlyX211ZXN0cmEAAAAAAAAEAAAAAAAAAARzYWxhAAAD7gAAACAAAAAAAAAABWRlc2RlAAAAAAAABgAAAAAAAAAFaGFzdGEAAAAAAAAGAAAAAAAAAA5wYXJ0ZV9zYWxhX2JwcwAAAAAABAAAAAEAAAPpAAAAAgAAB9AAAAAFRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAANYWRtaW5pc3RyYWRvcgAAAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAARVBcGxpY2EgZWwgYWRtaW5pc3RyYWRvciBwcm9wdWVzdG8sIHNpIHlhIHBhc8OzIGVsIHBsYXpvLiBMbyBmaXJtYSBlbAphZG1pbmlzdHJhZG9yIG51ZXZvLCBwYXJhIG5vIGVudHJlZ2FybGUgZWwgY29udHJhdG8gYSB1bmEgY3VlbnRhIHF1ZQpuYWRpZSBjb250cm9sYS4gQm9ycmEgbGFzIGRlbcOhcyBwcm9wdWVzdGFzIHBlbmRpZW50ZXMgKGPDs2RpZ28sIHRlc29ybwp5IHBhcnRlIGRlbCBhcnRpc3RhKTogZWwgYWRtaW5pc3RyYWRvciBudWV2byBlbXBpZXphIHNpbiBoZXJlbmNpYXMuAAAAAAAADWFwbGljYXJfYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==",
        "AAAAAAAAAFFDYXJnYSBvIGNhbWJpYSBsb3MgcHJlY2lvcyBkZSB1bmEgbW9uZWRhLiBDb24gZXN0byBsYSBtb25lZGEgcGFzYSBhIHNlciBhY2VwdGFkYS4AAAAAAAANZmlqYXJfcHJlY2lvcwAAAAAAAAIAAAAAAAAABm1vbmVkYQAAAAAAEwAAAAAAAAAHcHJlY2lvcwAAAAfQAAAAB1ByZWNpb3MAAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==",
        "AAAAAAAAALVEZWphIGRlIGFjZXB0YXIgdW5hIG1vbmVkYSBwYXJhIHBhZ29zIG51ZXZvcyAoaHVlbGxhcywgY29udGludWFjaW9uZXMsCmFwb3lvcyB5IHBhdHJvY2luaW9zKS4gTm8gdG9jYSBsbyB5YSBndWFyZGFkbzogbG9zIHNhbGRvcyBzZSBzaWd1ZW4KY29icmFuZG8geSBsb3MgZm9uZG9zIHNlIHNpZ3VlbiByZXRpcmFuZG8uAAAAAAAADXF1aXRhcl9tb25lZGEAAAAAAAABAAAAAAAAAAZtb25lZGEAAAAAABMAAAABAAAD6QAAAAIAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAAElDdWFscXVpZXJhIHB1ZWRlIHJlbm92YXIgbGEgdmlnZW5jaWEgZGVsIGZvbmRvIGRlIHVuYSBzYWxhIGVuIHVuYSBtb25lZGEuAAAAAAAADXJlbm92YXJfZm9uZG8AAAAAAAACAAAAAAAAAARzYWxhAAAD7gAAACAAAAAAAAAABm1vbmVkYQAAAAAAEwAAAAEAAAPpAAAAAgAAB9AAAAAFRXJyb3IAAAA=",
        "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",
        "AAAAAAAAANNFbCBhcnRpc3RhIHNlIHNhbGUgZGUgbGEgbXVlc3RyYSBkZSB1bmEgc2FsYSBxdWUgaGFiw61hIGFjZXB0YWRvLiBEZXNkZQplc2UgbW9tZW50byBzdXMgb2JyYXMgZGUgZXNhIHNhbGEgdnVlbHZlbiBhbCByZXBhcnRvIGRlIHNpZW1wcmUuIFB1ZWRlCnZvbHZlciBhIGFjZXB0YXJsYSBjb24gYGFjZXB0YXJfbXVlc3RyYWAuIEZhbGxhIHNpIG5vIHRpZW5lIGFjdWVyZG8uAAAAABBzYWxpcl9kZV9tdWVzdHJhAAAAAgAAAAAAAAAHYXJ0aXN0YQAAAAATAAAAAAAAAARzYWxhAAAD7gAAACAAAAABAAAD6QAAAAIAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAADFFbCBhZG1pbmlzdHJhZG9yIGNhbmNlbGEgdW5hIHByb3B1ZXN0YSBwZW5kaWVudGUuAAAAAAAAEmNhbmNlbGFyX3Byb3B1ZXN0YQAAAAAAAQAAAAAAAAAEdGlwbwAAB9AAAAAKVGlwb0NhbWJpbwAAAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==",
        "AAAAAAAAAF9BcGxpY2EgbGEgcGFydGUgZGVsIGFydGlzdGEgcHJvcHVlc3RhLCBzaSB5YSBwYXPDsyBlbCBwbGF6by4gTG9zIHNhbGRvcwp5YSBhbm90YWRvcyBubyBjYW1iaWFuLgAAAAATYXBsaWNhcl9wYXJ0ZV9hdXRvcgAAAAAAAAAAAQAAA+kAAAACAAAH0AAAAAVFcnJvcgAAAA==",
        "AAAAAAAAAEpQcm9wb25lIGNhbWJpYXIgbGEgcGFydGUgcXVlIHJlY2liZSBlbCBhcnRpc3RhLiBOdW5jYSBwb3IgZGViYWpvIGRlbCBwaXNvLgAAAAAAFHByb3BvbmVyX3BhcnRlX2F1dG9yAAAAAQAAAAAAAAAPcGFydGVfYXV0b3JfYnBzAAAAAAQAAAABAAAD6QAAAAYAAAfQAAAABUVycm9yAAAA",
        "AAAAAAAAAHZBcGxpY2EgbGEgYWN0dWFsaXphY2nDs24gcHJvcHVlc3RhLCBzaSB5YSBwYXPDsyBlbCBwbGF6by4gU2luIHBlcmRlcgpodWVsbGFzLCBzYWxkb3MgbmkgZm9uZG9zLiBTb2xvIGVsIGFkbWluaXN0cmFkb3IuAAAAAAAVYXBsaWNhcl9hY3R1YWxpemFjaW9uAAAAAAAAAAAAAAEAAAPpAAAAAgAAB9AAAAAFRXJyb3IAAAA=",
        "AAAAAAAAAG9Qcm9wb25lIHJlZW1wbGF6YXIgZWwgY8OzZGlnbyBkZWwgY29udHJhdG8gcG9yIHVubyB5YSBzdWJpZG8gYSBsYSByZWQuCkRldnVlbHZlIGRlc2RlIGN1w6FuZG8gc2UgcHVlZGUgYXBsaWNhci4AAAAAFnByb3BvbmVyX2FjdHVhbGl6YWNpb24AAAAAAAEAAAAAAAAACXdhc21faGFzaAAAAAAAA+4AAAAgAAAAAQAAA+kAAAAGAAAH0AAAAAVFcnJvcgAAAA==" ]),
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
        id_sala: this.txFromJSON<Buffer>,
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
        propuesta: this.txFromJSON<Option<Propuesta>>,
        abrir_sala: this.txFromJSON<Result<Buffer>>,
        patrocinar: this.txFromJSON<Result<void>>,
        parte_autor: this.txFromJSON<u32>,
        plazo_aviso: this.txFromJSON<u64>,
        dejar_huella: this.txFromJSON<Result<boolean>>,
        renovar_sala: this.txFromJSON<Result<void>>,
        abrir_muestra: this.txFromJSON<Result<void>>,
        administrador: this.txFromJSON<string>,
        aplicar_admin: this.txFromJSON<Result<void>>,
        fijar_precios: this.txFromJSON<Result<void>>,
        quitar_moneda: this.txFromJSON<Result<void>>,
        renovar_fondo: this.txFromJSON<Result<void>>,
        renovar_saldo: this.txFromJSON<Result<void>>,
        retirar_fondo: this.txFromJSON<Result<void>>,
        acepto_muestra: this.txFromJSON<boolean>,
        aplicar_tesoro: this.txFromJSON<Result<void>>,
        cerrar_muestra: this.txFromJSON<Result<void>>,
        proponer_admin: this.txFromJSON<Result<u64>>,
        aceptar_muestra: this.txFromJSON<Result<void>>,
        proponer_tesoro: this.txFromJSON<Result<u64>>,
        renovar_acuerdo: this.txFromJSON<Result<void>>,
        salir_de_muestra: this.txFromJSON<Result<void>>,
        cancelar_propuesta: this.txFromJSON<Result<void>>,
        aplicar_parte_autor: this.txFromJSON<Result<void>>,
        proponer_parte_autor: this.txFromJSON<Result<u64>>,
        aplicar_actualizacion: this.txFromJSON<Result<void>>,
        proponer_actualizacion: this.txFromJSON<Result<u64>>
  }
}