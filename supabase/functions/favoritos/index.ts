// Guarda o quita un favorito. Gratis, pero solo con cuenta: la billetera firma un
// mensaje (no una transacción, no cuesta nada) y acá se comprueba esa firma.
import { createClient } from "npm:@supabase/supabase-js@2";
import { StrKey } from "npm:@stellar/stellar-sdk@17";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });

const VALE_HORAS = 12;

/** El mensaje que firma la billetera. La app arma exactamente este texto. */
const mensajeDe = (cuenta: string, fecha: string) => `UMBRAL: entrar a mis favoritos\n${cuenta}\n${fecha}`;

/** Firma de mensajes de Stellar (SEP-53): se firma el SHA-256 de un prefijo fijo más el mensaje. */
async function firmaValida(cuenta: string, mensaje: string, firma: string): Promise<boolean> {
  try {
    const datos = new TextEncoder().encode("Stellar Signed Message:\n" + mensaje);
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", datos));
    // atob del propio Deno: Buffer.from(..., "base64") decodifica mal en este servidor.
    const f = /^[0-9a-f]{128}$/i.test(firma)
      ? Uint8Array.from(firma.match(/../g)!, (x) => parseInt(x, 16))
      : Uint8Array.from(atob(firma), (ch) => ch.charCodeAt(0));
    if (f.length !== 64) return false;
    // Ed25519 del propio Deno: la de la librería de Stellar no anda en este servidor.
    const clave = await crypto.subtle.importKey("raw", new Uint8Array(StrKey.decodeEd25519PublicKey(cuenta)), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, clave, f, hash);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { error: "Solo POST." });

  let c: Record<string, string>;
  try {
    c = await req.json();
  } catch {
    return responder(400, { error: "Pedido mal armado." });
  }
  const { cuenta, huella_id, accion, fecha, firma } = c;
  if (!/^G[A-Z2-7]{55}$/.test(cuenta ?? "") || !/^[0-9a-f]{64}$/.test(huella_id ?? "") || !["guardar", "quitar"].includes(accion) || !fecha || !firma) {
    return responder(400, { error: "Faltan datos." });
  }
  const edad = Date.now() - Date.parse(fecha);
  if (!(edad > -5 * 60_000 && edad < VALE_HORAS * 3_600_000)) return responder(401, { error: "La firma venció. Volvé a entrar." });
  if (!(await firmaValida(cuenta, mensajeDe(cuenta, fecha), firma))) return responder(401, { error: "La firma no es de esa cuenta." });

  const base = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (accion === "quitar") {
    const { error } = await base.from("favoritos").delete().eq("cuenta", cuenta).eq("huella_id", huella_id);
    return error ? responder(500, { error: "No se pudo quitar." }) : responder(200, { ok: true });
  }
  const { data: h } = await base.from("huellas").select("id").eq("id", huella_id).eq("estado", "publicada").maybeSingle();
  if (!h) return responder(404, { error: "Esa huella no está publicada." });
  const { error } = await base.from("favoritos").upsert({ cuenta, huella_id }, { onConflict: "cuenta,huella_id", ignoreDuplicates: true });
  return error ? responder(500, { error: "No se pudo guardar." }) : responder(200, { ok: true });
});
