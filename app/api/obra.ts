// Tarjeta para compartir una obra. Los buscadores y las redes no leen lo que va después del "#",
// así que /o/<id> (regla en vercel.json) llega acá: se devuelve un HTML chico con el título, la descripción
// y la foto de la obra, y el navegador de una persona salta enseguida a la ficha (#/obra/<id>).
// Lee con la clave pública de Supabase, la misma que usa la web: solo ve lo publicado.

const entorno = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SUPABASE_URL = entorno.VITE_SUPABASE_URL ?? "https://nznearthcpgbeyyeuhyy.supabase.co";
const CLAVE_PUBLICA = entorno.VITE_SUPABASE_CLAVE_PUBLICA ?? "sb_publishable_MBT_2R-srFcN-4Ar832Sfw_cZTqj5zf";

type Obra = { id: string; titulo: string | null; nombre: string | null; descripcion: string | null; foto_ruta: string | null };

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Recorta en la última palabra entera antes del largo y agrega "…". */
export function recortar(t: string, largo = 160): string {
  const limpio = t.replace(/\s+/g, " ").trim();
  if (limpio.length <= largo) return limpio;
  const corte = limpio.slice(0, largo - 1);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > largo * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s.,;:]+$/, "")}…`;
}

/** El HTML de la tarjeta. `origen` es https://<dominio>, sin barra al final. */
export function tarjeta(origen: string, id: string, obra: Obra | null): string {
  const ficha = `/#/obra/${id}`;
  const titulo = obra?.titulo?.trim() || "Una obra en UMBRAL";
  const descripcion = obra?.descripcion?.trim()
    ? recortar(obra.descripcion)
    : obra?.nombre
      ? `Obra de ${obra.nombre} en UMBRAL`
      : "El museo donde el arte no termina en la obra.";
  const imagen = obra?.foto_ruta ? `${SUPABASE_URL}/storage/v1/object/public/obras/${obra.foto_ruta}` : `${origen}/og.png`;
  const [t, d, i, u, f] = [titulo, descripcion, imagen, `${origen}/o/${id}`, ficha].map(escapar);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t} — UMBRAL</title>
<meta name="description" content="${d}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="UMBRAL">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${i}">
<meta property="og:url" content="${u}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">
<link rel="canonical" href="${u}">
<meta http-equiv="refresh" content="0;url=${f}">
</head>
<body>
<p><a href="${f}">Ver «${t}» en UMBRAL</a></p>
</body>
</html>`;
}

const ID = /^[0-9a-f]{64}$/;

/** Arma la respuesta. `leer` se puede cambiar en las pruebas. */
export async function responder(url: string, leer: typeof fetch = fetch): Promise<Response> {
  const pedido = new URL(url);
  const id = pedido.searchParams.get("id") ?? "";
  const html = { "Content-Type": "text/html; charset=utf-8" };
  if (!ID.test(id)) {
    return new Response(tarjeta(pedido.origin, "", null).replace(/\/#\/obra\//g, "/#/cielo"), { status: 404, headers: html });
  }
  let obra: Obra | null = null;
  try {
    const r = await leer(
      `${SUPABASE_URL}/rest/v1/huellas_publicas?select=id,titulo,nombre,descripcion,foto_ruta&id=eq.${id}&padre=is.null`,
      { headers: { apikey: CLAVE_PUBLICA, Authorization: `Bearer ${CLAVE_PUBLICA}` } },
    );
    if (r.ok) obra = ((await r.json()) as Obra[])[0] ?? null;
  } catch {
    // Sin base, igual se devuelve una tarjeta general que lleva a la ficha.
  }
  return new Response(tarjeta(pedido.origin, id, obra), {
    status: 200,
    headers: { ...html, "Cache-Control": obra ? "public, s-maxage=300, stale-while-revalidate=600" : "public, s-maxage=60" },
  });
}

export function GET(request: Request): Promise<Response> {
  return responder(request.url);
}
