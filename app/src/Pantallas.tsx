// Las pantallas, en el orden de la demo: portada → cielo → ficha (continuar, apoyar) → abrir → cobrar.
import { useEffect, useMemo, useRef, useState } from "react";
import { abrirObra, audioValido, continuarHuella, firmaDeFavoritos, fotoValida } from "./acciones";
import { borrarRetirada, cambiarFavorito, constelacion, favoritosDe, obras, urlAudio, urlFoto, type Huella, type Orden } from "./base";
import { firmar } from "./billetera";
import { corta, enlaceTx, ir, mensajeError, MONEDAS, palabras, plata, type Moneda } from "./comun";
import Constelacion from "./Constelacion";
import { RED, UNIDAD } from "./config";
import Reproductor from "./Reproductor";
import { apoyar, cobrar, invitacion, museoDe, nuevaSal, pagadaPorSala, preciosVigentes, retirar, saldoDe, type Derechos, type Documento } from "./umbral";

export type Sesion = { cuenta: string | null; moneda: Moneda; entrar: () => Promise<string | null> };

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

function Estado({ a, listo }: { a: ReturnType<typeof useAccion>; listo: string }) {
  return (
    <div className="estado" role="status" aria-live="polite">
      {a.paso && <p>{a.paso}</p>}
      {a.error && <p className="error">{a.error}</p>}
      {a.hecho && (
        <p>
          {listo}{" "}
          <a href={a.hecho.enlace} target="_blank" rel="noopener noreferrer">
            Ver el comprobante ↗
          </a>
        </p>
      )}
    </div>
  );
}

