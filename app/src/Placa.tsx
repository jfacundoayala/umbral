// Placa para pegar al lado de la obra física (escultura, mural, obra en una sala).
// El QR lleva a la ficha de la obra: quien la tiene enfrente deja su huella desde el celular.
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { constelacion, type Huella } from "./base";
import { firmarMensaje } from "./billetera";
import { corta, ir, mensajeError } from "./comun";
import type { Sesion } from "./Pantallas";
import { codigoCorto, firmaEnHex, mensajePlaca } from "./placa-firma";
import "./Placa.css";

const enlacePlaca = (id: string, firma: string) => `${location.origin}/#/obra/${id}?desde=placa&f=${firma}`;

export function Placa({ id, sesion }: { id: string; sesion: Sesion }) {
  const [obra, setObra] = useState<Huella | null | undefined>(undefined);
  const [qr, setQr] = useState("");
  const [firma, setFirma] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    constelacion(id)
      .then((d) => vivo && setObra(d.obra))
      .catch(() => vivo && setObra(null));
    return () => {
      vivo = false;
    };
  }, [id]);

  // El QR se arma recién con la firma de quien expuso la obra.
  useEffect(() => {
    if (!firma) return;
    let vivo = true;
    QRCode.toString(enlacePlaca(id, firma), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#191919", light: "#0000" } })
      .then((s) => vivo && setQr(s))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [id, firma]);

  async function firmarPlaca(cuenta: string) {
    setError("");
    setOcupado(true);
    try {
      setFirma(firmaEnHex(await firmarMensaje(mensajePlaca(obra!), cuenta)));
    } catch (e) {
      setError(/clos|cancel|reject|denied|dismiss/i.test(mensajeError(e)) ? "Cancelaste la firma." : `No se pudo firmar: ${mensajeError(e)}`);
    } finally {
      setOcupado(false);
    }
  }

  if (obra === undefined) return <section className="hoja"><p>Cargando…</p></section>;
  if (!obra || obra.estado === "retirada") {
    return (
      <section className="hoja">
        <p>Esa obra no está publicada.</p>
        <button className="btn" onClick={() => ir("/cielo")}>Volver al cielo</button>
      </section>
    );
  }

  const esSuya = sesion.cuenta === obra.autor;
  if (!firma) {
    return (
      <section className="hoja placa-pedido">
        <button className="volver" onClick={() => ir(`/obra/${id}`)}>← Volver a la obra</button>
        <h2>Placa de “{obra.titulo}”</h2>
        <p>
          La placa va al lado de la obra física: en la calle, en una plaza o en una sala. Quien la tiene enfrente escanea el código y deja su huella desde el celular.
        </p>
        <p className="sub">
          Solo la cuenta que expuso la obra puede crear su placa, y la firma con su billetera (gratis, no es un pago). La firma sirve solo para esta obra: al escanearla, UMBRAL muestra si la firmó esa cuenta y el código de la obra, que tiene que coincidir con el de la placa. Igual, lo que se paga siempre va a la cuenta de la obra registrada en el contrato.
        </p>
        {!sesion.cuenta ? (
          <button className="btn lleno" onClick={() => sesion.entrar()}>Entrar con la billetera de la obra</button>
        ) : esSuya ? (
          <button className="btn lleno" disabled={ocupado} onClick={() => firmarPlaca(sesion.cuenta!)}>{ocupado ? "Firmá en tu billetera…" : "Firmar y crear la placa"}</button>
        ) : (
          <p className="error">Esta obra la expuso otra cuenta ({corta(obra.autor)}). Entrá con esa billetera para crear su placa.</p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="placa-pantalla">
      <div className="placa-acciones no-imprimir">
        <button className="volver" onClick={() => ir(`/obra/${id}`)}>← Volver a la obra</button>
        <p className="sub">
          Imprimila y pegala al lado de la obra: en la calle, en una plaza o en una sala. Quien la tiene enfrente escanea el código y deja su huella desde el celular.
        </p>
        <button className="btn lleno" onClick={() => window.print()}>Imprimir la placa</button>
      </div>

      <article className="placa" aria-label={`Placa de ${obra.titulo}`}>
        <div className="placa-marca">
          <span>UMBRAL</span>
          <span>Museo vivo</span>
        </div>
        <h1 className="placa-titulo">{obra.titulo}</h1>
        {obra.nombre && <p className="placa-autor">{obra.nombre}</p>}
        <div className="placa-qr" role="img" aria-label="Código QR para dejar tu huella en esta obra" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="placa-llamado">Escaneá y contá qué te despierta esta obra.</p>
        <p className="placa-letra">Tu huella queda firmada en Stellar y el 70% de lo que pagás va a quien la hizo.</p>
        <p className="placa-pie">
          Código {codigoCorto(id)} · firmada por {corta(obra.autor)}
          <br />
          {location.host}
        </p>
      </article>
    </section>
  );
}
