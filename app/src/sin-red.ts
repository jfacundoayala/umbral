// Piezas que usan las pantallas y no necesitan stellar-sdk: así la primera carga no lo baja.
import { RED } from "./config";

export const nuevaSal = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

/** La acción se mandó, pero la red todavía no dijo si salió bien. Puede haberse cobrado:
 *  no hay que volver a pagar. Lleva el comprobante para seguir intentando publicar. */
export class PagoSinConfirmar extends Error {
  hash: string;
  constructor(hash: string) {
    super(
      `La acción se mandó, pero no pudimos confirmar si salió. No la repitas todavía: fijate en un minuto en ${RED.explorador}/tx/${hash}. Si era una huella y salió, se publica sola.`,
    );
    this.hash = hash;
  }
}
