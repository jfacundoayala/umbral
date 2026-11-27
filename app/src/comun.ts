// Piezas que usan varias pantallas: monedas, rutas y formato.
import { useEffect, useState } from "react";
import { MONEDA_ID, RED, UNIDAD, XLM_ID } from "./config";

export type Moneda = { id: string; codigo: "USDC" | "XLM" };
export const MONEDAS: Moneda[] = [
  { id: MONEDA_ID, codigo: "USDC" },
  { id: XLM_ID, codigo: "XLM" },
];
export const monedaDe = (id: string) => MONEDAS.find((m) => m.id === id) ?? MONEDAS[0];

/** Un monto en unidades mínimas, para leer: "1" o "2,50". */
export function plata(minimas: bigint, codigo: string) {
  const n = Number(minimas) / Number(UNIDAD);
  return `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${codigo}`;
}

export const corta = (cuenta: string) => `${cuenta.slice(0, 4)}…${cuenta.slice(-4)}`;
export const enlaceTx = (hash: string) => `${RED.explorador}/tx/${hash}`;
export const mensajeError = (e: unknown) => (e instanceof Error ? e.message : "Algo salió mal. Probá de nuevo.");

/** Rutas con "#", así anda en cualquier hosting estático sin configurar nada. */
export type Ruta =
  | { pantalla: "portada" }
  | { pantalla: "cielo" }
  | { pantalla: "obra"; id: string; placa?: { firma: string } }
  | { pantalla: "placa"; id: string }
  | { pantalla: "abrir"; sala?: string }
  | { pantalla: "cobrar" }
  | { pantalla: "terminos" }
  | { pantalla: "privacidad" }
  | { pantalla: "opinion"; desde: "huella" | "pie" };

/** Llegada desde la placa de una obra: #/obra/<id>?desde=placa&f=<firma>. */
function placaDe(consulta: string) {
  const q = new URLSearchParams(consulta);
  return q.get("desde") === "placa" ? { firma: (q.get("f") ?? "").toLowerCase() } : undefined;
}

function leerRuta(): Ruta {
  const [camino, consulta = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const partes = camino.split("/");
  if (partes[0] === "cielo") return { pantalla: "cielo" };
  if (partes[0] === "obra" && partes[1]) return { pantalla: "obra", id: partes[1], placa: placaDe(consulta) };
  if (partes[0] === "placa" && partes[1]) return { pantalla: "placa", id: partes[1] };
  if (partes[0] === "abrir") {
    // Invitación de una sala: #/abrir?sala=<id de la sala>
    const sala = new URLSearchParams(consulta).get("sala")?.toLowerCase();
    return { pantalla: "abrir", sala: sala && /^[0-9a-f]{64}$/.test(sala) ? sala : undefined };
  }
  if (partes[0] === "cobrar") return { pantalla: "cobrar" };
  if (partes[0] === "terminos") return { pantalla: "terminos" };
  if (partes[0] === "privacidad") return { pantalla: "privacidad" };
  if (partes[0] === "opinion") return { pantalla: "opinion", desde: new URLSearchParams(consulta).get("desde") === "huella" ? "huella" : "pie" };
  return { pantalla: "portada" };
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(leerRuta);
  useEffect(() => {
    const cambio = () => {
      setRuta(leerRuta());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", cambio);
    return () => window.removeEventListener("hashchange", cambio);
  }, []);
  return ruta;
}

export const ir = (destino: string) => {
  location.hash = destino;
};

/** Cuenta palabras como lo hace la base (separadas por espacios). */
export const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
