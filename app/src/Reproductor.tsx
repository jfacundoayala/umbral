// Reproductor del audio de una obra: botón redondo y una línea de ondas que se pinta a medida que suena.
import { useEffect, useRef, useState } from "react";

const BARRAS = 64;

/** Picos del audio, para dibujar la onda. Si no se puede leer el archivo, devuelve null y se dibuja una onda pareja. */
async function picos(src: string): Promise<number[] | null> {
  try {
    const datos = await (await fetch(src)).arrayBuffer();
    const ctx = new AudioContext();
    const audio = await ctx.decodeAudioData(datos);
    void ctx.close();
    const canal = audio.getChannelData(0);
    const tramo = Math.max(1, Math.floor(canal.length / BARRAS));
    const salida: number[] = [];
    for (let i = 0; i < BARRAS; i++) {
      let max = 0;
      for (let j = i * tramo; j < Math.min(canal.length, (i + 1) * tramo); j++) max = Math.max(max, Math.abs(canal[j]));
      salida.push(max);
    }
    const tope = Math.max(...salida) || 1;
    return salida.map((v) => v / tope);
  } catch {
    return null;
  }
}

const reloj = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––");

export default function Reproductor({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [sonando, setSonando] = useState(false);
  const [vamos, setVamos] = useState(0);
  const [dura, setDura] = useState(Number.NaN);
  const [onda, setOnda] = useState<number[] | null>(null);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    let vivo = true;
    void picos(src).then((p) => vivo && setOnda(p));
    return () => {
      vivo = false;
    };
  }, [src]);

  const alturas = onda ?? Array.from({ length: BARRAS }, (_, i) => 0.35 + 0.3 * Math.abs(Math.sin(i / 3)));
  const avance = dura > 0 ? vamos / dura : 0;

  const tocar = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setFalla(true));
    else a.pause();
  };
  const ir = (fraccion: number) => {
    const a = audio.current;
    if (!a || !(dura > 0)) return;
    a.currentTime = Math.min(dura, Math.max(0, fraccion * dura));
    setVamos(a.currentTime);
  };

  if (falla) return <p className="sub">Tu navegador no puede reproducir este audio.</p>;
  return (
    <div className="reproductor">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setSonando(true)}
        onPause={() => setSonando(false)}
        onEnded={() => setSonando(false)}
        onTimeUpdate={(e) => setVamos(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDura(e.currentTarget.duration)}
        onDurationChange={(e) => setDura(e.currentTarget.duration)}
        onError={() => setFalla(true)}
      />
      <button className="tocar" onClick={tocar} aria-label={sonando ? "Pausar el audio" : "Escuchar el audio"}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {sonando ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 1.5 14 8 4 14.5z" />}
        </svg>
      </button>
      <svg
        className="onda"
        viewBox={`0 0 ${BARRAS * 5} 32`}
        preserveAspectRatio="none"
        role="slider"
        tabIndex={0}
        aria-label="Avance del audio"
        aria-valuemin={0}
        aria-valuemax={Math.round(dura) || 0}
        aria-valuenow={Math.round(vamos)}
        aria-valuetext={`${reloj(vamos)} de ${reloj(dura)}`}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          ir((e.clientX - r.left) / r.width);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") ir(avance + 0.05);
          if (e.key === "ArrowLeft") ir(avance - 0.05);
        }}
      >
        {alturas.map((v, i) => {
          const h = 3 + v * 26;
          return <line key={i} className={i / BARRAS < avance ? "oida" : ""} x1={i * 5 + 2} x2={i * 5 + 2} y1={16 - h / 2} y2={16 + h / 2} />;
        })}
      </svg>
      <span className="tiempo">
        {reloj(vamos)} / {reloj(dura)}
      </span>
    </div>
  );
}
