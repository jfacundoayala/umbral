// Después de la siembra: cambia en la web los ids fijos de la colección vieja por los de la nueva.
//
// Lee el mapa que dejó sembrar.mjs (privado/siembra/mapa-<contrato>.json) y:
//   1. muestra la tabla id viejo → id nuevo de cada id que aparece escrito en el código;
//   2. renombra las miniaturas de public/muestra/<id>.webp;
//   3. propone la fecha DESDE_COLECCION nueva (un minuto antes de la primera huella sembrada).
//
// Uso (desde app/):
//   UMBRAL_CONTRATO=C... node scripts/reemplazar-ids.mjs            solo muestra; no cambia nada
//   UMBRAL_CONTRATO=C... node scripts/reemplazar-ids.mjs --aplicar  cambia los archivos y renombra las miniaturas
// Opción: --mapa=<ruta> para usar otro archivo de mapa.
// No toca docs/ (los enlaces viejos de docs/txs.md siguen valiendo como historia): solo los lista.
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const APLICAR = process.argv.includes("--aplicar");
const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = join(APP, "..");
const CONTRATO = process.env.UMBRAL_CONTRATO ?? "";
const ARCHIVO_MAPA = process.argv.find((a) => a.startsWith("--mapa="))?.slice(7) ?? join(RAIZ, "privado", "siembra", `mapa-${CONTRATO}.json`);
if (!existsSync(ARCHIVO_MAPA)) {
  console.error(`No está el mapa de la siembra: ${ARCHIVO_MAPA}\nPasá UMBRAL_CONTRATO (el contrato sembrado) o --mapa=<ruta>.`);
  process.exit(1);
}

const mapa = JSON.parse(readFileSync(ARCHIVO_MAPA, "utf8"));
const cambios = new Map(); // id viejo → id nuevo
const sinSembrar = new Set();
for (const [viejo, v] of Object.entries(mapa)) {
  const id = viejo.replace(/^sala:/, "");
  if (!v.nuevo) continue;
  // Una sala vale apenas se abrió; una huella, cuando quedó publicada.
  if (viejo.startsWith("sala:") || v.publicada) cambios.set(id, v.nuevo);
  else sinSembrar.add(id);
}

/** Archivos de código donde puede haber un id escrito. */
function archivosDe(carpeta, extensiones) {
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return nombre === "node_modules" || nombre === "contrato" ? [] : archivosDe(ruta, extensiones);
    return extensiones.some((e) => nombre.endsWith(e)) ? [ruta] : [];
  });
}
const CODIGO = [...archivosDe(join(APP, "src"), [".ts", ".tsx"]), ...archivosDe(join(APP, "pw"), [".ts"]), ...archivosDe(join(APP, "e2e"), [".mjs", ".ts"])];
const SOLO_AVISO = [...archivosDe(join(RAIZ, "docs"), [".md"]), join(RAIZ, "README.md")].filter(existsSync);
const ID = /\b[0-9a-f]{64}\b/g;
const rel = (ruta) => relative(RAIZ, ruta).replaceAll("\\", "/");

let tocados = 0;
const faltan = new Map(); // id viejo que está en el código pero no en el mapa → archivos
console.log(`Mapa: ${rel(ARCHIVO_MAPA)} (${cambios.size} ids con reemplazo)${APLICAR ? "" : "  — solo muestra; para cambiar: --aplicar"}\n`);
for (const ruta of CODIGO) {
  const texto = readFileSync(ruta, "utf8");
  const renglones = texto.split("\n");
  let hubo = false;
  renglones.forEach((renglon, i) => {
    for (const id of renglon.match(ID) ?? []) {
      if (cambios.has(id)) {
        if (!hubo) console.log(rel(ruta));
        hubo = true;
        console.log(`  ${String(i + 1).padStart(4)}: ${id} → ${cambios.get(id)}`);
      } else if (![...cambios.values()].includes(id)) {
        faltan.set(id, [...(faltan.get(id) ?? []), `${rel(ruta)}:${i + 1}${sinSembrar.has(id) ? " (sembrada a medias)" : ""}`]);
      }
    }
  });
  if (hubo && APLICAR) {
    writeFileSync(ruta, texto.replace(ID, (id) => cambios.get(id) ?? id));
    tocados++;
  }
}

