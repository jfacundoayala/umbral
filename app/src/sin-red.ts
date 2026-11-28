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

/** La acción llegó a la red y la red la rechazó: seguro que no se cobró. */
export class RechazadaPorLaRed extends Error {}

/** La billetera firmó con una cuenta que no es la que entró a UMBRAL. */
export const otraCuenta = (cuenta: string) =>
  new Error(`Tu billetera está en otra cuenta. Cambiá a la cuenta ${cuenta.slice(0, 4)}…${cuenta.slice(-4)} y probá de nuevo.`);
