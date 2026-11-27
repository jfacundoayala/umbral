// Lectura y escritura en la base (Supabase) con fetch, sin librería extra.
// El navegador solo puede: leer lo publicado, dejar borradores "pendiente" y subir la foto de su borrador.
// Publicar lo hace el servidor (función `publicar`), después de ver el pago en la red.
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from "./config";
import type { Documento } from "./umbral";

const CABECERAS = { apikey: SUPABASE_CLAVE_PUBLICA, Authorization: `Bearer ${SUPABASE_CLAVE_PUBLICA}` };

export type Huella = {
  id: string;
  digest: string;
  tx_hash: string | null;
  autor: string;
  artista: string;
  moneda: string;
  padre: string | null;
  estado: "publicada" | "retirada";
  nombre: string | null;
  titulo: string | null;
  descripcion: string | null;
  texto: string | null;
  foto_ruta: string | null;
  audio_ruta: string | null;
  sala: string | null;
  creado: string;
  recibido: string;
  raiz: string | null;
  respuestas_publicadas: number;
};

const CAMPOS = "id,digest,tx_hash,autor,artista,moneda,padre,sala,estado,nombre,titulo,descripcion,texto,foto_ruta,audio_ruta,creado,recibido,raiz,respuestas_publicadas";

async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, { headers: CABECERAS });
  if (!r.ok) throw new Error("No pudimos leer las obras. Probá de nuevo en un rato.");
  return r.json() as Promise<T>;
}

export type Orden = "huellas" | "nuevas";

/** Obras publicadas. "huellas": las más continuadas primero. "nuevas": las últimas primero. */
export function obras(orden: Orden): Promise<Huella[]> {
  const o = orden === "huellas" ? "respuestas_publicadas.desc,recibido.desc" : "recibido.desc";
  return leer<Huella[]>(`obras_con_conteo?select=${CAMPOS}&order=${o}&limit=200`);
}

/** Una obra y todas las huellas que nacieron de ella (la cadena entera, por `raiz`). */
export async function constelacion(idObra: string): Promise<{ obra: Huella | null; huellas: Huella[] }> {
  if (!/^[0-9a-f]{64}$/.test(idObra)) return { obra: null, huellas: [] };
  const filas = await leer<Huella[]>(`huellas_publicas?select=${CAMPOS}&or=(id.eq.${idObra},raiz.eq.${idObra})&order=recibido.asc`);
  const obra = filas.find((h) => h.id === idObra && h.padre === null) ?? null;
  return { obra, huellas: filas.filter((h) => h.id !== idObra) };
}

export const urlFoto = (ruta: string) => `${SUPABASE_URL}/storage/v1/object/public/obras/${ruta}`;
export const urlAudio = (ruta: string) => `${SUPABASE_URL}/storage/v1/object/public/audios/${ruta}`;

/** Deja el borrador invisible. Si ya estaba (mismo id), sigue: es el mismo contenido. */
export async function guardarBorrador(
  fila: { id: string; digest: string; autor: string; artista: string; moneda: string; padre: string | null; sala?: string | null; foto_ruta?: string | null; audio_ruta?: string | null },
  doc: Documento,
): Promise<void> {
  const cuerpo = {
    ...fila,
    estado: "pendiente",
    nombre: doc.nombre,
    titulo: doc.titulo || null,
    descripcion: doc.descripcion || null,
    texto: doc.texto || null,
    foto_ruta: fila.foto_ruta ?? null,
    audio_ruta: fila.audio_ruta ?? null,
    sala: fila.sala ?? null,
    derechos: doc.derechos ?? null,
    sal: doc.sal,
    creado: doc.creado,
  };
  // Sin pedir la fila de vuelta: el navegador no puede ver borradores.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/huellas`, {
    method: "POST",
    headers: { ...CABECERAS, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(cuerpo),
  });
  if (r.ok) return;
  const e = (await r.json().catch(() => ({}))) as { code?: string };
  if (e.code === "23505") return; // ya está
  if (e.code === "42501") {
    throw new Error(
      fila.padre
        ? "No pudimos guardar tu texto. Puede tener una palabra que no admitimos, o dejaste muchos borradores sin pagar en la última hora. Cambiá el texto o esperá un rato."
        : "No pudimos guardar tu obra. Si dejaste muchos borradores sin pagar en la última hora, esperá un rato.",
    );
  }
  throw new Error("No pudimos guardar el borrador. Revisá los datos y volvé a intentar.");
}

