// "Para quién es" de la portada. Archivo propio para que el diseño se cambie sin tocar el resto.
// Las fotos son reales, de Wikimedia Commons con licencia CC BY-SA, y llevan su crédito debajo.
import { OBRA_CON_SELLO } from "./base";
import { Isotipo } from "./Isotipo";
import "./ParaQuien.css";

export const PARA = [
  {
    quien: "Artistas",
    texto: "Mostrá tu obra, mirá qué siente la gente y cobrá cada vez que alguien deja su huella. Una escultura, un mural o un cuadro, en la calle o en una sala, también la recibe con un QR al lado.",
    accion: "Exponer una obra",
    destino: "/abrir",
    // Las fotos no son obras de la colección: no hay obra que sacar de "destacadas".
    obra: "",
    rotulo: "Bienal de Escultura",
    foto: "/para-quien/artistas.webp",
    encuadre: "50% 50%",
    credito: { autor: "Sergio Andrés Segovia", licencia: "CC BY-SA 3.0", fuente: "https://commons.wikimedia.org/wiki/File:Bienal_2012_01.jpg" },
  },
  {
    quien: "Salas, galerías y encuentros",
    texto: "Abrí tu espacio y organizá encuentros. Quien va en persona deja su huella gratis y se lleva el sello Estuve ahí.",
    accion: "Ver una obra con sello",
    destino: `/obra/${OBRA_CON_SELLO}`,
    obra: "",
    rotulo: "Una noche en el museo",
    foto: "/para-quien/salas.webp",
    encuadre: "50% 60%",
    credito: { autor: "Secretaría de Cultura de la Nación", licencia: "CC BY-SA 2.0", fuente: "https://commons.wikimedia.org/wiki/File:%22Mir%C3%B3_La_experiencia_de_mirar_%22_en_el_MNBA_(26131420309).jpg" },
  },
  {
    quien: "Público",
    texto: "Mirá todo gratis y sin cuenta. Si una obra te toca, dejale tu huella o un aporte. Lo que ponés es para quien la hizo.",
    accion: "Ver las obras",
    destino: "/cielo",
    obra: "",
    rotulo: "Un día de lluvia",
    foto: "/para-quien/publico.webp",
    encuadre: "50% 60%",
    credito: { autor: "Kgbo", licencia: "CC BY-SA 4.0", fuente: "https://commons.wikimedia.org/wiki/File:Three_girls_with_umbrellas_after_rain_in_Brisbane_02.jpg" },
  },
] as const;

/** "Para quién es": tres tarjetas iguales sobre el fondo crema, cada una con una foto real grande. */
export function ParaQuien() {
  return (
    <div className="para-quien">
      {/* El símbolo de UMBRAL, grande y suave, detrás del título. */}
      <Isotipo className="para-marca" grosor={1.2} />
      {/* Una constelación une las tres tarjetas: punto, aro y estrella, como en el logo. */}
      <div className="para-constelacion" aria-hidden="true">
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none">
          <path d="M200 26 C 420 6 520 34 600 22 S 860 6 1000 20" />
        </svg>
        <i className="para-astro punto" />
        <i className="para-astro aro" />
        <svg className="para-astro estrella" viewBox="-16 -16 32 32">
          <path d="M0 -16Q1.6 -1.6 16 0Q1.6 1.6 0 16Q-1.6 1.6 -16 0Q-1.6 -1.6 0 -16Z" />
        </svg>
      </div>
      <ul className="para-fotos">
        {PARA.map((p) => (
          <li key={p.quien}>
            <figure className="para-foto">
              <img src={p.foto} alt="" loading="lazy" style={{ objectPosition: p.encuadre }} />
              <span>{p.rotulo}</span>
            </figure>
            <div className="para-texto">
              <h3>{p.quien}</h3>
              <p>{p.texto}</p>
              <a className="para-enlace" href={`#${p.destino}`}>
                {p.accion} <span aria-hidden="true">→</span>
              </a>
              <small className="para-credito">
                Foto{" "}
                <a href={p.credito.fuente} target="_blank" rel="noopener noreferrer">
                  {p.credito.autor}
                </a>
                , {p.credito.licencia}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
