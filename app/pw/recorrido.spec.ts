// Recorridos de una persona que entra a UMBRAL. Solo leen: no firman, no pagan y no escriben en la base.
import { expect, test, type Page } from "@playwright/test";

const ENTRE_RAICES = "84dae87eddfb37fb8ec42cd8b82e01ac816e0806f5f44925e2032bb9459e70e5";
const CON_SELLO = "1b6a7197a9cd3f4d5f0d27d39cdfe37d042f3344650dd562b54939cac02a5bc6";

/** Junta los errores de la consola y de la página; al final de cada prueba tienen que ser cero. */
function vigilar(page: Page) {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(`console: ${m.text()}`);
  });
  return errores;
}

/** Nada se sale de la pantalla a lo ancho. */
async function sinDesborde(page: Page) {
  const { ancho, ventana } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, ventana: innerWidth }));
  expect(ancho, "la página se sale a lo ancho").toBeLessThanOrEqual(ventana);
}

test("la portada dice qué es UMBRAL y ofrece por dónde seguir", async ({ page }) => {
  const errores = vigilar(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("museo online");
  await expect(page.getByText("¿A qué venís?")).toBeVisible();
  await expect(page.getByRole("button", { name: /Vengo a mirar/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Quiero exponer mi obra/ })).toBeVisible();
  await sinDesborde(page);
  // Bajar hasta el final: todo lo que aparece al bajar tiene que cargar sin errores.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await expect(page.getByText("Cada obra es una estrella.")).toBeVisible();
  await sinDesborde(page);
  expect(errores).toEqual([]);
});

test("Vengo a mirar lleva a El cielo, con la colección completa y sin repetidas", async ({ page }) => {
  const errores = vigilar(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Vengo a mirar/ }).click();
  await expect(page).toHaveURL(/#\/cielo/);
  const tarjetas = page.locator("a.tarjeta");
  await expect(tarjetas.first()).toBeVisible();
  await expect.poll(() => tarjetas.count()).toBeGreaterThanOrEqual(18);
  const destinos = await tarjetas.evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(new Set(destinos).size, "hay obras repetidas").toBe(destinos.length);
  // Cada tarjeta se puede leer con lector de pantalla: el enlace tiene texto (la imagen es decorativa, alt vacío).
  const sinTexto = await tarjetas.evaluateAll((as) => as.filter((a) => !a.textContent?.trim()).length);
  expect(sinTexto).toBe(0);
  expect(await page.locator("a.tarjeta img:not([alt])").count(), "imágenes sin atributo alt").toBe(0);
  await sinDesborde(page);
  expect(errores).toEqual([]);
});

test("la ficha muestra la obra, su constelación y la foto que se da vuelta", async ({ page }, info) => {
  const errores = vigilar(page);
  await page.goto(`/#/obra/${ENTRE_RAICES}`);
  await expect(page.getByRole("heading", { name: "Entre raíces" }).first()).toBeVisible();
  // La constelación: la obra y sus huellas, cada una con nombre accesible.
  const mapa = page.locator("svg.mapa-3d");
  await expect(mapa).toBeVisible();
  await expect.poll(() => mapa.locator("[role=button][aria-label^='Huella de']").count()).toBeGreaterThanOrEqual(5);
  // La foto carga de verdad.
  const foto = page.locator("img.foto");
  await expect(foto).toBeVisible();
  await expect.poll(() => foto.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  // En compu, arrastrar la foto la da vuelta y muestra el dorso con la etiqueta del museo.
  if (info.project.name === "escritorio") {
    await foto.scrollIntoViewIfNeeded();
    const caja = (await page.locator(".movible-vuelta").boundingBox())!;
    await page.mouse.move(caja.x + caja.width * 0.3, caja.y + caja.height / 2);
    await page.mouse.down();
    // Despacio, para que no tome impulso: media vuelta (300 px × 0,6° por píxel = 180°).
    await page.mouse.move(caja.x + caja.width * 0.3 + 300, caja.y + caja.height / 2, { steps: 60 });
    await page.mouse.up();
    // Al soltarla se acomoda en la cara más cercana: el dorso (180°, más o menos vueltas enteras).
    const angulo = () =>
      page.locator(".movible-vuelta").evaluate((e) => {
        const m = /rotateY\((-?[\d.]+)deg\)/.exec((e as HTMLElement).style.transform);
        return m ? Math.round(((Number(m[1]) % 360) + 360) % 360) : -1;
      });
    await expect.poll(angulo).toBe(180);
    await expect(page.locator(".cara-dorso")).toContainText("Entre raíces");
  }
  // Tocar una huella abre su texto para continuarla.
  await mapa.locator("[role=button][aria-label^='Huella de']").first().click({ force: true });
  await expect(page.getByText(/Continuar esta huella/i)).toBeVisible();
  await sinDesborde(page);
  expect(errores).toEqual([]);
});

test("Cuentas claras lee el 80/20 del contrato", async ({ page }) => {
  const errores = vigilar(page);
  await page.goto("/#/cuentas");
  await expect(page.getByText("para quien hizo la obra")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("80%", { exact: true })).toBeVisible();
  await expect(page.getByText("20%", { exact: true })).toBeVisible();
  await expect(page.getByText(/UMBRAL se queda con el 30%/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver el contrato/ })).toHaveAttribute("href", /stellar\.expert/);
  await sinDesborde(page);
  expect(errores).toEqual([]);
});

test("la obra de un encuentro en persona lleva el sello Estuve ahí", async ({ page }) => {
  const errores = vigilar(page);
  await page.goto(`/#/obra/${CON_SELLO}`);
  await expect(page.getByRole("heading", { name: "Estuve en la puerta" }).first()).toBeVisible();
  await expect(page.getByText("Estuve ahí").first()).toBeVisible();
  await expect(page.getByText(/invitada por la sala/)).toBeVisible();
  expect(errores).toEqual([]);
});

test("las páginas legales cargan y una ruta inventada vuelve a la portada", async ({ page }) => {
  const errores = vigilar(page);
  for (const ruta of ["terminos", "privacidad"]) {
    await page.goto(`/#/${ruta}`);
    await expect(page.getByRole("heading").first()).toBeVisible();
  }
  await page.goto("/#/no-existe");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("museo online");
  expect(errores).toEqual([]);
});

test("se puede recorrer con teclado: todos los botones y enlaces tienen nombre", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Cada obra es una estrella.").scrollIntoViewIfNeeded();
  const sinNombre = await page.evaluate(() =>
    [...document.querySelectorAll("a[href], button")]
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .filter((e) => !(e.getAttribute("aria-label") || e.textContent?.trim() || e.getAttribute("title")))
      .map((e) => e.outerHTML.slice(0, 80)),
  );
  expect(sinNombre).toEqual([]);
  // El primer Tab llega a algo visible y enfocable.
  await page.keyboard.press("Tab");
  const enfocado = await page.evaluate(() => document.activeElement?.tagName);
  expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(enfocado);
});
