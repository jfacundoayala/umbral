// La placa de una obra la firma la cuenta que la expuso (firma de mensaje SEP-53, gratis, sin transacción).
// Lo firmado lleva versión, sitio, id y código del contenido de la obra: una placa sirve solo para
// esa obra en este sitio. La firma prueba qué cuenta firmó; no verifica la identidad civil del artista.
import { Buffer } from "buffer";

export type ObraFirmable = { id: string; digest: string; autor: string };

export const mensajePlaca = (o: ObraFirmable, sitio = location.host) =>
  `UMBRAL placa v1\nsitio: ${sitio}\nobra: ${o.id}\ncontenido: ${o.digest}`;

/** Código corto de la obra, para comparar la placa con la pantalla. */
export const codigoCorto = (idObra: string) => `${idObra.slice(0, 4)}-${idObra.slice(4, 8)}`.toUpperCase();

/** Las billeteras devuelven la firma en hexadecimal o en base64: en el enlace va siempre en hexadecimal. */
export const firmaEnHex = (firma: string) => (/^[0-9a-f]{128}$/i.test(firma) ? firma.toLowerCase() : Buffer.from(firma, "base64").toString("hex"));

/** Se comprueba contra la obra que muestra la pantalla (leída de la base), nunca contra datos del QR. */
export async function placaFirmada(o: ObraFirmable, firmaHex: string, sitio = location.host): Promise<boolean> {
  try {
    if (!/^[0-9a-f]{128}$/.test(firmaHex)) return false;
    const datos = new TextEncoder().encode("Stellar Signed Message:\n" + mensajePlaca(o, sitio));
    const hash = Buffer.from(await crypto.subtle.digest("SHA-256", datos));
    // stellar-sdk se baja recién acá: la ficha se dibuja sin esperarlo.
    const { Keypair } = await import("@stellar/stellar-sdk");
    return Keypair.fromPublicKey(o.autor).verify(hash, Buffer.from(firmaHex, "hex"));
  } catch {
    return false;
  }
}
