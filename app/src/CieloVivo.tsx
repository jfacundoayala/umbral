// El cielo de verdad, en el cierre de la portada. Cada obra publicada es una estrella, más grande cuanto
// más huellas tiene, y cada huella es una línea que sale de ella. Se toca una estrella y se abre la obra.
// Las posiciones salen del id de cada obra, así que no cambian entre visitas.
// Las líneas y los puntos se dibujan con trazos de largo cero y vector-effect, así siguen redondos
// aunque el dibujo se estire al ancho de la pantalla.
import type { Huella } from "./base";

type Obra = Pick<Huella, "id" | "titulo" | "nombre" | "respuestas_publicadas">;

/** Un número entre 0 y 1 que sale siempre igual del id y de una semilla. */
function azar(id: string, semilla: number): number {
  let h = 2166136261 ^ semilla;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/** Zonas libres alrededor del texto del centro, en porcentaje del ancho y del alto. */
const ZONAS: [number, number, number, number][] = [
  [3, 97, 6, 24], // arriba
  [3, 97, 82, 95], // abajo
  [3, 13, 24, 82], // costado izquierdo
  [87, 97, 24, 82], // costado derecho
];
const AREA = ZONAS.map(([x0, x1, y0, y1]) => (x1 - x0) * (y1 - y0));
const TOTAL = AREA.reduce((s, a) => s + a, 0);

function ubicar(obras: Obra[]) {
  const puestas: { o: Obra; x: number; y: number }[] = [];
  for (const o of obras) {
    let mejor = { x: 50, y: 10, d: -1 };
    for (let intento = 0; intento < 24; intento++) {
      let r = azar(o.id, intento * 3) * TOTAL;
      let z = 0;
      while (z < ZONAS.length - 1 && r > AREA[z]) r -= AREA[z++];
      const [x0, x1, y0, y1] = ZONAS[z];
      const x = x0 + azar(o.id, intento * 3 + 1) * (x1 - x0);
      const y = y0 + azar(o.id, intento * 3 + 2) * (y1 - y0);
      const d = Math.min(...puestas.map((p) => Math.hypot(p.x - x, (p.y - y) * 0.5)), 99);
      if (d > mejor.d) mejor = { x, y, d };
      if (d > 7) break;
    }
    puestas.push({ o, x: mejor.x, y: mejor.y });
  }
  return puestas;
}

export function CieloVivo({ obras }: { obras: Obra[] }) {
  const puestas = ubicar(obras);
  return (
    <div className="cielo-vivo">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {puestas.map(({ o, x, y }) =>
          Array.from({ length: Math.min(o.respuestas_publicadas, 8) }, (_, i) => {
            const a = azar(o.id, 100 + i) * Math.PI * 2;
            const largo = 2.2 + azar(o.id, 200 + i) * 2.4;
            const hx = x + Math.cos(a) * largo;
            const hy = y + Math.sin(a) * largo * 2.2;
            return (
              <g key={`${o.id}-${i}`} className="cv-huella" style={{ animationDelay: `${(i * 0.45 + azar(o.id, 7) * 4).toFixed(2)}s` }}>
                <line x1={x} y1={y} x2={hx} y2={hy} className="cv-linea" vectorEffect="non-scaling-stroke" />
                <line x1={hx} y1={hy} x2={hx} y2={hy} className="cv-punto" vectorEffect="non-scaling-stroke" />
              </g>
            );
          }),
        )}
        {puestas.map(({ o, x, y }) => (
          <line
            key={o.id}
            x1={x}
            y1={y}
            x2={x}
            y2={y}
            className="cv-estrella"
            strokeWidth={5 + Math.sqrt(o.respuestas_publicadas) * 2.6}
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${(azar(o.id, 9) * 3).toFixed(2)}s` }}
          />
        ))}
      </svg>
      {puestas.map(({ o, x, y }) => (
        <a
          key={o.id}
          className={`cv-obra ${x > 70 ? "cv-izq" : ""} ${y > 60 ? "cv-arriba" : ""}`}
          href={`#/obra/${o.id}`}
          style={{ left: `${x}%`, top: `${y}%` }}
          aria-label={`${o.titulo ?? "Obra"}, de ${o.nombre}. ${o.respuestas_publicadas} ${o.respuestas_publicadas === 1 ? "huella" : "huellas"}`}
        >
          <span className="cv-rotulo" aria-hidden="true">
            {o.titulo}
            <small>
              {o.nombre} · {o.respuestas_publicadas} {o.respuestas_publicadas === 1 ? "huella" : "huellas"}
            </small>
          </span>
        </a>
      ))}
    </div>
  );
}
