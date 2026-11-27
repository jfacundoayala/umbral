// La placa de una obra la firma quien la expuso (firma de mensaje SEP-53, gratis, sin transacción).
// La ficha comprueba esa firma: una placa hecha por otra persona no aparece como firmada.
import { Buffer } from "buffer";
import { Keypair } from "@stellar/stellar-sdk";

export const mensajePlaca = (idObra: string) => `UMBRAL: placa de la obra\n${idObra}`;

/** Código corto de la obra, para comparar la placa con la pantalla. */
export const codigoCorto = (idObra: string) => `${idObra.slice(0, 4)}-${idObra.slice(4, 8)}`.toUpperCase();

/** Las billeteras devuelven la firma en hexadecimal o en base64: en el enlace va siempre en hexadecimal. */
export const firmaEnHex = (firma: string) => (/^[0-9a-f]{128}$/i.test(firma) ? firma.toLowerCase() : Buffer.from(firma, "base64").toString("hex"));

export async function placaFirmada(idObra: string, autor: string, firmaHex: string): Promise<boolean> {
  try {
    if (!/^[0-9a-f]{128}$/.test(firmaHex)) return false;
    const datos = new TextEncoder().encode("Stellar Signed Message:\n" + mensajePlaca(idObra));
    const hash = Buffer.from(await crypto.subtle.digest("SHA-256", datos));
    return Keypair.fromPublicKey(autor).verify(hash, Buffer.from(firmaHex, "hex"));
  } catch {
    return false;
  }
}
