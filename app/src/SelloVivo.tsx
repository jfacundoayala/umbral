// El sello "Estuve ahí" como una moneda de bronce: canto con estrías, cara con luz arriba a la izquierda,
// el logo y los textos en relieve y una sombra debajo. Sigue vivo: anillos que giran, el logo que respira,
// ondas que salen del centro y un latido al tocarlo. Se puede arrastrar y girar; el brillo sigue el giro.
import { useId, useState } from "react";
import { Movible } from "./Movible";

const TRAZOS = [
  "M-52 -36 C-30 -65 24 -78 43 -43 C55 -20 79 23 48 47 C15 76 -36 46 -51 10 C-62 -10 -65 -19 -52 -36Z",
  "M-67 -19 C-66 -45 -12 -61 17 -49 C39 -40 52 -3 50 19 C47 45 17 52 -14 36 C-41 23 -72 8 -67 -19Z",
  "M-38 -22 C-20 -44 8 -37 25 -14 C43 9 43 24 20 31 C-5 37 -39 11 -44 -5 C-47 -12 -44 -17 -38 -22Z",
];

/** Las estrías del canto, como en una moneda. */
const ESTRIAS = Array.from({ length: 96 }, (_, i) => {
  const a = (i / 96) * Math.PI * 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return `M${(c * 141).toFixed(1)} ${(s * 141).toFixed(1)} L${(c * 151).toFixed(1)} ${(s * 151).toFixed(1)}`;
}).join(" ");

/** Reverso: la obra al centro y sus huellas alrededor, unidas. */
const REVERSO_PUNTOS: [number, number, number][] = [[0, 0, 9], [-44, -26, 6], [38, -38, 5], [50, 18, 6], [-30, 34, 5], [-70, 6, 4]];
const REVERSO_LINEAS = "M0 0 L-44 -26 L-70 6 M0 0 L38 -38 M0 0 L50 18 M0 0 L-30 34";

