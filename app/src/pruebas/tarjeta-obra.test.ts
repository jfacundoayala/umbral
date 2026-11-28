import { describe, expect, it } from "vitest";
import { recortar, responder } from "../../api/obra.ts";

const ID = "f23f895aa98d356b2870ec370e2b17d47ef7558592d2d7bc7a1ba13d9958b420";
const ORIGEN = "https://umbralmuseo.vercel.app";

/** Un fetch falso que devuelve estas filas y guarda lo que se pidió. */
function base(filas: unknown[], ok = true) {
  const pedidos: { url: string; init?: RequestInit }[] = [];
  const leer = (async (url: string, init?: RequestInit) => {
    pedidos.push({ url, init });
    return new Response(JSON.stringify(filas), { status: ok ? 200 : 500 });
  }) as typeof fetch;
  return { leer, pedidos };
}

describe("tarjeta para compartir una obra", () => {
  it("pone el título, la descripción y la foto de la obra, y lleva a la ficha", async () => {
    const { leer, pedidos } = base([{ id: ID, titulo: "Entre raíces", nombre: "Julián Romero", descripcion: "Dos formas talladas.", foto_ruta: `${ID}/foto.webp` }]);
    const r = await responder(`${ORIGEN}/api/obra?id=${ID}`, leer);
    const html = await r.text();
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(html).toContain('<meta property="og:title" content="Entre raíces">');
    expect(html).toContain('<meta property="og:description" content="Dos formas talladas.">');
    expect(html).toContain(`/storage/v1/object/public/obras/${ID}/foto.webp`);
    expect(html).toContain(`<meta property="og:url" content="${ORIGEN}/o/${ID}">`);
    expect(html).toContain(`content="0;url=/#/obra/${ID}"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    // Solo lo publicado, con la clave pública, y solo obras (no huellas).
    expect(pedidos[0].url).toContain(`huellas_publicas?select=id,titulo,nombre,descripcion,foto_ruta&id=eq.${ID}&padre=is.null`);
    expect(String((pedidos[0].init?.headers as Record<string, string>).apikey)).toMatch(/^sb_publishable_/);
  });

  it("escapa el texto de la obra", async () => {
    const { leer } = base([{ id: ID, titulo: '"><script>alert(1)</script>', nombre: null, descripcion: "a & b", foto_ruta: null }]);
    const html = await (await responder(`${ORIGEN}/api/obra?id=${ID}`, leer)).text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
    expect(html).toContain("a &amp; b");
    expect(html).toContain(`content="${ORIGEN}/og.png"`);
  });

  it("sin descripción, usa el nombre del artista", async () => {
    const { leer } = base([{ id: ID, titulo: "Frida", nombre: "Carla Méndez", descripcion: null, foto_ruta: null }]);
    const html = await (await responder(`${ORIGEN}/api/obra?id=${ID}`, leer)).text();
    expect(html).toContain('og:description" content="Obra de Carla Méndez en UMBRAL"');
  });

  it("rechaza un id que no es de 64 hex sin consultar la base", async () => {
    const { leer, pedidos } = base([]);
    const r = await responder(`${ORIGEN}/api/obra?id=1%27%20or%201=1`, leer);
    expect(r.status).toBe(404);
    expect(pedidos).toHaveLength(0);
  });

  it("si la base falla o no la encuentra, devuelve una tarjeta general que lleva a la ficha", async () => {
    const { leer } = base([], false);
    const r = await responder(`${ORIGEN}/api/obra?id=${ID}`, leer);
    const html = await r.text();
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toContain("s-maxage=60");
    expect(html).toContain(`url=/#/obra/${ID}`);
    expect(html).toContain(`${ORIGEN}/og.png`);
  });

  it("recorta la descripción a 160 caracteres en una palabra entera", () => {
    const largo = "palabra ".repeat(40);
    const r = recortar(largo);
    expect(r.length).toBeLessThanOrEqual(160);
    expect(r.endsWith("palabra…")).toBe(true);
  });
});
