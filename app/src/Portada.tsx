// Portada: el mismo modelo que web/index.html (diseño de Lucía).
// Huella de anillos cobalto en el centro de la constelación, cuatro verbos y nodos con íconos.
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ir } from "./comun";

/** Un anillo de la huella: un óvalo irregular. Misma cuenta que la portada web. */
function anillo(k: number, n: number, escala: number) {
  let d = "";
  for (let a = 0; a <= 360; a += 5) {
    const th = (a * Math.PI) / 180;
    const r = escala * (k / n) * (1 + 0.2 * Math.sin(2 * th + k * 0.16) + 0.09 * Math.sin(5 * th - k * 0.3));
    d += `${d ? "L" : "M"}${(r * Math.cos(th) * 0.82).toFixed(1)} ${(r * Math.sin(th)).toFixed(1)}`;
  }
  return d + "Z";
}

function ondas() {
  const salida: string[] = [];
  for (let i = 0; i < 46; i++) {
    let d = "";
    for (let x = 480; x <= 1640; x += 20) {
      const t = (x - 480) / 1160;
      const y = 900 - t * 520 + i * 9 + Math.sin(t * 6.2 + i * 0.07) * (70 - i * 0.6) + Math.sin(t * 13 + i * 0.16) * 14;
      d += `${d ? "L" : "M"}${x} ${y.toFixed(1)}`;
    }
    salida.push(d);
  }
  return salida;
}

const CENTRO: [number, number] = [420, 360];
const NODOS = [
  { id: "museo", x: 330, y: 120, nombre: "Museo" },
  { id: "cuadro", x: 660, y: 200, nombre: "Pintura" },
  { id: "objeto", x: 185, y: 360, nombre: "Objeto" },
  { id: "libro", x: 680, y: 410, nombre: "Libro" },
  { id: "obra", x: 300, y: 570, nombre: "Escultura" },
  { id: "camara", x: 600, y: 610, nombre: "Video" },
];
const PUNTOS: [number, number][] = [[360, 268], [460, 228], [505, 210], [600, 330], [525, 440], [540, 548], [440, 630], [78, 492], [280, 700], [585, 110], [470, 700]];
const ARISTAS = [
  ["n0", "p0"], ["n0", "p1"], ["p0", "n2"], ["n2", "c"], ["c", "p2"], ["p2", "n1"], ["n1", "p9"],
  ["c", "p4"], ["p4", "n3"], ["n3", "p3"], ["p3", "p2"], ["c", "n4"], ["n4", "p6"], ["p6", "p10"],
  ["p4", "p5"], ["p5", "p10"], ["n2", "p7"], ["n4", "p8"], ["p1", "p2"], ["p5", "n5"], ["n5", "p10"], ["n0", "p9"],
];
const pos = (clave: string): [number, number] => {
  if (clave === "c") return CENTRO;
  const n = Number(clave.slice(1));
  return clave[0] === "n" ? [NODOS[n].x, NODOS[n].y] : PUNTOS[n];
};

/** Íconos de las formas que puede tener una huella (los mismos del <defs> de la portada web). */
function Iconos() {
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <g id="i-objeto" {...trazo}>
          <path d="M8.8 3h6.4M10 3c0 2-.4 2.6-1.9 4.4C6.6 9.3 6 10.9 6 13c0 3.3 1.7 5.6 3.6 8h4.8c1.9-2.4 3.6-4.7 3.6-8 0-2.1-.6-3.7-2.1-5.6C14.4 5.6 14 5 14 3M7 9.5h10M6.3 15h11.4" />
        </g>
        <g id="i-obra" {...trazo}>
          <path d="M9.2 4.3c2.1-1.7 5.3-1.2 6.4 1.3.5 1.1.4 2.2.1 3l1.3 2.1-1.3.5v1.5c0 .9-.7 1.5-1.6 1.4l-1.3-.1v2.3M9.2 4.3C7.6 5.7 7.3 8 8.2 9.9c.5 1.1.8 2 .8 3.3v2.6M10.4 4.8c1.6.2 2.6 1.2 2.9 2.7M5.3 21c.3-2.8 1.6-4.4 3.7-5.2M18.7 21c-.3-2.5-1.5-4.1-3.9-4.7M4.3 21h15.4" />
        </g>
        <g id="i-museo" {...trazo}>
          <path d="M3 9l9-5 9 5zM4.5 9h15v1.6h-15zM3.5 19h17v2h-17zM4.5 17.4h15V19h-15zM6.5 10.6v6.8M10 10.6v6.8M14 10.6v6.8M17.5 10.6v6.8" />
        </g>
        <g id="i-libro" {...trazo}>
          <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" />
        </g>
        <g id="i-cuadro" {...trazo}>
          <rect x="3.5" y="5" width="17" height="14" rx="1" />
          <rect x="6" y="7.5" width="12" height="9" />
          <path d="M6 15l3.5-3.5 2.5 2.5 2-2 4 3.5" />
          <circle cx="14.5" cy="10" r="1" />
        </g>
        <g id="i-camara" {...trazo}>
          <rect x="3" y="9" width="13" height="9" rx="1.5" />
          <path d="M16 12l5-3v9l-5-3" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="12.5" cy="6.5" r="2.5" />
        </g>
      </defs>
    </svg>
  );
}