/** `chico`: sin textos, para el costado de la ficha. */
export function SelloVivo({ chico = false, className = "" }: { chico?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const [latidos, setLatidos] = useState(0);
  const latir = () => setLatidos((n) => n + 1);
  const u = (n: string) => `url(#${n}-${id})`;

  return (
    <Movible
      className={`sello-vivo sello-moneda ${chico ? "sello-vivo-chico" : ""} ${className}`}
      forma="moneda"
      grosor={chico ? 4 : 16}
      dorso={
        <svg viewBox="-160 -160 320 320" aria-hidden="true">
          <circle r="152" fill={u("canto")} />
          <path d={ESTRIAS} stroke="#3E1E0E" strokeOpacity=".55" strokeWidth={chico ? 3 : 1.6} />
          <circle r="140" fill={u("cara")} />
          <circle r="140" fill="#000" filter={u("grano")} />
          <circle r="129" fill="none" stroke="#B77443" strokeWidth="4" filter={u("relieve")} />
          {/* Reverso: una constelación chica, la que arma cada obra con sus huellas. */}
          <g filter={u("relieve")} transform={chico ? "scale(1.3)" : "translate(0 -34)"}>
            <path d={REVERSO_LINEAS} fill="none" stroke="#B87445" strokeWidth={chico ? 4 : 2.4} strokeLinecap="round" />
            {REVERSO_PUNTOS.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={chico ? r * 1.6 : r} fill={i === 0 ? "#7A3B1E" : "#BE7A49"} />
            ))}
          </g>
          {!chico && (
            <g filter={u("relieve")}>
              <text className="sv-texto" y="50" textAnchor="middle">UMBRAL</text>
              <text className="sv-modo" y="72" textAnchor="middle">MUSEO VIVO</text>
              <text className="sv-modo" y="92" textAnchor="middle" style={{ fontSize: 10 }}>RESISTENCIA · CHACO</text>
            </g>
          )}
        </svg>
      }
    >
      <svg
        viewBox="-160 -160 320 320"
        role="img"
        aria-label="Sello Estuve ahí, presencial, de UMBRAL ABIERTO"
        onClick={latir}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && latir()}
        tabIndex={chico ? -1 : 0}
      >
        <defs>
          {/* Canto: bronce oscuro con un reflejo arriba a la izquierda. */}
          <linearGradient id={`canto-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E9BE8A" />
            <stop offset=".35" stopColor="#B8683E" />
            <stop offset=".7" stopColor="#7C3F22" />
            <stop offset="1" stopColor="#4E2714" />
          </linearGradient>
          {/* Cara: latón y cobre, con la luz arriba a la izquierda. */}
          <radialGradient id={`cara-${id}`} cx=".34" cy=".3" r=".85">
            <stop offset="0" stopColor="#F4D3A2" />
            <stop offset=".35" stopColor="#D59A63" />
            <stop offset=".75" stopColor="#B26A3E" />
            <stop offset="1" stopColor="#8A4B2A" />
          </radialGradient>
          <linearGradient id={`borde-luz-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF1D8" stopOpacity=".95" />
            <stop offset=".5" stopColor="#FFF1D8" stopOpacity="0" />
            <stop offset=".5" stopColor="#3E1E0E" stopOpacity="0" />
            <stop offset="1" stopColor="#3E1E0E" stopOpacity=".8" />
          </linearGradient>
          <linearGradient id={`borde-sombra-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3E1E0E" stopOpacity=".7" />
            <stop offset=".5" stopColor="#3E1E0E" stopOpacity="0" />
            <stop offset=".5" stopColor="#FFF1D8" stopOpacity="0" />
            <stop offset="1" stopColor="#FFF1D8" stopOpacity=".8" />
          </linearGradient>
          {/* Relieve: una luz clara arriba a la izquierda y una sombra abajo a la derecha. */}
          <filter id={`relieve-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feOffset in="SourceAlpha" dx="-1.1" dy="-1.1" result="a" />
            <feFlood floodColor="#FFEBCB" floodOpacity=".9" />
            <feComposite in2="a" operator="in" result="luz" />
            <feOffset in="SourceAlpha" dx="1.5" dy="1.7" result="b" />
            <feGaussianBlur in="b" stdDeviation=".5" result="bb" />
            <feFlood floodColor="#40200F" floodOpacity=".85" />
            <feComposite in2="bb" operator="in" result="sombra" />
            <feMerge>
              <feMergeNode in="sombra" />
              <feMergeNode in="luz" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Textura del metal: un grano muy fino. */}
          <filter id={`grano-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" />
            <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .16  0 0 0 0 .08  0 0 0 .22 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <path id={`giro-${id}`} d="M0 -114 A114 114 0 1 1 -0.1 -114" />
        </defs>

        {/* Canto con estrías. */}
        <circle r="152" fill={u("canto")} />
        <path d={ESTRIAS} stroke="#3E1E0E" strokeOpacity=".55" strokeWidth={chico ? 3 : 1.6} />
        <circle r="152" fill="none" stroke="#2E160A" strokeOpacity=".5" strokeWidth="1.5" />

        {/* Cara de la moneda, levemente hundida respecto del canto. */}
        <circle r="140" fill={u("cara")} />
        <circle r="140" fill="#000" filter={u("grano")} />
        <circle r="139" fill="none" stroke={u("borde-sombra")} strokeWidth="3" />
        {/* Gráfila: el anillo en relieve que rodea la cara. */}
        <circle r="129" fill="none" stroke="#B77443" strokeWidth="4" filter={u("relieve")} />
        <circle r="129" fill="none" stroke={u("borde-luz")} strokeWidth="1.2" />

        {/* Ondas de resonancia grabadas en la cara: salen del centro y se apagan. */}
        <g className="sv-ondas" fill="none">
          {[0, 1, 2].map((i) => (
            <circle key={i} r="36" className="sv-onda" style={{ animationDelay: `${i * 1.4}s` }} />
          ))}
        </g>
        {latidos > 0 && (
          <g key={latidos} fill="none">
            <circle r="36" className="sv-latido" />
            <circle r="36" className="sv-latido sv-latido-2" />
          </g>
        )}

        <g transform={chico ? "scale(.82)" : "scale(.66)"} filter={u("relieve")}>
          <g className="sv-arcos-a" fill="none" stroke="#B87445" strokeWidth={chico ? 4 : 2.6} strokeLinecap="round">
            <path d="M-129 -28 C-145 -85 -94 -133 -33 -141 M40 -135 C107 -123 148 -77 140 -16 M138 55 C119 113 61 142 4 140 M-63 132 C-112 113 -139 80 -139 47" />
          </g>
          {!chico && (
            <g className="sv-arcos-b" fill="none" stroke="#B87445" strokeWidth="1.8" strokeLinecap="round" opacity=".8">
              <path d="M-138 -65 C-111 -116 -75 -124 -48 -127 M61 -118 C100 -105 123 -69 127 -45 M124 83 C92 124 50 129 25 129 M-76 119 C-109 100 -125 74 -128 65" />
            </g>
          )}
        </g>

        {!chico && (
          <g filter={u("relieve")}>
            <text className="sv-giro-texto">
              <textPath href={`#giro-${id}`} startOffset="0" textLength="712" lengthAdjust="spacing">
                UMBRAL ABIERTO · ESTUVE AHÍ · PRESENCIAL · MUSEO VIVO ·
              </textPath>
            </text>
          </g>
        )}

        <g filter={u("relieve")}>
          <g className="sv-iso" transform={chico ? "scale(.9)" : "translate(0 -22) scale(.6)"}>
            {TRAZOS.map((d, i) => (
              <path key={i} d={d} className={`sv-trazo sv-trazo-${i}`} fill="none" stroke="#BE7A49" strokeWidth={chico ? 4.5 : 3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
            <circle r="8" className="sv-punto" />
          </g>
          {!chico && (
            <>
              <text className="sv-texto" y="50" textAnchor="middle">Estuve ahí</text>
              <text className="sv-modo" y="71" textAnchor="middle">PRESENCIAL</text>
            </>
          )}
        </g>
      </svg>
    </Movible>
  );
}
