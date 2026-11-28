import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { corta, monedaDe, useRuta, type Moneda } from "./comun";
import type { Sesion } from "./Pantallas";
import Fondos from "./Fondos";
import Portada from "./Portada";
import { XLM_ID } from "./config";
import "./App.css";
import { Isotipo } from "./Isotipo";
import { Estela } from "./Estela";

const CLAVE_MONEDA = "umbral-moneda";

// La portada se dibuja sin esperar a la billetera ni a Stellar: esas partes se bajan recién cuando hacen falta.
const billetera = () => import("./billetera");
const pantalla = <K extends "Cielo" | "Ficha" | "Abrir" | "Cobrar">(k: K) => lazy(() => import("./Pantallas").then((m) => ({ default: m[k] })));
const Cielo = pantalla("Cielo");
const Ficha = pantalla("Ficha");
const Abrir = pantalla("Abrir");
const Cobrar = pantalla("Cobrar");
const Placa = lazy(() => import("./Placa").then((m) => ({ default: m.Placa })));
const Cuentas = lazy(() => import("./Cuentas").then((m) => ({ default: m.Cuentas })));
const Legal = lazy(() => import("./Legal").then((m) => ({ default: m.Legal })));
const Opinion = lazy(() => import("./Opinion").then((m) => ({ default: m.Opinion })));
const MiCodigo = lazy(() => import("./Encuentro").then((m) => ({ default: m.MiCodigo })));
const Puerta = lazy(() => import("./Encuentro").then((m) => ({ default: m.Puerta })));

// Con ?prueba (solo en desarrollo) entra el firmante de prueba: no hay billetera que elegir.
const EN_PRUEBA = import.meta.env.DEV && new URLSearchParams(location.search).has("prueba");

