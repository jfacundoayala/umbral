// Ayuda para quien prueba por primera vez: fondos de prueba gratis y aviso si eligió USDC sin tenerlo.
import { useEffect, useState } from "react";
import { RED, USDC, XLM_ID } from "./config";
import { monedaDe, type Moneda } from "./comun";

type Estado = { existe: boolean; xlm: number; usdc: number | null } | null;

/** Lo que la cuenta tiene en la red de pruebas. `usdc` es null si la cuenta no tiene USDC habilitado. */
async function leerCuenta(cuenta: string): Promise<Estado> {
  const r = await fetch(`${RED.horizonUrl}/accounts/${cuenta}`);
  if (r.status === 404) return { existe: false, xlm: 0, usdc: null };
  if (!r.ok) return null;
  const datos = (await r.json()) as { balances: { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }[] };
  const xlm = datos.balances.find((b) => b.asset_type === "native");
  const usdc = datos.balances.find((b) => b.asset_code === USDC.codigo && b.asset_issuer === USDC.emisor);
  return { existe: true, xlm: Number(xlm?.balance ?? 0), usdc: usdc ? Number(usdc.balance) : null };
}

export default function Fondos({ cuenta, moneda, cambiarMoneda }: { cuenta: string; moneda: Moneda; cambiarMoneda: (m: Moneda) => void }) {
  const [estado, setEstado] = useState<Estado>(null);
  const [vuelta, setVuelta] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let vivo = true;
    leerCuenta(cuenta)
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado(null));
    // Se vuelve a mirar al volver a la pestaña (por ejemplo, después de habilitar USDC en la billetera).
    const otraVez = () => setVuelta((v) => v + 1);
    window.addEventListener("focus", otraVez);
    return () => {
      vivo = false;
      window.removeEventListener("focus", otraVez);
    };
  }, [cuenta, vuelta]);

  // El "Listo" se va solo a los pocos segundos.
  useEffect(() => {
    if (!mensaje.startsWith("Listo")) return;
    const t = setTimeout(() => setMensaje(""), 6000);
    return () => clearTimeout(t);
  }, [mensaje]);

  async function cargar() {
    setCargando(true);
    setMensaje("");
    try {
      const r = await fetch(`${RED.friendbot}/?addr=${cuenta}`);
      if (!r.ok && r.status !== 400) throw new Error();
      setMensaje("Listo: tu cuenta ya tiene XLM de prueba.");
      setVuelta((v) => v + 1);
    } catch {
      setMensaje("No se pudieron cargar los fondos ahora. Probá de nuevo en un rato.");
    } finally {
      setCargando(false);
    }
  }

  if (!estado) return mensaje ? <p className="ayuda-fondos" role="status">{mensaje}</p> : null;

  if (!estado.existe) {
    return (
      <div className="ayuda-fondos" role="status">
        <p>Tu cuenta es nueva. Te cargamos saldo de prueba gratis. No vale dinero real y sirve para probar UMBRAL.</p>
        <button className="btn lleno" onClick={cargar} disabled={cargando}>
          {cargando ? "Cargando…" : "Cargar fondos de prueba"}
        </button>
      </div>
    );
  }

  if (moneda.codigo === "USDC" && !estado.usdc) {
    return (
      <div className="ayuda-fondos" role="status">
        <p>
          {estado.usdc === null
            ? "Elegiste pagar en USDC, pero tu cuenta no tiene USDC habilitado."
            : "Elegiste pagar en USDC, pero tu cuenta no tiene USDC de prueba."}{" "}
          Para probar, lo más fácil es pagar en XLM.
        </p>
        <button className="btn lleno" onClick={() => cambiarMoneda(monedaDe(XLM_ID))}>
          Pagar en XLM
        </button>
      </div>
    );
  }

  return mensaje ? <p className="ayuda-fondos" role="status">{mensaje}</p> : null;
}
