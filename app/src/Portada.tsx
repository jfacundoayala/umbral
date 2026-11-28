// Portada (opción 2 de Lucía, 28/11): composición centrada, una obra suspendida entre órbitas finas
// y una sola acción. Mirar es libre y no pide cuenta.
import { useEffect, useRef } from "react";
import { ir } from "./comun";
import { PortadaMas } from "./PortadaMas";

/** "Entre raíces", primera obra de la Colección 001 (obra de muestra). */
const OBRA_PORTADA = "e11edfb7b8f6b72e5f3f6cd7f48e85229cf3dd5eef60825f999586ffa6d0f607";

/** Órbitas finas alrededor de la obra, con algunas huellas (puntos) sobre ellas. */
function Orbitas() {
  const orbitas = [
    { rx: 430, ry: 100, rot: -6, puntos: [0.08, 0.57] },
    { rx: 360, ry: 120, rot: 10, puntos: [0.33, 0.81] },
    { rx: 300, ry: 80, rot: -16, puntos: [0.66] },
    { rx: 470, ry: 150, rot: 3, puntos: [0.2, 0.45] },
  ];
  return (
    <svg className="orbitas" viewBox="-500 -260 1000 520" aria-hidden="true">
      {orbitas.map((o, i) => (
        <g key={i} className={`orbita orbita-${i}`} transform={`rotate(${o.rot})`}>
          <ellipse rx={o.rx} ry={o.ry} fill="none" stroke="currentColor" strokeWidth="1" opacity={0.42 - i * 0.05} />
          {o.puntos.map((t, j) => (
            <circle key={j} cx={o.rx * Math.cos(t * 2 * Math.PI)} cy={o.ry * Math.sin(t * 2 * Math.PI)} r={j === 0 ? 5 : 3.5} fill="currentColor" />
          ))}
        </g>
      ))}
    </svg>
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
        ctx.strokeStyle = `rgba(49,75,73,${0.34 - Math.abs(l) * 0.07})`;
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
  const { portada, lienzo } = useEstela();
  return (
    <>
      <section className="portada portada-centrada" ref={portada}>
        <canvas className="estela" ref={lienzo} aria-hidden="true" />
        <p className="rotulo portada-rotulo">Museo vivo · Resistencia, Chaco</p>
        <h1>Más allá de lo tangible.</h1>
        <div className="portada-escena">
          <Orbitas />
          <button className="portada-obra" onClick={() => ir(`/obra/${OBRA_PORTADA}`)} aria-label="Ver la obra Entre raíces y sus huellas">
            <img src="/portada/entre-raices.webp" width="510" height="510" alt="Entre raíces: dos formas curvas de madera entrelazadas sobre una base neutra." fetchPriority="high" />
          </button>
        </div>
        <p className="bajada">Un museo vivo donde las obras siguen creciendo con las personas.</p>
        <button className="entrar" onClick={() => ir("/cielo")}>
          Explorá el museo <span aria-hidden="true">→</span>
        </button>
        <p className="libre">Mirar es libre. No necesitás una cuenta.</p>
      </section>
      <PortadaMas />
    </>
  );
}
