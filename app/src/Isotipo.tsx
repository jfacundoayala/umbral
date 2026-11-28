// Isotipo de UMBRAL (Lucía, 27/11): tres trazos orgánicos y un punto. El punto es la presencia; las líneas, lo que despierta.
// Toma el color del texto que lo rodea (currentColor).
export function Isotipo({ className, grosor = 1.6, titulo }: { className?: string; grosor?: number; titulo?: string }) {
  return (
    <svg className={className} viewBox="-80 -80 160 160" role={titulo ? "img" : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <g fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        <path d="M-52 -36 C-30 -65 24 -78 43 -43 C55 -20 79 23 48 47 C15 76 -36 46 -51 10 C-62 -10 -65 -19 -52 -36Z" />
        <path d="M-67 -19 C-66 -45 -12 -61 17 -49 C39 -40 52 -3 50 19 C47 45 17 52 -14 36 C-41 23 -72 8 -67 -19Z" />
        <path d="M-38 -22 C-20 -44 8 -37 25 -14 C43 9 43 24 20 31 C-5 37 -39 11 -44 -5 C-47 -12 -44 -17 -38 -22Z" />
      </g>
      <circle r="8" fill="currentColor" />
    </svg>
  );
}
