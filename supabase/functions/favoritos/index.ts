// Guarda o quita un favorito. Gratis, pero solo con cuenta: la billetera firma un
// mensaje (no una transacción, no cuesta nada) y acá se comprueba esa firma.
// La firma nombra la acción y la huella, y vale pocos minutos (ver firma.ts).
import { createClient } from "npm:@supabase/supabase-js@2";
import { StrKey } from "npm:@stellar/stellar-sdk@17";
import { firmaValida, mensajeDe, vigente, type Accion } from "./firma.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });

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
  if (!vigente(fecha)) return responder(401, { error: "La firma venció. Probá de nuevo." });
  let clave: Uint8Array;
  try {
    clave = new Uint8Array(StrKey.decodeEd25519PublicKey(cuenta));
  } catch {
    return responder(400, { error: "Esa cuenta no es válida." });
  }
  if (!(await firmaValida(clave, mensajeDe(accion as Accion, huella_id, cuenta, fecha), firma))) {
    return responder(401, { error: "La firma no es de esa cuenta o no es para esta acción." });
  }

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
