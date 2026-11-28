// Lo que sigue a la portada: cómo funciona, obras del cielo con números en vivo, para quién es y los encuentros.
// Solo lee la base con fetch: no baja billetera ni stellar-sdk.
import { useEffect, useState } from "react";
import { OBRA_CON_SELLO, obras, urlFoto, urlTarjeta, type Huella } from "./base";
import { ir, OBRA_PORTADA } from "./comun";
import { SelloVivo } from "./SelloVivo";
import { PasosVivos } from "./PasosVivos";
import { CierreCielo, ParaVivos } from "./ParaVivos";

const PASOS = [
  ["Mirá gratis", "Recorré el cielo y abrí cualquier obra. No hace falta cuenta."],
  ["Dejá tu huella", "Escribí lo que la obra te despertó. Tu huella se suma a su constelación."],
  ["El 80% es para quien la hizo", "Cada huella le deja al artista el 80%, al momento. Solo cambia si firma una muestra con una sala, y nunca le queda menos del 30%."],
] as const;

const PARA = [
  {
    quien: "Artistas",
    texto: "Exponé tu obra, mirá qué despierta en la gente y cobrá cada vez que alguien la continúa. Con una placa con QR al lado, tu escultura de la calle también recibe huellas, como",
    ejemplo: { texto: "la talla Entre raíces", destino: `/obra/${OBRA_PORTADA}` },
    accion: "Exponer una obra",
    destino: "/abrir",
  },
  {
    quien: "Salas y museos",
    texto: "Abrí tu sala, armá muestras con fecha y organizá encuentros: quien va en persona deja su huella gratis, la paga tu fondo y se lleva el sello \"Estuve ahí\".",
    accion: "Ver una obra con sello",
    destino: `/obra/${OBRA_CON_SELLO}`,
  },
  {
    quien: "Público",
    texto: "Mirá todo gratis. Si una obra te toca, dejá unas palabras o apoyala con lo que quieras: lo que ponés es para quien la hizo.",
    accion: "Atravesar el umbral",
    destino: "/cielo",
  },
] as const;

function useCielo() {
  const [lista, setLista] = useState<Huella[] | null>(null);
  useEffect(() => {
    let vivo = true;
    obras("huellas")
      .then((l) => vivo && setLista(l))
      .catch(() => vivo && setLista([]));
    return () => {
      vivo = false;
    };
  }, []);
  return lista;
}

export function PortadaMas() {
  const lista = useCielo();
  const destacadas = (lista ?? []).filter((o) => o.foto_ruta).slice(0, 6);
  const nObras = lista?.length ?? 0;
  const nHuellas = (lista ?? []).reduce((s, o) => s + o.respuestas_publicadas, 0);

  return (
    <div className="pmas">
      <section className="pmas-bloque" aria-labelledby="pmas-como">
        <p className="rotulo">Cómo funciona</p>
        <h2 id="pmas-como">Lo que la obra despierta, la obra lo cobra.</h2>
        <PasosVivos pasos={PASOS} />
      </section>

      <section className="pmas-bloque" aria-labelledby="pmas-cielo">
        <div className="pmas-cabeza">
          <div>
            <p className="rotulo">En el cielo ahora</p>
            <h2 id="pmas-cielo">Obras que ya tienen huellas</h2>
          </div>
          {lista && nObras > 0 && (
            <dl className="pmas-numeros" aria-live="polite">
              <div>
                <dt>obras</dt>
                <dd>{nObras}</dd>
              </div>
              <div>
                <dt>huellas</dt>
                <dd>{nHuellas}</dd>
              </div>
            </dl>
          )}
        </div>
        {lista === null ? (
          <p className="sub">Mirando el cielo…</p>
        ) : (
          <ul className="obras pmas-obras">
            {destacadas.map((o) => (
              <li key={o.id}>
                <a href={`#/obra/${o.id}`} className="tarjeta">
                  <img
                    src={urlTarjeta(o.id, o.foto_ruta ?? "")}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      const firmada = urlFoto(o.foto_ruta ?? "");
                      if (e.currentTarget.src !== firmada) e.currentTarget.src = firmada;
                    }}
                  />
                  <span className="titulo">{o.titulo}</span>
                  <span className="autor">{o.nombre}</span>
                  <span className="huellas">
                    {o.respuestas_publicadas} {o.respuestas_publicadas === 1 ? "huella" : "huellas"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p>
          <button className="btn" onClick={() => ir("/cielo")}>Ver todo el cielo</button>
        </p>
      </section>

      <section className="pmas-bloque" aria-labelledby="pmas-para">
        <p className="rotulo">Para quién es</p>
        <h2 id="pmas-para">Un museo que se arma entre todos</h2>
        <ParaVivos items={PARA} />
      </section>

      <section className="pmas-bloque pmas-encuentro" aria-labelledby="pmas-enc">
        <SelloVivo className="pmas-sello-vivo" />
        <div>
          <p className="rotulo">Encuentros</p>
          <h2 id="pmas-enc">Estuve ahí</h2>
          <p>
            Una sala organiza un encuentro. En la puerta escanea tu código, tu huella la paga la sala y tu obra queda con el sello "Estuve ahí". Como se hace cara a cara, ese sello no se consigue desde tu casa.
          </p>
        </div>
      </section>

      <section className="pmas-cierre">
        <CierreCielo />
        <h2>Cada obra es una estrella. Cada huella, una línea.</h2>
        <button className="entrar" onClick={() => ir("/cielo")}>
          Atravesar el umbral <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}
