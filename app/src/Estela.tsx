// La estela del cursor: siete líneas finas que siguen al puntero en toda la web.
import { useEffect, useRef } from "react";

export function Estela() {
  const lienzo = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = lienzo.current;
    const ctx = c?.getContext("2d");
    // Solo con mouse o lápiz y sin "reducir movimiento": en el celular el dedo ya tapa la pantalla.
    if (!c || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    let rastro: { x: number; y: number; t: number }[] = [];
    let activo = false;
    const medir = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const dibujar = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
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
      if (e.pointerType === "touch") return;
      rastro.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (rastro.length > 60) rastro.shift();
      if (!activo) {
        activo = true;
        requestAnimationFrame(dibujar);
      }
    };
    // Al bajar o subir la página, el rastro viejo se borra para que no quede corrido.
    const desplazar = () => {
      rastro = [];
    };
    medir();
    addEventListener("resize", medir);
    addEventListener("pointermove", mover, { passive: true });
    addEventListener("scroll", desplazar, { passive: true });
    return () => {
      removeEventListener("resize", medir);
      removeEventListener("pointermove", mover);
      removeEventListener("scroll", desplazar);
    };
  }, []);
  return <canvas className="estela-global" ref={lienzo} aria-hidden="true" />;
}
