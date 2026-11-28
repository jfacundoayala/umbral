// Portada (opción 2 de Lucía, 28/11): composición centrada, una obra suspendida entre órbitas finas
// y una sola acción. Mirar es libre y no pide cuenta.
import { Movible } from "./Movible";
import { ir } from "./comun";
import { PortadaMas } from "./PortadaMas";

/** La idea en tres pasos, sin hablar de dinero: eso se cuenta más abajo, en "Cómo funciona". */
const PASOS = ["Exponé lo que querés que quede", "Quien lo ve deja su huella", "Crece como una constelación"];

/** "Entre raíces", primera obra de la Colección 001. */
const OBRA_PORTADA = "84dae87eddfb37fb8ec42cd8b82e01ac816e0806f5f44925e2032bb9459e70e5";

/** Órbitas finas alrededor de la obra, con algunas huellas (puntos) sobre ellas. */
function Orbitas() {
  const orbitas = [
    { rx: 430, ry: 100, rot: -6, puntos: [0.08, 0.57] },
    { rx: 360, ry: 120, rot: 10, puntos: [0.33, 0.81] },
    { rx: 300, ry: 80, rot: -16, puntos: [0.66] },
    { rx: 470, ry: 150, rot: 3, puntos: [0.2, 0.45] },
  ];
  return (
    <svg className="orbitas" viewBox="-500 -260 1000 520" aria-hidden="true">
      {orbitas.map((o, i) => (
        <g key={i} className={`orbita orbita-${i}`} transform={`rotate(${o.rot})`}>
          <ellipse rx={o.rx} ry={o.ry} fill="none" stroke="currentColor" strokeWidth="1" opacity={0.42 - i * 0.05} />
          {o.puntos.map((t, j) => (
            <circle key={j} cx={o.rx * Math.cos(t * 2 * Math.PI)} cy={o.ry * Math.sin(t * 2 * Math.PI)} r={j === 0 ? 5 : 3.5} fill="currentColor" />
          ))}
        </g>
      ))}
    </svg>
  );
}

export default function Portada() {
  return (
    <>
      <section className="portada portada-centrada">
        <p className="rotulo portada-rotulo">Museo vivo · Resistencia, Chaco</p>
        <h1>Más allá de lo tangible.</h1>
        <p className="idea">UMBRAL guarda lo que no querés perder.</p>
        <p className="bajada">Una obra, un objeto, un recuerdo. Lo exponés, queda sellado en la red y quienes lo ven le dejan su huella.</p>
        <div className="portada-escena">
          <Orbitas />
          <button className="portada-obra" onClick={() => ir(`/obra/${OBRA_PORTADA}`)} aria-label="Ver la obra Entre raíces y sus huellas">
            <Movible className="movible-portada">
            <img src="/portada/entre-raices.webp" width="510" height="510" alt="Entre raíces: dos formas curvas de madera entrelazadas sobre una base neutra." fetchPriority="high" />
            </Movible>
          </button>
        </div>
        <ol className="portada-pasos">
          {PASOS.map((p, i) => (
            <li key={p}>
              <span aria-hidden="true">{i + 1}</span>
              {p}
            </li>
          ))}
        </ol>
        <button className="entrar" onClick={() => ir("/cielo")}>
          Explorá el museo <span aria-hidden="true">→</span>
        </button>
        <p className="libre">Mirar es libre. No necesitás una cuenta.</p>
        <p className="donde">En museos, galerías y encuentros, en persona o virtuales.</p>
      </section>
      <PortadaMas />
    </>
  );
}
