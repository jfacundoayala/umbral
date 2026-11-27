// Prueba de punta a punta contra la red de pruebas de Stellar (testnet), con un navegador sin ventana.
// Recorre: exponer una obra (con foto), continuarla, apoyarla, marcarla como favorita y cobrar.
//
// OJO: gasta XLM de testnet (los carga friendbot), crea obras y huellas REALES en la base y no las borra.
// La limpieza es manual (ver docs/pruebas-e2e.md). No corre con `npm test`.
//
// Requisitos: el servidor de desarrollo corriendo (`npm run dev`), porque el firmante de prueba
// (`?prueba`) solo existe en desarrollo, y un navegador Chromium (Edge o Chrome).
//
// Uso: npm run e2e -- [carpeta-capturas] [archivo-registro.json]
// Variables: UMBRAL_URL (por defecto http://localhost:5173/?prueba#/), UMBRAL_NAVEGADOR (ruta a Edge o Chrome),
//            UMBRAL_PUERTO_CDP (por defecto 9333).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [carpeta = "e2e-capturas", registro = "e2e-registro.json"] = process.argv.slice(2);
mkdirSync(carpeta, { recursive: true });
const CANDIDATOS = [
  process.env.UMBRAL_NAVEGADOR,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const EDGE = CANDIDATOS.find((r) => existsSync(r));
if (!EDGE) throw new Error("No encontré Edge ni Chrome: indicá la ruta en UMBRAL_NAVEGADOR.");
const PERFIL = join(tmpdir(), "umbral-e2e-perfil");
rmSync(PERFIL, { recursive: true, force: true });
const PUERTO = Number(process.env.UMBRAL_PUERTO_CDP ?? 9333);
const URL0 = process.env.UMBRAL_URL ?? "http://localhost:5173/?prueba#/";
if (!new URL(URL0).search.includes("prueba")) throw new Error("UMBRAL_URL tiene que llevar ?prueba (firmante de prueba).");
const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${PERFIL}`, "--window-size=1440,900", "--no-first-run", "--disable-extensions", URL0], { stdio: "ignore" });

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const anotar = (paso, datos) => { const l = { paso, ...datos, hora: new Date().toISOString() }; log.push(l); console.log(JSON.stringify(l)); };

let ws, id = 0;
const pendientes = new Map();
function cdp(method, params = {}) {
  return new Promise((res, rej) => {
    const n = ++id;
    pendientes.set(n, { res, rej });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function js(expr) {
  const r = await cdp("Runtime.evaluate", { expression: `(async()=>{${AYUDAS}; ${expr}})()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function captura(nombre) {
  await dormir(600);
  const r = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(carpeta, `app-${nombre}.png`), Buffer.from(r.data, "base64"));
  anotar("captura", { archivo: `app-${nombre}.png` });
}
/** Espera hasta que la expresión devuelva algo verdadero. */
async function esperar(expr, ms = 120000, que = expr) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const v = await js(expr).catch(() => null);
    if (v) return v;
    await dormir(700);
  }
  throw new Error(`Se agotó la espera: ${que}`);
}

const AYUDAS = `
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const boton = (t, r = document) => $$('button', r).find(b => b.textContent.trim().startsWith(t));
const campo = (t, r = document) => $$('label.campo', r).find(l => l.querySelector('span').textContent.startsWith(t))?.querySelector('input,textarea');
const poner = (el, v) => { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
const estado = (r) => (r.querySelector('.estado')?.innerText ?? '');
const enlaces = (r) => $$('.estado a', r).map(a => a.href);
`;

async function entrarComo(nombre, crear) {
  await js(`const s = boton('Salir'); if (s) s.click();`);
  await dormir(300);
  const cuenta = await js(crear ? `return await umbralPrueba.crear(${JSON.stringify(nombre)})` : `return umbralPrueba.usar(${JSON.stringify(nombre)})`);
  await js(`boton('Entrar con billetera', document.querySelector('header')).click();`);
  await esperar(`return document.querySelector('.cuenta code')?.title === ${JSON.stringify(cuenta)}`, 10000, "entrar");
  anotar("cuenta", { nombre, cuenta });
  return cuenta;
}

