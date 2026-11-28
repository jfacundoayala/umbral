// Portada (opción 2 de Lucía, 28/11): composición centrada, una obra suspendida entre órbitas finas
// y una sola acción. Mirar es libre y no pide cuenta.
import { Movible } from "./Movible";
import { OBRA_CON_SELLO } from "./base";
import { ir, OBRA_PORTADA } from "./comun";
import { PortadaMas } from "./PortadaMas";

/** Qué pasa, en palabras de todos los días. El 80% se explica más abajo, en "Cómo funciona". */
const PASOS = ["Abrís una obra", "Le dejás tu huella: lo que te hizo sentir", "El artista recibe el 80% al momento"];

/** "Entre raíces", primera obra de la Colección 001. */

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
        <p className="rotulo portada-rotulo">Más allá de lo tangible</p>
        <h1>El museo donde el arte no termina en la obra.</h1>
        <p className="bajada">
          Abrís una obra y escribís lo que te hizo sentir: a eso le decimos <b>huella</b>. Queda junto a la obra, a la vista de todos, y el
          artista recibe el 80% al momento.
        </p>
        <p className="portada-pregunta">¿A qué venís?</p>
        <div className="portada-elegir">
          <button className="elegir elegir-mirar" onClick={() => ir("/cielo")}>
            <span className="elegir-titulo">Vengo a mirar <span aria-hidden="true">→</span></span>
            <span className="elegir-sub">Recorré las obras gratis, sin crear una cuenta.</span>
          </button>
          <button className="elegir elegir-exponer" onClick={() => ir("/abrir")}>
            <span className="elegir-titulo">Quiero exponer mi obra <span aria-hidden="true">→</span></span>
            <span className="elegir-sub">Subí una foto de tu obra y cobrá por cada huella que reciba.</span>
          </button>
        </div>
        <p className="libre">
          ¿Tenés una sala o un museo?{" "}
          <a href={`#/obra/${OBRA_CON_SELLO}`}>Mirá cómo funciona un encuentro en persona</a>.
        </p>
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
        <p className="donde">En museos, galerías y encuentros, en persona o virtuales.</p>
      </section>
      <PortadaMas />
    </>
  );
}
