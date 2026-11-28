// Una obra que se puede mover: se inclina siguiendo el cursor, se gira y se desliza al arrastrarla,
// y vuelve sola a su lugar con un resorte, como las constelaciones.
import { useEffect, useRef, type ReactNode } from "react";

const MAX_GIRO_Y = 55;
const MAX_GIRO_X = 35;
const MAX_DESLIZ = 36;

export function Movible({ children, className = "" }: { children: ReactNode; className?: string }) {
  const caja = useRef<HTMLSpanElement>(null);
  const movio = useRef(false);

  useEffect(() => {
    const el = caja.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Estado: giro (rx, ry), desliz (tx, ty) y sus velocidades. "meta" es hacia dónde vuelve el resorte.
    const s = { rx: 0, ry: 0, tx: 0, ty: 0, vrx: 0, vry: 0, vtx: 0, vty: 0, metaX: 0, metaY: 0 };
    let arrastre: { id: number; x: number; y: number; ux: number; uy: number; t: number } | null = null;
    let cuadro = 0;
    const limitar = (v: number, m: number) => Math.max(-m, Math.min(m, v));

    const pintar = () => {
      const escala = arrastre ? 1.04 : 1 + Math.min(0.02, (Math.abs(s.rx) + Math.abs(s.ry)) / 2000);
      el.style.transform = `perspective(900px) translate3d(${s.tx.toFixed(1)}px, ${s.ty.toFixed(1)}px, 0) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg) scale(${escala.toFixed(3)})`;
      const sombra = 10 + Math.abs(s.ry) / 3 + Math.abs(s.rx) / 3;
      el.style.setProperty("--sombra-x", `${(-s.ry / 4).toFixed(1)}px`);
      el.style.setProperty("--sombra-y", `${(8 + s.rx / 4).toFixed(1)}px`);
      el.style.setProperty("--sombra-b", `${sombra.toFixed(1)}px`);
      el.style.setProperty("--brillo-x", `${(50 + s.ry).toFixed(1)}%`);
      el.style.setProperty("--brillo-y", `${(50 - s.rx).toFixed(1)}%`);
    };

    const paso = () => {
      if (!arrastre) {
        // Resorte con amortiguación: vuelve a la meta (0, o la inclinación del cursor) con un rebote suave.
        s.vry += (s.metaY - s.ry) * 0.06;
        s.vrx += (s.metaX - s.rx) * 0.06;
        s.vtx += -s.tx * 0.07;
        s.vty += -s.ty * 0.07;
        for (const k of ["vrx", "vry", "vtx", "vty"] as const) s[k] *= 0.84;
        s.ry += s.vry;
        s.rx += s.vrx;
        s.tx += s.vtx;
        s.ty += s.vty;
      }
      pintar();
      const quieto =
        !arrastre &&
        Math.abs(s.ry - s.metaY) + Math.abs(s.rx - s.metaX) + Math.abs(s.tx) + Math.abs(s.ty) < 0.05 &&
        Math.abs(s.vry) + Math.abs(s.vrx) + Math.abs(s.vtx) + Math.abs(s.vty) < 0.05;
      cuadro = quieto ? 0 : requestAnimationFrame(paso);
    };
    const despertar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(paso);
    };

    const encima = (e: PointerEvent) => {
      if (arrastre || e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      s.metaY = ((e.clientX - r.left) / r.width - 0.5) * 16;
      s.metaX = -((e.clientY - r.top) / r.height - 0.5) * 12;
      despertar();
    };
    const salir = () => {
      s.metaX = 0;
      s.metaY = 0;
      despertar();
    };
    const bajar = (e: PointerEvent) => {
      if (e.button !== 0) return;
      arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, ux: e.clientX, uy: e.clientY, t: performance.now() };
      movio.current = false;
      s.vrx = s.vry = s.vtx = s.vty = 0;
      el.classList.add("moviendo");
      despertar();
    };
    const arrastrar = (e: PointerEvent) => {
      if (!arrastre || e.pointerId !== arrastre.id) {
        encima(e);
        return;
      }
      const dx = e.clientX - arrastre.ux;
      const dy = e.clientY - arrastre.uy;
      if (!movio.current && Math.hypot(e.clientX - arrastre.x, e.clientY - arrastre.y) > 6) {
        movio.current = true;
        // Desde acá el puntero es de la obra: el arrastre sigue aunque el cursor salga de ella.
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Sin un puntero activo (por ejemplo, un evento simulado), el arrastre sigue igual dentro de la obra.
        }
      }
      if (!movio.current) return;
      const ahora = performance.now();
      const dt = Math.max(8, ahora - arrastre.t);
      s.ry = limitar(s.ry + dx * 0.45, MAX_GIRO_Y);
      s.rx = limitar(s.rx - dy * 0.35, MAX_GIRO_X);
      s.tx = limitar(s.tx + dx * 0.25, MAX_DESLIZ);
      s.ty = limitar(s.ty + dy * 0.18, MAX_DESLIZ);
      // La velocidad del último tramo queda como impulso al soltar.
      s.vry = ((dx * 0.45) / dt) * 16;
      s.vrx = ((-dy * 0.35) / dt) * 16;
      arrastre.ux = e.clientX;
      arrastre.uy = e.clientY;
      arrastre.t = ahora;
    };
    const soltar = (e: PointerEvent) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      arrastre = null;
      el.classList.remove("moviendo");
      s.metaX = 0;
      s.metaY = 0;
      despertar();
    };

    el.addEventListener("pointerenter", encima);
    el.addEventListener("pointermove", arrastrar);
    el.addEventListener("pointerleave", salir);
    el.addEventListener("pointerdown", bajar);
    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
    return () => {
      cancelAnimationFrame(cuadro);
      el.removeEventListener("pointerenter", encima);
      el.removeEventListener("pointermove", arrastrar);
      el.removeEventListener("pointerleave", salir);
      el.removeEventListener("pointerdown", bajar);
      el.removeEventListener("pointerup", soltar);
      el.removeEventListener("pointercancel", soltar);
    };
  }, []);

  return (
    <span
      ref={caja}
      className={`movible ${className}`}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        // Si fue un arrastre, no es un clic: no abre la obra.
        if (movio.current) {
          e.preventDefault();
          e.stopPropagation();
          movio.current = false;
        }
      }}
    >
      {children}
    </span>
  );
}
