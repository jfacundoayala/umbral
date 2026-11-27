import { lazy, Suspense, useEffect, useState } from "react";
import { corta, monedaDe, MONEDAS, useRuta, type Moneda } from "./comun";
import type { Sesion } from "./Pantallas";
import Fondos from "./Fondos";
import Portada from "./Portada";
import { XLM_ID } from "./config";
import "./App.css";

const CLAVE_MONEDA = "umbral-moneda";

// La portada se dibuja sin esperar a la billetera ni a Stellar: esas partes se bajan recién cuando hacen falta.
const billetera = () => import("./billetera");
const pantalla = <K extends "Cielo" | "Ficha" | "Abrir" | "Cobrar">(k: K) => lazy(() => import("./Pantallas").then((m) => ({ default: m[k] })));
const Cielo = pantalla("Cielo");
const Ficha = pantalla("Ficha");
const Abrir = pantalla("Abrir");
const Cobrar = pantalla("Cobrar");
const Placa = lazy(() => import("./Placa").then((m) => ({ default: m.Placa })));
const Legal = lazy(() => import("./Legal").then((m) => ({ default: m.Legal })));

export default function App() {
  const ruta = useRuta();
  const [cuenta, setCuenta] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<Moneda>(() => monedaDe(localStorage.getItem(CLAVE_MONEDA) ?? XLM_ID));
  const [aviso, setAviso] = useState("");

  useEffect(() => {
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

  async function alEntrar() {
    setAviso("");
    try {
      const c = await (await billetera()).entrar();
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

  function cambiarMoneda(m: Moneda) {
    setMoneda(m);
    localStorage.setItem(CLAVE_MONEDA, m.id);
  }

  const sesion: Sesion = { cuenta, moneda, entrar: alEntrar };
  const activa = (p: string) => (ruta.pantalla === p ? "page" : undefined);

  return (
    <>
      <div className="aviso">Red de pruebas de Stellar: los fondos son de prueba y no tienen valor real.</div>
      <header>
        <a className="marca" href="#/">UMBRAL</a>
        <nav>
          <a href="#/cielo" aria-current={activa("cielo")}>El cielo</a>
          <a href="#/abrir" aria-current={activa("abrir")}>Exponer una obra</a>
          <a href="#/cobrar" aria-current={activa("cobrar")}>Cobrar</a>
        </nav>
        <span className="hueco" />
        <label className="moneda">
          <span>Pagar en</span>
          <select
            value={moneda.id}
            onChange={(e) => cambiarMoneda(monedaDe(e.target.value))}
          >
            {MONEDAS.map((m) => (
              <option key={m.id} value={m.id}>{m.codigo}</option>
            ))}
          </select>
        </label>
        {cuenta ? (
          <span className="cuenta">
            <code title={cuenta}>{corta(cuenta)}</code>
            <button className="btn" onClick={() => billetera().then((b) => b.salir()).then(() => setCuenta(null))}>Salir</button>
          </span>
        ) : (
          <button className="btn lleno" onClick={alEntrar}>Entrar con billetera</button>
        )}
      </header>
      {aviso && <p className="aviso-error" role="alert">{aviso}</p>}
      {cuenta && <Fondos key={cuenta} cuenta={cuenta} moneda={moneda} cambiarMoneda={cambiarMoneda} />}
      <main>
        <Suspense fallback={<section className="hoja"><p>Cargando…</p></section>}>
        {ruta.pantalla === "portada" && <Portada />}
        {ruta.pantalla === "cielo" && <Cielo />}
        {ruta.pantalla === "obra" && <Ficha key={ruta.id} id={ruta.id} sesion={sesion} desdePlaca={ruta.placa} />}
        {ruta.pantalla === "placa" && <Placa key={ruta.id} id={ruta.id} sesion={sesion} />}
        {ruta.pantalla === "abrir" && <Abrir key={ruta.sala ?? ""} sesion={sesion} sala={ruta.sala} />}
        {ruta.pantalla === "cobrar" && <Cobrar sesion={sesion} />}
        {(ruta.pantalla === "terminos" || ruta.pantalla === "privacidad") && <Legal cual={ruta.pantalla} />}
        </Suspense>
      </main>
      <footer className="pie">
        <span>UMBRAL · red de pruebas de Stellar</span>
        <a href="#/terminos">Términos</a>
        <a href="#/privacidad">Privacidad</a>
      </footer>
    </>
  );
}
