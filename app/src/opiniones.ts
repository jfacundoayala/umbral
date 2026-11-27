// La opinión de quien prueba UMBRAL: corta, opcional y sin datos personales.
// Se guarda en la tabla `opiniones`, que el navegador solo puede llenar, no leer.

export type Rol = "artista" | "sala" | "publico";
export type Pudo = "si" | "con_ayuda" | "no";
export type Desde = "huella" | "pie";

export const LARGO_TEXTO = 500;
export const LARGO_APODO = 40;

export const ROLES: [Rol, string][] = [
  ["artista", "Artista"],
  ["sala", "Trabajo en un museo o una sala"],
  ["publico", "Público"],
];

export const PUDO: [Pudo, string][] = [
  ["si", "Sí, solo/a"],
  ["con_ayuda", "Con ayuda"],
  ["no", "No"],
];

export type Opinion = {
  desde: Desde;
  rol: Rol;
  pudo: Pudo;
  costo: string | null;
  cambiaria: string | null;
  apodo: string | null;
  citar: boolean;
};

export type Respuestas = {
  desde: Desde;
  rol: Rol | null;
  pudo: Pudo | null;
  costo: string;
  cambiaria: string;
  apodo: string;
  citar: boolean;
};

const limpio = (t: string) => {
  const s = t.trim().replace(/\s+/g, " ");
  return s ? s : null;
};

/** Lo que va a la base, o un mensaje si falta algo. Sin apodo no se cita a nadie. */
export function armarOpinion(r: Respuestas): Opinion | string {
  if (!r.rol) return "Contanos qué sos: artista, museo o sala, o público.";
  if (!r.pudo) return "Contanos si pudiste dejar tu huella.";
  const costo = limpio(r.costo);
  const cambiaria = limpio(r.cambiaria);
  const apodo = limpio(r.apodo);
  if ((costo?.length ?? 0) > LARGO_TEXTO || (cambiaria?.length ?? 0) > LARGO_TEXTO) return `Cada respuesta puede tener hasta ${LARGO_TEXTO} letras.`;
  if ((apodo?.length ?? 0) > LARGO_APODO) return `El nombre o apodo puede tener hasta ${LARGO_APODO} letras.`;
  return { desde: r.desde, rol: r.rol, pudo: r.pudo, costo, cambiaria, apodo, citar: r.citar };
}
