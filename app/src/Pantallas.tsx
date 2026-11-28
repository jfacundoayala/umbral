// Las pantallas, en el orden de la demo: portada → cielo → ficha (continuar, apoyar) → abrir → cobrar.
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { audioValido, fotoValida } from "./archivos";
import { borrarRetirada, cambiarFavorito, favoritosDe, urlAudio, urlFoto, urlTarjeta, type Huella, type Orden } from "./base";
import { corta, enlaceTx, ir, mensajeError, monedaDe, MONEDAS, palabras, plata, type Moneda } from "./comun";
import Constelacion from "./Constelacion";
import AvisoPlaca from "./AvisoPlaca";
import { placaFirmada } from "./placa-firma";
import { RED, UNIDAD } from "./config";
import Reproductor from "./Reproductor";
import "./Formularios.css";
import { nuevaSal, PagoSinConfirmar } from "./sin-red";
import type { Derechos, Documento, Firmar } from "./umbral";
import { Movible } from "./Movible";
import { SelloVivo } from "./SelloVivo";
import { esObraFisica } from "./fisica";
import { constelacionPrimero, obrasPrimero, ORDEN_INICIAL } from "./adelanto";

// Lo que habla con la red (stellar-sdk y la billetera) se baja recién cuando hace falta:
// el cielo y la ficha se dibujan sin esperarlo.
const red = () => import("./umbral");
/** Espera a que la página termine de cargar y el navegador quede libre. */
const enCalma = () =>
  new Promise<void>((listo) => {
    const esperar = () => ("requestIdleCallback" in window ? requestIdleCallback(() => listo(), { timeout: 2500 }) : setTimeout(listo, 1200));
    if (document.readyState === "complete") esperar();
    else addEventListener("load", esperar, { once: true });
  });
/** Para lo que se lee de la red al abrir una pantalla (precios, reparto, sello): el cliente del contrato
 *  se baja después de mostrar la obra, así no compite con la foto. Lo que dispara la persona usa `red()`. */
const redLuego = () => enCalma().then(red);
const acciones = () => import("./acciones");
const firmar: Firmar = async (xdr, cuenta) => (await import("./billetera")).firmar(xdr, cuenta);

export type Sesion = { cuenta: string | null; moneda: Moneda; cambiarMoneda: (m: Moneda) => void; entrar: () => Promise<string | null> };

/** Estado de una acción con pago: lo que pasa ahora, el error o el comprobante final. */
function useAccion() {
  const [paso, setPaso] = useState("");
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState<{ enlace: string } | null>(null);
  const ocupado = paso !== "";
  async function correr(f: (avance: (t: string) => void) => Promise<{ enlace: string } | void>) {
    setError("");
    setHecho(null);
    setPaso("Preparando…");
    try {
      const r = await f(setPaso);
      if (r) setHecho(r);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setPaso("");
    }
  }
  return { paso, error, hecho, ocupado, correr, setError };
}

/** Después de dejar una huella: invitación chica a contar cómo fue. */
const OPINAR = <a className="opinar" href="#/opinion?desde=huella">Contanos qué te pareció</a>;

function Estado({ a, listo, opinar }: { a: ReturnType<typeof useAccion>; listo: string; opinar?: boolean }) {
  return (
    <div className="estado" role="status" aria-live="polite">
      {a.paso && <p>{a.paso}</p>}
      {a.error && <p className="error">{a.error}</p>}
      {a.hecho && (
        <p>
          {listo}{" "}
          {a.hecho.enlace && (
            <a href={a.hecho.enlace} target="_blank" rel="noopener noreferrer">
              Ver el comprobante ↗
            </a>
          )}
          {opinar && <> · {OPINAR}</>}
        </p>
      )}
    </div>
  );
}

type Precios = { huella: bigint; continuar: bigint };

const CLAVE_PRECIOS = "umbral-precios";
/** El último precio que se leyó en este navegador. */
function preciosGuardados(moneda: string): Precios | null {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_PRECIOS) ?? "{}")[moneda];
    return g ? { huella: BigInt(g.huella), continuar: BigInt(g.continuar) } : null;
  } catch {
    return null;
  }
}
function guardarPrecios(moneda: string, p: Precios) {
  try {
    const todos = JSON.parse(localStorage.getItem(CLAVE_PRECIOS) ?? "{}");
    todos[moneda] = { huella: String(p.huella), continuar: String(p.continuar) };
    localStorage.setItem(CLAVE_PRECIOS, JSON.stringify(todos));
  } catch {
    // Sin lugar para guardar: la próxima vez se vuelve a leer.
  }
}

/** Precios en la moneda con la que se paga y, como referencia, en USDC: el precio se dice siempre en USDC.
 *  `precios` es lo que dice el contrato ahora (con eso se firma). `conocidos` es eso o, mientras llega,
 *  lo último que se leyó en este navegador: sirve para mostrar el precio sin esperar. */