function Verbos() {
  return (
    <ul className="verbos">
      <li>
        <svg viewBox="0 0 62 62" fill="none" stroke="#191919" strokeWidth="1.1" strokeLinecap="round" aria-hidden="true">
          <path d="M5 33c8-10 17-15 26-15s18 5 26 15c-8 10-17 15-26 15S13 43 5 33z" />
          <circle cx="31" cy="33" r="7.5" fill="#2445C7" stroke="none" />
          <path d="M31 8v6M20 10l2.5 5.5M42 10l-2.5 5.5M11 15l4 4.5M51 15l-4 4.5" />
        </svg>
        Explorá
      </li>
      <li>
        <svg viewBox="0 0 62 62" fill="none" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true">
          <path d="M31 14L8 25l23 11 23-11z" fill="#2445C7" stroke="#2445C7" />
          <path d="M8 33l23 11 23-11" stroke="#191919" />
          <path d="M8 41l23 11 23-11" stroke="#191919" />
        </svg>
        Creá
      </li>
      <li>
        <svg viewBox="0 0 62 62" fill="none" stroke="#191919" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 22L31 9l23 13zM11 22h40v4H11zM8 50h46v4H8zM11 46h40v4H11z" />
          <path d="M16 26v20M22 26v20M40 26v20M46 26v20" />
          <path d="M27 46V35a4 4 0 0 1 8 0v11z" fill="#2445C7" stroke="none" />
        </svg>
        Conservá
      </li>
      <li>
        <svg viewBox="0 0 62 62" fill="none" stroke="#191919" strokeWidth="1.1" aria-hidden="true">
          <path d="M31 31L14 16M31 31l19-9M31 31l-6 21M31 31l17 15" stroke="#2445C7" />
          <circle cx="31" cy="31" r="7" fill="#2445C7" stroke="none" />
          <circle cx="31" cy="31" r="11.5" stroke="#2445C7" strokeWidth=".9" />
          <circle cx="14" cy="16" r="3" fill="#F2EFE6" />
          <circle cx="50" cy="22" r="3" fill="#F2EFE6" />
          <circle cx="25" cy="52" r="3" fill="#F2EFE6" />
          <circle cx="48" cy="46" r="3" fill="#F2EFE6" />
        </svg>
        Conectá
      </li>
    </ul>
  );
}

