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
/** El cielo muestra lo expuesto en el contrato final (desde el 28/11, 11:30 UTC).
 *  Lo anterior (ensayos y contratos viejos) sigue en la red y se abre por su enlace;
 *  sus comprobantes están en docs/txs.md. */
const DESDE_COLECCION = "2026-11-28T11:30:00Z";
export const enElCielo = (h: Pick<Huella, "id" | "recibido">) => new Date(h.recibido) >= new Date(DESDE_COLECCION);

/** La obra de prueba que muestra el sello "Estuve ahí" (encuentro en persona en la red de pruebas). */
export const OBRA_CON_SELLO = "bd8d882f1fc3826cfdba82c3adc983be0bcd622085b5133adf6bd51acb591ce4";

/** Saca las repetidas: si dos obras tienen el mismo título y la misma firma, queda una sola, la más nueva.
 *  Así una obra sembrada dos veces nunca se ve dos veces. No cambia el orden de las que quedan. */
export function sinRepetidas<T extends Pick<Huella, "id" | "titulo" | "nombre" | "recibido">>(lista: T[]): T[] {
  const clave = (h: T) => [h.titulo, h.nombre].map((x) => (x ?? "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ")).join("\n");
  const gana = new Map<string, T>();
  for (const h of lista) {
    const otra = gana.get(clave(h));
    if (!otra || new Date(h.recibido).getTime() > new Date(otra.recibido).getTime()) gana.set(clave(h), h);
  }
  return lista.filter((h) => gana.get(clave(h)) === h);
}

export async function obras(orden: Orden): Promise<Huella[]> {
  const o = orden === "huellas" ? "respuestas_publicadas.desc,recibido.desc" : "recibido.desc";
  const todas = await leer<Huella[]>(`obras_con_conteo?select=${CAMPOS}&order=${o}&limit=200`);
  return sinRepetidas(todas.filter(enElCielo));
}

/** Una obra y todas las huellas que nacieron de ella (la cadena entera, por `raiz`). */
export async function constelacion(idObra: string): Promise<{ obra: Huella | null; huellas: Huella[] }> {
  if (!/^[0-9a-f]{64}$/.test(idObra)) return { obra: null, huellas: [] };
  const filas = await leer<Huella[]>(`huellas_publicas?select=${CAMPOS}&or=(id.eq.${idObra},raiz.eq.${idObra})&order=recibido.asc`);
  const obra = filas.find((h) => h.id === idObra && h.padre === null) ?? null;
  return { obra, huellas: filas.filter((h) => h.id !== idObra) };
}

export const urlFoto = (ruta: string) => `${SUPABASE_URL}/storage/v1/object/public/obras/${ruta}`;
/** Miniaturas livianas (app/public/muestra, 480 px de ancho) de las obras, solo para las tarjetas.
 *  No entran en el código firmado: la ficha muestra siempre la foto firmada de Storage. */
const MINIATURAS = new Set([
  "091c0f2605a9d491d9a24f5f1cb267db6d8d2f908b2e7bea6a26cd29873892d7",
  "0efbeadfaca0492159f11b7b7a877070fe3d0eb3a45cc1af212cff6a75b179cd",
  "15aa392532c75debc079c073fe4e0bae7d54079bf6b848e08e975a276555f300",
  "18a0cb534fc26730a976616bbb2ab71ef1c96b25c88a8552bf9199d64160c972",
  "18b0dd405826c5306e4e58c1dcaf49b4db361d885d4d79efcdec2e5223e8649e",
  "2338f11428e071452678cb81425a97e0f1038677a6f59edf1ae7be59f74d69bb",
  "25209c8402b42e0fb4121663619d43ba69e55e1d31a0473142e1eeed767e6179",
  "282c20d7ec9c9791f8b9dae715b68bbfa41dfa8adb3df23b5a6c78590e6635f9",
  "3abac9c4ea6dd175b70f64abbd220de05e11cf89448859e10e5125219dc67a3b",
  "55e4a1423a6e61f967359d880b941ebe79031d054b85421fe07ca29124c68b0d",
  "5f87ba7f0a4d2d43675ed60214cafd5afd4ded768abc605204f90d46e43f6acc",
  "64feb53715b24ceef5dd9b72b43e4653b783ddb02931cb924a6ce7551587dc11",
  "673b6d8c445b20ac939ce10ad44a54e4fdac619876cd9c73930c8f61ef79d371",
  "728ede139ed0b4310bf1f80758422b25312be7c1ee99a4a33a87665918652024",
  "8a17e13813e5605d81210217329ba4ec2df0d725adba22b4826db38b65541bad",
  "97b8a4626f1687acd8d9a065505bc6eb663498865228df4c93543f29d5512f64",
  "a4b90b637d00f19b1a7cfc4d74285cba9dc61b595c3d587aaad5efd80c3c7e95",
  "b4c66b59ec56fbeba57eecd4d7af28e17cb23c85c77c3ac8112343c4ab25fcd8",
  "b613936c43920f627ca1ab8cc6fc632da475f6726f6005504222f545a5947e28",
  "b7cc29fa73577c9674b0bcce8d086ac0f28e32b853c388b7bccab331ddc0626e",
  "bbc4c0e86ca4c92640d8f391f4da4e8cec8d1f9faeeb93384d31bfd682dc72cd",
  "bd8d882f1fc3826cfdba82c3adc983be0bcd622085b5133adf6bd51acb591ce4",
  "cdc454c10ad3be0d2568e4ec62ae8d11cfffa85354da1b6c9c97a605c01f9a89",
  "d0ab2b7ffaabb1474ce4e75d7fda57abe54cecd3fc2516520f21f3fae9141b11",
  "dc55359be40369bbbe5ef5f9acdb8760abce17a37d9465df7b4f5382f1f4fea8",
  "ebeaba2900afd9a6b772d87dd5810d43d2e08d98a19ef8d24af53a8e39a2bd14",
  "f23f895aa98d356b2870ec370e2b17d47ef7558592d2d7bc7a1ba13d9958b420",
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
  if (e.code === "42501") throw new Error("No pudimos guardarla. Puede tener una palabra que no admitimos. Cambiá el texto y probá de nuevo.");
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
