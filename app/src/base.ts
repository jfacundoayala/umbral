// Lectura y escritura en la base (Supabase) con fetch, sin librería extra.
// El navegador solo puede: leer lo publicado, dejar borradores "pendiente", subir la foto de su borrador y dejar una opinión.
// Publicar lo hace el servidor (función `publicar`), después de ver el pago en la red.
import { SUPABASE_CLAVE_PUBLICA, SUPABASE_URL } from "./config";
import type { Documento } from "./umbral";
import type { Opinion } from "./opiniones";

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
/** El cielo muestra lo expuesto desde la colección final (28/11, 05:30 UTC) y la obra de Lucía.
 *  Lo anterior (versiones reemplazadas y pruebas) sigue en la red y se abre por su enlace;
 *  sus comprobantes están en docs/txs.md. */
const DESDE_COLECCION = "2026-11-28T05:30:00Z";
const MIRTA = "8d78f8c880d97a97b4cc6127719c086707843d79a933e3b1c59ec3e6753d551b";
export const enElCielo = (h: Pick<Huella, "id" | "recibido">) => h.id === MIRTA || new Date(h.recibido) >= new Date(DESDE_COLECCION);

/** La obra de prueba que muestra el sello "Estuve ahí" (encuentro en persona en la red de pruebas). */
export const OBRA_CON_SELLO = "12541274d348295d720da7108ba583c63f1fdb4314a415f04b3c487dc9c0e4ac";

export async function obras(orden: Orden): Promise<Huella[]> {
  const o = orden === "huellas" ? "respuestas_publicadas.desc,recibido.desc" : "recibido.desc";
  const todas = await leer<Huella[]>(`obras_con_conteo?select=${CAMPOS}&order=${o}&limit=200`);
  return todas.filter(enElCielo);
}

/** Una obra y todas las huellas que nacieron de ella (la cadena entera, por `raiz`). */
export async function constelacion(idObra: string): Promise<{ obra: Huella | null; huellas: Huella[] }> {
  if (!/^[0-9a-f]{64}$/.test(idObra)) return { obra: null, huellas: [] };
  const filas = await leer<Huella[]>(`huellas_publicas?select=${CAMPOS}&or=(id.eq.${idObra},raiz.eq.${idObra})&order=recibido.asc`);
  const obra = filas.find((h) => h.id === idObra && h.padre === null) ?? null;
  return { obra, huellas: filas.filter((h) => h.id !== idObra) };
}

export const urlFoto = (ruta: string) => `${SUPABASE_URL}/storage/v1/object/public/obras/${ruta}`;
/** Miniaturas livianas (app/public/muestra) de las obras de muestra, solo para las tarjetas del cielo.
 *  No entran en el código firmado: la ficha muestra siempre la foto firmada de Storage. */
const MINIATURAS = new Set([
  "c11a519bf2b3e15f9fd2a13be031614aadd105800bf7ae17c57e4315f1f150e7",
  "cdad0d0288ee60a556ff861ef2b6baa64e9a5292e9e6785c2b156133a856259d",
  "ce540f8556ab6c7d48e7174e662e04c58de2937071ff108122dc329503fcc71e",
  "d387c0738f34fd75510735cd50a625fd657be543f17183ab7910743c2a4deab6",
  "e0a1f2f25d102a447aea1947aed17ab655a89a43dc1c9e94ae8f72108567e6a3",
]);
/** Foto para una tarjeta del cielo: la miniatura si hay, si no la foto firmada. */
export const urlTarjeta = (id: string, ruta: string) => (MINIATURAS.has(id) ? `/muestra/${id}.webp` : urlFoto(ruta));
export const urlAudio = (ruta: string) => `${SUPABASE_URL}/storage/v1/object/public/audios/${ruta}`;

/** Deja el borrador invisible. Si ya estaba (mismo id), sigue: es el mismo contenido. */
/** Guarda una opinión. No pide la fila de vuelta: el navegador no puede leer las opiniones. */
export async function enviarOpinion(o: Opinion): Promise<void> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/opiniones`, {
    method: "POST",
    headers: { ...CABECERAS, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(o),
  });
  if (r.ok) return;
  const e = (await r.json().catch(() => ({}))) as { code?: string };
  if (e.code === "42501") throw new Error("No pudimos guardarla: puede tener una palabra que no admitimos. Cambiá el texto y probá de nuevo.");
  throw new Error("No pudimos guardar tu opinión. Probá de nuevo en un rato.");
}

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
/** Publica un borrador pagado. Sin comprobante, el servidor lo busca en la red. Devuelve el comprobante si lo hay. */
export async function publicar(id: string, tx_hash = ""): Promise<string | null> {
  let ultimo = "No pudimos publicar.";
  for (let intento = 0; intento < 4; intento++) {
    if (intento) await new Promise((r) => setTimeout(r, 2500 * intento));
    const r = await fetch(`${SUPABASE_URL}/functions/v1/publicar`, {
      method: "POST",
      headers: { ...CABECERAS, "Content-Type": "application/json" },
      body: JSON.stringify({ id, tx_hash }),
    });
    const c = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; tx_hash?: string | null };
    if (r.ok && c.ok) return c.tx_hash ?? (tx_hash || null);
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