/** Estela suave que sigue al cursor sobre la portada. No corre si la persona pidió menos movimiento. */
function useEstela() {
  const portada = useRef<HTMLElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const p = portada.current;
    const c = lienzo.current;
    const ctx = c?.getContext("2d");
    if (!p || !c || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let rastro: { x: number; y: number; t: number }[] = [];
    let activo = false;
    const medir = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = p.clientWidth * dpr;
      c.height = p.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const dibujar = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const ahora = performance.now();
      rastro = rastro.filter((q) => ahora - q.t < 900);
      for (let l = -3; l <= 3; l++) {
        ctx.beginPath();
        rastro.forEach((q, n) => {
          const edad = (ahora - q.t) / 900;
          const yy = q.y + l * 5 * (0.3 + edad) + Math.sin(n * 0.5 + l) * 3 * edad;
          if (n === 0) ctx.moveTo(q.x, yy);
          else ctx.lineTo(q.x, yy);
        });
        ctx.strokeStyle = `rgba(36,69,199,${0.34 - Math.abs(l) * 0.07})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (rastro.length) requestAnimationFrame(dibujar);
      else activo = false;
    };
    const mover = (e: PointerEvent) => {
      const r = p.getBoundingClientRect();
      rastro.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
      if (rastro.length > 60) rastro.shift();
      if (!activo) {
        activo = true;
        requestAnimationFrame(dibujar);
      }
    };
    medir();
    addEventListener("resize", medir);
    p.addEventListener("pointermove", mover);
    return () => {
      removeEventListener("resize", medir);
      p.removeEventListener("pointermove", mover);
    };
  }, []);
  return { portada, lienzo };
}

export default function Portada() {
  const lineas = useMemo(() => ondas(), []);
  const svg = useRef<SVGSVGElement>(null);
  const [sumados, setSumados] = useState<{ x: number; y: number; a: [number, number] }[]>([]);
  const { portada, lienzo } = useEstela();

  // Tocar la constelación suma un punto unido al más cercano.
  function sumar(e: MouseEvent) {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * 800;
    const y = ((e.clientY - r.top) / r.height) * 800;
    const todos: [number, number][] = [...PUNTOS, ...NODOS.map((n) => [n.x, n.y] as [number, number]), CENTRO, ...sumados.map((s) => [s.x, s.y] as [number, number])];
    let mejor = todos[0];
    let dm = Infinity;
    for (const q of todos) {
      const d = Math.hypot(q[0] - x, q[1] - y);
      if (d > 30 && d < dm) {
        dm = d;
        mejor = q;
      }
    }
    setSumados((s) => [...s, { x, y, a: mejor }]);
  }

  return (
    <section className="portada" ref={portada}>
      <Iconos />
      <svg className="fondo" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect x="1274" y="0" width="182" height="900" fill="#A1ACCB" opacity=".38" />
        <g fill="none" stroke="#2445C7" strokeWidth=".7" opacity=".55">
          {lineas.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <circle cx="1560" cy="1120" r="410" fill="#2445C7" />
      </svg>
      <canvas className="estela" ref={lienzo} aria-hidden="true" />

      <div className="texto">
        <h1>UMBRAL</h1>
        <p className="lema">Más allá de lo tangible.</p>
        <div className="raya" />
        <p className="bajada">Un museo vivo: los artistas exponen obras y el público las continúa con palabras. Cada huella queda firmada en Stellar.</p>
        <Verbos />
        <div className="acciones">
          <button className="entrar" onClick={() => ir("/cielo")}>
            Atravesar el umbral <span aria-hidden="true">→</span>
          </button>
          <p className="valor">
            <b>Cada huella tiene valor.</b>
            <br />
            Exponer una obra o continuarla se paga con USDC o XLM.
          </p>
        </div>
      </div>

      <div className="constelacion" title="Tocá la constelación para sumar un punto" onClick={sumar}>
        <svg ref={svg} viewBox="0 0 800 800" role="img" aria-label="Constelación de huellas: museo, pintura, objeto, libro, escultura y video conectados entre sí">
          <g fill="none" stroke="#2445C7" strokeWidth="1" strokeDasharray="1 7" strokeLinecap="round" opacity=".8">
            <circle cx="420" cy="360" r="62" />
            <circle cx="420" cy="360" r="112" />
            <circle cx="420" cy="360" r="290" />
          </g>
          <g stroke="#2445C7" strokeWidth="1" opacity=".75">
            {ARISTAS.map(([a, b], n) => {
              const p = pos(a);
              const q = pos(b);
              return <line key={n} className="aparece" style={{ animationDelay: `${0.3 + n * 0.07}s` }} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;
            })}
          </g>
          <g fill="#2445C7">
            {PUNTOS.map(([x, y], n) => (
              <circle key={n} className="aparece" style={{ animationDelay: `${0.2 + n * 0.08}s` }} cx={x} cy={y} r={n % 3 === 0 ? 6.5 : 4} />
            ))}
          </g>
          <g className="aparece" fill="none" stroke="#2445C7" strokeWidth="1.5">
            <g transform={`translate(${CENTRO[0]} ${CENTRO[1]}) rotate(-18)`}>
              {[2, 3, 4, 5, 6].map((k) => (
                <path key={k} d={anillo(k, 6, 36)} />
              ))}
            </g>
          </g>
          <circle className="aparece" cx={CENTRO[0]} cy={CENTRO[1]} r="4.5" fill="#2445C7" />
          <g>
            {NODOS.map((nd, n) => (
              <g key={nd.id} className="nodo aparece" style={{ animationDelay: `${0.5 + n * 0.18}s` }}>
                <circle className="aro" cx={nd.x} cy={nd.y} r="42" />
                <use href={`#i-${nd.id}`} className="icono" transform={`translate(${nd.x - 24} ${nd.y - 24}) scale(2)`} />
                <text x={nd.x} y={nd.y + 62}>
                  {nd.nombre}
                </text>
              </g>
            ))}
          </g>
          <g stroke="#2445C7" strokeWidth="1" fill="#2445C7">
            {sumados.map((s, i) => (
              <g key={i} className="aparece">
                <line x1={s.x} y1={s.y} x2={s.a[0]} y2={s.a[1]} opacity=".75" />
                <circle cx={s.x} cy={s.y} r="5" stroke="none" />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}
