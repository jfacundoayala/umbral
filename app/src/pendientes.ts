// Huellas pagadas que todavía no se publicaron.
// Si la publicación falla después de pagar (se corta la conexión, se cierra la pestaña),
// el id y el comprobante quedan guardados en este navegador y se vuelve a intentar
// cada vez que se abre UMBRAL, sin firmar ni pagar de nuevo. El servidor igual
// comprueba en la red que el pago existe antes de publicar.
import { publicar } from "./base";

const CLAVE = "umbral-pendientes";
/** El borrador pagado se guarda 7 días (ver la limpieza en esquema.sql): después ya no hay nada que publicar. */
const VIDA_MS = 7 * 24 * 3_600_000;

type Pendiente = { id: string; hash: string; desde: number };

function leer(): Pendiente[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function guardar(lista: Pendiente[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* sin almacenamiento: queda solo el reintento del momento */
  }
}

/** Anota una huella pagada antes de intentar publicarla. Se llama apenas el pago sale hacia la red:
 *  si la pestaña se cierra durante la espera, la huella se publica sola al volver. */
export function anotar(id: string, hash: string) {
  guardar([...leer().filter((p) => p.id !== id), { id, hash, desde: Date.now() }]);
}

/** Anota una huella que ya está pagada en la red aunque acá no haya comprobante (por ejemplo, la pagó un intento
 *  anterior). Si ya estaba anotada, no toca su comprobante. */
export function anotarSiFalta(id: string) {
  if (!leer().some((p) => p.id === id)) anotar(id, "");
}

/** `true` si esa huella ya estaba anotada (por un intento anterior). */
export function estaAnotada(id: string): boolean {
  return leer().some((p) => p.id === id);
}

export function quitar(id: string) {
  guardar(leer().filter((p) => p.id !== id));
}

/** Reintenta publicar lo pendiente. Devuelve cuántas huellas se publicaron. */
export async function reintentarPendientes(): Promise<number> {
  let publicadas = 0;
  for (const p of leer()) {
    if (Date.now() - p.desde > VIDA_MS) {
      quitar(p.id);
      continue;
    }
    try {
      try {
        await publicar(p.id, p.hash);
      } catch (e) {
        // El comprobante guardado puede ser el de un segundo intento que la red rechazó (el primero sí pagó).
        // Sin comprobante, el servidor igual comprueba en el contrato que la huella está pagada.
        if (!p.hash || !(e instanceof Error) || !/comprobante/i.test(e.message)) throw e;
        await publicar(p.id);
      }
      quitar(p.id);
      publicadas++;
    } catch {
      /* se vuelve a intentar la próxima vez */
    }
  }
  return publicadas;
}
