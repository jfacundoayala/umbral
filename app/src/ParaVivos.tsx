// "Para quién es" con vida: cada tarjeta tiene su ilustración animada, un degradado de la paleta
// y entra en movimiento cuando aparece en pantalla, como "Cómo funciona".
import { useEffect, useRef, useState } from "react";
import { Movible } from "./Movible";

/** Artistas: un marco donde se dibuja un trazo y, al terminar, nacen estrellas. */
function Artista() {
  return (
    <svg viewBox="-100 -70 200 140" aria-hidden="true">
      <rect x="-62" y="-50" width="124" height="96" rx="4" fill="#F7F2E8" stroke="currentColor" strokeWidth="1.6" />
      <rect x="-52" y="-40" width="104" height="76" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".4" />
      <path className="pa-trazo" d="M-40 22 C-24 -26 -2 30 12 -6 S40 -30 42 -18" fill="none" stroke="#B8683E" strokeWidth="3" strokeLinecap="round" />
      <line x1="-30" y1="46" x2="-44" y2="64" stroke="currentColor" strokeWidth="1.6" />
      <line x1="30" y1="46" x2="44" y2="64" stroke="currentColor" strokeWidth="1.6" />
      {[
        [74, -46, 0.4],
        [84, 10, 1.1],
        [-80, -30, 1.8],
        [-76, 30, 2.5],
      ].map(([x, y, d], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" className="pv-titila" style={{ animationDelay: `${d}s` }} />
      ))}
    </svg>
  );
}

/** Salas y museos: una puerta en arco y la gente que entra, de a uno. */
function Sala() {
  return (
    <svg viewBox="-100 -70 200 140" aria-hidden="true">
      <path d="M-90 50 H90" stroke="currentColor" strokeWidth="1.2" opacity=".5" />
      <path d="M8 50 V-14 A34 34 0 0 1 76 -14 V50" fill="#F7F2E8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 50 V-12 A22 22 0 0 1 64 -12 V50" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".45" />
      <circle cx="42" cy="-30" r="4" className="pv-titila" />
      {[0, 1, 2].map((i) => (
        <g key={i} className="pa-entra" style={{ animationDelay: `${i * 1.3}s` }}>
          <circle cx="-70" cy="22" r="7" fill={i === 1 ? "#B8683E" : "currentColor"} />
          <path d="M-79 50 C-79 36 -61 36 -61 50" fill={i === 1 ? "#B8683E" : "currentColor"} />
        </g>
      ))}
    </svg>
  );
}

/** Público: tres personas y, de cada una, una palabra que sube y se vuelve estrella. */
function Publico() {
  return (
    <svg viewBox="-100 -70 200 140" aria-hidden="true">
      {[-52, 0, 52].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="22" r="9" fill="currentColor" opacity={i === 1 ? 1 : 0.75} />
          <path d={`M${x - 15} 56 C${x - 15} 36 ${x + 15} 36 ${x + 15} 56`} fill="currentColor" opacity={i === 1 ? 1 : 0.75} />
          <g className="pa-sube" style={{ animationDelay: `${i * 0.9}s` }}>
            <line x1={x} y1="4" x2={x} y2="-16" stroke="#B8683E" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx={x} cy="-22" r="4.5" fill="#B8683E" />
          </g>
        </g>
      ))}
      <path d="M-52 -40 L0 -54 L52 -40" fill="none" stroke="currentColor" strokeWidth="1" opacity=".35" className="pa-lazo" />
    </svg>
  );
}

const ILUS = [Artista, Sala, Publico];

type Para = { readonly quien: string; readonly texto: string; readonly accion: string; readonly destino: string };

export function ParaVivos({ items }: { items: readonly Para[] }) {
  const lista = useRef<HTMLUListElement>(null);
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
      { threshold: 0.2 },
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);

  return (
    <ul className={`pmas-para para-vivos ${visible ? "a-la-vista" : ""}`} ref={lista}>
      {items.map((p, i) => {
        const Ilus = ILUS[i % ILUS.length];
        return (
          <li key={p.quien} className={`pa-tarjeta pa-tarjeta-${i}`} style={{ transitionDelay: `${i * 140}ms` }}>
            <Movible className="pv-ilus">
              <Ilus />
            </Movible>
            <h3>{p.quien}</h3>
            <p>{p.texto}</p>
            <a className="pmas-enlace" href={`#${p.destino}`}>
              {p.accion} <span aria-hidden="true">→</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Fondo del cierre: una constelación que se dibuja sola, con estrellas que titilan. */
export function CierreCielo() {
  const estrellas: [number, number, number][] = [
    [60, 90, 3], [180, 40, 2], [250, 150, 3.5], [380, 70, 2.5], [470, 190, 3], [560, 60, 2], [700, 120, 3.5],
    [820, 50, 2.5], [900, 170, 3], [980, 80, 2], [120, 230, 2], [330, 260, 2.5], [640, 250, 2], [860, 280, 2.5], [40, 300, 2],
  ];
  const lineas = [
    [0, 2], [2, 3], [3, 4], [4, 6], [6, 7], [7, 8], [8, 9], [1, 3], [5, 6], [10, 11], [12, 13],
  ];
  return (
    <svg className="cierre-cielo" viewBox="0 0 1000 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {lineas.map(([a, b], i) => (
        <line
          key={i}
          x1={estrellas[a][0]}
          y1={estrellas[a][1]}
          x2={estrellas[b][0]}
          y2={estrellas[b][1]}
          className="cc-linea"
          pathLength={1}
          style={{ animationDelay: `${(i * 0.7) % 6}s` }}
        />
      ))}
      {estrellas.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} className="cc-estrella" style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
      ))}
    </svg>
  );
}
