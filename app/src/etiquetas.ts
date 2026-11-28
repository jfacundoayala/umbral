// Qué nombres se muestran en la constelación 3D sin que se pisen.
// Se ubican de a uno, por prioridad: el que se mira o se eligió, después la obra, después de adelante hacia atrás.
// Un nombre se oculta si choca con otro ya ubicado o si toca el círculo de otro punto: debajo de uno
// de adelante queda tapado, y encima de uno de atrás (sobre todo la foto de la obra) no se lee.

export type Caja = { x: number; y: number; ancho: number; alto: number };
export type Circulo = { x: number; y: number; r: number };
export type Candidato = {
  id: string;
  /** Profundidad: más alto, más cerca de quien mira. */
  z: number;
  /** Dónde iría el nombre. */
  caja: Caja;
  /** El círculo del punto, en pantalla. */
  circulo: Circulo;
  /** Va primero (la obra, o la huella que se mira o se eligió). */
  prioridad: number;
};

const chocan = (a: Caja, b: Caja) => a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;

/** La caja toca el círculo (se mide desde el punto de la caja más cercano al centro del círculo). */
function tapa(c: Circulo, k: Caja) {
  const px = Math.max(k.x, Math.min(c.x, k.x + k.ancho));
  const py = Math.max(k.y, Math.min(c.y, k.y + k.alto));
  return (px - c.x) ** 2 + (py - c.y) ** 2 < c.r * c.r;
}

export function etiquetasVisibles(candidatos: Candidato[]): Set<string> {
  const orden = [...candidatos].sort((a, b) => b.prioridad - a.prioridad || b.z - a.z);
  const puestas: Caja[] = [];
  const visibles = new Set<string>();
  for (const c of orden) {
    if (puestas.some((p) => chocan(p, c.caja))) continue;
    // La que se mira o se eligió se muestra igual: es la que la persona está buscando.
    if (c.prioridad < 2 && candidatos.some((o) => o.id !== c.id && tapa(o.circulo, c.caja))) continue;
    puestas.push(c.caja);
    visibles.add(c.id);
  }
  return visibles;
}

/** Caja aproximada de un nombre centrado en `x`, con la línea de base en `y`, en mayúsculas espaciadas. */
export function cajaDeNombre(texto: string, x: number, y: number, tamano: number): Caja {
  const ancho = texto.length * tamano * 0.82 + tamano * 0.4;
  return { x: x - ancho / 2, y: y - tamano * 0.85, ancho, alto: tamano * 1.15 };
}