function usePrecios(moneda: string) {
  const [leidos, setLeidos] = useState<{ moneda: string; precios: Precios } | null>(null);
  const [enUsdc, setEnUsdc] = useState<Precios | null>(() => preciosGuardados(MONEDAS[0].id));
  const [fallo, setFallo] = useState("");
  const guardados = useMemo(() => preciosGuardados(moneda), [moneda]);
  useEffect(() => {
    let vivo = true;
    redLuego()
      .then((r) => r.preciosVigentes(moneda))
      .then((p) => {
        guardarPrecios(moneda, p);
        if (vivo) {
          setLeidos({ moneda, precios: p });
          setFallo("");
        }
      })
      .catch(() => vivo && setFallo(moneda));
    // Si la referencia no se puede leer, se muestra solo lo que se paga.
    redLuego()
      .then((r) => r.preciosVigentes(MONEDAS[0].id))
      .then((p) => {
        guardarPrecios(MONEDAS[0].id, p);
        if (vivo) setEnUsdc(p);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [moneda]);
  const precios = leidos?.moneda === moneda ? leidos.precios : null;
  return { precios, conocidos: precios ?? guardados, enUsdc, error: fallo === moneda && !precios };
}

/** "1 USDC", o "1 USDC (10 XLM)" si se paga en otra moneda: primero el precio en USDC, después lo que sale de la cuenta. */
function precioEnUsdc(pago: bigint, codigo: string, usdc?: bigint) {
  return codigo === "USDC" || usdc === undefined ? plata(pago, codigo) : `${plata(usdc, "USDC")} (${plata(pago, codigo)})`;
}

/** Con qué se paga. Va en cada formulario de pago, no en el menú. */
function ElegirMoneda({ sesion }: { sesion: Sesion }) {
  return (
    <label className="campo moneda-pago">
      <span>Moneda (de prueba)</span>
      <select value={sesion.moneda.id} onChange={(e) => sesion.cambiarMoneda(monedaDe(e.target.value))}>
        {MONEDAS.map((m) => (
          <option key={m.id} value={m.id}>{m.codigo}</option>
        ))}
      </select>
    </label>
  );
}

function BotonEntrar({ sesion, texto }: { sesion: Sesion; texto: string }) {
  return (
    <div className="pedir-cuenta">
      <p>{texto}</p>
      <button className="btn lleno" onClick={() => sesion.entrar()}>
        Entrar con billetera
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Cielo

export function Cielo() {
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const [lista, setLista] = useState<Huella[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let vivo = true;
    obrasPrimero(orden)
      .then((l) => vivo && (setLista(l), setError("")))
      .catch((e) => vivo && setError(mensajeError(e)));
    return () => {
      vivo = false;
    };
  }, [orden]);

  return (
    <section className="hoja">
      <p className="rotulo">El cielo</p>
      <h1 className="titulo">Obras expuestas</h1>
      <p className="sub">Tocá una obra para verla y dejarle tu huella. Las que más huellas tienen brillan primero.</p>
      <p>
        <button className="btn" onClick={() => ir("/abrir")}>Subí lo tuyo</button>
      </p>
      <div className="orden" role="group" aria-label="Ordenar">
        <button aria-pressed={orden === "huellas"} onClick={() => setOrden("huellas")}>
          Más huellas
        </button>
        <button aria-pressed={orden === "nuevas"} onClick={() => setOrden("nuevas")}>
          Más nuevas
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {!lista && !error && <p>Mirando el cielo…</p>}
      {lista?.length === 0 && (
        <div className="vacio">
          <p>Todavía no hay obras. La primera puede ser la tuya.</p>
          <button className="btn lleno" onClick={() => ir("/abrir")}>
            Subí lo tuyo
          </button>
        </div>
      )}
      <ul className="obras">
        {lista?.map((o, i) => (
          <li key={o.id}>
            <a href={`#/obra/${o.id}`} className="tarjeta">
              {o.foto_ruta ? (
                <Movible>
                <img
                  src={urlTarjeta(o.id, o.foto_ruta)}
                  alt=""
                  loading={i < 2 ? "eager" : "lazy"}
                  fetchPriority={i < 2 ? "high" : "auto"}
                  onError={(e) => {
                    // Si la miniatura falla, vuelve a la foto firmada.
                    const firmada = urlFoto(o.foto_ruta ?? "");
                    if (e.currentTarget.src !== firmada) e.currentTarget.src = firmada;
                  }}
                />
                </Movible>
              ) : (
                <span className="sin-foto" aria-hidden="true">
                  <svg viewBox="-20 -20 40 40">
                    <circle r="7" />
                  </svg>
                </span>
              )}
              <span className="titulo">{o.titulo}</span>
              <span className="autor">{o.nombre}</span>
              <span className="huellas">
                {o.respuestas_publicadas} {o.respuestas_publicadas === 1 ? "huella" : "huellas"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- Ficha de una obra

export function Ficha({ id, sesion, desdePlaca, dejar }: { id: string; sesion: Sesion; desdePlaca?: { firma: string }; dejar?: boolean }) {
  // Llegada desde la placa: se comprueba que la haya firmado quien expuso la obra.
  const [placaOk, setPlacaOk] = useState<boolean | null>(null);
  const [datos, setDatos] = useState<{ obra: Huella | null; huellas: Huella[] } | null>(null);
  const [error, setError] = useState("");
  const [elegida, setElegida] = useState(id);
  const [vuelta, setVuelta] = useState(0);
  const [publicada, setPublicada] = useState<string | null>(null); // "" = publicada sin enlace al comprobante
  const [sello, setSello] = useState<{ obra: string; museo: string } | null>(null);
  const salaObra = datos?.obra?.sala ?? null;
  const txObra = datos?.obra?.tx_hash ?? null;
  const idObra = datos?.obra?.id ?? null;

  const autorObra = datos?.obra?.autor ?? null;
  const digestObra = datos?.obra?.digest ?? null;
  const firmaPlaca = desdePlaca?.firma ?? null;
  useEffect(() => {
    if (firmaPlaca === null || !idObra || !autorObra || !digestObra) return;
    let vivo = true;
    placaFirmada({ id: idObra, autor: autorObra, digest: digestObra }, firmaPlaca).then((ok) => vivo && setPlacaOk(ok));
    return () => {
      vivo = false;
    };
  }, [firmaPlaca, idObra, autorObra, digestObra]);

  // Sello de presencia: la obra se abrió por invitación de una sala y la pagó su fondo (se lee en la red).
  useEffect(() => {
    if (!salaObra || !txObra || !idObra) return;
    let vivo = true;
    redLuego()
      .then((r) => Promise.all([r.pagadaPorSala(txObra), r.museoDe(salaObra)]))
      .then(([pagada, museo]) => vivo && pagada && museo && setSello({ obra: idObra, museo }))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [salaObra, txObra, idObra]);

  useEffect(() => {
    let vivo = true;
    constelacionPrimero(id)
      .then((d) => vivo && (setDatos(d), setError("")))
      .catch((e) => vivo && setError(mensajeError(e)));
    return () => {
      vivo = false;
    };
  }, [id, vuelta]);

  // Llegada con ?dejar (el botón "Dejar mi huella" de la portada): va al formulario y pone el cursor ahí.
  const cargada = !!datos?.obra;
  useEffect(() => {
    if (!dejar || !cargada) return;
    const campo = document.getElementById("lo-que-sentiste");
    campo?.closest("form")?.scrollIntoView({ block: "start" });
    campo?.focus({ preventScroll: true });
  }, [dejar, cargada]);

  if (error) return <section className="hoja"><p className="error">{error}</p></section>;
  if (!datos) return <section className="hoja"><p>Buscando la obra…</p></section>;
  const { obra, huellas } = datos;
  if (!obra) {
    return (
      <section className="hoja">
        <p>Esa obra no está (o todavía no se publicó).</p>
        <button className="btn" onClick={() => ir("/cielo")}>Volver al cielo</button>
      </section>
    );
  }
  const actual = [obra, ...huellas].find((h) => h.id === elegida) ?? obra;
  // La placa con QR va al lado de una obra que se puede visitar: una escultura, un mural, una pintura.
  const conPlaca = obra.estado !== "retirada" && esObraFisica(obra);

  return (
    <section className="ficha-obra">
      <div className="cielo-obra">
        <button className="volver" onClick={() => ir("/cielo")}>← El cielo</button>
        {/* En el celular, arriba van el título y una miniatura: quien escanea la placa ve enseguida que llegó a la obra. */}
        <div className="obra-cabeza">
          {obra.foto_ruta && obra.estado !== "retirada" && (
            <button
              type="button"
              className="obra-mini"
              aria-label="Ver la obra"
              onClick={() => {
                setElegida(obra.id);
                document.querySelector(".ficha-obra aside")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <img
                src={urlTarjeta(obra.id, obra.foto_ruta)}
                alt=""
                width={76}
                height={76}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (obra.foto_ruta && !img.src.endsWith(obra.foto_ruta)) img.src = urlFoto(obra.foto_ruta);
                }}
              />
            </button>
          )}
          <div>
            <h1 className="titulo">{obra.estado === "retirada" ? "Obra retirada" : obra.titulo}</h1>
            {obra.estado !== "retirada" && obra.nombre && <p className="obra-autoria">de {obra.nombre}</p>}
          </div>
        </div>
        {desdePlaca && obra.estado !== "retirada" && <AvisoPlaca firmada={placaOk} obra={obra} />}
        <p className="sub">
          {huellas.length === 0
            ? "Todavía no tiene huellas. Dejá la primera y contá qué sentiste al verla."
            : `${huellas.length} ${huellas.length === 1 ? "huella" : "huellas"}. La obra está en el centro y cada huella sale de aquella a la que responde. Tocá cualquiera para leerla y dejarle tu huella.`}
        </p>
        <Constelacion obra={obra} huellas={huellas} elegida={actual.id} elegir={setElegida} invitada={sello?.obra === obra.id} />
      </div>
      <aside>
        {publicada !== null && (
          <p className="estado publicada" role="status">
            Listo: tu huella ya está en la constelación.{" "}
            {publicada && <a href={publicada} target="_blank" rel="noopener noreferrer">Ver el comprobante ↗</a>} · {OPINAR}
          </p>
        )}
        <Lectura key={`l${actual.id}`} h={actual} esObra={actual.id === obra.id} sesion={sesion} alRetirar={() => setVuelta((v) => v + 1)} museo={sello?.obra === actual.id ? sello.museo : null} placa={conPlaca && actual.id === obra.id} />
        <Continuar key={actual.id} obra={obra} padre={actual} sesion={sesion} alPublicar={(nueva, enlace) => { setElegida(nueva); setVuelta((v) => v + 1); setPublicada(enlace); }} />
        <Apoyar obra={obra} sesion={sesion} />
      </aside>
    </section>
  );
}

function Lectura({ h, esObra, sesion, alRetirar, museo, placa }: { h: Huella; esObra: boolean; sesion: Sesion; alRetirar: () => void; museo: string | null; placa: boolean }) {
  const fecha = new Date(h.creado).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="lectura">
      <div className="fila-arriba">
        <p className="rotulo">{esObra ? "La obra" : "Una huella"}</p>
        <Favorito huella={h.id} sesion={sesion} />
      </div>
      {museo && (
        <div className="sello" title="La sala la invitó y su fondo pagó la obra. Se puede ver en el comprobante.">
          <SelloVivo chico className="sello-marca" />
          <span className="sello-raya" aria-hidden="true" />
          <p>
            <span className="sello-cero">UMBRAL ABIERTO</span>
            <span className="sello-uno">Estuve ahí</span>
            <span className="sello-modo">Presencial</span>
            <span className="sello-dos">
              invitada por la sala de{" "}
              <a href={`${RED.explorador}/account/${museo}`} target="_blank" rel="noopener noreferrer">
                {corta(museo)}
              </a>
            </span>
          </p>
        </div>
      )}
      {h.estado === "retirada" ? (
        <>
          <h2 className="h3">{esObra ? "Obra retirada" : "Huella retirada"}</h2>
          <p className="sub">Quien la escribió la retiró. Su contenido se borró y el comprobante sigue en la red.</p>
        </>
      ) : esObra ? (
        <>
          {h.foto_ruta && (
            <Movible
              className="movible-foto"
              zoom
              grosor={16}
              dorso={
                <span className="dorso-cuadro">
                  <span className="etiqueta">
                    <span className="rotulo">UMBRAL · Museo vivo</span>
                    <strong>{h.titulo}</strong>
                    {h.nombre && <span>{h.nombre}</span>}
                    <span>Expuesta el {fecha}</span>
                    <span>Cuenta {corta(h.autor)}</span>
                  </span>
                </span>
              }
            >
              <img className="foto" src={urlFoto(h.foto_ruta)} alt={`Foto de la obra ${h.titulo ?? ""}`} />
            </Movible>
          )}
          {h.foto_ruta && <p className="pista-zoom">Arrastrala de costado para darla vuelta y ver su dorso. Doble clic o doble toque para acercar.</p>}
          <h2 className="h3">{h.titulo}</h2>
          {h.descripcion && <p>{h.descripcion}</p>}
          {h.audio_ruta && <Reproductor src={urlAudio(h.audio_ruta)} />}
        </>
      ) : (
        <blockquote>{h.texto}</blockquote>
      )}
      <p className="meta">
        {h.nombre ? `${esObra ? "Obra de" : "Por"} ${h.nombre} · ` : ""}
        {fecha} · cuenta {corta(h.autor)}
      </p>
      {h.tx_hash && (
        <p className="comprobante">
          <a className="btn" href={enlaceTx(h.tx_hash)} target="_blank" rel="noopener noreferrer">
            Ver el comprobante público ↗
          </a>
          <small>Un registro que nadie puede borrar ni cambiar.</small>
        </p>
      )}
      {esObra && h.estado === "publicada" && <Compartir id={h.id} titulo={h.titulo} />}
      {placa && (
        <p className="placa-oferta">
          ¿La hiciste vos? <a href={`#/placa/${h.id}`}>Imprimí una placa con QR para ponerla al lado de la obra</a>.
        </p>
      )}
      {esObra && h.estado !== "retirada" && <RepartoFicha nombre={h.nombre} />}
      {h.estado === "publicada" && sesion.cuenta === h.autor && <Retirar h={h} cuenta={sesion.cuenta} alRetirar={alRetirar} />}
    </div>
  );
}

/** Comparte el link /o/<id>: al pegarlo en WhatsApp o en una red se ve la foto y el título de la obra.
 *  En el celular abre el menú de compartir; en la compu copia el link. */
function Compartir({ id, titulo }: { id: string; titulo: string | null }) {
  const [aviso, setAviso] = useState("");
  const link = `${location.origin}/o/${id}`;
  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo ?? "Una obra en UMBRAL", text: titulo ? `"${titulo}" en UMBRAL` : "Una obra en UMBRAL", url: link });
      } catch {
        // La persona cerró el menú: no hay nada que avisar.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setAviso("Link copiado. Pegalo donde quieras.");
    } catch {
      setAviso(`Copiá este link: ${link}`);
    }
  };
  return (
    <div className="compartir">
      <button type="button" className="btn" onClick={compartir}>
        Compartir la obra
      </button>
      <p className="compartir-aviso" role="status">
        {aviso}
      </p>
    </div>
  );
}

/** A dónde va tu huella: el % que aplica hoy el contrato, leído en vivo. */
function RepartoFicha({ nombre }: { nombre: string | null }) {
  const [autor, setAutor] = useState<number | null>(null);
  useEffect(() => {
    redLuego().then((m) => m.repartoVigente()).then((r) => setAutor(r.autor)).catch(() => setAutor(null));
  }, []);
  if (autor === null) return null;
  return (
    <div className="reparto-ficha">
      <p className="rotulo">A dónde va tu huella</p>
      <p>
        <b>{autor.toLocaleString("es-AR")}%</b> para {nombre || "quien hizo la obra"}, al momento. <b>{(100 - autor).toLocaleString("es-AR")}%</b> para sostener UMBRAL. Lo dice el contrato, no nosotros.
      </p>
      <a href="#/cuentas">Ver las cuentas claras</a>
    </div>
  );
}

function Retirar({ h, cuenta, alRetirar }: { h: Huella; cuenta: string; alRetirar: () => void }) {
  const [seguro, setSeguro] = useState(false);
  const a = useAccion();
  if (!seguro) {
    return (
      <button className="btn retirar" onClick={() => setSeguro(true)}>
        Retirar mi huella
      </button>
    );
  }
  return (
    <div className="caja aviso-retirar">
      <p>
        Vamos a borrar el contenido de tu huella de UMBRAL. <b>El comprobante en la red de Stellar no se puede borrar</b>: va a seguir diciendo que
        dejaste una huella ese día, pero sin el texto. Esto no se deshace.
      </p>
      <div className="fila">
        <button
          className="btn lleno"
          disabled={a.ocupado}
          onClick={() =>
            a.correr(async (avance) => {
              avance("Firmá en tu billetera…");
              try {
                await (await red()).retirar(cuenta, firmar, h.id);
              } catch (e) {
                // Si ya estaba retirada en la red (un intento anterior que se cortó) o la red no confirmó,
                // igual se borra el contenido: borrarRetirada espera a que la red lo confirme.
                if (!(e instanceof PagoSinConfirmar) && mensajeError(e) !== "Esa huella fue retirada.") throw e;
              }
              avance("Borrando el contenido…");
              await borrarRetirada(h.id);
              alRetirar();
            })
          }
        >
          Firmar y retirar
        </button>
        <button className="btn" disabled={a.ocupado} onClick={() => setSeguro(false)}>
          Mejor no
        </button>
      </div>
      <Estado a={a} listo="" />
    </div>
  );
}

function Favorito({ huella, sesion }: { huella: string; sesion: Sesion }) {
  const [guardadas, setGuardadas] = useState<Set<string> | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const cuenta = sesion.cuenta;
  useEffect(() => {
    if (!cuenta) return;
    favoritosDe(cuenta).then(setGuardadas).catch(() => setGuardadas(new Set()));
  }, [cuenta]);
  if (!cuenta || !guardadas) return null;
  const esta = guardadas.has(huella);
  async function cambiar() {
    if (!cuenta) return;
    setOcupado(true);
    setError("");
    try {
      const accion = esta ? "quitar" : "guardar";
      const { fecha, firma } = await (await acciones()).firmaDeFavoritos(cuenta, accion, huella);
      await cambiarFavorito({ cuenta, huella_id: huella, accion, fecha, firma });
      const nuevas = new Set(guardadas);
      if (esta) nuevas.delete(huella);
      else nuevas.add(huella);
      setGuardadas(nuevas);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }
  return (
    <span className="favorito">
      <button onClick={cambiar} disabled={ocupado} aria-pressed={esta} aria-label="Favorito" title={esta ? "Quitar de favoritos" : "Guardar en favoritos"}>
        {esta ? "★" : "☆"}
      </button>
      {error && <small className="error">{error}</small>}
    </span>
  );
}

/** El documento se guarda mientras no cambie lo escrito: si la firma falla y la persona reintenta,
 *  se usa el mismo borrador en vez de dejar otro (la base acepta pocos borradores por hora). */
function useDocumento(clave: string, armar: () => Omit<Documento, "sal" | "creado">) {
  const ref = useRef<{ clave: string; doc: Documento } | null>(null);
  return () => {
    if (ref.current?.clave !== clave) ref.current = { clave, doc: { ...armar(), creado: new Date().toISOString(), sal: nuevaSal() } };
    return ref.current.doc;
  };
}

function Continuar({ obra, padre, sesion, alPublicar }: { obra: Huella; padre: Huella; sesion: Sesion; alPublicar: (id: string, enlace: string) => void }) {
  const [texto, setTexto] = useState("");
  const [nombre, setNombre] = useState("");
  const [permiso, setPermiso] = useState(false);
  const { precios, conocidos, enUsdc, error: sinPrecio } = usePrecios(sesion.moneda.id);
  const a = useAccion();
  const limpio = texto.trim();
  const doc = useDocumento(`${sesion.cuenta}|${sesion.moneda.id}|${padre.id}|${limpio}|${nombre.trim()}`, () => ({ texto: limpio, nombre: nombre.trim() }));
  const precio = precios?.continuar;
  const visto = precio ?? conocidos?.continuar;
  const listo = limpio.length >= 3 && limpio.length <= 300 && nombre.trim().length > 0 && permiso && precio !== undefined && !a.ocupado;

  if (padre.estado === "retirada") return null;
  return (
    <form
      className="caja"
      onSubmit={(e) => {
        e.preventDefault();
        if (!sesion.cuenta || precio === undefined) return;
        const cuenta = sesion.cuenta;
        a.correr(async (avance) => {
          const r = await (await acciones()).continuarHuella(cuenta, obra, padre.id, doc(), precio, sesion.moneda.id, avance);
          setTexto("");
          setPermiso(false);
          alPublicar(r.id, r.enlace);
          return r;
        });
      }}
    >
      <p className="rotulo">{padre.id === obra.id ? "Dejá tu huella sobre esta obra" : "Dejá tu huella sobre esta"}</p>
      <label className="campo">
        <span>Lo que sentiste</span>
        <textarea id="lo-que-sentiste" value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} placeholder="Solo texto, hasta 300 caracteres" />
        <small>{texto.length}/300</small>
      </label>
      <label className="campo">
        <span>Tu nombre o seudónimo</span>
        <input value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={permiso} onChange={(e) => setPermiso(e.target.checked)} />
        <span>Doy permiso para publicar este texto. Sé que cualquiera lo puede leer y que no incluye datos sensibles míos ni de otras personas.</span>
      </label>
      <ElegirMoneda sesion={sesion} />
      <p className="precio">
        Cuesta <b>{visto !== undefined ? precioEnUsdc(visto, sesion.moneda.codigo, enUsdc?.continuar) : sinPrecio ? "(no se pudo leer el precio)" : "(leyendo el precio)"}</b>. El 80% va a quien hizo la obra y el 20% a UMBRAL. Solo cambia si el artista firma una muestra con una sala, y nunca le queda menos del 30%. Vos no cobrás por dejar tu huella.
      </p>
      {sesion.cuenta ? (
        <button className="btn lleno" disabled={!listo}>
          Firmar y pagar {precio !== undefined ? plata(precio, sesion.moneda.codigo) : ""}
        </button>
      ) : (
        <BotonEntrar sesion={sesion} texto="Para dejar tu huella, entrá con tu billetera." />
      )}
      {sesion.cuenta && !listo && !a.ocupado && precio !== undefined && (
        <p className="sub">Para firmar, escribí al menos 3 letras, poné tu nombre y marcá el permiso.</p>
      )}
      <Estado a={a} listo="Listo, tu huella ya está en la constelación." opinar />
    </form>
  );
}

function Apoyar({ obra, sesion }: { obra: Huella; sesion: Sesion }) {
  const [monto, setMonto] = useState("1");
  const a = useAccion();
  const n = Number(monto.replace(",", "."));
  const valido = Number.isFinite(n) && n >= 0.01 && n <= 10_000;
  return (
    <form
      className="caja"
      onSubmit={(e) => {
        e.preventDefault();
        if (!sesion.cuenta || !valido) return;
        const cuenta = sesion.cuenta;
        a.correr(async (avance) => {
          avance("Firmá en tu billetera…");
          return (await red()).apoyar(cuenta, firmar, obra.id, n, sesion.moneda.id);
        });
      }}
    >
      <p className="rotulo">Apoyar</p>
      <p className="sub">Sin escribir nada, elegí cuánto. El 80% es para quien lo subió.</p>
      <ElegirMoneda sesion={sesion} />
      <div className="fila">
        <label className="monto">
          <input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} aria-label={`Monto en ${sesion.moneda.codigo}`} />
          <span>{sesion.moneda.codigo}</span>
        </label>
        {sesion.cuenta ? (
          <button className="btn lleno" disabled={!valido || a.ocupado}>
            Firmar y apoyar
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => sesion.entrar()}>
            Entrar con billetera
          </button>
        )}
      </div>
      {!valido && monto.trim() !== "" && <p className="error" role="status">Poné un monto entre 0,01 y 10.000 {sesion.moneda.codigo}.</p>}
      <Estado a={a} listo="Gracias, tu apoyo llegó." />
    </form>
  );
}

// ---------------------------------------------------------------- Abrir una obra

/** Si la persona llegó con una invitación de sala: de qué museo es y si el fondo le paga la obra. */
function useInvitacion(sala: string | undefined, cuenta: string | null, moneda: string) {
  const [datos, setDatos] = useState<{ museo: string | null; invitada: boolean; fondo: bigint } | null>(null);
  useEffect(() => {
    if (!sala) return;
    let vivo = true;
    redLuego()
      .then((r) => Promise.all([r.museoDe(sala), cuenta ? r.invitacion(sala, cuenta, moneda) : Promise.resolve({ invitada: false, fondo: 0n })]))
      .then(([museo, inv]) => vivo && setDatos({ museo, ...inv }))
      .catch(() => vivo && setDatos({ museo: null, invitada: false, fondo: 0n }));
    return () => {
      vivo = false;
    };
  }, [sala, cuenta, moneda]);
  return sala ? datos : null;
}

const OPCIONES_DERECHOS: [Derechos, string][] = [
  ["autoria", "Un recuerdo, una receta, una foto de la familia, o una obra que hice yo."],
  ["dominio_publico", "Es de dominio público, su autor murió hace más de 70 años."],
  ["autorizacion", "Tengo autorización de su autor o de quien tiene sus derechos."],
];
const NOMBRE_DERECHOS: Record<Derechos, string> = { autoria: "Es mío", dominio_publico: "Dominio público", autorizacion: "Con autorización" };

const peso = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`);
const minutos = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="paso">
      <div className="paso-cabeza">
        <span className="paso-n" aria-hidden="true">{n}</span>
        <h2 className="h3">{titulo}</h2>
      </div>
      <div className="paso-cuerpo">{children}</div>
    </li>
  );
}

const IconoFoto = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="6" y="10" width="36" height="28" />
    <circle cx="17" cy="20" r="3.5" className="acento" />
    <path d="M6 33 18 24l8 6 6-4 10 7" />
  </svg>
);
const IconoAudio = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M8 22v4M14 18v12M26 16v16M32 20v8M38 14v20M44 21v6" />
    <path d="M20 10v28" className="acento" />
  </svg>
);

/** Zona para tocar o soltar un archivo. El input queda oculto a la vista, pero se usa con teclado y lector. */
function ZonaArchivo({ tipo, etiqueta, ayuda, accept, archivo, url, aviso, alElegir }: {
  tipo: "foto" | "audio";
  etiqueta: string;
  ayuda: string;
  accept: string;
  archivo: File | null;
  url: string | null;
  aviso: string;
  alElegir: (f: File | null) => boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [dura, setDura] = useState<{ url: string; seg: number } | null>(null);
  const idAviso = useId();
  const seg = url && dura?.url === url ? dura.seg : Number.NaN;
  const limpiar = () => {
    if (input.current) input.current.value = "";
  };
  return (
    <div className="archivo">
      <p className="archivo-rotulo">
        {etiqueta} <span>(opcional)</span>
      </p>
      {archivo && (
        <div className="archivo-elegido">
          {tipo === "foto" && url ? (
            <img className="archivo-mini" src={url} alt="" />
          ) : (
            <span className="archivo-mini icono">{tipo === "foto" ? <IconoFoto /> : <IconoAudio />}</span>
          )}
          <p className="archivo-datos">
            <b>{archivo.name}</b>
            <small>
              {tipo === "audio" && Number.isFinite(seg) ? `${minutos(seg)} · ` : ""}
              {peso(archivo.size)}
            </small>
          </p>
          <div className="archivo-botones">
            <button type="button" className="btn chico" onClick={() => input.current?.click()}>
              Cambiar<span className="solo-lector"> {tipo === "foto" ? "la foto" : "el audio"}</span>
            </button>
            <button
              type="button"
              className="btn chico"
              onClick={() => {
                alElegir(null);
                limpiar();
              }}
            >
              Quitar<span className="solo-lector"> {tipo === "foto" ? "la foto" : "el audio"}</span>
            </button>
          </div>
          {tipo === "audio" && url && (
            <audio src={url} preload="metadata" hidden onLoadedMetadata={(e) => setDura({ url, seg: e.currentTarget.duration })} />
          )}
        </div>
      )}
      <label
        className={`archivo-zona${encima ? " encima" : ""}${archivo ? " oculta" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          const f = e.dataTransfer.files?.[0];
          if (f) alElegir(f);
          limpiar();
        }}
      >
        <input
          ref={input}
          className="archivo-input"
          type="file"
          accept={accept}
          aria-label={`${etiqueta} (opcional, ${ayuda})`}
          aria-describedby={aviso ? idAviso : undefined}
          onChange={(e) => {
            if (!alElegir(e.target.files?.[0] ?? null)) e.target.value = "";
          }}
        />
        <span className="archivo-icono">{tipo === "foto" ? <IconoFoto /> : <IconoAudio />}</span>
        <span className="archivo-accion">
          <b>Tocá para elegir</b> o soltá el archivo acá
        </span>
        <small>{ayuda}</small>
      </label>
      {aviso && (
        <small id={idAviso} className="error archivo-aviso" role="alert">
          {aviso}
        </small>
      )}
    </div>
  );
}

export function Abrir({ sesion, sala }: { sesion: Sesion; sala?: string }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nombre, setNombre] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [aviso, setAviso] = useState("");
  const [avisoAudio, setAvisoAudio] = useState("");
  const inv = useInvitacion(sala, sesion.cuenta, sesion.moneda.id);
  const [permiso, setPermiso] = useState(false);
  const [derechos, setDerechos] = useState<Derechos | null>(null);
  const { precios, conocidos, enUsdc, error: sinPrecio } = usePrecios(sesion.moneda.id);
  const a = useAccion();
  const [nueva, setNueva] = useState<string | null>(null);
  const vista = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);
  const oido = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => () => {
    if (oido) URL.revokeObjectURL(oido);
  }, [oido]);
  const nPalabras = palabras(titulo);
  const precio = precios?.huella;
  const doc = useDocumento(
    `${sesion.cuenta}|${sesion.moneda.id}|${titulo.trim()}|${descripcion.trim()}|${nombre.trim()}|${foto?.name}|${foto?.size}|${foto?.lastModified}|${audio?.name}|${audio?.size}|${audio?.lastModified}|${sala}|${derechos}`,
    () => ({ texto: "", titulo: titulo.trim(), descripcion: descripcion.trim(), nombre: nombre.trim(), derechos: derechos ?? undefined }),
  );
  const pagaLaSala = !!inv?.invitada && precio !== undefined && inv.fondo >= precio;
  const listo = (!sala || inv?.museo) && nPalabras >= 1 && nPalabras <= 20 && titulo.trim().length <= 200 && descripcion.length <= 400 && nombre.trim().length > 0 && derechos !== null && permiso && precio !== undefined && !a.ocupado;
  const faltan = [
    nPalabras < 1 && "el título",
    !nombre.trim() && "tu nombre",
    derechos === null && "de quién es",
    !permiso && "marcar el permiso",
  ].filter((x): x is string => !!x);
  const pista = faltan.length ? `Para firmar te falta ${faltan.join(", ")}.` : nPalabras > 20 ? "Acortá el título, hasta 20 palabras." : "";
  const visto = precio ?? conocidos?.huella;
  const textoPrecio = visto !== undefined ? precioEnUsdc(visto, sesion.moneda.codigo, enUsdc?.huella) : sinPrecio ? "(no se pudo leer el precio)" : "(leyendo el precio)";

  const elegirFoto = (f: File | null) => {
    if (f && !fotoValida(f)) {
      setAviso("Esa foto no sirve. Tiene que ser JPG, PNG o WEBP y pesar hasta 20 MB.");
      setFoto(null);
      return false;
    }
    setAviso("");
    setFoto(f);
    return true;
  };
  const elegirAudio = (f: File | null) => {
    if (f && !audioValido(f)) {
      setAvisoAudio("Ese audio no sirve. Tiene que ser MP3, M4A, WEBM u OGG y pesar hasta 5 MB.");
      setAudio(null);
      return false;
    }
    setAvisoAudio("");
    setAudio(f);
    return true;
  };

  // La vista previa se dibuja en dos lugares: al costado en la compu y, en pantallas angostas,
  // justo antes de firmar, para ver cómo queda la obra antes de pagar.
  const previa = (
    <>
      <p className="rotulo">Así se va a ver</p>
      <article className="ficha-museo">
        {vista ? (
          <img className="ficha-foto" src={vista} alt="Vista previa de la foto" />
        ) : (
          <div className="ficha-foto vacia" aria-hidden="true">
            <IconoFoto />
            <span>Sin foto</span>
          </div>
        )}
        <div className="ficha-texto">
          <h2 className={titulo.trim() ? "h3" : "h3 a-completar"}>{titulo.trim() || "Título"}</h2>
          <p className={`ficha-autor${nombre.trim() ? "" : " a-completar"}`}>{nombre.trim() || "Tu nombre"}</p>
          {descripcion.trim() && <p className="ficha-desc">{descripcion.trim()}</p>}
          {oido && <Reproductor src={oido} />}
          <dl className="ficha-datos">
            <div>
              <dt>Derechos</dt>
              <dd>{derechos ? NOMBRE_DERECHOS[derechos] : "Sin elegir"}</dd>
            </div>
            <div>
              <dt>Subirlo</dt>
              <dd>
                {pagaLaSala ? "Paga la sala" : textoPrecio}
                <small>va a UMBRAL</small>
              </dd>
            </div>
          </dl>
        </div>
      </article>
      <p className="previa-nota">Después, cada huella y cada aporte te deja el 80%.</p>
    </>
  );

  return (
    <section className="hoja exponer">
      <div className="form-cabeza">
        <p className="rotulo">Exponer</p>
        <h1 className="titulo">Subí lo tuyo</h1>
        <p className="sub">Una obra o un recuerdo, con una foto o un audio y su título. Lo firmás con tu billetera y queda en el cielo a tu nombre. Cada vez que alguien le deje su huella o un aporte, te llega el 80%.</p>
      </div>
      {sala && (
        <p className="invitacion">
          {!inv
            ? "Leyendo la invitación…"
            : !inv.museo
              ? "Esa sala no existe. Podés subirla igual, sin sala, desde \"Subí lo tuyo\"."
              : `Te invitó la sala de ${corta(inv.museo)}. ${pagaLaSala ? "Su fondo paga esta obra, vos no pagás nada." : sesion.cuenta ? "Tu cuenta no tiene una invitación disponible de esta sala (o se le acabó el fondo). La obra la pagás vos." : "Entrá con tu billetera para ver si la sala te paga la obra."}`}
          {inv?.museo && sesion.cuenta && !pagaLaSala && (
            <>
              {" "}Si estás en la sala, <a href={`#/codigo?sala=${sala}`}>mostrá tu código para el encuentro</a> y te invitan en la puerta.
            </>
          )}
        </p>
      )}
      <div className="exponer-grilla">
        <form
          className="form-pasos"
          onSubmit={(e) => {
            e.preventDefault();
            if (!sesion.cuenta || precio === undefined) return;
            const cuenta = sesion.cuenta;
            a.correr(async (avance) => {
              const r = await (await acciones()).abrirObra(cuenta, doc(), { foto, audio }, precio, sesion.moneda.id, avance, inv?.museo ? sala : undefined);
              setNueva(r.id);
              return r;
            });
          }}
        >
          <ol className="pasos">
            <Paso n={1} titulo="¿Qué subís?">
              <label className="campo">
                <span>Título</span>
                <input value={titulo} maxLength={200} onChange={(e) => setTitulo(e.target.value)} placeholder="Hasta 20 palabras" />
                <small className={nPalabras > 20 ? "error" : ""}>{nPalabras}/20 palabras</small>
              </label>
              <label className="campo">
                <span>Descripción (opcional)</span>
                <textarea value={descripcion} maxLength={400} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué es, de dónde viene, qué sentís al verlo" />
                <small>{descripcion.length}/400</small>
              </label>
              <label className="campo">
                <span>Tu nombre (o el de quien lo hizo)</span>
                <input value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
              </label>
            </Paso>
            <Paso n={2} titulo="Foto y audio">
              <ZonaArchivo
                tipo="foto"
                etiqueta="Foto"
                ayuda="JPG, PNG o WEBP, hasta 20 MB"
                accept="image/jpeg,image/png,image/webp"
                archivo={foto}
                url={vista}
                aviso={aviso}
                alElegir={elegirFoto}
              />
              <ZonaArchivo
                tipo="audio"
                etiqueta="Audio"
                ayuda="MP3, M4A, WEBM u OGG, hasta 5 MB"
                accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/webm,audio/ogg"
                archivo={audio}
                url={oido}
                aviso={avisoAudio}
                alElegir={elegirAudio}
              />
            </Paso>
            <Paso n={3} titulo="¿De quién es?">
              <fieldset className="derechos tarjetas-derechos">
                <legend>De quién es lo que subís (elegí una)</legend>
                {OPCIONES_DERECHOS.map(([valor, texto]) => (
                  <label key={valor} className="opcion-derecho">
                    <input type="radio" name="derechos" value={valor} checked={derechos === valor} onChange={() => setDerechos(valor)} required />
                    <span>
                      <b>{NOMBRE_DERECHOS[valor]}</b>
                      {texto}
                    </span>
                  </label>
                ))}
                <small>
                  Una foto tomada en la calle no alcanza. Una escultura o un mural en la vía pública sigue teniendo autor. Si aparecen personas que se reconocen, tienen que haber dado su consentimiento.{" "}
                  <a className="enlace-tocable" href="#/terminos" target="_blank" rel="noopener noreferrer">Leer los términos</a>
                </small>
              </fieldset>
            </Paso>
            <Paso n={4} titulo="Firmar y publicar">
              <div className="previa previa-angosta" role="group" aria-label="Vista previa de la ficha">
                {previa}
              </div>
              <label className="check permiso">
                <input type="checkbox" checked={permiso} onChange={(e) => setPermiso(e.target.checked)} />
                <span>Acepto que cualquiera lo vea y le deje su huella.</span>
              </label>
              <div className="resumen">
                <ElegirMoneda sesion={sesion} />
                <div className="resumen-fila" aria-hidden="true">
                  <span>Total</span>
                  <b>{pagaLaSala ? "Paga la sala" : textoPrecio}</b>
                </div>
                <p className="precio">
                  Subirlo cuesta <b>{textoPrecio}</b>, que van a UMBRAL.
                  {pagaLaSala && " Esta vez los paga el fondo de la sala."}
                </p>
                {sesion.cuenta ? (
                  <button className="btn lleno grande" disabled={!listo}>
                    {pagaLaSala ? "Firmar (paga la sala)" : `Firmar y pagar ${precio !== undefined ? plata(precio, sesion.moneda.codigo) : ""}`}
                  </button>
                ) : (
                  <BotonEntrar sesion={sesion} texto="Para subir lo tuyo, entrá con tu billetera." />
                )}
                {sesion.cuenta && !listo && !a.ocupado && precio !== undefined && pista && <p className="sub">{pista}</p>}
              </div>
              <Estado a={a} listo="Listo, tu obra ya está en el cielo." opinar />
              {nueva && (
                <button type="button" className="btn" onClick={() => ir(`/obra/${nueva}`)}>
                  Ver mi obra
                </button>
              )}
            </Paso>
          </ol>
        </form>
        <aside className="previa" aria-label="Vista previa de la ficha">
          {previa}
        </aside>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Cobrar

const PASOS_COBRO: { titulo: string; texto: string; dibujo: ReactNode }[] = [
  {
    titulo: "Alguien deja su huella o un aporte en tu obra",
    texto: "Cada huella nueva y cada aporte suman a tu saldo.",
    dibujo: (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M22 40 40 22M22 40l22 8" />
        <circle cx="22" cy="40" r="7" />
        <circle cx="42" cy="20" r="5" className="acento" />
        <circle cx="47" cy="49" r="4" />
      </svg>
    ),
  },
  {
    titulo: "El 80% queda a tu nombre",
    texto: "El otro 20% va a UMBRAL. Ves tu saldo acá, por moneda.",
    dibujo: (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="20" className="suave" />
        <circle cx="32" cy="32" r="20" className="acento" strokeDasharray="88 126" transform="rotate(-90 32 32)" />
        <circle cx="32" cy="32" r="2.5" className="lleno" />
      </svg>
    ),
  },
  {
    titulo: "Lo retirás cuando quieras",
    texto: "Al retirar, el dinero va directo a tu billetera.",
    dibujo: (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="12" y="28" width="40" height="24" />
        <path d="M12 34h40M42 43h4" />
        <path d="M32 6v15M26 15l6 6 6-6" className="acento" />
      </svg>
    ),
  },
];

export function Cobrar({ sesion }: { sesion: Sesion }) {
  const [saldos, setSaldos] = useState<Record<string, number> | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [sinSaldo, setSinSaldo] = useState(false);
  const a = useAccion();
  const cuenta = sesion.cuenta;
  useEffect(() => {
    if (!cuenta) return;
    let vivo = true;
    Promise.all(MONEDAS.map(async (m) => [m.id, await (await red()).saldoDe(cuenta, m.id)] as const))
      .then((l) => vivo && (setSaldos(Object.fromEntries(l)), setSinSaldo(false)))
      .catch(() => vivo && setSinSaldo(true));
    return () => {
      vivo = false;
    };
  }, [cuenta, vuelta]);

  const pasos = (
    <ol className="cobro-pasos" aria-label="Cómo funciona">
      {PASOS_COBRO.map((p, i) => (
        <li key={p.titulo}>
          <span className="cobro-dibujo">{p.dibujo}</span>
          <span className="cobro-n" aria-hidden="true">0{i + 1}</span>
          <h2 className="h3">{p.titulo}</h2>
          <p>{p.texto}</p>
        </li>
      ))}
    </ol>
  );

  return (
    <section className="hoja cobro">
      <div className="form-cabeza">
        <p className="rotulo">Mis cobros</p>
        <h1 className="titulo">Lo que juntaron tus obras</h1>
        <p className="sub">Si expusiste una obra, acá ves lo que juntó, el 80% de cada huella y de cada aporte. Lo pasás a tu billetera cuando quieras.</p>
      </div>
      {!cuenta ? (
        <>
          {pasos}
          <div className="cobro-entrar">
            <BotonEntrar sesion={sesion} texto="Entrá con tu billetera para ver tu saldo." />
          </div>
        </>
      ) : (
        <>
          <p className="cobro-destino">
            Se retira a tu billetera <code>{corta(cuenta)}</code>. El dinero va directo ahí.
          </p>
          {sinSaldo ? (
            <p className="error">No pudimos leer tu saldo. Probá de nuevo en un rato.</p>
          ) : !saldos ? (
            <p className="cobro-leyendo">Leyendo tu saldo…</p>
          ) : (
            <ul className="saldos-tarjetas">
              {MONEDAS.map((m) => {
                const s = saldos[m.id] ?? 0;
                return (
                  <li key={m.id} className={`saldo${s > 0 ? " con-saldo" : ""}`}>
                    <p className="rotulo">Saldo en {m.codigo}</p>
                    <p className="cifra">{plata(BigInt(Math.round(s * Number(UNIDAD))), m.codigo)}</p>
                    <p className="saldo-nota">{s > 0 ? "Listo para retirar" : "Sin saldo por ahora"}</p>
                    <button
                      className="btn lleno"
                      disabled={s <= 0 || a.ocupado}
                      onClick={() =>
                        a.correr(async (avance) => {
                          avance("Firmá en tu billetera…");
                          const r = await (await red()).cobrar(cuenta, firmar, m.id);
                          setVuelta((v) => v + 1);
                          return r;
                        })
                      }
                    >
                      Retirar a mi billetera<span className="solo-lector"> ({m.codigo})</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {saldos && MONEDAS.every((m) => (saldos[m.id] ?? 0) <= 0) && <p className="sub">Todavía no hay nada para retirar. Aparece acá cuando alguien deje su huella o un aporte en una obra tuya.</p>}
          <div className="cobro-resultado">
            <Estado a={a} listo="Listo, el dinero ya está en tu billetera." />
          </div>
          <p className="rotulo cobro-como">Cómo funciona</p>
          {pasos}
        </>
      )}
    </section>
  );
}
