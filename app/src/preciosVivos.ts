// Lo que cuesta exponer, lo que cuesta dejar una huella y la parte de quien subió la obra, para decirlo
// en la portada. Se lee del contrato cuando el navegador queda libre (así no compite con la primera
// pintura). Mientras tanto, o si la red no contesta, se muestran los valores que rigen hoy.
import { useEffect, useState } from "react";
import { MONEDAS, plata } from "./comun";

export type PreciosVivos = { exponer: string; huella: string; parte: number };

/** Respaldo fijo: los valores del contrato al 28/11/2026. */
export const DE_HOY: PreciosVivos = { exponer: "2 USDC", huella: "1 USDC", parte: 80 };

let ultimo: PreciosVivos | null = null;
let pedido: Promise<PreciosVivos> | null = null;

function leer(): Promise<PreciosVivos> {
  pedido ??= import("./umbral")
    .then((u) => Promise.all([u.preciosVigentes(MONEDAS[0].id), u.repartoVigente()]))
    .then(([p, r]) => (ultimo = { exponer: plata(p.huella, "USDC"), huella: plata(p.continuar, "USDC"), parte: r.autor }))
    .catch((e) => {
      pedido = null; // otra pantalla puede volver a probar
      throw e;
    });
  return pedido;
}

export function usePreciosVivos(): PreciosVivos {
  const [vivos, setVivos] = useState(ultimo ?? DE_HOY);
  useEffect(() => {
    if (ultimo) return;
    let vivo = true;
    const pedir = () =>
      leer()
        .then((p) => vivo && setVivos(p))
        .catch(() => undefined);
    // Safari no tiene requestIdleCallback: ahí se espera un par de segundos.
    const ocio = (window as Partial<Pick<Window, "requestIdleCallback">>).requestIdleCallback;
    const espera = setTimeout(() => (ocio ? ocio(pedir, { timeout: 3000 }) : pedir()), 1500);
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
  }, []);
  return vivos;
}