function usePrecios(moneda: string) {
  const [precios, setPrecios] = useState<{ huella: bigint; continuar: bigint } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    preciosVigentes(moneda)
      .then((p) => vivo && (setPrecios(p), setError(false)))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
      setPrecios(null);
    };
  }, [moneda]);
  return { precios, error };
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
  const [orden, setOrden] = useState<Orden>("huellas");
  const [lista, setLista] = useState<Huella[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let vivo = true;
    obras(orden)
      .then((l) => vivo && (setLista(l), setError("")))
      .catch((e) => vivo && setError(mensajeError(e)));
    return () => {
      vivo = false;
    };
  }, [orden]);

  return (
    <section className="hoja">
      <p className="rotulo">El cielo</p>
      <h2>Obras expuestas</h2>
      <p className="sub">Cada obra es una estrella. Las que más huellas tienen brillan primero.</p>
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
            Exponer una obra
          </button>
        </div>
      )}
      <ul className="obras">
        {lista?.map((o) => (
          <li key={o.id}>
            <a href={`#/obra/${o.id}`} className="tarjeta">
              {o.foto_ruta ? (
                <img src={urlFoto(o.foto_ruta)} alt="" loading="lazy" />
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

export function Ficha({ id, sesion }: { id: string; sesion: Sesion }) {
  const [datos, setDatos] = useState<{ obra: Huella | null; huellas: Huella[] } | null>(null);
  const [error, setError] = useState("");
  const [elegida, setElegida] = useState(id);
  const [vuelta, setVuelta] = useState(0);
  const [publicada, setPublicada] = useState<string | null>(null);
  const [sello, setSello] = useState<{ obra: string; museo: string } | null>(null);
  const salaObra = datos?.obra?.sala ?? null;
  const txObra = datos?.obra?.tx_hash ?? null;
  const idObra = datos?.obra?.id ?? null;

  // Sello de presencia: la obra se abrió por invitación de una sala y la pagó su fondo (se lee en la red).
  useEffect(() => {
    if (!salaObra || !txObra || !idObra) return;
    let vivo = true;
    Promise.all([pagadaPorSala(txObra), museoDe(salaObra)])
      .then(([pagada, museo]) => vivo && pagada && museo && setSello({ obra: idObra, museo }))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [salaObra, txObra, idObra]);

  useEffect(() => {
    let vivo = true;
    constelacion(id)
      .then((d) => vivo && (setDatos(d), setError("")))
      .catch((e) => vivo && setError(mensajeError(e)));
    return () => {
      vivo = false;
    };
  }, [id, vuelta]);

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

  return (
    <section className="ficha-obra">
      <div className="cielo-obra">
        <button className="volver" onClick={() => ir("/cielo")}>← El cielo</button>
        <h2>{obra.estado === "retirada" ? "Obra retirada" : obra.titulo}</h2>
        <p className="sub">
          {huellas.length} {huellas.length === 1 ? "huella" : "huellas"}. La obra está en el centro y cada huella sale de la que continúa. Tocá cualquiera para leerla y continuarla.
        </p>
        <Constelacion obra={obra} huellas={huellas} elegida={actual.id} elegir={setElegida} invitada={sello?.obra === obra.id} />
      </div>
      <aside>
        {publicada && (
          <p className="estado publicada" role="status">
            Listo: tu huella ya está en la constelación.{" "}
            <a href={publicada} target="_blank" rel="noopener noreferrer">Ver el comprobante ↗</a>
          </p>
        )}
        <Lectura key={`l${actual.id}`} h={actual} esObra={actual.id === obra.id} sesion={sesion} alRetirar={() => setVuelta((v) => v + 1)} museo={sello?.obra === actual.id ? sello.museo : null} />
        <Continuar key={actual.id} obra={obra} padre={actual} sesion={sesion} alPublicar={(nueva, enlace) => { setElegida(nueva); setVuelta((v) => v + 1); setPublicada(enlace); }} />
        <Apoyar obra={obra} sesion={sesion} />
      </aside>
    </section>
  );
}

function Lectura({ h, esObra, sesion, alRetirar, museo }: { h: Huella; esObra: boolean; sesion: Sesion; alRetirar: () => void; museo: string | null }) {
  const fecha = new Date(h.creado).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="lectura">
      <div className="fila-arriba">
        <p className="rotulo">{esObra ? "La obra" : "Una huella"}</p>
        <Favorito huella={h.id} sesion={sesion} />
      </div>
      {museo && (
        <div className="sello" title="La sala la invitó y su fondo pagó la obra. Se puede ver en el comprobante.">
          <svg className="sello-marca" viewBox="-19 -19 38 38" aria-hidden="true">
            <circle className="punteado" r={17} />
            <circle className="punteado" r={11.5} />
            <circle r={6.5} />
            <circle className="centro" r={2.4} />
          </svg>
          <p>
            <span className="sello-uno">Estuve ahí</span>
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
          <h3>{esObra ? "Obra retirada" : "Huella retirada"}</h3>
          <p className="sub">Quien la escribió la retiró. Su contenido se borró; el comprobante sigue en la red.</p>
        </>
      ) : esObra ? (
        <>
          {h.foto_ruta && <img className="foto" src={urlFoto(h.foto_ruta)} alt={`Foto de la obra ${h.titulo ?? ""}`} />}
          <h3>{h.titulo}</h3>
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
        <a className="btn" href={enlaceTx(h.tx_hash)} target="_blank" rel="noopener noreferrer">
          Ver el comprobante en Stellar Expert ↗
        </a>
      )}
      {h.estado === "publicada" && sesion.cuenta === h.autor && <Retirar h={h} cuenta={sesion.cuenta} alRetirar={alRetirar} />}
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
              await retirar(cuenta, firmar, h.id);
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
      const { fecha, firma } = await firmaDeFavoritos(cuenta);
      await cambiarFavorito({ cuenta, huella_id: huella, accion: esta ? "quitar" : "guardar", fecha, firma });
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
      <button onClick={cambiar} disabled={ocupado} aria-pressed={esta} title={esta ? "Quitar de favoritos" : "Guardar en favoritos"}>
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
  const { precios, error: sinPrecio } = usePrecios(sesion.moneda.id);
  const a = useAccion();
  const limpio = texto.trim();
  const doc = useDocumento(`${sesion.cuenta}|${sesion.moneda.id}|${padre.id}|${limpio}|${nombre.trim()}`, () => ({ texto: limpio, nombre: nombre.trim() }));
  const precio = precios?.continuar;
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
          const r = await continuarHuella(cuenta, obra, padre.id, doc(), precio, sesion.moneda.id, avance);
          setTexto("");
          setPermiso(false);
          alPublicar(r.id, r.enlace);
          return r;
        });
      }}
    >
      <p className="rotulo">Continuar esta huella</p>
      <label className="campo">
        <span>Lo que te despertó</span>
        <textarea value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} placeholder="Solo texto, hasta 300 caracteres" />
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
      <p className="precio">
        Cuesta <b>{precio !== undefined ? plata(precio, sesion.moneda.codigo) : sinPrecio ? "(no se pudo leer el precio)" : "(leyendo el precio)"}</b>. El 70% va a la artista o el artista de la obra y el 30% a UMBRAL. Vos no cobrás por continuar.
      </p>
      {sesion.cuenta ? (
        <button className="btn lleno" disabled={!listo}>
          Firmar y pagar {precio !== undefined ? plata(precio, sesion.moneda.codigo) : ""}
        </button>
      ) : (
        <BotonEntrar sesion={sesion} texto="Para continuar, entrá con tu billetera." />
      )}
      <Estado a={a} listo="Listo: tu huella ya está en la constelación." />
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
          return apoyar(cuenta, firmar, obra.id, n, sesion.moneda.id);
        });
      }}
    >
      <p className="rotulo">Apoyar la obra</p>
      <p className="sub">Monto libre, sin escribir nada. El 70% va a quien la hizo.</p>
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
      <Estado a={a} listo="Gracias: tu apoyo llegó." />
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
    Promise.all([museoDe(sala), cuenta ? invitacion(sala, cuenta, moneda) : Promise.resolve({ invitada: false, fondo: 0n })])
      .then(([museo, inv]) => vivo && setDatos({ museo, ...inv }))
      .catch(() => vivo && setDatos({ museo: null, invitada: false, fondo: 0n }));
    return () => {
      vivo = false;
    };
  }, [sala, cuenta, moneda]);
  return sala ? datos : null;
}

