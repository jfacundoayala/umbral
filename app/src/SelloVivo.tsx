// El sello "Estuve ahí" vivo: anillos que giran, el logo que respira, ondas de resonancia que salen del
// centro y el texto en círculo. Se puede arrastrar y girar como las obras; al tocarlo, late.
import { useId, useState } from "react";
import { Movible } from "./Movible";

const TRAZOS = [
  "M-52 -36 C-30 -65 24 -78 43 -43 C55 -20 79 23 48 47 C15 76 -36 46 -51 10 C-62 -10 -65 -19 -52 -36Z",
  "M-67 -19 C-66 -45 -12 -61 17 -49 C39 -40 52 -3 50 19 C47 45 17 52 -14 36 C-41 23 -72 8 -67 -19Z",
  "M-38 -22 C-20 -44 8 -37 25 -14 C43 9 43 24 20 31 C-5 37 -39 11 -44 -5 C-47 -12 -44 -17 -38 -22Z",
];

/** `chico`: sin textos, para el costado de la ficha. */
export function SelloVivo({ chico = false, className = "" }: { chico?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const [latidos, setLatidos] = useState(0);
  const latir = () => setLatidos((n) => n + 1);

  return (
    <Movible className={`sello-vivo ${chico ? "sello-vivo-chico" : ""} ${className}`}>
      <svg
        viewBox="-160 -160 320 320"
        role="img"
        aria-label="Sello Estuve ahí, presencial, de UMBRAL ABIERTO"
        onClick={latir}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && latir()}
        tabIndex={chico ? -1 : 0}
      >
        <defs>
          <radialGradient id={`luz-${id}`}>
            <stop offset="0" stopColor="#F7F2E8" />
            <stop offset=".7" stopColor="#EDE5D5" />
            <stop offset="1" stopColor="#E4D9C4" stopOpacity="0" />
          </radialGradient>
          <path id={`giro-${id}`} d="M0 -112 A112 112 0 1 1 -0.1 -112" />
        </defs>
        <circle r="150" fill={`url(#luz-${id})`} />

        {/* Ondas de resonancia: salen del centro y se apagan, una detrás de otra. */}
        <g className="sv-ondas" fill="none">
          {[0, 1, 2].map((i) => (
            <circle key={i} r="40" className="sv-onda" style={{ animationDelay: `${i * 1.4}s` }} />
          ))}
        </g>
        {/* Un latido extra cada vez que se toca el sello. */}
        {latidos > 0 && (
          <g key={latidos} fill="none">
            <circle r="40" className="sv-latido" />
            <circle r="40" className="sv-latido sv-latido-2" />
          </g>
        )}

        <g className="sv-arcos-a" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M-129 -28 C-145 -85 -94 -133 -33 -141 M40 -135 C107 -123 148 -77 140 -16 M138 55 C119 113 61 142 4 140 M-63 132 C-112 113 -139 80 -139 47" />
        </g>
        <g className="sv-arcos-b" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".6">
          <path d="M-138 -65 C-111 -116 -75 -124 -48 -127 M61 -118 C100 -105 123 -69 127 -45 M124 83 C92 124 50 129 25 129 M-76 119 C-109 100 -125 74 -128 65" />
        </g>

        {!chico && (
          <text className="sv-giro-texto">
            <textPath href={`#giro-${id}`} startOffset="0" textLength="700" lengthAdjust="spacing">
              UMBRAL ABIERTO · ESTUVE AHÍ · PRESENCIAL · MUSEO VIVO ·
            </textPath>
          </text>
        )}

        <g className="sv-iso" transform={chico ? "scale(1.25)" : "translate(0 -20) scale(.62)"}>
          {TRAZOS.map((d, i) => (
            <path key={i} d={d} className={`sv-trazo sv-trazo-${i}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ))}
          <circle r="8" className="sv-punto" />
        </g>

        {!chico && (
          <>
            <text className="sv-texto" y="50" textAnchor="middle">Estuve ahí</text>
            <text className="sv-modo" y="70" textAnchor="middle">PRESENCIAL</text>
          </>
        )}
      </svg>
    </Movible>
  );
}
