// La firma que pide un favorito. Sin nada propio del servidor: lo prueba la app (app/src/pruebas/favoritos.test.ts).
// Cada firma vale para UNA acción sobre UNA huella y por pocos minutos: quien la copie no puede usarla
// para otra huella, para la acción contraria ni más tarde.

export type Accion = "guardar" | "quitar";

/** Cuánto vale una firma, en minutos. */
export const VALE_MINUTOS = 5;

/** El mensaje que firma la billetera. La app arma exactamente este texto (app/src/acciones.ts). */
export const mensajeDe = (accion: Accion, huella: string, cuenta: string, fecha: string) =>
  `UMBRAL: ${accion} favorito\n${huella}\n${cuenta}\n${fecha}`;

/** `true` si la fecha firmada es de hace menos de VALE_MINUTOS (se tolera un reloj adelantado un minuto). */
export function vigente(fecha: string, ahora: number = Date.now()): boolean {
  const edad = ahora - Date.parse(fecha);
  return edad > -60_000 && edad < VALE_MINUTOS * 60_000;
}

/** Firma de mensajes de Stellar (SEP-53): se firma el SHA-256 de un prefijo fijo más el mensaje.
 *  `clave` son los 32 bytes de la clave pública de la cuenta. */
export async function firmaValida(clave: Uint8Array, mensaje: string, firma: string): Promise<boolean> {
  try {
    const datos = new TextEncoder().encode("Stellar Signed Message:\n" + mensaje);
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", datos));
    // atob del propio entorno: Buffer.from(..., "base64") decodifica mal en el servidor.
    const f = /^[0-9a-f]{128}$/i.test(firma)
      ? Uint8Array.from(firma.match(/../g)!, (x) => parseInt(x, 16))
      : Uint8Array.from(atob(firma), (ch) => ch.charCodeAt(0));
    if (f.length !== 64) return false;
    // Ed25519 del propio entorno: la de la librería de Stellar no anda en el servidor.
    const k = await crypto.subtle.importKey("raw", new Uint8Array(clave), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, k, f, hash);
  } catch {
    return false;
  }
}
