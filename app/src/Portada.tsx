// Portada (maqueta C, 28/11): una invitación a subir algo propio y, a la vista, obras reales de la
// colección con una huella real de cada una. Mirar es libre y no pide cuenta.
import { useEffect, useState } from "react";
import { OBRA_CON_SELLO, urlFoto, urlTarjeta } from "./base";
import { ir } from "./comun";
import { PortadaMas } from "./PortadaMas";
import { usePreciosVivos } from "./preciosVivos";
import { citables, OBRAS_DE_PORTADA, obrasDePortadaEnVivo, type EnVivo, type ObraDePortada } from "./portadaObras";

function useObrasDePortada() {
  const [vivas, setVivas] = useState<Map<string, EnVivo> | null>(null);
  useEffect(() => {
    let vivo = true;
    obrasDePortadaEnVivo().then((m) => vivo && setVivas(m));
    return () => {
      vivo = false;
    };
  }, []);
  return vivas;
}

const cuantas = (n: number) => `${n} ${n === 1 ? "huella" : "huellas"}`;

/** Una obra real de la colección: su foto, qué es, su título, una huella que le dejaron y cuántas tiene. */
function Tarjeta({ o, vivo, primera }: { o: ObraDePortada; vivo: EnVivo | undefined; primera: boolean }) {
  const huella = vivo ? citables(vivo)[0] : undefined;
  // El id de hoy lo da la base (la obra se busca por título), el escrito vale mientras tanto.
  const id = vivo?.obra.id ?? o.id;
  const foto = o.imagen ?? (vivo?.obra.foto_ruta ? urlTarjeta(vivo.obra.id, vivo.obra.foto_ruta) : undefined);
  return (
    <li>
      <a className="rec" href={id ? `#/obra/${id}` : "#/cielo"}>
        <span className="rec-foto">
          {foto && (
            <img
              src={foto}
              alt=""
              width="480"
              height="480"
              loading={primera ? "eager" : "lazy"}
              fetchPriority={primera ? "high" : undefined}
              onError={(e) => {
                const firmada = vivo?.obra.foto_ruta ? urlFoto(vivo.obra.foto_ruta) : "";
                if (firmada && e.currentTarget.src !== firmada) e.currentTarget.src = firmada;
              }}
            />
          )}
          <span className="rec-tipo">{o.disciplina}</span>
          {vivo?.obra.audio_ruta && <span className="rec-audio">Se escucha</span>}
        </span>
        <span className="rec-titulo">{vivo?.obra.titulo ?? o.titulo}</span>
        <span className="rec-de">{vivo?.obra.nombre ? `de ${vivo.obra.nombre}` : " "}</span>
        {huella && (
          <span className="rec-resp">
            “{huella.texto}”<small>{huella.nombre}</small>
          </span>
        )}
        {vivo && <span className="rec-cuenta">{cuantas(vivo.obra.respuestas_publicadas)}</span>}
      </a>
    </li>
  );
}

/** Las tarjetas de la tira. Mientras la base no contesta, las elegidas. Después, las elegidas que están
 *  publicadas y, si falta alguna, las obras de El cielo que ocupan su lugar. */
function tarjetasDe(vivas: Map<string, EnVivo> | null): ObraDePortada[] {
  if (!vivas) return OBRAS_DE_PORTADA;
  const elegidas = OBRAS_DE_PORTADA.filter((o) => vivas.has(o.titulo));
  const otras = [...vivas]
    .filter(([titulo]) => !OBRAS_DE_PORTADA.some((o) => o.titulo === titulo))
    .map(([titulo, v]) => ({ titulo, id: v.obra.id, disciplina: v.obra.audio_ruta ? "Sonido" : "Obra" }));
  return [...elegidas, ...otras];
}

export default function Portada() {
  const vivas = useObrasDePortada();
  const precios = usePreciosVivos();
  return (
    <>
      <section className="portada portada-centrada portada-c">
        <p className="rotulo portada-rotulo">Más allá de lo tangible</p>
        <h1>
          Subí algo que <em>no querés perder.</em>
        </h1>
        <p className="bajada">
          <b>Una foto, una receta, una carta, un sonido.</b> Queda guardado en el museo y la gente le deja su huella, unas
          palabras con lo que sintió.
        </p>
        <div className="portada-elegir">
          <button className="elegir elegir-mirar" onClick={() => ir("/cielo")}>
            <span className="elegir-titulo">Vengo a mirar <span aria-hidden="true">→</span></span>
            <span className="elegir-sub">Gratis, sin crear una cuenta.</span>
          </button>
          <button className="elegir elegir-exponer" onClick={() => ir("/abrir")}>
            <span className="elegir-titulo">Quiero exponer mi obra <span aria-hidden="true">→</span></span>
            <span className="elegir-sub">
              Cuesta {precios.exponer} de prueba. El {precios.parte.toLocaleString("es-AR")}% de cada huella que reciba es tuyo.
            </span>
          </button>
        </div>
        <p className="portada-lema">El museo donde el arte no termina en la obra.</p>
        <ul className="muro" aria-label="Obras de la colección">
          <li>
            <a className="rec rec-tuyo" href="#/abrir">
              <span className="rec-mas" aria-hidden="true">+</span>
              <span>
                <span className="rec-titulo">Lo tuyo va acá</span>
                <span className="rec-de">Una foto, un texto o un audio.</span>
              </span>
            </a>
          </li>
          {/* Cuando la base contestó, una obra que no está publicada no deja una tarjeta vacía. */}
          {tarjetasDe(vivas).map((o, i) => (
            <Tarjeta key={o.titulo} o={o} vivo={vivas?.get(o.titulo)} primera={i === 0} />
          ))}
        </ul>
        <p className="libre">
          ¿Tenés una sala o un museo?{" "}
          <a href={`#/obra/${OBRA_CON_SELLO}`}>Ver una obra con el sello Estuve ahí</a>.
        </p>
      </section>
      <PortadaMas vivas={vivas} precios={precios} />
    </>
  );
}