console.log("\nMiniaturas (public/muestra):");
const MUESTRA = join(APP, "public", "muestra");
let renombradas = 0;
for (const nombre of existsSync(MUESTRA) ? readdirSync(MUESTRA) : []) {
  const [id, ext] = nombre.split(".");
  if (cambios.has(id)) {
    console.log(`  ${id.slice(0, 8)}….${ext} → ${cambios.get(id).slice(0, 8)}….${ext}`);
    if (APLICAR) renameSync(join(MUESTRA, nombre), join(MUESTRA, `${cambios.get(id)}.${ext}`));
    renombradas++;
  } else if (/^[0-9a-f]{64}$/.test(id) && ![...cambios.values()].includes(id)) {
    faltan.set(id, [...(faltan.get(id) ?? []), `app/public/muestra/${nombre}`]);
  }
}

if (faltan.size) {
  console.log("\nIds que siguen escritos y NO tienen reemplazo en el mapa (revisar a mano):");
  for (const [id, donde] of faltan) console.log(`  ${id}\n    ${donde.join("\n    ")}`);
}

const enDocs = SOLO_AVISO.map((ruta) => [rel(ruta), (readFileSync(ruta, "utf8").match(ID) ?? []).filter((id) => cambios.has(id)).length]).filter(([, n]) => n);
if (enDocs.length) console.log(`\nEn la documentación quedan ids viejos (no se tocan): ${enDocs.map(([r, n]) => `${r} (${n})`).join(", ")}`);

// La fecha desde la que El cielo muestra la colección: un minuto antes de la primera huella sembrada.
const env = Object.fromEntries(
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_CLAVE_PUBLICA"].map((k) => [k, process.env[k]]),
);
const config = existsSync(join(APP, "src", "config.ts")) ? readFileSync(join(APP, "src", "config.ts"), "utf8") : "";
const url = env.VITE_SUPABASE_URL ?? config.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
const clave = env.VITE_SUPABASE_CLAVE_PUBLICA ?? config.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
const sembradas = Object.entries(mapa).filter(([k, v]) => !k.startsWith("sala:") && v.publicada).map(([, v]) => v.nuevo);
if (url && clave && sembradas.length) {
  try {
    const r = await fetch(`${url}/rest/v1/huellas_publicas?select=recibido&id=in.(${sembradas.join(",")})&order=recibido.asc&limit=1`, { headers: { apikey: clave, Authorization: `Bearer ${clave}` } });
    const [primera] = await r.json();
    if (primera?.recibido) {
      const desde = new Date(Math.floor((new Date(primera.recibido).getTime() - 60_000) / 60_000) * 60_000).toISOString().replace(".000Z", "Z");
      console.log(`\nDESDE_COLECCION propuesto para base.ts: "${desde}"  (primera huella sembrada: ${primera.recibido})`);
      console.log("Con esa fecha, MIRTA y REEMPLAZADAS ya no hacen falta: todo lo viejo queda antes y todo lo sembrado después.");
    }
  } catch (e) {
    console.log(`\nNo se pudo leer la fecha de la primera huella sembrada (${e?.message ?? e}). Se saca de la base: el menor "recibido" de los ids nuevos.`);
  }
} else {
  console.log("\nDESDE_COLECCION: no se pudo proponer (sin datos de la base o sin huellas sembradas). Va un minuto antes del primer \"recibido\" de las sembradas.");
}

console.log(APLICAR ? `\nHecho: ${tocados} archivos cambiados y ${renombradas} miniaturas renombradas. Falta correr las pruebas y revisar el diff.` : `\nNada cambió. ${renombradas} miniaturas y los ids de arriba se cambian con --aplicar.`);