const OPCIONES_DERECHOS: [Derechos, string][] = [
  ["autoria", "Soy autora o autor de esta obra."],
  ["dominio_publico", "Es de dominio público: su autor murió hace más de 70 años."],
  ["autorizacion", "Tengo autorización de su autor o de quien tiene sus derechos."],
];

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
  const { precios, error: sinPrecio } = usePrecios(sesion.moneda.id);
  const a = useAccion();
  const [nueva, setNueva] = useState<string | null>(null);
  const vista = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);
  const nPalabras = palabras(titulo);
  const precio = precios?.huella;
  const doc = useDocumento(
    `${sesion.cuenta}|${sesion.moneda.id}|${titulo.trim()}|${descripcion.trim()}|${nombre.trim()}|${foto?.name}|${foto?.size}|${foto?.lastModified}|${audio?.name}|${audio?.size}|${audio?.lastModified}|${sala}|${derechos}`,
    () => ({ texto: "", titulo: titulo.trim(), descripcion: descripcion.trim(), nombre: nombre.trim(), derechos: derechos ?? undefined }),
  );
  const pagaLaSala = !!inv?.invitada && precio !== undefined && inv.fondo >= precio;
  const listo = (!sala || inv?.museo) && nPalabras >= 1 && nPalabras <= 20 && titulo.trim().length <= 200 && descripcion.length <= 400 && nombre.trim().length > 0 && derechos !== null && permiso && precio !== undefined && !a.ocupado;

  return (
    <section className="hoja angosta">
      <p className="rotulo">Exponer una obra</p>
      <h2>Tu obra, en el cielo</h2>
      <p className="sub">La obra queda firmada a tu nombre en la red. Cada vez que alguien la continúe o la apoye, te llega el 70%.</p>
      {sala && (
        <p className="invitacion">
          {!inv
            ? "Leyendo la invitación…"
            : !inv.museo
              ? "Esa sala no existe. Podés exponer la obra igual, sin sala, desde \"Exponer una obra\"."
              : `Te invitó la sala de ${corta(inv.museo)}. ${pagaLaSala ? "Su fondo paga esta obra: vos no pagás nada." : sesion.cuenta ? "Tu cuenta no tiene una invitación disponible de esta sala (o se le acabó el fondo): la obra la pagás vos." : "Entrá con tu billetera para ver si la sala te paga la obra."}`}
        </p>
      )}
      <form
        className="caja"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sesion.cuenta || precio === undefined) return;
          const cuenta = sesion.cuenta;
          a.correr(async (avance) => {
            const r = await abrirObra(cuenta, doc(), { foto, audio }, precio, sesion.moneda.id, avance, inv?.museo ? sala : undefined);
            setNueva(r.id);
            return r;
          });
        }}
      >
        <label className="campo">
          <span>Título</span>
          <input value={titulo} maxLength={200} onChange={(e) => setTitulo(e.target.value)} />
          <small className={nPalabras > 20 ? "error" : ""}>{nPalabras}/20 palabras</small>
        </label>
        <label className="campo">
          <span>Descripción (opcional)</span>
          <textarea value={descripcion} maxLength={400} onChange={(e) => setDescripcion(e.target.value)} />
          <small>{descripcion.length}/400</small>
        </label>
        <label className="campo">
          <span>Autor o autora</span>
          <input value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="campo">
          <span>Foto (opcional, JPG, PNG o WEBP, hasta 5 MB)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && !fotoValida(f)) {
                setAviso("Esa foto no sirve: tiene que ser JPG, PNG o WEBP y pesar hasta 5 MB.");
                setFoto(null);
                e.target.value = "";
                return;
              }
              setAviso("");
              setFoto(f);
            }}
          />
          {aviso && <small className="error">{aviso}</small>}
        </label>
        {vista && <img className="foto" src={vista} alt="Vista previa de la foto" />}
        <label className="campo">
          <span>Audio (opcional, MP3, M4A, WEBM u OGG, hasta 5 MB)</span>
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/webm,audio/ogg"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && !audioValido(f)) {
                setAvisoAudio("Ese audio no sirve: tiene que ser MP3, M4A, WEBM u OGG y pesar hasta 5 MB.");
                setAudio(null);
                e.target.value = "";
                return;
              }
              setAvisoAudio("");
              setAudio(f);
            }}
          />
          {avisoAudio && <small className="error">{avisoAudio}</small>}
        </label>
        <fieldset className="derechos">
          <legend>Derechos de la obra (elegí una)</legend>
          {OPCIONES_DERECHOS.map(([valor, texto]) => (
            <label key={valor} className="check">
              <input type="radio" name="derechos" value={valor} checked={derechos === valor} onChange={() => setDerechos(valor)} required />
              <span>{texto}</span>
            </label>
          ))}
          <small>
            Una foto tomada en la calle no alcanza: una escultura o un mural en la vía pública sigue teniendo autor. Si aparecen personas que se reconocen, tienen que haber dado su consentimiento.{" "}
            <a href="#/terminos" target="_blank" rel="noopener noreferrer">Leer los términos</a>
          </small>
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={permiso} onChange={(e) => setPermiso(e.target.checked)} />
          <span>Acepto que cualquiera vea la obra y la continúe.</span>
        </label>
        <p className="precio">
          Exponer una obra cuesta <b>{precio !== undefined ? plata(precio, sesion.moneda.codigo) : sinPrecio ? "(no se pudo leer el precio)" : "(leyendo el precio)"}</b>, que van a UMBRAL.
          {pagaLaSala && " Esta vez los paga el fondo de la sala."}
        </p>
        {sesion.cuenta ? (
          <button className="btn lleno" disabled={!listo}>
            {pagaLaSala ? "Firmar (paga la sala)" : `Firmar y pagar ${precio !== undefined ? plata(precio, sesion.moneda.codigo) : ""}`}
          </button>
        ) : (
          <BotonEntrar sesion={sesion} texto="Para exponer una obra, entrá con tu billetera." />
        )}
        <Estado a={a} listo="Listo: tu obra ya está en el cielo." />
        {nueva && (
          <button type="button" className="btn" onClick={() => ir(`/obra/${nueva}`)}>
            Ver mi obra
          </button>
        )}
      </form>
    </section>
  );
}