/** Sube la foto o el audio del borrador. Tiene que estar el borrador antes. */
export async function subirArchivo(deposito: "obras" | "audios", ruta: string, archivo: File): Promise<void> {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${deposito}/${ruta}`, {
    method: "POST",
    headers: { ...CABECERAS, "Content-Type": archivo.type.split(";")[0], "x-upsert": "false" },
    body: archivo,
  });
  if (r.ok) return;
  const t = await r.text();
  if (/already exists|Duplicate/i.test(t)) return;
  throw new Error(
    deposito === "obras"
      ? "No pudimos subir la foto. Probá con otra (JPG, PNG o WEBP, hasta 5 MB)."
      : "No pudimos subir el audio. Probá con otro (MP3, M4A, WEBM u OGG, hasta 5 MB).",
  );
}

/** Le pide al servidor que publique: el servidor mira la red y recién ahí la muestra.
 *  La red puede tardar unos segundos en mostrar el pago, por eso reintenta. */
export async function publicar(id: string, tx_hash: string): Promise<void> {
  let ultimo = "No pudimos publicar.";
  for (let intento = 0; intento < 4; intento++) {
    if (intento) await new Promise((r) => setTimeout(r, 2500 * intento));
    const r = await fetch(`${SUPABASE_URL}/functions/v1/publicar`, {
      method: "POST",
      headers: { ...CABECERAS, "Content-Type": "application/json" },
      body: JSON.stringify({ id, tx_hash }),
    });
    const c = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (r.ok && c.ok) return;
    ultimo = c.error ?? ultimo;
    if (r.status === 400 || r.status === 404 || r.status === 409) break; // no se arregla esperando
  }
  throw new Error(`El pago quedó hecho, pero no se pudo publicar: ${ultimo}`);
}

/** Ids de las huellas que una cuenta guardó como favoritas. */
export async function favoritosDe(cuenta: string): Promise<Set<string>> {
  const filas = await leer<{ huella_id: string }[]>(`favoritos?select=huella_id&cuenta=eq.${cuenta}`);
  return new Set(filas.map((f) => f.huella_id));
}

export async function cambiarFavorito(datos: { cuenta: string; huella_id: string; accion: "guardar" | "quitar"; fecha: string; firma: string }) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/favoritos`, {
    method: "POST",
    headers: { ...CABECERAS, "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const c = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!r.ok || !c.ok) throw new Error(c.error ?? "No se pudo guardar el favorito.");
}

/** Después de retirar en el contrato: el servidor lo comprueba en la red y borra el contenido y los archivos. */
export async function borrarRetirada(id: string): Promise<void> {
  let ultimo = "No se pudo borrar el contenido.";
  for (let intento = 0; intento < 4; intento++) {
    if (intento) await new Promise((r) => setTimeout(r, 2500 * intento));
    const r = await fetch(`${SUPABASE_URL}/functions/v1/retirar`, {
      method: "POST",
      headers: { ...CABECERAS, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const c = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (r.ok && c.ok) return;
    ultimo = c.error ?? ultimo;
    // 409: la red todavía la ve activa; puede ser demora, se reintenta.
    if (r.status === 400 || r.status === 404) break;
  }
  throw new Error(`La huella quedó retirada en la red, pero no se pudo borrar su contenido: ${ultimo}. Volvé a intentar.`);
}
