// Lo que sigue a la portada: cómo funciona, obras del cielo con números en vivo, para quién es y los encuentros.
// Solo lee la base con fetch: no baja billetera ni stellar-sdk.
import { useEffect, useState } from "react";
import { obras, urlFoto, urlTarjeta, type Huella } from "./base";
import { ir } from "./comun";

const PASOS = [
  ["Mirá gratis", "Recorré el cielo y abrí cualquier obra. No hace falta cuenta."],
  ["Dejá tu huella", "Escribí lo que la obra te despertó. Tu huella se suma a su constelación."],
  ["El 70% es para quien la hizo", "Cada huella le deja al artista el 70%, al momento. Lo cobra cuando quiere."],
] as const;

const PARA = [
  {
    quien: "Artistas",
    texto: "Exponé tu obra, mirá qué despierta en la gente y cobrá cada vez que alguien la continúa. Con una placa con QR, tu escultura de la calle también recibe huellas.",
    accion: "Exponer una obra",
    destino: "/abrir",
  },
  {
    quien: "Salas y museos",
    texto: "Abrí tu sala, armá muestras con fecha y organizá encuentros: quien va en persona deja su huella gratis, la paga tu fondo y se lleva el sello \"Estuve ahí\".",
    accion: "Ver una obra con sello",
    destino: "/cielo",
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
  const destacadas = (lista ?? []).filter((o) => o.foto_ruta).slice(0, 3);
  const nObras = lista?.length ?? 0;
  const nHuellas = (lista ?? []).reduce((s, o) => s + o.respuestas_publicadas, 0);

  return (
    <div className="pmas">
      <section className="pmas-bloque" aria-labelledby="pmas-como">
        <p className="rotulo">Cómo funciona</p>
        <h2 id="pmas-como">Lo que la obra despierta, la obra lo cobra.</h2>
        <ol className="pmas-pasos">
          {PASOS.map(([t, d], i) => (
            <li key={t}>
              <span className="pmas-n" aria-hidden="true">{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
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
        <ul className="pmas-para">
          {PARA.map((p) => (
            <li key={p.quien}>
              <h3>{p.quien}</h3>
              <p>{p.texto}</p>
              <a className="pmas-enlace" href={`#${p.destino}`}>
                {p.accion} <span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="pmas-bloque pmas-encuentro" aria-labelledby="pmas-enc">
        <svg className="pmas-sello" viewBox="-40 -40 80 80" aria-hidden="true">
          <circle r="34" fill="none" stroke="#2445C7" strokeWidth="1.2" strokeDasharray="1.5 4" strokeLinecap="round" />
          <circle r="22" fill="none" stroke="#2445C7" strokeWidth="1.2" strokeDasharray="1.5 4" strokeLinecap="round" />
          <circle r="11" fill="none" stroke="#2445C7" strokeWidth="1.6" />
          <circle r="5" fill="#2445C7" />
        </svg>
        <div>
          <p className="rotulo">Encuentros</p>
          <h2 id="pmas-enc">Estuve ahí</h2>
          <p>
            Una sala organiza un encuentro. En la puerta escanea tu código, tu huella la paga la sala y tu obra queda con el sello "Estuve ahí". Como se hace cara a cara, ese sello no se consigue desde tu casa.
          </p>
        </div>
      </section>

      <section className="pmas-cierre">
        <h2>Cada obra es una estrella. Cada huella, una línea.</h2>
        <button className="entrar" onClick={() => ir("/cielo")}>
          Atravesar el umbral <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}
