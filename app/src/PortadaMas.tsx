// Lo que sigue a la portada: cómo funciona, obras del cielo con números en vivo, para quién es y los encuentros.
// Solo lee la base con fetch: no baja billetera ni stellar-sdk.
import { useEffect, useState } from "react";
import { OBRA_CON_SELLO, obras, urlFoto, urlTarjeta, type Huella } from "./base";
import { ir, OBRA_PORTADA } from "./comun";
import { SelloVivo } from "./SelloVivo";
import { citables, OBRA_DE_EJEMPLO, OBRAS_DE_PORTADA, type EnVivo } from "./portadaObras";
import { CierreCielo, ParaVivos } from "./ParaVivos";
import type { PreciosVivos } from "./preciosVivos";

const pasos = (p: PreciosVivos) =>
  [
    ["Subís", "Subís tu recuerdo", `Una foto, un texto o un audio, con un título. Lleva un minuto y cuesta ${p.exponer} de prueba.`],
    ["Queda guardado", "Queda guardado en el museo", "Con tu nombre, a la vista de todos, para que no se pierda."],
    ["La gente le deja su huella", "La gente le deja su huella", `Unas palabras con lo que sintió. El ${p.parte.toLocaleString("es-AR")}% de lo que se paga por cada huella es para vos. Solo cambia si firmás una muestra con una sala, y nunca te queda menos del 30%.`],
  ] as const;

/** El ejemplo de "Cómo funciona": una obra real con las primeras huellas que le dejaron. */
function Ejemplo({ vivo }: { vivo: EnVivo | undefined }) {
  if (!vivo) return <div className="hilo hilo-vacio" aria-hidden="true" />;
  const { obra } = vivo;
  const local = OBRAS_DE_PORTADA.find((o) => o.titulo === OBRA_DE_EJEMPLO)?.imagen;
  const foto = local ?? (obra.foto_ruta ? urlTarjeta(obra.id, obra.foto_ruta) : undefined);
  return (
    <div className="hilo">
      <div className="hilo-cab">
        {foto && <img src={foto} alt="" width="232" height="232" loading="lazy" />}
        <div>
          <h3>{obra.titulo}</h3>
          <p>Subida por {obra.nombre}</p>
        </div>
      </div>
      {citables(vivo).slice(0, 3).map((h) => (
        <p className="rec-resp" key={h.id}>
          “{h.texto}”<small>{h.nombre}</small>
        </p>
      ))}
      <div className="hilo-pie">
        <span>
          {obra.respuestas_publicadas} {obra.respuestas_publicadas === 1 ? "huella" : "huellas"} · el 80% para quien la subió
        </span>
        <a className="hilo-boton" href={`#/obra/${obra.id}?dejar`}>Dejar mi huella</a>
      </div>
    </div>
  );
}

const PARA = [
  {
    quien: "Artistas",
    texto: "Exponé tu obra, mirá qué siente la gente y cobrá cada vez que alguien le deja su huella. Con una placa con QR al lado, tu escultura de la calle también recibe huellas, como",
    ejemplo: { texto: "la talla Entre raíces", destino: `/obra/${OBRA_PORTADA}` },
    accion: "Exponer una obra",
    destino: "/abrir",
  },
  {
    quien: "Salas y museos",
    texto: "Abrí tu sala, armá muestras con fecha y organizá encuentros. Quien va en persona deja su huella gratis, la paga tu fondo y se lleva el sello \"Estuve ahí\".",
    accion: "Ver una obra con sello",
    destino: `/obra/${OBRA_CON_SELLO}`,
  },
  {
    quien: "Público",
    texto: "Mirá todo gratis. Si una obra te toca, dejá tu huella o dale un aporte de lo que quieras. Lo que ponés es para quien la hizo.",
    accion: "Ver las obras",
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

/** "La regla": una frase y tres compromisos que el contrato cumple. */
function Regla({ precios }: { precios: PreciosVivos }) {
  const parte = precios.parte;
  const compromisos = [
    ["Mirar, gratis y sin cuenta", "Recorrés todo el museo sin registrarte."],
    [`El ${parte.toLocaleString("es-AR")}% para quien lo subió`, "Cada huella que le dejan le paga a su autor, en el momento."],
    ["Tu huella queda unida a la obra", "A la vista de todos, con su comprobante público."],
  ];
  return (
    <section className="regla" aria-labelledby="pmas-regla">
      <p className="rotulo">La regla</p>
      <h2 id="pmas-regla">Mirar es gratis. Lo que se paga es para quien lo hizo.</h2>
      <p className="regla-frase">
        Dejar una huella cuesta {precios.huella} de prueba, y el {parte.toLocaleString("es-AR")}% va a quien lo subió.
      </p>
      <ul className="regla-lista">
        {compromisos.map(([titulo, texto]) => (
          <li key={texto}>
            <span className="regla-tilde" aria-hidden="true">✓</span>
            <b>{titulo}</b>
            <span>{texto}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PortadaMas({ vivas, precios }: { vivas: Map<string, EnVivo> | null; precios: PreciosVivos }) {
  const lista = useCielo();
  // Las de la tira de arriba no se repiten acá.
  const enLaTira = new Set(OBRAS_DE_PORTADA.flatMap((o) => [o.id, o.titulo]).filter(Boolean));
  const destacadas = (lista ?? []).filter((o) => o.foto_ruta && !enLaTira.has(o.id) && !enLaTira.has(o.titulo ?? "")).slice(0, 6);
  const nObras = lista?.length ?? 0;
  const nHuellas = (lista ?? []).reduce((s, o) => s + o.respuestas_publicadas, 0);

  return (
    <div className="pmas">
      <section className="como" aria-labelledby="pmas-como">
        <div>
          <p className="rotulo">Cómo funciona</p>
          <h2 id="pmas-como">Lo subís vos. Lo sigue la gente.</h2>
          <ol className="como-pasos">
            {pasos(precios).map(([etiqueta, titulo, texto], i) => (
              <li key={titulo}>
                <span className="como-etiqueta" aria-hidden="true">
                  0{i + 1} / {etiqueta}
                </span>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ol>
        </div>
        <Ejemplo vivo={vivas?.get(OBRA_DE_EJEMPLO)} />
      </section>

      <Regla precios={precios} />

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
          <p>
            <a href={`#/obra/${OBRA_CON_SELLO}`}>Mirá una obra con este sello</a>
          </p>
        </div>
      </section>

      <section className="pmas-cierre">
        <CierreCielo />
        <h2>Cada obra es una estrella. Cada huella, una línea.</h2>
        <button className="entrar" onClick={() => ir("/cielo")}>
          Ver las obras <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}
