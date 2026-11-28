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
// Opciones:
//   --solo=N       solo las primeras N obras
//   --a-la-vez=N   cuántas obras reciben huellas al mismo tiempo (por defecto 5)
//   --con-sala     incluye las obras abiertas por una sala. Para cada sala vieja crea una cuenta de museo,
//                  abre una sala nueva (`abrir_sala(museo, semilla) -> id`), le pone fondo e invita a la
//                  cuenta del artista: la obra queda pagada por el fondo y marcada como presencial.
//   --con-fichas   suma las obras nuevas de privado/fotos-libres/fichas.json (material con licencia libre):
//                  cada ficha es una obra con su archivo ya bajado, el crédito al final de la descripción
//                  y sus huellas de ejemplo. La ficha cuyo archivo todavía no está bajado se saltea y se avisa.
//   --mezclar      cambia el orden de las obras para que no queden seguidas las del mismo tipo (sonido,
//                  foto, solo texto, museo, paisaje...). El cielo muestra primero lo último que se sembró,
//                  así que el orden de siembra es el orden en que se ven. Siempre da el mismo orden.
//
// Orden: primero las obras, una por una y en el orden original (así El cielo las ordena igual).
// Después las huellas: dentro de cada obra van en su orden (padres antes que hijos) y varias obras
// avanzan a la vez. Cada cuenta firma de a una acción por vez (una cola por cuenta), así no se pisan.
//
// Guarda en privado/siembra/ (carpeta ignorada por git; NUNCA se imprime ni se sube):
//   llaves.json            cuenta vieja → llave secreta de la cuenta nueva ("sala:<id>" → la del museo de esa sala)
//   mapa-<contrato>.json   id viejo → id nuevo, comprobante y estado
//   cambios.json           (opcional, lo escribe una persona) id viejo de una obra → { foto, descripcion, derechos }
//                          para sembrarla con otra foto (ruta desde la raíz del repo), otro texto u otros derechos
// Es idempotente: si se corta, se vuelve a correr y sigue donde quedó.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { randomBytes } from "node:crypto";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";

const ENSAYO = process.argv.includes("--ensayo");
const CON_SALA = process.argv.includes("--con-sala");
const CON_FICHAS = process.argv.includes("--con-fichas");
const MEZCLAR = process.argv.includes("--mezclar");
const opcion = (nombre, porDefecto) => Number(process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split("=")[1] ?? porDefecto);
const SOLO = opcion("solo", 0);
const A_LA_VEZ = Math.max(1, opcion("a-la-vez", 5));
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
const { Client } = await cargar("/src/contrato/cliente.ts");

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
// Lo que ya sembró una corrida anterior también está en la base: no es colección vieja, no se vuelve a sembrar.
const yaSembradas = new Set(Object.values(leerJson(ARCHIVO_MAPA)).map((v) => v.nuevo));
const todas = (await base.obras("nuevas")).filter((o) => !yaSembradas.has(o.id)).sort((a, b) => a.recibido.localeCompare(b.recibido));
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

// Obras nuevas con licencia libre (--con-fichas). No vienen de la base: se arman acá con la misma forma.
const avisos = [];
if (CON_FICHAS) {
  const RAIZ = join(APP, "..");
  const ARCHIVO_SALES = join(PRIVADO, "sales-fichas.json");
  // La sal de cada documento se guarda: si la corrida se corta, al seguir sale el mismo código y el mismo id.
  const sales = leerJson(ARCHIVO_SALES);
  const salDe = (clave) => (sales[clave] ??= randomBytes(16).toString("hex"));
  const { fichas = [] } = leerJson(join(RAIZ, "privado", "fotos-libres", "fichas.json"));
  for (const f of fichas) {
    const id = `ficha:${f.slug}`;
    const falta = [f.archivo, f.audio].filter((r) => r && !existsSync(join(RAIZ, r)));
    if (!f.archivo && !f.audio) falta.push("(la ficha no nombra foto ni audio)");
    if (falta.length) {
      avisos.push(`Ficha "${f.titulo}": no se siembra, falta ${falta.join(" y ")}.`);
      continue;
    }
    const obra = { id, autor: id, estado: "publicada", padre: null, sala: null, enlace: null, texto: "", titulo: f.titulo, nombre: f.nombre, descripcion: `${f.descripcion} ${f.credito}`, creado: f.creado, sal: salDe(id), ficha: f };
    const huellas = (f.huellas ?? []).map((h, i) => {
      const hid = `${id}:h${i + 1}`;
      return { id: hid, autor: hid, estado: "publicada", padre: id, texto: h.texto, nombre: h.nombre, creado: new Date(Date.parse(f.creado) + (i + 1) * 60000).toISOString(), sal: salDe(hid), ficha: f };
    });
    arboles.push({ obra, huellas, saltadas: [] });
  }
  if (!ENSAYO) guardarJson(ARCHIVO_SALES, sales);
}

