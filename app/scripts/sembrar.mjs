// Siembra: vuelve a crear la colección de El cielo en un contrato nuevo de la red de pruebas.
//
// Las obras y huellas de hoy las dejaron cuentas de prueba cuyas llaves no se guardaron, así que
// no se pueden "mudar": se rehacen con cuentas nuevas, por el mismo camino que usa la app
// (borrador en la base → firma y pago en el contrato → función `publicar`).
// El documento, el código de contenido y el id salen del código de la app (src/umbral.ts y src/base.ts),
// cargado desde Node con Vite: no hay una segunda versión de esas cuentas.
//
// Uso (desde app/):
//   node scripts/sembrar.mjs --ensayo          lee, arma el árbol y revisa todo; no crea ni envía nada
//   UMBRAL_CONTRATO=C... node scripts/sembrar.mjs   siembra de verdad en ese contrato
// Opciones: --solo=N (solo las primeras N obras), --con-sala (incluye las obras abiertas por una sala;
//   por defecto quedan para el final, a mano, porque necesitan el circuito de sala).
//
// Guarda en privado/siembra/ (carpeta ignorada por git; NUNCA se imprime ni se sube):
//   llaves.json            cuenta vieja → llave secreta de la cuenta nueva
//   mapa-<contrato>.json   id viejo → id nuevo, comprobante y estado
// Es idempotente: si se corta, se vuelve a correr y sigue donde quedó.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";

const ENSAYO = process.argv.includes("--ensayo");
const CON_SALA = process.argv.includes("--con-sala");
const SOLO = Number(process.argv.find((a) => a.startsWith("--solo="))?.split("=")[1] ?? 0);
const CONTRATO = process.env.UMBRAL_CONTRATO ?? "";
if (!ENSAYO && !/^C[A-Z2-7]{55}$/.test(CONTRATO)) {
  console.error("Falta UMBRAL_CONTRATO (el id del contrato nuevo). Para probar sin enviar nada: --ensayo");
  process.exit(1);
}
// La app lee el contrato de VITE_CONTRATO_ID: se le pasa el nuevo antes de cargar su código.
if (CONTRATO) process.env.VITE_CONTRATO_ID = CONTRATO;

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = join(AQUI, "..");
const PRIVADO = join(APP, "..", "privado", "siembra");
const ARCHIVO_LLAVES = join(PRIVADO, "llaves.json");

