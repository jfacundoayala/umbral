// Refleja en la base una huella retirada en la red (por su autor o por moderación).
// No le cree al navegador: consulta el contrato y solo actúa si allá figura inactiva.
// Al retirar se borra el contenido y los archivos; queda el código en la red.
import { createClient } from "npm:@supabase/supabase-js@2";
import { Account, BASE_FEE, Contract, rpc, scValToNative, TransactionBuilder, xdr } from "npm:@stellar/stellar-sdk@17";

const RPC = Deno.env.get("UMBRAL_RPC") ?? "https://soroban-testnet.stellar.org";
const FRASE = Deno.env.get("UMBRAL_FRASE") ?? "Test SDF Network ; September 2015";
const CONTRATO = Deno.env.get("UMBRAL_CONTRATO") ?? "CBE4RP5RRN7HKZLQKYZKNZFVCGDOFB74JPWGGWSIAUNNLR3R3IUXJ4ZM";
const CUENTA_LECTURA = "GCCYPGWDNHLQBJAGIPNX5DRBB4CKMCTEQT4IK64IRSNN2IGGBO4JAB5C";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });

const aBytes = (hex: string) => Uint8Array.from(hex.match(/../g)!, (x) => parseInt(x, 16));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { error: "Solo POST." });

  let id = "";
  try {
    id = String((await req.json()).id ?? "").toLowerCase();
  } catch {
    return responder(400, { error: "Pedido mal armado." });
  }
  if (!/^[0-9a-f]{64}$/.test(id)) return responder(400, { error: "Falta el id." });

  const base = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: h } = await base.from("huellas").select("id, estado, foto_ruta, audio_ruta").eq("id", id).maybeSingle();
  if (!h) return responder(404, { error: "No hay una huella con ese id." });
  if (h.estado === "retirada") return responder(200, { ok: true, ya_estaba: true });
  if (h.estado !== "publicada") return responder(409, { error: "Esa huella no está publicada." });

  let activa: boolean;
  try {
    const tx = new TransactionBuilder(new Account(CUENTA_LECTURA, "0"), { fee: BASE_FEE, networkPassphrase: FRASE })
      .addOperation(new Contract(CONTRATO).call("obtener", xdr.ScVal.scvBytes(aBytes(id) as never)))
      .setTimeout(30)
      .build();
    const sim = await new rpc.Server(RPC).simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) return responder(502, { error: "No se pudo leer la huella en la red." });
    activa = (scValToNative(sim.result.retval) as { activa: boolean }).activa;
  } catch {
    return responder(502, { error: "No se pudo consultar la red. Probá de nuevo." });
  }
  if (activa) return responder(409, { error: "En la red la huella sigue activa. Primero hay que retirarla con la billetera." });

  if (h.foto_ruta) await base.storage.from("obras").remove([h.foto_ruta]);
  if (h.audio_ruta) await base.storage.from("audios").remove([h.audio_ruta]);
  const { error } = await base
    .from("huellas")
    .update({ estado: "retirada", nombre: "—", titulo: null, descripcion: null, texto: null, foto_ruta: null, audio_ruta: null, enlace: null })
    .eq("id", id);
  if (error) return responder(500, { error: "No se pudo actualizar la base." });
  return responder(200, { ok: true });
});