if (MEZCLAR) {
  const tipoDe = ({ obra }) => obra.ficha?.tipo ?? (obra.sala ? "encuentro" : obra.audio_ruta ? "sonido" : obra.foto_ruta ? "foto" : "texto");
  const grupos = new Map();
  for (const a of arboles) grupos.set(tipoDe(a), [...(grupos.get(tipoDe(a)) ?? []), a]);
  // Cada grupo se reparte parejo a lo largo de toda la lista: el elemento k de un grupo de n va en la
  // posición (k + 0,5) / n. Así los grupos grandes quedan intercalados y los chicos, bien separados.
  const mezcladas = [...grupos.values()]
    .flatMap((g, i) => g.map((arbol, k) => ({ arbol, lugar: (k + 0.5) / g.length + i * 1e-6 })))
    .sort((x, y) => x.lugar - y.lugar)
    .map((x) => x.arbol);
  arboles.splice(0, arboles.length, ...mezcladas);
}

const total = arboles.reduce((s, a) => s + 1 + a.huellas.length, 0);
const autores = new Set(arboles.flatMap((a) => [a.obra.autor, ...a.huellas.map((h) => h.autor)]));
console.log(`\n${arboles.length} obras y ${total - arboles.length} huellas (${total} en total) de ${autores.size} cuentas.`);

// ---------------------------------------------------------------- 2. Armar cada documento y revisarlo contra el original

const DERECHOS = ["autoria", "dominio_publico", "autorizacion"];
const cambios = leerJson(join(PRIVADO, "cambios.json"));
const archivos = new Map(); // id viejo → { foto, audio, codigoFoto, codigoAudio }
const documentos = new Map(); // id viejo → Documento
const deDisco = (ruta) => new File([readFileSync(join(APP, "..", ruta))], ruta.split("/").pop(), { type: tipoPorRuta(ruta) });

for (const { obra, huellas } of arboles) {
  const cambio = cambios[obra.id];
  const ficha = obra.ficha;
  const rutaFoto = cambio?.foto ?? ficha?.archivo;
  const foto = rutaFoto ? deDisco(rutaFoto) : obra.foto_ruta ? await bajar(base.urlFoto(obra.foto_ruta), obra.foto_ruta) : null;
  if (foto && !(foto.type in EXTENSION)) throw new Error(`La foto de "${obra.titulo}" no es jpg, png ni webp.`);
  const audio = ficha?.audio ? deDisco(ficha.audio) : obra.audio_ruta ? await bajar(base.urlAudio(obra.audio_ruta), obra.audio_ruta) : null;
  if (audio && (!(audio.type in EXTENSION_AUDIO) || audio.size > 5 * 1024 * 1024)) throw new Error(`El audio de "${obra.titulo}" tiene que ser mp3, m4a, webm u ogg y pesar hasta 5 MB.`);
  const a = { foto, audio, codigoFoto: foto ? await umbral.codigoDeArchivo(foto) : undefined, codigoAudio: audio ? await umbral.codigoDeArchivo(audio) : undefined };
  archivos.set(obra.id, a);
  // Mismo contenido que el original: mismos textos, misma fecha, misma sal y los mismos archivos.
  const comun = { texto: obra.texto ?? "", nombre: obra.nombre ?? "", titulo: obra.titulo ?? "", descripcion: cambio?.descripcion ?? obra.descripcion ?? "", creado: obra.creado, sal: obra.sal };
  const conArchivos = { ...comun, ...(a.codigoFoto ? { foto: a.codigoFoto } : {}), ...(a.codigoAudio ? { audio: a.codigoAudio } : {}) };
  // La vista pública no trae los derechos declarados: se deducen probando cuál da el código original.
  let derechos = ficha ? (ficha.derechos ?? "autorizacion") : null;
  for (const d of ficha ? [] : DERECHOS) {
    if ((await umbral.codigoDe({ ...conArchivos, derechos: d })).toString("hex") === obra.digest) derechos = d;
  }
  if (obra.enlace) avisos.push(`"${obra.titulo}": tenía un enlace; no se siembra (la app ya no guarda enlaces).`);
  if (ficha) {
    if (!DERECHOS.includes(derechos)) throw new Error(`Ficha "${obra.titulo}": derechos "${derechos}" no existe.`);
  } else if (cambio) {
    derechos = cambio.derechos ?? derechos ?? "autoria";
    avisos.push(`"${obra.titulo}": se siembra con cambios pedidos (${Object.keys(cambio).join(", ")}).`);
  } else if (!derechos) {
    derechos = "autoria";
    avisos.push(`"${obra.titulo}": el código original no se pudo reproducir (documento de una versión anterior); se siembra con derechos "autoria".`);
  }
  documentos.set(obra.id, { ...conArchivos, derechos });

  for (const h of huellas) {
    const doc = { texto: h.texto ?? "", nombre: h.nombre ?? "", creado: h.creado, sal: h.sal };
    if (!h.ficha && (await umbral.codigoDe(doc)).toString("hex") !== h.digest) avisos.push(`Huella ${h.id.slice(0, 8)} de "${obra.titulo}": el código original no se pudo reproducir; se siembra igual con su texto.`);
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
  console.log(`● ${obra.titulo} — ${obra.nombre} [${obra.id.slice(0, 8)}] cuenta ${corta(obra.autor)} · ${d.derechos}${archivos.get(obra.id).foto ? " · foto" : ""}${archivos.get(obra.id).audio ? " · audio" : ""}${obra.sala ? " · SALA" : ""}${obra.ficha ? " · NUEVA (ficha)" : ""}`);
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

// Cada sala vieja tiene su cuenta de museo nueva.
for (const sala of new Set(arboles.map((a) => a.obra.sala).filter(Boolean))) {
  if (llaves[`sala:${sala}`]) continue;
  llaves[`sala:${sala}`] = Keypair.random().secret();
  guardarJson(ARCHIVO_LLAVES, llaves);
}

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

// ---------------------------------------------------------------- 5. Colas: una por cuenta, y un tope de obras a la vez

const colas = new Map();
/** Corre `hacer` cuando termina lo anterior de esa misma cola (una cuenta firma de a una acción). */
function enCola(clave, hacer) {
  const turno = (colas.get(clave) ?? Promise.resolve()).then(hacer, hacer);
  colas.set(clave, turno.catch(() => undefined));
  return turno;
}

/** Corre `hacer` sobre cada elemento, con `tope` a la vez como mucho. */
async function deATantos(lista, tope, hacer) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(tope, lista.length) }, async () => {
      while (i < lista.length) await hacer(lista[i++]);
    }),
  );
}