const vite = await createServer({ root: APP, logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", optimizeDeps: { noDiscovery: true } });
const cargar = (ruta) => vite.ssrLoadModule(ruta);
const { RED, CONTRATO_ID, XLM_ID, UNIDAD, SUPABASE_URL, SUPABASE_CLAVE_PUBLICA } = await cargar("/src/config.ts");
const base = await cargar("/src/base.ts");
const umbral = await cargar("/src/umbral.ts");
const { EXTENSION, EXTENSION_AUDIO } = await cargar("/src/archivos.ts");

const ARCHIVO_MAPA = join(PRIVADO, `mapa-${CONTRATO_ID}.json`);
const leerJson = (ruta) => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, "utf8")) : {});
const guardarJson = (ruta, datos) => {
  mkdirSync(PRIVADO, { recursive: true });
  writeFileSync(ruta, JSON.stringify(datos, null, 2));
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const corta = (s) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const xlm = (n) => `${Number(n) / Number(UNIDAD)} XLM`;

/** Reintenta lo que puede fallar por la red. Los rechazos claros (del contrato o de la base) no se reintentan. */
async function reintentar(que, hacer, veces = 4) {
  let ultimo;
  for (let i = 0; i < veces; i++) {
    try {
      return await hacer();
    } catch (e) {
      ultimo = e;
      if (e instanceof umbral.PagoSinConfirmar) throw e;
      if (!/red de pruebas|fetch|network|timeout|ECONN|502|503|504|No pudimos hablar|No se pudo consultar/i.test(String(e?.message ?? e))) throw e;
      console.log(`    … ${que}: falló (${String(e?.message ?? e).slice(0, 80)}), reintento ${i + 1}/${veces - 1}`);
      await dormir(3000 * (i + 1));
    }
  }
  throw ultimo;
}

// ---------------------------------------------------------------- 1. Leer lo que hoy se ve en El cielo

/** Tipo de archivo por su extensión (lo que la app guardó al subirlo). */
const tipoPorRuta = (ruta) => {
  const ext = ruta.split(".").pop();
  const de = (tabla) => Object.entries(tabla).find(([, e]) => e === ext)?.[0];
  return de(EXTENSION) ?? de(EXTENSION_AUDIO) ?? "application/octet-stream";
};
async function bajar(url, ruta) {
  const r = await reintentar(`bajar ${ruta}`, async () => {
    const x = await fetch(url);
    if (!x.ok) throw new Error(`No se pudo bajar ${ruta} (${x.status})`);
    return x;
  });
  return new File([await r.arrayBuffer()], ruta.split("/").pop(), { type: tipoPorRuta(ruta) });
}

console.log(`Red: ${RED.nombre}. Contrato: ${CONTRATO_ID}${ENSAYO ? "  (ENSAYO: no se crea ni se envía nada)" : ""}`);
const todas = (await base.obras("nuevas")).sort((a, b) => a.recibido.localeCompare(b.recibido));
const aparte = todas.filter((o) => o.sala && !CON_SALA);
let obras = todas.filter((o) => !o.sala || CON_SALA);
if (SOLO) obras = obras.slice(0, SOLO);

/** Cada obra con sus huellas en orden: padres antes que hijos. */
const arboles = [];
for (const obra of obras) {
  const { huellas } = await reintentar("leer constelación", () => base.constelacion(obra.id));
  // La sal de cada huella (parte del documento firmado) está en la vista pública, pero la app no la pide: se lee aparte.
  const sales = await reintentar("leer sal", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/huellas_publicas?select=id,sal,enlace&or=(id.eq.${obra.id},raiz.eq.${obra.id})`, { headers: { apikey: SUPABASE_CLAVE_PUBLICA, Authorization: `Bearer ${SUPABASE_CLAVE_PUBLICA}` } });
    if (!r.ok) throw new Error(`fetch sal ${r.status}`);
    return new Map((await r.json()).map((f) => [f.id, f]));
  });
  for (const h of [obra, ...huellas]) {
    h.sal = sales.get(h.id)?.sal;
    h.enlace = sales.get(h.id)?.enlace ?? null;
    if (!h.sal) throw new Error(`La huella ${h.id.slice(0, 8)} no tiene sal en la base.`);
  }
  const vivas = new Set([obra.id]);
  const lista = [];
  const saltadas = [];
  for (const h of [...huellas].sort((a, b) => a.recibido.localeCompare(b.recibido))) {
    // Una huella retirada no se rehace, ni lo que colgaba de ella.
    if (h.estado !== "publicada" || !h.padre || !vivas.has(h.padre)) saltadas.push(h);
    else {
      vivas.add(h.id);
      lista.push(h);
    }
  }
  arboles.push({ obra, huellas: lista, saltadas });
}

const total = arboles.reduce((s, a) => s + 1 + a.huellas.length, 0);
const autores = new Set(arboles.flatMap((a) => [a.obra.autor, ...a.huellas.map((h) => h.autor)]));
console.log(`\n${arboles.length} obras y ${total - arboles.length} huellas (${total} en total) de ${autores.size} cuentas.`);

// ---------------------------------------------------------------- 2. Armar cada documento y revisarlo contra el original

const DERECHOS = ["autoria", "dominio_publico", "autorizacion"];
const archivos = new Map(); // id viejo → { foto, audio, codigoFoto, codigoAudio }
const documentos = new Map(); // id viejo → Documento
const avisos = [];

for (const { obra, huellas } of arboles) {
  const foto = obra.foto_ruta ? await bajar(base.urlFoto(obra.foto_ruta), obra.foto_ruta) : null;
  const audio = obra.audio_ruta ? await bajar(base.urlAudio(obra.audio_ruta), obra.audio_ruta) : null;
  const a = { foto, audio, codigoFoto: foto ? await umbral.codigoDeArchivo(foto) : undefined, codigoAudio: audio ? await umbral.codigoDeArchivo(audio) : undefined };
  archivos.set(obra.id, a);
  // Mismo contenido que el original: mismos textos, misma fecha, misma sal y los mismos archivos.
  const comun = { texto: obra.texto ?? "", nombre: obra.nombre ?? "", titulo: obra.titulo ?? "", descripcion: obra.descripcion ?? "", creado: obra.creado, sal: obra.sal };
  const conArchivos = { ...comun, ...(a.codigoFoto ? { foto: a.codigoFoto } : {}), ...(a.codigoAudio ? { audio: a.codigoAudio } : {}) };
  // La vista pública no trae los derechos declarados: se deducen probando cuál da el código original.
  let derechos = null;
  for (const d of DERECHOS) {
    if ((await umbral.codigoDe({ ...conArchivos, derechos: d })).toString("hex") === obra.digest) derechos = d;
  }
  if (obra.enlace) avisos.push(`"${obra.titulo}": tenía un enlace; no se siembra (la app ya no guarda enlaces).`);
  if (!derechos) {
    derechos = "autoria";
    avisos.push(`"${obra.titulo}": el código original no se pudo reproducir (documento de una versión anterior); se siembra con derechos "autoria".`);
  }
  documentos.set(obra.id, { ...conArchivos, derechos });

  for (const h of huellas) {
    const doc = { texto: h.texto ?? "", nombre: h.nombre ?? "", creado: h.creado, sal: h.sal };
    if ((await umbral.codigoDe(doc)).toString("hex") !== h.digest) avisos.push(`Huella ${h.id.slice(0, 8)} de "${obra.titulo}": el código original no se pudo reproducir; se siembra igual con su texto.`);
    documentos.set(h.id, doc);
  }
}

// ---------------------------------------------------------------- 3. Mostrar el plan

const precios = await reintentar("leer precios", () => umbral.preciosVigentes(XLM_ID));
const gasto = new Map();
for (const { obra, huellas } of arboles) {
  gasto.set(obra.autor, (gasto.get(obra.autor) ?? 0n) + precios.huella);
  for (const h of huellas) gasto.set(h.autor, (gasto.get(h.autor) ?? 0n) + precios.continuar);
}

console.log(`Precios en el contrato: exponer ${xlm(precios.huella)}, continuar ${xlm(precios.continuar)}.\n`);
for (const { obra, huellas, saltadas } of arboles) {
  const d = documentos.get(obra.id);
  console.log(`● ${obra.titulo} — ${obra.nombre} [${obra.id.slice(0, 8)}] cuenta ${corta(obra.autor)} · ${d.derechos}${obra.foto_ruta ? " · foto" : ""}${obra.audio_ruta ? " · audio" : ""}${obra.sala ? " · SALA" : ""}`);
  const hijos = (padre, nivel) => {
    for (const h of huellas.filter((x) => x.padre === padre)) {
      console.log(`${"   ".repeat(nivel)}└ ${h.nombre} [${h.id.slice(0, 8)}] cuenta ${corta(h.autor)}: ${(h.texto ?? "").slice(0, 60).replace(/\s+/g, " ")}${(h.texto ?? "").length > 60 ? "…" : ""}`);
      hijos(h.id, nivel + 1);
    }
  };
  hijos(obra.id, 1);
  if (saltadas.length) console.log(`   (no se rehacen ${saltadas.length}: retiradas o colgadas de una retirada)`);
}
if (aparte.length) console.log(`\nQuedan aparte, para el circuito de sala: ${aparte.map((o) => `"${o.titulo}" [${o.id.slice(0, 8)}]`).join(", ")}`);
const maximo = [...gasto.values()].reduce((m, v) => (v > m ? v : m), 0n);
console.log(`\nGasto total en la red de pruebas: ${xlm([...gasto.values()].reduce((s, v) => s + v, 0n))}. La cuenta que más paga: ${xlm(maximo)} (friendbot da 10.000 XLM por cuenta).`);
if (avisos.length) console.log(`\nAvisos (${avisos.length}):\n${avisos.map((a) => `  - ${a}`).join("\n")}`);

if (ENSAYO) {
  console.log("\nEnsayo terminado: no se creó ninguna cuenta ni se envió nada.");
  await vite.close();
  process.exit(0);
}

// ---------------------------------------------------------------- 4. Cuentas nuevas (una por cada cuenta original)

const llaves = leerJson(ARCHIVO_LLAVES);
const mapa = leerJson(ARCHIVO_MAPA);
const cuentaDe = (vieja) => Keypair.fromSecret(llaves[vieja]);
let nuevas = 0;
for (const vieja of autores) {
  if (llaves[vieja]) continue;
  llaves[vieja] = Keypair.random().secret();
  nuevas++;
}
if (nuevas) guardarJson(ARCHIVO_LLAVES, llaves);
console.log(`\nCuentas: ${autores.size} (${nuevas} nuevas). Las llaves quedan en privado/siembra/llaves.json y no se muestran.`);

const fondeadas = new Set();
async function fondear(vieja) {
  if (fondeadas.has(vieja)) return;
  const publica = cuentaDe(vieja).publicKey();
  await reintentar("friendbot", async () => {
    const existe = await fetch(`${RED.horizonUrl}/accounts/${publica}`);
    if (existe.ok) return;
    const r = await fetch(`${RED.friendbot}?addr=${publica}`);
    if (!r.ok && !/already|exist/i.test(await r.text())) throw new Error(`fetch friendbot ${r.status}`);
  });
  fondeadas.add(vieja);
}
const firmante = (vieja) => async (xdr) => {
  const tx = TransactionBuilder.fromXDR(xdr, RED.frase);
  tx.sign(cuentaDe(vieja));
  return { signedTxXdr: tx.toXDR() };
};

// ---------------------------------------------------------------- 5. Sembrar: borrador → archivos → firma y pago → publicar

const anotar = (viejo, datos) => {
  mapa[viejo] = { ...mapa[viejo], ...datos };
  guardarJson(ARCHIVO_MAPA, mapa);
};

/** Paga y publica una huella. Si ya estaba pagada (corrida anterior), solo publica. */
async function pagarYPublicar(viejo, id, pagar) {
  let hash = mapa[viejo]?.tx ?? "";
  if (!hash) {
    try {
      hash = (await reintentar("pagar", pagar)).hash;
    } catch (e) {
      if (e instanceof umbral.PagoSinConfirmar) {
        hash = e.hash; // salió pero la red no confirmó a tiempo: el servidor lo comprueba al publicar
        await dormir(8000);
      } else if (e?.message !== "Ya dejaste esta huella.") throw e;
    }
    if (hash) anotar(viejo, { tx: hash });
  }
  const publicado = await reintentar("publicar", () => base.publicar(id, hash));
  anotar(viejo, { tx: publicado ?? hash ?? null, publicada: true });
}

async function sembrar(viejo, etiqueta, hacer) {
  if (mapa[viejo]?.publicada) {
    console.log(`  = ${etiqueta}: ya estaba (${mapa[viejo].nuevo.slice(0, 8)})`);
    return;
  }
  await hacer();
  console.log(`  ✓ ${etiqueta}: ${mapa[viejo].nuevo.slice(0, 8)} · ${RED.explorador}/tx/${mapa[viejo].tx ?? ""}`);
}

let hechas = 0;
for (const { obra, huellas } of arboles) {
  console.log(`\n● ${obra.titulo} — ${obra.nombre}`);
  await sembrar(obra.id, "obra", async () => {
    await fondear(obra.autor);
    const cuenta = cuentaDe(obra.autor).publicKey();
    const doc = documentos.get(obra.id);
    const { foto, audio } = archivos.get(obra.id);
    const digest = await umbral.codigoDe(doc);
    const id = (await umbral.idDe(cuenta, digest)).toString("hex");
    anotar(obra.id, { nuevo: id, cuenta });
    const foto_ruta = foto ? `${id}/foto.${EXTENSION[foto.type]}` : null;
    const audio_ruta = audio ? `${id}/audio.${EXTENSION_AUDIO[audio.type]}` : null;
    await reintentar("borrador", () => base.guardarBorrador({ id, digest: digest.toString("hex"), autor: cuenta, artista: cuenta, moneda: XLM_ID, padre: null, sala: null, foto_ruta, audio_ruta }, doc));
    if (foto) await reintentar("subir foto", () => base.subirArchivo("obras", foto_ruta, foto));
    if (audio) await reintentar("subir audio", () => base.subirArchivo("audios", audio_ruta, audio));
    await pagarYPublicar(obra.id, id, () => umbral.dejarHuella(cuenta, firmante(obra.autor), doc, precios.huella, XLM_ID));
  });
  hechas++;

  const artista = mapa[obra.id].cuenta;
  for (const h of huellas) {
    await sembrar(h.id, `huella de ${h.nombre}`, async () => {
      await fondear(h.autor);
      const cuenta = cuentaDe(h.autor).publicKey();
      const doc = documentos.get(h.id);
      const padre = mapa[h.padre]?.nuevo;
      if (!padre || !mapa[h.padre].publicada) throw new Error(`El padre de ${h.id.slice(0, 8)} todavía no está publicado.`);
      const digest = await umbral.codigoDe(doc);
      const id = (await umbral.idDe(cuenta, digest)).toString("hex");
      anotar(h.id, { nuevo: id, cuenta });
      await reintentar("borrador", () => base.guardarBorrador({ id, digest: digest.toString("hex"), autor: cuenta, artista, moneda: XLM_ID, padre, sala: null }, doc));
      await pagarYPublicar(h.id, id, () => umbral.continuar(cuenta, firmante(h.autor), padre, doc, precios.continuar, XLM_ID));
    });
    hechas++;
  }
}

console.log(`\nListo: ${hechas} de ${total} sembradas en ${CONTRATO_ID}. El mapa id viejo → id nuevo quedó en privado/siembra/.`);
await vite.close();
