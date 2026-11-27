// El encuentro en persona: quien va muestra un QR con su cuenta y la sala lo escanea en la puerta.

const CUENTA = /G[A-Z2-7]{55}/;

/** La cuenta que trae un código escaneado o pegado, o null si no trae una.
 *  Acepta la cuenta sola o dentro de un texto (por ejemplo, "web+stellar:pay?destination=G…"). */
export function cuentaDeCodigo(texto: string): string | null {
  const m = texto.trim().toUpperCase().match(CUENTA);
  return m ? m[0] : null;
}

export const enlaceMiCodigo = (sala?: string) => `${location.origin}${location.pathname}#/codigo${sala ? `?sala=${sala}` : ""}`;