// ---------------------------------------------------------------- 6. Salas (solo con --con-sala)

const anotar = (viejo, datos) => {
  mapa[viejo] = { ...mapa[viejo], ...datos };
  guardarJson(ARCHIVO_MAPA, mapa);
};

/** Firma y manda una acción del contrato que la app no tiene envuelta (abrir sala, poner fondo). */
async function mandar(que, armar) {
  return reintentar(que, async () => {
    const enviado = await (await armar()).signAndSend();
    const estado = enviado.getTransactionResponse?.status;
    if (estado !== "SUCCESS") throw new Error(`${que}: la red de pruebas respondió ${estado ?? "sin estado"}`);
    return enviado.sendTransactionResponse?.hash;
  });
}

/** Deja lista la sala nueva que reemplaza a `vieja`, con fondo y con `invitada` invitada. Devuelve el id nuevo. */
async function prepararSala(vieja, invitada) {
  const clave = `sala:${vieja}`;
  return enCola(clave, async () => {
    await fondear(clave);
    const museo = cuentaDe(clave).publicKey();
    const c = new Client({ contractId: CONTRATO_ID, rpcUrl: RED.rpcUrl, networkPassphrase: RED.frase, publicKey: museo, signTransaction: firmante(clave) });
    if (typeof c.id_sala !== "function") throw new Error("El cliente del contrato no tiene id_sala: falta regenerarlo para el contrato nuevo.");
    if (!mapa[clave]?.semilla) anotar(clave, { semilla: randomBytes(32).toString("hex"), cuenta: museo });
    const semilla = Buffer.from(mapa[clave].semilla, "hex");
    // El id de la sala lo calcula el contrato con la cuenta del museo y la semilla.
    const nuevo = Buffer.from((await c.id_sala({ museo, semilla })).result).toString("hex");
    anotar(clave, { nuevo });
    if (!(await umbral.museoDe(nuevo))) {
      const tx = await mandar("abrir sala", () => c.abrir_sala({ museo, semilla }));
      anotar(clave, { tx });
      console.log(`  ✓ sala nueva ${nuevo.slice(0, 8)} (reemplaza a ${vieja.slice(0, 8)}) · ${RED.explorador}/tx/${tx}`);
    }
    const estado = await umbral.invitacion(nuevo, invitada, XLM_ID);
    if (estado.fondo < precios.huella) await mandar("poner fondo", () => c.patrocinar({ quien: museo, sala: Buffer.from(nuevo, "hex"), moneda: XLM_ID, monto: precios.huella - estado.fondo }));
    if (!estado.invitada) await reintentar("invitar", () => umbral.invitar(museo, firmante(clave), nuevo, invitada));
    return nuevo;
  });
}

