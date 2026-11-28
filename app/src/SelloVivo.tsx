// El sello "Estuve ahí" como una medalla de piedra verde, del color de UMBRAL: canto con estrías, cara con luz arriba a la izquierda,
// el logo y los textos en relieve y una sombra debajo. Sigue vivo: anillos que giran, el logo que respira,
// ondas que salen del centro y un latido al tocarlo. Se puede arrastrar y girar; el brillo sigue el giro.
import { useId, useState } from "react";
import { Movible } from "./Movible";

// Los mismos trazos del isotipo (Isotipo.tsx): abiertos abajo a la izquierda, con la constelación que entra hasta la estrella.
const TRAZOS = [
  "M-27.1 -56.1L-21.8 -58.5L-16.4 -60.5L-10.8 -62.1L-5.2 -63.2L0.3 -63.9L5.9 -64.1L11.3 -63.7L16.5 -62.8L21.6 -61.4L26.4 -59.3L30.9 -56.6L35.0 -53.3L38.8 -49.4L42.0 -44.7L44.2 -40.6L46.2 -36.9L48.3 -32.8L50.4 -28.6L52.5 -24.1L54.6 -19.5L56.5 -14.8L58.3 -9.9L59.9 -5.0L61.2 -0.0L62.3 5.0L63.0 9.9L63.2 14.9L63.0 19.7L62.3 24.5L61.1 29.1L59.2 33.6L56.7 37.9L53.5 42.0L49.5 45.8L44.6 49.7L39.4 53.1L34.0 55.6L28.4 57.3L22.6 58.3L16.8 58.6L11.0 58.3L5.2 57.3L-0.6 55.8L-6.4 53.7L-12.0 51.1L-17.4 48.0L-22.6 44.6L-27.6 40.7L-32.3 36.5L-36.7 32.0L-40.8 27.3L-44.4 22.3L-47.5 17.1L-50.2 11.8L-52.1 8.0L-53.6 5.2L-55.0 2.5L-56.2 -0.0L-57.3 -2.4L-58.2 -4.8L-59.0 -7.0L-59.7 -9.2L-60.1 -11.3L-60.4 -13.4L-60.5 -14.8",
  "M-45.4 -44.2L-40.6 -46.4L-35.5 -48.3L-30.2 -49.8L-24.8 -51.1L-19.3 -52.1L-13.7 -52.7L-8.2 -53.0L-2.8 -53.0L2.5 -52.6L7.6 -51.8L12.5 -50.6L17.0 -49.0L20.2 -47.4L23.3 -45.5L26.3 -43.2L29.1 -40.6L31.7 -37.7L34.2 -34.5L36.5 -31.1L38.7 -27.5L40.7 -23.8L42.5 -19.9L44.1 -15.9L45.6 -11.8L46.8 -7.8L47.9 -3.7L48.8 0.4L49.4 4.3L49.9 8.2L50.2 12.0L50.2 15.6L50.0 19.0L49.4 22.8L48.3 26.2L46.9 29.4L45.2 32.3L43.1 34.9L40.7 37.2L38.0 39.1L35.1 40.8L31.9 42.2L28.5 43.3L24.9 44.0L21.1 44.4L17.1 44.5L12.9 44.3L8.7 43.8L4.3 42.9L-0.2 41.7L-4.8 40.1L-9.4 38.2L-14.0 36.0L-18.1 34.0L-22.2 32.0L-26.3 30.0L-30.4 27.9L-34.4 25.7L-38.3 23.5L-42.1 21.2L-45.8 18.8L-49.2 16.3L-52.5 13.8L-55.5 11.1L-58.3 8.3L-60.0 6.4",
  "M-14.1 -35.2L-10.7 -35.3L-7.3 -35.0L-3.9 -34.4L-0.5 -33.5L2.9 -32.2L6.2 -30.6L9.5 -28.7L12.6 -26.6L15.7 -24.1L18.6 -21.4L21.5 -18.4L24.1 -15.1L26.7 -11.7L29.1 -8.4L31.2 -5.2L33.1 -2.2L34.6 0.8L35.9 3.6L36.8 6.3L37.5 8.9L37.9 11.4L37.9 13.7L37.7 16.0L37.1 18.1L36.3 20.1L35.1 21.9L33.6 23.7L31.8 25.3L29.6 26.8L27.1 28.2L24.3 29.5L21.1 30.6L17.5 31.5L13.6 31.9L9.6 31.8L5.6 31.3L1.5 30.5L-2.6 29.3L-6.6 27.9L-10.6 26.2L-14.5 24.2L-18.3 22.0L-21.9 19.7L-25.4 17.2L-28.7 14.6L-31.7 11.9L-34.5 9.1L-37.1 6.4L-39.3 3.6L-41.1 0.9L-42.6 -1.7",
];
/** Los puntos de la constelación que entra por la abertura, de afuera hacia la estrella. */
const PUNTOS: [number, number, number][] = [[-96, 74, 4.4], [-70, 52, 3.6], [-46, 46, 3.2], [-24, 24, 2.6]];
const ESTRELLA = "M0 -16Q1.6 -1.6 16 0Q1.6 1.6 0 16Q-1.6 1.6 -16 0Q-1.6 -1.6 0 -16Z";

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
          <path d={ESTRIAS} stroke="#0B1613" strokeOpacity=".55" strokeWidth={chico ? 3 : 1.6} />
          <circle r="140" fill={u("cara")} />
          <circle r="140" fill="#000" filter={u("grano")} />
          <circle r="129" fill="none" stroke="#5C7C77" strokeWidth="4" filter={u("relieve")} />
          {/* Reverso: una constelación chica, la que arma cada obra con sus huellas. */}
          <g filter={u("relieve")} transform={chico ? "scale(1.3)" : "translate(0 -34)"}>
            <path d={REVERSO_LINEAS} fill="none" stroke="#5C7C77" strokeWidth={chico ? 4 : 2.4} strokeLinecap="round" />
            {REVERSO_PUNTOS.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={chico ? r * 1.6 : r} fill={i === 0 ? "#243A37" : "#638480"} />
            ))}
          </g>
          {!chico && (
            <g filter={u("relieve")}>
              <text className="sv-texto" y="50" textAnchor="middle">UMBRAL</text>
              <text className="sv-modo" y="72" textAnchor="middle">MUSEO VIVO</text>
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
          {/* Canto: verde petróleo oscuro con un reflejo arriba a la izquierda. */}
          <linearGradient id={`canto-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#BFCDC8" />
            <stop offset=".35" stopColor="#4F6F6B" />
            <stop offset=".7" stopColor="#2A423F" />
            <stop offset="1" stopColor="#16282A" />
          </linearGradient>
          {/* Cara: verde petróleo y marfil, con la luz arriba a la izquierda. */}
          <radialGradient id={`cara-${id}`} cx=".34" cy=".3" r=".85">
            <stop offset="0" stopColor="#D5DFDB" />
            <stop offset=".35" stopColor="#86A19B" />
            <stop offset=".75" stopColor="#4B6A66" />
            <stop offset="1" stopColor="#2E4744" />
          </radialGradient>
          <linearGradient id={`borde-luz-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F2EDE3" stopOpacity=".95" />
            <stop offset=".5" stopColor="#F2EDE3" stopOpacity="0" />
            <stop offset=".5" stopColor="#0B1613" stopOpacity="0" />
            <stop offset="1" stopColor="#0B1613" stopOpacity=".8" />
          </linearGradient>
          <linearGradient id={`borde-sombra-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0B1613" stopOpacity=".7" />
            <stop offset=".5" stopColor="#0B1613" stopOpacity="0" />
            <stop offset=".5" stopColor="#F2EDE3" stopOpacity="0" />
            <stop offset="1" stopColor="#F2EDE3" stopOpacity=".8" />
          </linearGradient>
          {/* Relieve: una luz clara arriba a la izquierda y una sombra abajo a la derecha. */}
          <filter id={`relieve-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feOffset in="SourceAlpha" dx="-1.1" dy="-1.1" result="a" />
            <feFlood floodColor="#F2EDE3" floodOpacity=".9" />
            <feComposite in2="a" operator="in" result="luz" />
            <feOffset in="SourceAlpha" dx="1.5" dy="1.7" result="b" />
            <feGaussianBlur in="b" stdDeviation=".5" result="bb" />
            <feFlood floodColor="#0B1613" floodOpacity=".85" />
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
            <feColorMatrix values="0 0 0 0 .08  0 0 0 0 .16  0 0 0 0 .15  0 0 0 .22 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <path id={`giro-${id}`} d="M0 -114 A114 114 0 1 1 -0.1 -114" />
        </defs>

        {/* Canto con estrías. */}
        <circle r="152" fill={u("canto")} />
        <path d={ESTRIAS} stroke="#0B1613" strokeOpacity=".55" strokeWidth={chico ? 3 : 1.6} />
        <circle r="152" fill="none" stroke="#2E160A" strokeOpacity=".5" strokeWidth="1.5" />

        {/* Cara de la moneda, levemente hundida respecto del canto. */}
        <circle r="140" fill={u("cara")} />
        <circle r="140" fill="#000" filter={u("grano")} />
        <circle r="139" fill="none" stroke={u("borde-sombra")} strokeWidth="3" />
        {/* Gráfila: el anillo en relieve que rodea la cara. */}
        <circle r="129" fill="none" stroke="#5C7C77" strokeWidth="4" filter={u("relieve")} />
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
          <g className="sv-arcos-a" fill="none" stroke="#5C7C77" strokeWidth={chico ? 4 : 2.6} strokeLinecap="round">
            <path d="M-129 -28 C-145 -85 -94 -133 -33 -141 M40 -135 C107 -123 148 -77 140 -16 M138 55 C119 113 61 142 4 140 M-63 132 C-112 113 -139 80 -139 47" />
          </g>
          {!chico && (
            <g className="sv-arcos-b" fill="none" stroke="#5C7C77" strokeWidth="1.8" strokeLinecap="round" opacity=".8">
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
          <g className="sv-iso" transform={chico ? "scale(.8) translate(17.5 -6.5)" : "translate(0 -22) scale(.54) translate(17.5 -6.5)"}>
            {TRAZOS.map((d, i) => (
              <path key={i} d={d} className={`sv-trazo sv-trazo-${i}`} fill="none" stroke="#638480" strokeWidth={chico ? 4.5 : 3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            ))}
            {PUNTOS.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={chico ? r * 1.4 : r} fill="#638480" />
            ))}
            <path d={ESTRELLA} className="sv-punto" />
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
