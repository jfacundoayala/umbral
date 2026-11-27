// Dibujo de una obra y sus huellas: la obra en el centro, cada continuación sale de la huella que continúa.
// Mismo armado que la maqueta (web/app.html): cada rama ocupa un ángulo según cuántas hojas tiene.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Huella } from "./base";

type Punto = { id: string; x: number; y: number; px: number | null; py: number | null; nivel: number };

function ubicar(obra: Huella, huellas: Huella[]): Punto[] {
  const hijos = new Map<string, Huella[]>();
  for (const h of huellas) if (h.padre) hijos.set(h.padre, [...(hijos.get(h.padre) ?? []), h]);
  const hojas = (id: string): number => {
    const hs = hijos.get(id) ?? [];
    return hs.length ? hs.reduce((n, h) => n + hojas(h.id), 0) : 1;
  };
  const salida: Punto[] = [];
  const paso = (id: string, desde: number, hasta: number, nivel: number, padre: { x: number; y: number } | null) => {
    const ang = (desde + hasta) / 2;
    const radio = nivel ? 112 + (nivel - 1) * 92 : 0;
    const pos = { x: nivel ? Math.cos(ang) * radio : 0, y: nivel ? Math.sin(ang) * radio : 0 };
    salida.push({ id, ...pos, px: padre?.x ?? null, py: padre?.y ?? null, nivel });
    let a = desde;
    const total = hojas(id);
    for (const h of hijos.get(id) ?? []) {
      const ancho = ((hasta - desde) * hojas(h.id)) / total;
      paso(h.id, a, a + ancho, nivel + 1, pos);
      a += ancho;
    }
  };
  paso(obra.id, -Math.PI / 2, Math.PI * 1.5, 0, null);
  return salida;
}

/** Número pseudoazaroso fijo para cada obra: el fondo no cambia entre visitas. */
function semilla(texto: string) {
  let s = 7;
  for (const c of texto) s = (s * 31 + c.charCodeAt(0)) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Fondo de la identidad: órbitas punteadas, puntitos sueltos y ondas de líneas finas. Solo decora. */
function Fondo({ alcance, id }: { alcance: number; id: string }) {
  const { ondas, puntos, orbitas } = useMemo(() => {
    const az = semilla(id);
    const k = alcance / 300;
    const ondas = Array.from({ length: 30 }, (_, i) => {
      let d = "";
      for (let x = -alcance * 2.5; x <= alcance * 2.5; x += alcance / 40) {
        const y = alcance * 0.62 - i * 5.5 * k + Math.sin(x / (95 * k) + i * 0.12) * 34 * k + Math.sin(x / (36 * k)) * 4 * k - x * 0.16;
        d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      return d;
    });
    const puntos = Array.from({ length: 56 }, () => ({ x: (az() * 2 - 1) * alcance, y: (az() * 2 - 1) * alcance, r: az() < 0.15 ? 2.4 : 1.1, o: 0.25 + az() * 0.5 }));
    const orbitas = [112, 204, 296, 388].filter((r) => r < alcance * 1.05);
    return { ondas, puntos, orbitas };
  }, [alcance, id]);
  return (
    <g className="fondo" aria-hidden="true">
      {ondas.map((d, i) => <path key={i} className="onda" d={d} />)}
      {orbitas.map((r, i) => <circle key={r} className="orbita" r={r} opacity={0.55 - i * 0.1} />)}
      {puntos.map((p, i) => <circle key={i} className="astro" cx={p.x} cy={p.y} r={p.r} opacity={p.o} />)}
    </g>
  );
}

/** Ícono de la obra según lo que tiene: audio, foto o solo texto. */
function Icono({ h }: { h: Huella }): ReactNode {
  if (h.audio_ruta)
    return (
      <g className="icono">
        {[5, 10, 15, 9, 4].map((alto, i) => <line key={i} className={i === 2 ? "acento" : ""} x1={-8 + i * 4} x2={-8 + i * 4} y1={-alto / 2} y2={alto / 2} />)}
      </g>
    );
  if (h.foto_ruta)
    return (
      <g className="icono">
        <rect x={-11} y={-8} width={22} height={16} />
        <path d="M-9 6 L-3 -1 L2 4 L5 1 L9 6" />
        <circle className="acento lleno" cx={4} cy={-3.5} r={1.6} />
      </g>
    );
  return (
    <g className="icono">
      <path d="M0 -6 C-4 -9 -9 -9 -11 -7 V8 C-9 6 -4 6 0 9 C4 6 9 6 11 8 V-7 C9 -9 4 -9 0 -6 Z M0 -6 V9" />
    </g>
  );
}

/** En pantallas angostas el dibujo se acerca, para que los puntos se vean y se puedan tocar. */
function useAngosta() {
  const consulta = "(max-width: 560px)";
  const [angosta, setAngosta] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const cambio = () => setAngosta(m.matches);
    m.addEventListener("change", cambio);
    return () => m.removeEventListener("change", cambio);
  }, []);
  return angosta;
}

/** `invitada`: la obra la pagó el fondo de una sala (sello de presencia): el círculo lleva un aro de puntos alrededor. */
export default function Constelacion({ obra, huellas, elegida, elegir, invitada = false }: { obra: Huella; huellas: Huella[]; elegida: string; elegir: (id: string) => void; invitada?: boolean }) {
  const puntos = ubicar(obra, huellas);
  const porId = new Map([obra, ...huellas].map((h) => [h.id, h]));
  const angosta = useAngosta();
  const base = angosta ? 190 : 300;
  const alcance = Math.max(base, ...puntos.map((p) => Math.hypot(p.x, p.y) + 50));
  // Si la constelación crece, el dibujo se achica: los puntos y los nombres crecen (hasta el doble) para que se lean y se puedan tocar.
  const k = Math.min(2, alcance / base);
  return (
    <svg className="mapa" viewBox={`${-alcance} ${-alcance} ${alcance * 2} ${alcance * 2}`} role="group" aria-label="Constelación de huellas de la obra">
      <Fondo alcance={alcance} id={obra.id} />
      {puntos.map((p) => p.px !== null && <line key={`l${p.id}`} className="linea" x1={p.px} y1={p.py!} x2={p.x} y2={p.y} />)}
      {puntos.map((p) => {
        const h = porId.get(p.id)!;
        const nombre = h.estado === "retirada" ? "Retirada" : (h.nombre ?? "").split(" ")[0];
        const clase = ["punto", p.nivel ? "" : "raiz", h.estado === "retirada" ? "retirada" : "", p.id === elegida ? "sel" : ""].join(" ");
        return (
          <g
            key={p.id}
            className={clase}
            transform={`translate(${p.x} ${p.y})`}
            tabIndex={0}
            role="button"
            aria-label={p.nivel ? `Huella de ${nombre}` : invitada ? "La obra, invitada por una sala" : "La obra"}
            aria-pressed={p.id === elegida}
            onClick={() => elegir(p.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                elegir(p.id);
              }
            }}
          >
            {!p.nivel && invitada && <circle className="sello-aro" r={42 * k} />}
            <circle className="toque" r={(p.nivel ? 26 : 44) * k} />
            <circle className="nucleo" r={(p.nivel ? 13 : 31) * k} />
            {!p.nivel && h.estado !== "retirada" && (
              <g transform={`scale(${k})`}>
                <Icono h={h} />
              </g>
            )}
            <text y={(p.nivel ? 28 : invitada ? 62 : 50) * k} style={{ fontSize: 10 * k }}>{p.nivel ? nombre : "Obra"}</text>
          </g>
        );
      })}
    </svg>
  );
}