// ---------------------------------------------------------------- Cobrar

export function Cobrar({ sesion }: { sesion: Sesion }) {
  const [saldos, setSaldos] = useState<Record<string, number> | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [sinSaldo, setSinSaldo] = useState(false);
  const a = useAccion();
  const cuenta = sesion.cuenta;
  useEffect(() => {
    if (!cuenta) return;
    let vivo = true;
    Promise.all(MONEDAS.map(async (m) => [m.id, await saldoDe(cuenta, m.id)] as const))
      .then((l) => vivo && (setSaldos(Object.fromEntries(l)), setSinSaldo(false)))
      .catch(() => vivo && setSinSaldo(true));
    return () => {
      vivo = false;
    };
  }, [cuenta, vuelta]);

  return (
    <section className="hoja angosta">
      <p className="rotulo">Cobrar</p>
      <h2>Lo que juntaron tus obras</h2>
      <p className="sub">Solo cobran quienes abren obras: el 70% de cada continuación y de cada apoyo. Lo retirás cuando quieras.</p>
      {!cuenta ? (
        <BotonEntrar sesion={sesion} texto="Entrá con tu billetera para ver tu saldo." />
      ) : sinSaldo ? (
        <p className="error">No pudimos leer tu saldo. Probá de nuevo en un rato.</p>
      ) : !saldos ? (
        <p>Leyendo tu saldo…</p>
      ) : (
        <ul className="saldos">
          {MONEDAS.map((m) => {
            const s = saldos[m.id] ?? 0;
            return (
              <li key={m.id}>
                <span className="cifra">{plata(BigInt(Math.round(s * Number(UNIDAD))), m.codigo)}</span>
                <button
                  className="btn lleno"
                  disabled={s <= 0 || a.ocupado}
                  onClick={() =>
                    a.correr(async (avance) => {
                      avance("Firmá en tu billetera…");
                      const r = await cobrar(cuenta, firmar, m.id);
                      setVuelta((v) => v + 1);
                      return r;
                    })
                  }
                >
                  Retirar {m.codigo}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Estado a={a} listo="Listo: el dinero ya está en tu billetera." />
    </section>
  );
}
