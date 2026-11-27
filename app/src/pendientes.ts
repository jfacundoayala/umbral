// Huellas pagadas que todavía no se publicaron.
// Si la publicación falla después de pagar (se corta la conexión, se cierra la pestaña),
// el id y el comprobante quedan guardados en este navegador y se vuelve a intentar
// cada vez que se abre UMBRAL, sin firmar ni pagar de nuevo. El servidor igual
// comprueba en la red que el pago existe antes de publicar.
import { publicar } from "./base";

const CLAVE = "umbral-pendientes";
/** El borrador se borra solo a las 24 horas: después de eso ya no hay nada que publicar. */
const VIDA_MS = 24 * 3_600_000;

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

/** Anota una huella pagada antes de intentar publicarla. */
export function anotar(id: string, hash: string) {
  guardar([...leer().filter((p) => p.id !== id), { id, hash, desde: Date.now() }]);
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
      await publicar(p.id, p.hash);
      quitar(p.id);
      publicadas++;
    } catch {
      /* se vuelve a intentar la próxima vez */
    }
  }
  return publicadas;
}
