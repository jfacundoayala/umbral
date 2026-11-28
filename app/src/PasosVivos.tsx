// "Cómo funciona" con vida: cada paso tiene su ilustración animada en los colores de la identidad,
// y los pasos entran en movimiento cuando aparecen en pantalla.
import { useEffect, useRef, useState } from "react";
import { Movible } from "./Movible";

/** Paso 1: mirar. Un ojo hecho de órbitas, con estrellas que titilan alrededor. */
function Mirar() {
  return (
    <svg viewBox="-100 -70 200 140" aria-hidden="true">
      <g className="pv-orbita-lenta" fill="none" stroke="currentColor" strokeWidth="1.2">
        <ellipse rx="82" ry="34" opacity=".5" />
        <ellipse rx="64" ry="48" opacity=".35" transform="rotate(18)" />
      </g>
      <path d="M-58 0 C-30 -34 30 -34 58 0 C30 34 -30 34 -58 0Z" fill="#F7F2E8" stroke="currentColor" strokeWidth="1.6" />
      <circle r="17" className="pv-iris" />
      <circle r="7" fill="#1E1B18" className="pv-pupila" />
      {[
        [-80, -46, 0],
        [74, -52, 0.6],
        [88, 30, 1.2],
        [-70, 50, 1.8],
        [6, -62, 2.4],
      ].map(([x, y, d], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" className="pv-titila" style={{ animationDelay: `${d}s` }} />
      ))}
    </svg>
  );
}

/** Paso 2: dejar una huella. Una línea nueva se dibuja desde la obra y nace una estrella. */
function Huella() {
  return (
    <svg viewBox="-100 -70 200 140" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.2" opacity=".45">
        <line x1="-40" y1="10" x2="-78" y2="-34" />
        <line x1="-40" y1="10" x2="-74" y2="46" />
        <line x1="-40" y1="10" x2="6" y2="-44" />
      </g>
      <circle cx="-78" cy="-34" r="4" fill="currentColor" opacity=".6" />
      <circle cx="-74" cy="46" r="4" fill="currentColor" opacity=".6" />
      <circle cx="6" cy="-44" r="4" fill="currentColor" opacity=".6" />
      <path className="pv-trazo-nuevo" d="M-40 10 C0 20 34 36 66 18" fill="none" stroke="#B8683E" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="66" cy="18" r="6" className="pv-estrella-nueva" />
      <circle cx="66" cy="18" r="6" className="pv-onda-nueva" fill="none" />
      <circle cx="-40" cy="10" r="11" fill="#314B49" />
      <circle cx="-40" cy="10" r="4" fill="#F2EDE3" />
    </svg>
  );
}

/** Paso 3: el reparto. Un anillo que se llena hasta el 80%, con el número que cuenta. */
function Reparto({ visible }: { visible: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visible) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(80);
      return;
    }
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / 1400);
      setN(Math.round(80 * (1 - Math.pow(1 - k, 3))));
      if (k < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [visible]);
  const largo = 2 * Math.PI * 48;
  return (
    <svg viewBox="-100 -70 200 140" aria-hidden="true">
      <circle r="48" fill="none" stroke="#D9CBB2" strokeWidth="12" />
      <circle
        r="48"
        fill="none"
        stroke="#B8683E"
        strokeWidth="12"
        strokeLinecap="round"
        transform="rotate(-90)"
        strokeDasharray={`${(largo * n) / 100} ${largo}`}
      />
      <text y="9" textAnchor="middle" className="pv-numero">{n}%</text>
      <g className="pv-orbita-lenta">
        <circle cx="72" cy="-30" r="5" fill="#314B49" />
        <circle cx="-74" cy="28" r="3.5" fill="#5E6654" />
      </g>
    </svg>
  );
}

type Paso = readonly [string, string];

export function PasosVivos({ pasos }: { pasos: readonly Paso[] }) {
  const lista = useRef<HTMLOListElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          o.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);

  const ilus = [<Mirar key="m" />, <Huella key="h" />, <Reparto key="r" visible={visible} />];
  return (
    <ol className={`pmas-pasos pasos-vivos ${visible ? "a-la-vista" : ""}`} ref={lista}>
      {pasos.map(([t, d], i) => (
        <li key={t} className={`pv-paso pv-paso-${i}`} style={{ transitionDelay: `${i * 140}ms` }}>
          <Movible className="pv-ilus">{ilus[i]}</Movible>
          <span className="pmas-n" aria-hidden="true">{i + 1}</span>
          <h3>{t}</h3>
          <p>{d}</p>
        </li>
      ))}
    </ol>
  );
}