// ---------------------------------------------------------------- 7. Sembrar: borrador → archivos → firma y pago → publicar

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

const fallas = [];
let hechas = 0;
const fallo = (etiqueta, e) => {
  fallas.push(`${etiqueta}: ${e?.message ?? e}`);
  console.log(`  ✗ ${etiqueta}: ${e?.message ?? e}`);
};

// Primero las obras, una por una y en su orden.
console.log("\nObras:");
for (const { obra } of arboles) {
  const etiqueta = `"${obra.titulo}" — ${obra.nombre}`;
  try {
    await sembrar(obra.id, etiqueta, () =>
      enCola(obra.autor, async () => {
        await fondear(obra.autor);
        const cuenta = cuentaDe(obra.autor).publicKey();
        const doc = documentos.get(obra.id);
        const { foto, audio } = archivos.get(obra.id);
        const digest = await umbral.codigoDe(doc);
        const id = (await umbral.idDe(cuenta, digest)).toString("hex");
        anotar(obra.id, { nuevo: id, cuenta });
        const sala = obra.sala ? await prepararSala(obra.sala, cuenta) : null;
        const foto_ruta = foto ? `${id}/foto.${EXTENSION[foto.type]}` : null;
        const audio_ruta = audio ? `${id}/audio.${EXTENSION_AUDIO[audio.type]}` : null;
        await reintentar("borrador", () => base.guardarBorrador({ id, digest: digest.toString("hex"), autor: cuenta, artista: cuenta, moneda: XLM_ID, padre: null, sala, foto_ruta, audio_ruta }, doc));
        if (foto) await reintentar("subir foto", () => base.subirArchivo("obras", foto_ruta, foto));
        if (audio) await reintentar("subir audio", () => base.subirArchivo("audios", audio_ruta, audio));
        await pagarYPublicar(obra.id, id, () => umbral.dejarHuella(cuenta, firmante(obra.autor), doc, precios.huella, XLM_ID, sala ?? undefined));
      }),
    );
    hechas++;
  } catch (e) {
    fallo(etiqueta, e);
  }
}

// Después las huellas: cada obra en su orden, varias obras a la vez.
console.log(`\nHuellas (${A_LA_VEZ} obras a la vez):`);
await deATantos(arboles, A_LA_VEZ, async ({ obra, huellas }) => {
  if (!mapa[obra.id]?.publicada) return;
  const artista = mapa[obra.id].cuenta;
  for (const h of huellas) {
    const etiqueta = `"${obra.titulo}" ← ${h.nombre}`;
    try {
      await sembrar(h.id, etiqueta, () =>
        enCola(h.autor, async () => {
          await fondear(h.autor);
          const cuenta = cuentaDe(h.autor).publicKey();
          const doc = documentos.get(h.id);
          const padre = mapa[h.padre]?.nuevo;
          if (!padre || !mapa[h.padre].publicada) throw new Error("su huella anterior todavía no está publicada");
          const digest = await umbral.codigoDe(doc);
          const id = (await umbral.idDe(cuenta, digest)).toString("hex");
          anotar(h.id, { nuevo: id, cuenta });
          // En el contrato, una continuación hereda la sala de su obra: el borrador tiene que decir lo mismo.
          const sala = obra.sala ? mapa[`sala:${obra.sala}`].nuevo : null;
          await reintentar("borrador", () => base.guardarBorrador({ id, digest: digest.toString("hex"), autor: cuenta, artista, moneda: XLM_ID, padre, sala }, doc));
          await pagarYPublicar(h.id, id, () => umbral.continuar(cuenta, firmante(h.autor), padre, doc, precios.continuar, XLM_ID));
        }),
      );
      hechas++;
    } catch (e) {
      fallo(etiqueta, e);
    }
  }
});

console.log(`\n${fallas.length ? "Incompleto" : "Listo"}: ${hechas} de ${total} sembradas en ${CONTRATO_ID}. El mapa id viejo → id nuevo quedó en privado/siembra/.`);
if (fallas.length) console.log(`Fallaron ${fallas.length} (volvé a correr el mismo comando: sigue donde quedó):\n${fallas.map((f) => `  - ${f}`).join("\n")}`);
await vite.close();
process.exit(fallas.length ? 1 : 0);