try {
  // Conectarse a Edge
  let pagina;
  for (let i = 0; i < 40 && !pagina; i++) {
    await dormir(500);
    try { pagina = (await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* todavía no */ }
  }
  if (!pagina) throw new Error("Edge no abrió");
  ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pendientes.has(m.id)) { const p = pendientes.get(m.id); pendientes.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  await cdp("Runtime.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: URL0 });
  await esperar(`return !!window.umbralPrueba && !!document.querySelector('.portada')`, 30000, "carga");
  await dormir(3500); // animaciones de la portada
  await captura("01-portada");

  // 1. Cielo antes
  await js(`location.hash = '/cielo'`);
  await esperar(`return !document.body.innerText.includes('Mirando el cielo')`, 20000);
  await captura("02-cielo-antes");

  // 2. La artista abre una obra (paga en XLM)
  const artista = await entrarComo("artista", true);
  await js(`poner(document.querySelector('header select'), $$('header option').find(o => o.textContent === 'XLM').value)`);
  await js(`location.hash = '/abrir'`);
  await esperar(`return document.querySelector('.precio')?.innerText.includes('20 XLM')`, 30000, "precio abrir");
  await js(`
    poner(campo('Título'), 'Prueba de punta a punta');
    poner(campo('Descripción'), 'Obra de prueba para la demo. Una escultura en una vereda de Resistencia, entre árboles y colectivos.');
    poner(campo('Autor'), 'Artista de prueba');
    const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d');
    g.fillStyle = '#F2EFE6'; g.fillRect(0, 0, 800, 600); g.strokeStyle = '#2445C7'; g.lineWidth = 2;
    for (let k = 1; k <= 9; k++) { g.beginPath(); g.ellipse(400, 300, 30 * k * 0.82, 30 * k, -0.3, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#2445C7'; g.beginPath(); g.arc(400, 300, 10, 0, Math.PI * 2); g.fill();
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'foto.png', { type: 'image/png' }));
    const f = document.querySelector('input[type=file]'); f.files = dt.files; f.dispatchEvent(new Event('change', { bubbles: true }));
  `);
  await dormir(300);
  await js(`$$('input[name=derechos]')[0].click(); $$('form .check input[type=checkbox]').forEach(i => { if (!i.checked) i.click(); });`);
  await captura("03-abrir");
  await js(`boton('Firmar y pagar').click()`);
  const abrir = await esperar(`const f = document.querySelector('form'); const e = estado(f); if (e.includes('Listo') || f.querySelector('.estado .error')) return { e, enlaces: enlaces(f) };`, 180000, "abrir obra");
  anotar("abrir", abrir);
  if (!abrir.e.includes("Listo")) throw new Error("Falló abrir: " + abrir.e);
  await captura("04-obra-abierta");
  await js(`boton('Ver mi obra').click()`);
  const idObra = await esperar(`return location.hash.startsWith('#/obra/') && document.querySelector('.lectura') && location.hash.slice(7)`, 30000, "ficha");
  anotar("obra", { id: idObra });
  await captura("05-ficha");

  // 3. Alguien del público continúa (10 XLM)
  const publico = await entrarComo("publico", true);
  await esperar(`return document.querySelector('aside form .precio')?.innerText.includes('10 XLM')`, 30000, "precio continuar");
  await js(`const f = $$('aside form')[0];
    poner(f.querySelector('textarea'), 'Prueba: me hizo acordar a la plaza de mi barrio, cuando era chica.');
    poner(campo('Tu nombre', f), 'Visitante de prueba');
    f.querySelector('.check input').click();`);
  await captura("06-continuar");
  await js(`boton('Firmar y pagar', $$('aside form')[0]).click()`);
  const cont = await esperar(`const p = document.querySelector('.estado.publicada'); if (p) return { e: p.innerText, enlaces: [p.querySelector('a').href] }; const f = $$('aside form')[0]; if (f?.querySelector('.estado .error')) return { e: estado(f), enlaces: [] };`, 180000, "continuar");
  anotar("continuar", cont);
  if (!cont.e.includes("Listo")) throw new Error("Falló continuar: " + cont.e);
  await esperar(`return document.querySelectorAll('.punto').length >= 2`, 30000, "huella en la constelación");
  const idHuella = await js(`return document.querySelector('.punto.sel') ? location.hash : null`);
  await captura("07-huella-publicada");

  // 4. Apoyo de 5 XLM
  await js(`const f = $$('aside form')[1]; poner(f.querySelector('.monto input'), '5');`);
  await js(`boton('Firmar y apoyar').click()`);
  const apoyo = await esperar(`const f = $$('aside form')[1]; const e = estado(f); if (e.includes('Gracias') || f.querySelector('.estado .error')) return { e, enlaces: enlaces(f) };`, 180000, "apoyar");
  anotar("apoyar", apoyo);
  await captura("08-apoyo");

  // 5. Favorito (firma de mensaje, gratis)
  await js(`document.querySelector('.favorito button').click()`);
  const fav = await esperar(`const b = document.querySelector('.favorito button'); const e = document.querySelector('.favorito .error'); if (b?.textContent === '★' || e) return { boton: b?.textContent, error: e?.textContent ?? null };`, 30000, "favorito");
  anotar("favorito", fav);

  // 6. La artista cobra
  await entrarComo("artista", false);
  await js(`location.hash = '/cobrar'`);
  await esperar(`return document.querySelectorAll('.saldos-tarjetas li').length === 2`, 30000, "saldos");
  const saldos = await js(`return $$('.saldos-tarjetas li .cifra').map(x => x.textContent)`);
  anotar("saldos-antes", { saldos });
  await captura("09-cobrar");
  await js(`$$('.saldos-tarjetas li').find(l => l.innerText.includes('XLM')).querySelector('button').click()`);
  const cobro = await esperar(`const s = document.querySelector('.cobro-resultado') ?? document.querySelector('main'); const e = estado(s); if (e.includes('Listo') || s.querySelector('.estado .error')) return { e, enlaces: enlaces(s) };`, 180000, "cobrar");
  anotar("cobrar", cobro);
  await dormir(3000);
  anotar("saldos-despues", { saldos: await js(`return $$('.saldos-tarjetas li .cifra').map(x => x.textContent)`) });
  await captura("10-cobrado");

  // 7. Cielo después
  await js(`location.hash = '/cielo'`);
  await esperar(`return document.querySelectorAll('.obras li').length > 0`, 20000, "cielo con obras");
  await dormir(1500);
  await captura("11-cielo-despues");
  anotar("fin", { artista, publico, idObra, idHuella });
} catch (e) {
  anotar("error", { mensaje: String(e?.message ?? e) });
  try { await captura("zz-error"); } catch { /* nada */ }
  process.exitCode = 1;
} finally {
  writeFileSync(registro, JSON.stringify(log, null, 2));
  ws?.close();
  edge.kill();
  await dormir(500);
  rmSync(PERFIL, { recursive: true, force: true });
}
