// Una obra que se puede mover: se inclina siguiendo el cursor, se gira y se desliza al arrastrarla,
// y vuelve sola a su lugar con un resorte, como las constelaciones. Con `zoom`, doble clic (o doble toque)
// acerca la imagen en ese punto; acercada, se arrastra para recorrerla y la rueda cambia el aumento.
import { useEffect, useRef, type ReactNode } from "react";

const MAX_GIRO_Y = 55;
const MAX_GIRO_X = 35;
const MAX_DESLIZ = 36;
const AUMENTO = 2.4;
const AUMENTO_MAX = 4;

export function Movible({ children, className = "", zoom = false }: { children: ReactNode; className?: string; zoom?: boolean }) {
  const caja = useRef<HTMLSpanElement>(null);
  const movio = useRef(false);

  useEffect(() => {
    const el = caja.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Estado: giro (rx, ry), desliz (tx, ty) y sus velocidades. "meta" es hacia dónde vuelve el resorte.
    const s = { rx: 0, ry: 0, tx: 0, ty: 0, vrx: 0, vry: 0, vtx: 0, vty: 0, metaX: 0, metaY: 0, z: 1, zMeta: 1, px: 0, py: 0, pxMeta: 0, pyMeta: 0 };
    let ultimoToque = { t: 0, x: 0, y: 0 };
    const acercada = () => s.zMeta > 1.01;
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
      el.style.setProperty("--z", s.z.toFixed(3));
      el.style.setProperty("--px", `${s.px.toFixed(1)}px`);
      el.style.setProperty("--py", `${s.py.toFixed(1)}px`);
    };
    /** El recorrido posible con un aumento dado, para que la imagen no deje ver sus bordes. */
    const encuadrar = () => {
      const r = el.getBoundingClientRect();
      s.pxMeta = limitar(s.pxMeta, ((s.zMeta - 1) * r.width) / 2);
      s.pyMeta = limitar(s.pyMeta, ((s.zMeta - 1) * r.height) / 2);
    };
    /** Acerca o aleja manteniendo quieto el punto (cx, cy) de la pantalla. */
    const aumentar = (nuevo: number, cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      const dx = cx - (r.left + r.width / 2);
      const dy = cy - (r.top + r.height / 2);
      const z0 = s.zMeta;
      s.zMeta = Math.max(1, Math.min(AUMENTO_MAX, nuevo));
      // El punto bajo el cursor está en (d - p) / z de la imagen: se busca que quede en el mismo lugar.
      s.pxMeta = dx - ((dx - s.pxMeta) / z0) * s.zMeta;
      s.pyMeta = dy - ((dy - s.pyMeta) / z0) * s.zMeta;
      if (s.zMeta <= 1.01) s.pxMeta = s.pyMeta = 0;
      encuadrar();
      el.classList.toggle("acercada", acercada());
      el.style.touchAction = acercada() ? "none" : "";
      despertar();
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
      s.z += (s.zMeta - s.z) * 0.22;
      s.px += (s.pxMeta - s.px) * 0.3;
      s.py += (s.pyMeta - s.py) * 0.3;
      pintar();
      const quieto =
        !arrastre &&
        Math.abs(s.ry - s.metaY) + Math.abs(s.rx - s.metaX) + Math.abs(s.tx) + Math.abs(s.ty) < 0.05 &&
        Math.abs(s.vry) + Math.abs(s.vrx) + Math.abs(s.vtx) + Math.abs(s.vty) < 0.05 &&
        Math.abs(s.z - s.zMeta) < 0.002 &&
        Math.abs(s.px - s.pxMeta) + Math.abs(s.py - s.pyMeta) < 0.2;
      cuadro = quieto ? 0 : requestAnimationFrame(paso);
    };
    const despertar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(paso);
    };

    const encima = (e: PointerEvent) => {
      if (arrastre || e.pointerType === "touch") return;
      if (acercada()) {
        s.metaX = s.metaY = 0;
        return;
      }
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
      if (acercada()) {
        // Acercada: arrastrar recorre la imagen en vez de girarla.
        s.pxMeta += dx;
        s.pyMeta += dy;
        encuadrar();
        arrastre.ux = e.clientX;
        arrastre.uy = e.clientY;
        despertar();
        return;
      }
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
      // Doble toque en el celular: dos toques cortos, cerca y seguidos.
      if (zoom && e.pointerType !== "mouse" && !movio.current) {
        const ahora = performance.now();
        if (ahora - ultimoToque.t < 320 && Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < 30) {
          aumentar(acercada() ? 1 : AUMENTO, e.clientX, e.clientY);
          ultimoToque = { t: 0, x: 0, y: 0 };
        } else ultimoToque = { t: ahora, x: e.clientX, y: e.clientY };
      }
      arrastre = null;
      el.classList.remove("moviendo");
      s.metaX = 0;
      s.metaY = 0;
      despertar();
    };

    const dobleClic = (e: MouseEvent) => {
      e.preventDefault();
      aumentar(acercada() ? 1 : AUMENTO, e.clientX, e.clientY);
    };
    const rueda = (e: WheelEvent) => {
      // La rueda solo cambia el aumento si la imagen ya está acercada: si no, la página baja como siempre.
      if (!acercada()) return;
      e.preventDefault();
      aumentar(s.zMeta * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    if (zoom) {
      el.addEventListener("dblclick", dobleClic);
      el.addEventListener("wheel", rueda, { passive: false });
    }
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
      el.removeEventListener("dblclick", dobleClic);
      el.removeEventListener("wheel", rueda);
    };
  }, [zoom]);

  return (
    <span
      ref={caja}
      className={`movible ${zoom ? "movible-zoom" : ""} ${className}`}
      title={zoom ? "Arrastrala para girarla. Doble clic para acercar." : undefined}
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
