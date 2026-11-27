// Publica una huella SOLO si el pago está en la red de Stellar.
// El navegador deja un borrador invisible y, después de firmar, llama acá con el
// comprobante. Esta función no le cree al navegador: lee el contrato y compara.
import { createClient } from "npm:@supabase/supabase-js@2";
import { Account, BASE_FEE, Contract, rpc, scValToNative, StrKey, TransactionBuilder, xdr } from "npm:@stellar/stellar-sdk@17";
import { Buffer } from "node:buffer";

const RPC = Deno.env.get("UMBRAL_RPC") ?? "https://soroban-testnet.stellar.org";
const FRASE = Deno.env.get("UMBRAL_FRASE") ?? "Test SDF Network ; September 2015";
const CONTRATO = Deno.env.get("UMBRAL_CONTRATO") ?? "CCFQDRBGXVE4EIXZMBKA4GXXJV3BV6IZNSNXLPJHTDKEGN3SYYIW4N66";
// Cuenta cualquiera que exista en la red: solo se usa para consultar, no firma nada.
const CUENTA_LECTURA = "GCCYPGWDNHLQBJAGIPNX5DRBB4CKMCTEQT4IK64IRSNN2IGGBO4JAB5C";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });

const HEX64 = /^[0-9a-f]{64}$/;
const sha256 = async (b: Uint8Array | ArrayBuffer) => Buffer.from(await crypto.subtle.digest("SHA-256", b)).toString("hex");
const hexDe = (v: unknown) => (v == null ? null : Buffer.from(v as Uint8Array).toString("hex"));

/** Misma cuenta que hace la app (app/src/umbral.ts, documentoOrdenado). Si cambia allá, cambia acá. */
function documentoOrdenado(d: Record<string, string | null | undefined>): string {
  const t = (x?: string | null) => (x ?? "").normalize("NFC");
  return JSON.stringify({
    audio: d.audio ?? "",
    creado: d.creado,
    derechos: d.derechos ?? "",
    descripcion: t(d.descripcion),
    enlace: d.enlace ?? "",
    foto: d.foto ?? "",
    nombre: t(d.nombre),
    sal: d.sal,
    texto: t(d.texto),
    titulo: t(d.titulo),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { error: "Solo POST." });

  let id = "", tx_hash = "";
  try {
    const c = await req.json();
    id = String(c.id ?? "").toLowerCase();
    tx_hash = String(c.tx_hash ?? "").toLowerCase();
  } catch {
    return responder(400, { error: "Pedido mal armado." });
  }
  if (!HEX64.test(id) || !HEX64.test(tx_hash)) return responder(400, { error: "Faltan el id o el comprobante." });

  const base = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: h, error } = await base.from("huellas").select("*").eq("id", id).maybeSingle();
  if (error) return responder(500, { error: "No se pudo leer la base." });
  if (!h) return responder(404, { error: "No hay un borrador con ese id." });
  if (h.estado === "publicada") return responder(200, { ok: true, ya_estaba: true });
  if (h.estado !== "pendiente") return responder(409, { error: "Esa huella fue retirada." });

  // 1. El contenido guardado tiene que dar el mismo código que se firmó.
  const archivo = async (deposito: string, ruta: string | null) => {
    if (!ruta) return "";
    const { data, error } = await base.storage.from(deposito).download(ruta);
    if (error || !data) throw new Error("falta-archivo");
    return await sha256(await data.arrayBuffer());
  };
  let foto = "", audio = "";
  try {
    foto = await archivo("obras", h.foto_ruta);
    audio = await archivo("audios", h.audio_ruta);
  } catch {
    return responder(409, { error: "Falta subir la foto o el audio." });
  }
  const codigo = await sha256(new TextEncoder().encode(documentoOrdenado({ ...h, foto, audio })));
  if (codigo !== h.digest) return responder(409, { error: "El contenido no coincide con lo que se firmó." });

  // 2. El contrato tiene que tener esa huella, con ese autor, artista, código, padre y sala.
  const red = new rpc.Server(RPC);
  let enRed: Record<string, unknown>;
  try {
    const tx = new TransactionBuilder(new Account(CUENTA_LECTURA, "0"), { fee: BASE_FEE, networkPassphrase: FRASE })
      .addOperation(new Contract(CONTRATO).call("obtener", xdr.ScVal.scvBytes(Buffer.from(id, "hex"))))
      .setTimeout(30)
      .build();
    const sim = await red.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) return responder(402, { error: "Esa huella no está pagada en la red." });
    enRed = scValToNative(sim.result.retval);
  } catch {
    return responder(502, { error: "No se pudo consultar la red. Probá de nuevo." });
  }
  const coincide =
    enRed.autor === h.autor &&
    enRed.artista === h.artista &&
    hexDe(enRed.digest) === h.digest &&
    hexDe(enRed.padre) === (h.padre ?? null) &&
    hexDe(enRed.sala) === (h.sala ?? null) &&
    enRed.activa === true;
  if (!coincide) return responder(409, { error: "Lo que está en la red no coincide con el borrador." });

  // 3. El comprobante tiene que ser una transacción exitosa que registró esta huella.
  try {
    const t = await red.getTransaction(tx_hash);
    if (t.status !== "SUCCESS") return responder(402, { error: "Ese comprobante no figura como exitoso en la red." });
    // Busca el evento HuellaDejada de este contrato con este id como tema.
    const registrada = t.events.contractEventsXdr.flat().some((e) => {
      if (!e.contractId || StrKey.encodeContract(Buffer.from(String(e.contractId), "hex")) !== CONTRATO) return false;
      const [nombre, huella] = e.body.v0.topics.map((x) => scValToNative(x));
      return nombre === "huella_dejada" && hexDe(huella) === id;
    });
    if (!registrada) return responder(409, { error: "Ese comprobante no es el de esta huella." });
  } catch {
    return responder(502, { error: "No se pudo leer el comprobante. Probá de nuevo." });
  }

  // 4. Recién ahora se publica.
  const { error: e2 } = await base.from("huellas").update({ estado: "publicada", tx_hash }).eq("id", id).eq("estado", "pendiente");
  if (e2) return responder(409, { error: "Ese comprobante ya se usó para otra huella." });
  return responder(200, { ok: true });
});
