// Cuentas claras: el reparto y las reglas, leídos en vivo de la red, y los avisos fechados.
import { useEffect, useState } from "react";
import { obras } from "./base";
import { CONTRATO_ID, RED } from "./config";
import { corta, MONEDAS, plata } from "./comun";
import { preciosVigentes, repartoVigente } from "./umbral";

type Precio = { codigo: string; huella: bigint; continuar: bigint };

const AVISOS: { fecha: string; texto: string }[] = [
  { fecha: "28 de noviembre de 2026", texto: "Abrimos la Colección 001: objetos, cartas y memorias que suenan, de Resistencia y alrededores." },
  { fecha: "27 de noviembre de 2026", texto: "Nueva identidad del museo, nueva placa con QR y nuevo sello UMBRAL ABIERTO." },
  { fecha: "Pendiente", texto: "Pasar de la red de pruebas a la red real de Stellar. Antes vamos a fijar el % de cada obra y sumar firma de varias personas." },
];

export function Cuentas() {
  const [reparto, setReparto] = useState<{ autor: number; tesoro: string } | null>(null);
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [numeros, setNumeros] = useState<{ obras: number; huellas: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    repartoVigente().then(setReparto).catch(() => setError(true));
    Promise.all(MONEDAS.map((m) => preciosVigentes(m.id).then((p) => ({ codigo: m.codigo, ...p }))))
      .then(setPrecios)
      .catch(() => setError(true));
    obras("nuevas")
      .then((o) => setNumeros({ obras: o.length, huellas: o.reduce((s, h) => s + (h.respuestas_publicadas ?? 0), 0) }))
      .catch(() => setError(true));
  }, []);

  const autor = reparto ? `${reparto.autor.toLocaleString("es-AR")}%` : "…";
  const umbral = reparto ? `${(100 - reparto.autor).toLocaleString("es-AR")}%` : "…";

  return (
    <section className="hoja angosta cuentas">
      <p className="rotulo">Cuentas claras</p>
      <h2>A dónde va cada huella</h2>
      <p className="sub">Todo lo que se paga en UMBRAL queda escrito en la red. Esto no lo escribimos a mano: se lee ahora del contrato.</p>
      {error && <p className="aviso-error" role="alert">No pudimos leer todo de la red. Probá de nuevo en un rato.</p>}

      <div className="cuentas-reparto">
        <div><b>{autor}</b><span>para quien hizo la obra</span></div>
        <div><b>{umbral}</b><span>para sostener UMBRAL</span></div>
      </div>
      <p>Así se reparte cada huella y cada apoyo. Mirar es gratis. Si la obra entra en una muestra con fecha, la sala toma su parte, que queda publicada, y solo si el artista la acepta con su firma. Nunca baja del 30% para el artista.</p>

      {precios.length > 0 && (
        <ul className="cuentas-lista">
          {precios.map((p) => (
            <li key={p.codigo}>
              En {p.codigo}: exponer una obra, <b>{plata(p.huella, p.codigo)}</b> · dejar una huella, <b>{plata(p.continuar, p.codigo)}</b>
            </li>
          ))}
        </ul>
      )}
      {numeros && (
        <p>Hoy hay <b>{numeros.obras}</b> obras en El cielo y <b>{numeros.huellas}</b> huellas publicadas.</p>
      )}
      <p className="cuentas-enlaces">
        <a href={`${RED.explorador}/contract/${CONTRATO_ID}`} target="_blank" rel="noopener noreferrer">Ver el contrato ({corta(CONTRATO_ID)}) ↗</a>
        {reparto && (
          <a href={`${RED.explorador}/account/${reparto.tesoro}`} target="_blank" rel="noopener noreferrer">Ver la cuenta de UMBRAL ({corta(reparto.tesoro)}) ↗</a>
        )}
      </p>

      <h3>Quién paga qué</h3>
      <ul>
        <li><b>El público</b> mira gratis. Si una obra lo toca, deja su huella o la apoya.</li>
        <li><b>Las salas y los padrinos</b> ponen un fondo para los encuentros en persona: quien va deja su obra sin pagar y se lleva el sello Estuve ahí.</li>
        <li><b>Cada obra</b> puede tener su placa con QR, firmada por quien la expuso, para poner al lado de la pieza: conecta el objeto con su registro en la red.</li>
      </ul>

      <h3>Reglas que el contrato cumple</h3>
      <ul>
        <li>Lo que junta un artista solo lo retira el artista, con su firma.</li>
        <li>El fondo de una sala solo lo retira su museo.</li>
        <li>Nadie puede meter una obra en una muestra sin que el artista acepte.</li>
        <li>La parte del artista nunca baja del 30%.</li>
      </ul>

      <h3>Lo que todavía puede cambiar (y cómo lo vamos a cerrar)</h3>
      <p>Hoy UMBRAL puede cambiar el % general, siempre entre 30% y 100%, y actualizar el código del contrato. Lo contamos acá para que no haya sorpresas. Antes de la red real, el % va a quedar fijo en cada obra desde que se expone, y cada cambio va a necesitar la firma de varias personas y un aviso con días de anticipación.</p>

      <h3>Avisos</h3>
      <ul className="cuentas-avisos">
        {AVISOS.map((a) => (
          <li key={a.texto}><span>{a.fecha}</span>{a.texto}</li>
        ))}
      </ul>
    </section>
  );
}
