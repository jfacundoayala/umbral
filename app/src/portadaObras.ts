// Las obras que muestra la portada. Cada una se busca en la base por su id y, si ese id ya no está
// (la colección se volvió a sembrar), por su título, que no cambia entre siembras. Los ids escritos acá
// los actualiza scripts/reemplazar-ids.mjs, las que no tienen id se resuelven solas por el título.
// Todo lo demás (foto, cantidad de huellas y la huella que se cita) se lee en vivo de la base.
import { constelacion, obras, type Huella } from "./base";

export type ObraDePortada = {
  /** Id de la obra, si se conoce. Sin id, se busca por título entre las obras de El cielo. */
  id?: string;
  /** Qué es, en una o dos palabras. No está en la base: lo dice la descripción de la obra. */
  disciplina: string;
  /** Título de la obra tal como está publicada. Es la clave estable: identifica la tarjeta. */
  titulo: string;
  /** Foto liviana servida con la web, si hay. Si no, se usa la de la obra. */
  imagen?: string;
};

/** Seis obras distintas y de la vida de la gente: una escultura, la calle, una receta de familia, un perro, una carta y la lluvia. */
export const OBRAS_DE_PORTADA: ObraDePortada[] = [
  { id: "f23f895aa98d356b2870ec370e2b17d47ef7558592d2d7bc7a1ba13d9958b420", disciplina: "Escultura", titulo: "Entre raíces", imagen: "/portada/entre-raices.webp" },
  { id: "5f87ba7f0a4d2d43675ed60214cafd5afd4ded768abc605204f90d46e43f6acc", disciplina: "En la calle", titulo: "Vereda de lapacho" },
  { id: "728ede139ed0b4310bf1f80758422b25312be7c1ee99a4a33a87665918652024", disciplina: "Receta de familia", titulo: "La sopa paraguaya de Mirta" },
  { id: "a4b90b637d00f19b1a7cfc4d74285cba9dc61b595c3d587aaad5efd80c3c7e95", disciplina: "Un perro", titulo: "Frida" },
  { id: "55e4a1423a6e61f967359d880b941ebe79031d054b85421fe07ca29124c68b0d", disciplina: "Una carta", titulo: "Carta a quienes todavía no llegaron" },
  { id: "18a0cb534fc26730a976616bbb2ab71ef1c96b25c88a8552bf9199d64160c972", disciplina: "La lluvia", titulo: "Lluvia en el techo de chapa" },
];

/** La obra que se usa de ejemplo en "Cómo funciona" (por su título). */
export const OBRA_DE_EJEMPLO = "La sopa paraguaya de Mirta";

export type EnVivo = { obra: Huella; huellas: Huella[] };

/** La portada no nombra la ciudad ni la provincia: una huella que las nombra no se cita ahí. */
const NOMBRA_LUGAR = /resistencia|chaco|chaque/i;

/** Las huellas que se pueden citar en la portada: publicadas, dejadas sobre la obra misma y sin nombrar el lugar. */
export function citables(v: EnVivo): Huella[] {
  return v.huellas.filter((h) => h.estado === "publicada" && h.padre === v.obra.id && !!h.texto && !NOMBRA_LUGAR.test(h.texto));
}

const igual = (a?: string | null, b?: string | null) => (a ?? "").normalize("NFC").trim().toLowerCase() === (b ?? "").normalize("NFC").trim().toLowerCase();

/** El id con el que se busca cada obra de la portada: el suyo si está en El cielo, si no el de la obra
 *  de El cielo con el mismo título, y si tampoco, el que tenía escrito (puede seguir abriéndose por su enlace). */
export function idsDePortada(entradas: ObraDePortada[], cielo: (Pick<Huella, "id" | "titulo"> & { foto_ruta?: string | null; respuestas_publicadas?: number })[]): Map<string, string> {
  const ids = new Map<string, string>();
  const usada = (id: string) => [...ids.values()].includes(id);
  for (const o of entradas) {
    const id = cielo.find((h) => h.id === o.id)?.id ?? cielo.find((h) => igual(h.titulo, o.titulo))?.id ?? o.id;
    // Una misma obra no ocupa dos tarjetas.
    if (id && !usada(id)) ids.set(o.titulo, id);
  }
  // Si alguna de las elegidas todavía no está publicada, su lugar lo ocupa otra obra de El cielo
  // (primero las que tienen foto y más huellas). La tira siempre muestra la misma cantidad, todas distintas.
  const resto = cielo.filter((h) => h.titulo && !usada(h.id) && !ids.has(h.titulo));
  const conMasHuellas = (lista: typeof resto) => [...lista].sort((x, y) => (y.respuestas_publicadas ?? 0) - (x.respuestas_publicadas ?? 0));
  for (const h of [...conMasHuellas(resto.filter((x) => x.foto_ruta)), ...conMasHuellas(resto.filter((x) => !x.foto_ruta))]) {
    if (ids.size >= entradas.length) break;
    if (![...ids.keys()].some((t) => igual(t, h.titulo))) ids.set(h.titulo!, h.id);
  }
  return ids;
}

/** Lee de la base cada obra de la portada con sus huellas, por título. La que falla o ya no está, queda afuera. */
export async function obrasDePortadaEnVivo(): Promise<Map<string, EnVivo>> {
  const cielo = await obras("nuevas").catch(() => []);
  const leidas = await Promise.all(
    [...idsDePortada(OBRAS_DE_PORTADA, cielo)].map(([titulo, id]) =>
      constelacion(id)
        .then((c) => (c.obra ? ([titulo, { obra: c.obra, huellas: c.huellas }] as const) : null))
        .catch(() => null),
    ),
  );
  return new Map(leidas.filter((x) => x !== null));
}