/** Antes de la lista de billeteras: qué es una billetera y cuál le conviene a quien nunca usó una. */
function PasoBilletera({ alElegir, alCerrar }: { alElegir: (cual?: "albedo") => void; alCerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  return (
    <dialog ref={ref} className="paso-billetera" aria-labelledby="pb-titulo" onClose={alCerrar} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <h2 id="pb-titulo" className="h3">Entrar con tu billetera</h2>
      <p>Para dejar tu huella necesitás una billetera, una app gratis que guarda tu cuenta y confirma tus pagos.</p>
      <p>
        La más fácil es <b>Albedo</b>: se usa desde el navegador, sin instalar nada.
      </p>
      <div className="pb-botones">
        <button className="btn lleno" onClick={() => alElegir("albedo")}>Usar Albedo</button>
        <button className="btn" onClick={() => alElegir()}>Ya tengo una</button>
      </div>
      <p className="pb-nota">Si tu cuenta es nueva, te cargamos saldo de prueba gratis. Apenas entrás aparece el botón arriba.</p>
      <button className="pb-cerrar" aria-label="Cerrar" onClick={() => ref.current?.close()}>×</button>
    </dialog>
  );
}

export default function App() {
  const ruta = useRuta();
  const [cuenta, setCuenta] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<Moneda>(() => monedaDe(localStorage.getItem(CLAVE_MONEDA) ?? XLM_ID));
  const [aviso, setAviso] = useState("");
  // El paso propio de billetera, abierto: quien pidió entrar espera la cuenta (o null si se cierra).
  const [paso, setPaso] = useState<{ resolver: (c: string | null) => void } | null>(null);

  useEffect(() => {
    // La billetera (y stellar-sdk) se baja solo si alguien ya había entrado; si no, al tocar "Entrar".
    // En desarrollo, con ?prueba, se carga igual: ahí vive el firmante de prueba.
    if (localStorage.getItem("@StellarWalletsKit/activeAddress") || (import.meta.env.DEV && new URLSearchParams(location.search).has("prueba")))
      billetera()
        .then((b) => b.cuentaGuardada())
        .then(setCuenta)
        .catch(() => setCuenta(null));
    // Huellas que se pagaron y no llegaron a publicarse: se publican ahora, sin volver a pagar.
    import("./pendientes")
      .then((p) => p.reintentarPendientes())
      .then((n) => {
        if (n > 0) setAviso(n === 1 ? "Publicamos una huella tuya que había quedado pagada y sin publicar." : `Publicamos ${n} huellas tuyas que habían quedado pagadas y sin publicar.`);
      })
      .catch(() => {});
  }, []);

  async function conectar(cual?: "albedo") {
    try {
      const c = await (await billetera()).entrar(cual);
      setCuenta(c);
      return c;
    } catch (e) {
      // Cerrar la ventana de billeteras no es un error.
      const texto = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      if (!/clos|cancel|reject|denied|dismiss/i.test(texto)) {
        setAviso("No se pudo conectar con la billetera. Fijate que esté instalada y en la red de pruebas (Testnet), y probá de nuevo.");
      }
      return null;
    }
  }

  function alEntrar(): Promise<string | null> {
    setAviso("");
    if (EN_PRUEBA) return conectar();
    // Se baja ya, así al elegir no hay espera (Albedo abre una ventana y el navegador la bloquea si se demora).
    billetera().catch(() => undefined);
    return new Promise((resolver) => {
      paso?.resolver(null);
      setPaso({ resolver });
    });
  }
  function elegirBilletera(cual?: "albedo") {
    const p = paso;
    setPaso(null);
    conectar(cual).then((c) => p?.resolver(c));
  }
  function cerrarPaso() {
    paso?.resolver(null);
    setPaso(null);
  }

  function cambiarMoneda(m: Moneda) {
    setMoneda(m);
    localStorage.setItem(CLAVE_MONEDA, m.id);
  }

  const sesion: Sesion = { cuenta, moneda, cambiarMoneda, entrar: alEntrar };
  const activa = (p: string) => (ruta.pantalla === p ? "page" : undefined);

  return (
    <>
      <Estela />
      <aside className="aviso" aria-label="Aviso">Versión de prueba. Los pagos se hacen con saldo de prueba y no se cobra nada real.</aside>
      <header>
        <a className="marca" href="#/" aria-label="UMBRAL, inicio">
          <Isotipo className="marca-iso" grosor={1.4} />
          <span>UMBRAL</span>
        </a>
        <nav>
          <a href="#/cielo" aria-current={activa("cielo")}>El cielo</a>
          <a href="#/abrir" aria-current={activa("abrir")}>Subí lo tuyo</a>
          <a href="#/cobrar" aria-current={activa("cobrar")}>Mis cobros</a>
        </nav>
        <span className="hueco" />
        {cuenta ? (
          <span className="cuenta">
            <code title={cuenta}>{corta(cuenta)}</code>
            <button className="btn" onClick={() => billetera().then((b) => b.salir()).then(() => setCuenta(null))}>Salir</button>
          </span>
        ) : (
          <button className="btn lleno" onClick={alEntrar}>Entrar con billetera</button>
        )}
      </header>
      {paso && <PasoBilletera alElegir={elegirBilletera} alCerrar={cerrarPaso} />}
      {aviso && <p className="aviso-error" role="alert">{aviso}</p>}
      {cuenta && <Fondos key={cuenta} cuenta={cuenta} moneda={moneda} cambiarMoneda={cambiarMoneda} />}
      <main>
        <Suspense fallback={<section className="hoja"><p>Cargando…</p></section>}>
        {ruta.pantalla === "portada" && <Portada />}
        {ruta.pantalla === "cielo" && <Cielo />}
        {ruta.pantalla === "obra" && <Ficha key={ruta.id} id={ruta.id} sesion={sesion} desdePlaca={ruta.placa} dejar={ruta.dejar} />}
        {ruta.pantalla === "placa" && <Placa key={ruta.id} id={ruta.id} sesion={sesion} />}
        {ruta.pantalla === "abrir" && <Abrir key={ruta.sala ?? ""} sesion={sesion} sala={ruta.sala} />}
        {ruta.pantalla === "cobrar" && <Cobrar sesion={sesion} />}
        {ruta.pantalla === "cuentas" && <Cuentas />}
        {(ruta.pantalla === "terminos" || ruta.pantalla === "privacidad") && <Legal cual={ruta.pantalla} />}
        {ruta.pantalla === "opinion" && <Opinion key={ruta.desde} desde={ruta.desde} />}
        {ruta.pantalla === "codigo" && <MiCodigo sesion={sesion} sala={ruta.sala} />}
        {ruta.pantalla === "puerta" && <Puerta key={ruta.sala} sesion={sesion} sala={ruta.sala} />}
        </Suspense>
      </main>
      <footer className="pie">
        <span>UMBRAL · red de pruebas de Stellar</span>
        <a href="#/cuentas">Cuentas claras</a>
        <a href="#/terminos">Términos</a>
        <a href="#/privacidad">Privacidad</a>
        <a href="#/opinion">Contanos qué te pareció</a>
      </footer>
    </>
  );
}
