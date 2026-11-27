// Dibujo de una obra y sus huellas: la obra en el centro, cada continuación sale de la huella que continúa.
// Mismo armado que la maqueta (web/app.html): cada rama ocupa un ángulo según cuántas hojas tiene.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { urlFoto, type Huella } from "./base";

type Punto = { id: string; x: number; y: number; px: number | null; py: number | null; nivel: number; desc: number };

/** Radio de cada generación: la obra en el centro y cada continuación en la órbita siguiente. */
const ORBITAS = [112, 204, 296, 388, 480, 572];
const radioDe = (nivel: number) => (nivel ? ORBITAS[nivel - 1] ?? ORBITAS[ORBITAS.length - 1] + (nivel - ORBITAS.length) * 92 : 0);

/** Número fijo entre 0 y 1 para cada id: el dibujo es siempre el mismo, pero no queda en línea recta. */
function azarDe(id: string) {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 1_000_003;
  return s / 1_000_003;
}

function ubicar(obra: Huella, huellas: Huella[]): Punto[] {
  const hijos = new Map<string, Huella[]>();
  for (const h of huellas) if (h.padre) hijos.set(h.padre, [...(hijos.get(h.padre) ?? []), h]);
  const hojas = (id: string): number => {
    const hs = hijos.get(id) ?? [];
    return hs.length ? hs.reduce((n, h) => n + hojas(h.id), 0) : 1;
  };
  const descendientes = (id: string): number => (hijos.get(id) ?? []).reduce((n, h) => n + 1 + descendientes(h.id), 0);
  const salida: Punto[] = [];
  // Cada rama ocupa un sector según cuántas hojas tiene. Dentro de su sector, cada huella se corre un poco
  // (siempre igual para el mismo id): así una cadena de continuaciones dibuja una figura y no una línea.
  const paso = (id: string, desde: number, hasta: number, nivel: number, padre: { x: number; y: number } | null) => {
    const ancho = hasta - desde;
    const corrimiento = nivel ? (azarDe(id) - 0.5) * Math.min(ancho * 0.7, 1.1) : 0;
    const ang = (desde + hasta) / 2 + corrimiento;
    const radio = radioDe(nivel);
    const pos = { x: nivel ? Math.cos(ang) * radio : 0, y: nivel ? Math.sin(ang) * radio : 0 };
    salida.push({ id, ...pos, px: padre?.x ?? null, py: padre?.y ?? null, nivel, desc: descendientes(id) });
    // Los hijos se reparten alrededor de donde quedó el padre, no del centro del sector.
    const centro = ang;
    const mitad = nivel ? Math.min(ancho, Math.PI * 0.9) / 2 : Math.PI;
    let a = centro - mitad;
    const total = hojas(id);
    for (const h of hijos.get(id) ?? []) {
      const parte = (2 * mitad * hojas(h.id)) / total;
      paso(h.id, a, a + parte, nivel + 1, pos);
      a += parte;
    }
  };
  // La primera rama arranca en un ángulo distinto para cada obra.
  const inicio = -Math.PI / 2 + (azarDe(obra.id) - 0.5) * Math.PI;
  paso(obra.id, inicio, inicio + Math.PI * 2, 0, null);
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
    const orbitas = ORBITAS.filter((r) => r < alcance * 1.05);
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
            {p.nivel ? (
              <>
                {/* Más grande y con centro azul cuanto más la continuaron. */}
                <circle className="nucleo" r={(11 + Math.min(8, p.desc * 2.5)) * k} />
                {p.desc > 0 && <circle className="semilla" r={(3 + Math.min(4, p.desc)) * k} />}
              </>
            ) : (
              <>
                <circle className="nucleo" r={31 * k} />
                {h.foto_ruta && h.estado !== "retirada" ? (
                  <>
                    <clipPath id={`recorte-${p.id}`}>
                      <circle r={29 * k} />
                    </clipPath>
                    <image
                      className="foto-obra"
                      href={urlFoto(h.foto_ruta)}
                      x={-29 * k}
                      y={-29 * k}
                      width={58 * k}
                      height={58 * k}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#recorte-${p.id})`}
                    />
                  </>
                ) : (
                  h.estado !== "retirada" && (
                    <g transform={`scale(${k})`}>
                      <Icono h={h} />
                    </g>
                  )
                )}
              </>
            )}
            <text y={(p.nivel ? 28 + Math.min(8, p.desc * 2.5) : invitada ? 62 : 50) * k} style={{ fontSize: 10 * k }}>{p.nivel ? nombre : "Obra"}</text>
          </g>
        );
      })}
    </svg>
  );
}
