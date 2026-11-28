// Encuentros en persona: el sello "Estuve ahí" prueba que la persona estuvo en la sala.
// 1. Quien va muestra "Mi código para el encuentro" (un QR con su cuenta pública).
// 2. La sala lo escanea en la puerta y lo invita (firma la cuenta que abrió la sala).
// 3. Quien fue invitado expone su obra con #/abrir?sala=…: la paga el fondo y sale el sello.
import { useEffect, useRef, useState } from "react";
import { corta, mensajeError } from "./comun";
import { cuentaDeCodigo, enlaceMiCodigo } from "./codigo-encuentro";
import type { Sesion } from "./Pantallas";
import type { Firmar } from "./umbral";
import "./Formularios.css";

const red = () => import("./umbral");
const firmar: Firmar = async (xdr) => (await import("./billetera")).firmar(xdr);

/** Un QR en SVG, armado en el navegador (qrcode se baja recién acá). */
function useQr(texto: string | null) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!texto) return;
    let vivo = true;
    import("qrcode")
      .then((q) => q.default.toString(texto, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1E1B18", light: "#F2EDE3" } }))
      .then((s) => vivo && setSvg(s))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [texto]);
  return svg;
}

function Entrar({ sesion, para }: { sesion: Sesion; para: string }) {
  return (
    <p>
      <button className="btn lleno" onClick={sesion.entrar}>Entrar con billetera</button>{" "}
      <span className="sub">para {para}</span>
    </p>
  );
}

/** #/codigo?sala=…: el QR con la cuenta de quien va al encuentro. */
export function MiCodigo({ sesion, sala }: { sesion: Sesion; sala?: string }) {
  const svg = useQr(sesion.cuenta);
  return (
    <section className="hoja encuentro">
      <div className="form-cabeza">
        <h2>Mi código para el encuentro</h2>
        <p className="sub">Mostráselo a la sala en la puerta. Lo escanean y te invitan: tu obra la paga la sala y queda con el sello "Estuve ahí".</p>
      </div>
      {!sesion.cuenta ? (
        <Entrar sesion={sesion} para="ver tu código." />
      ) : (
        <>
          <div className="encuentro-qr" role="img" aria-label={`Código QR de tu cuenta ${corta(sesion.cuenta)}`} dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="encuentro-cuenta">Tu cuenta: <code>{sesion.cuenta}</code></p>
          <p className="sub">Es tu cuenta pública: no permite mover nada de tu billetera.</p>
          {sala && (
            <p>
              <a className="btn lleno" href={`#/abrir?sala=${sala}`}>Ya me invitaron: dejar mi obra</a>
            </p>
          )}
        </>
      )}
    </section>
  );
}

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
const conDetector = () => "BarcodeDetector" in window;

/** Lee QR con la cámara mientras está abierta. Si el navegador no puede, no se muestra. */
function Camara({ alLeer }: { alLeer: (texto: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let vivo = true;
    let flujo: MediaStream | null = null;
    let vuelta = 0;
    (async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!vivo || !video.current) return;
        video.current.srcObject = flujo;
        await video.current.play();
        const Clase = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = new Clase({ formats: ["qr_code"] });
        const mirar = async () => {
          if (!vivo || !video.current) return;
          const r = await detector.detect(video.current).catch(() => []);
          if (r[0]?.rawValue) alLeer(r[0].rawValue);
          vuelta = window.setTimeout(mirar, 300);
        };
        mirar();
      } catch {
        if (vivo) setError("No pudimos abrir la cámara. Pegá la cuenta abajo.");
      }
    })();
    return () => {
      vivo = false;
      clearTimeout(vuelta);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [alLeer]);
  return error ? <p className="error">{error}</p> : <video ref={video} className="encuentro-video" muted playsInline />;
}

/** #/puerta/{sala}: la sala escanea el código de quien está ahí y lo invita. */
export function Puerta({ sesion, sala }: { sesion: Sesion; sala: string }) {
  const [museo, setMuseo] = useState<string | null | undefined>(undefined);
  const [texto, setTexto] = useState("");
  const [camara, setCamara] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState<{ cuenta: string; enlace: string } | null>(null);
  const [error, setError] = useState("");
  const qrSala = useQr(enlaceMiCodigo(sala));

  useEffect(() => {
    let vivo = true;
    red()
      .then((r) => r.museoDe(sala))
      .then((m) => vivo && setMuseo(m))
      .catch(() => vivo && setMuseo(null));
    return () => {
      vivo = false;
    };
  }, [sala]);

  const leido = cuentaDeCodigo(texto);
  const esLaSala = !!sesion.cuenta && sesion.cuenta === museo;

  const alLeer = useRef((t: string) => {
    const c = cuentaDeCodigo(t);
    if (c) {
      setTexto(c);
      setCamara(false);
    }
  }).current;

  async function invitar() {
    if (!leido || !sesion.cuenta) return;
    setError("");
    setHecho(null);
    setOcupado(true);
    try {
      const r = await (await red()).invitar(sesion.cuenta, firmar, sala, leido);
      setHecho({ cuenta: leido, enlace: r.enlace });
      setTexto("");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="hoja encuentro">
      <div className="form-cabeza">
        <h2>Invitar en la puerta</h2>
        <p className="sub">Escaneá el código de quien está en la sala. Queda invitada: su obra la paga el fondo de la sala y lleva el sello "Estuve ahí".</p>
      </div>
      {museo === undefined ? (
        <p>Cargando…</p>
      ) : museo === null ? (
        <p className="error">Esa sala no existe.</p>
      ) : !sesion.cuenta ? (
        <Entrar sesion={sesion} para="invitar con la cuenta que abrió la sala." />
      ) : !esLaSala ? (
        <p className="error">Esta pantalla es para la cuenta que abrió la sala ({corta(museo)}). Entraste con {corta(sesion.cuenta)}.</p>
      ) : (
        <div className="encuentro-puerta">
          <div className="form-pasos opinion-form">
            {camara ? <Camara alLeer={alLeer} /> : conDetector() && <button className="btn" onClick={() => setCamara(true)}>Escanear con la cámara</button>}
            <label className="campo">
              <span>Cuenta de quien está en la puerta</span>
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O pegala acá (empieza con G)" autoComplete="off" spellCheck={false} />
            </label>
            {texto && !leido && <p className="error">Eso no parece una cuenta de Stellar.</p>}
            <p>
              <button className="btn lleno" disabled={!leido || ocupado} onClick={invitar}>
                {ocupado ? "Invitando…" : leido ? `Invitar a ${corta(leido)}` : "Invitar"}
              </button>
            </p>
            <div role="status" aria-live="polite">
              {hecho && (
                <p className="estado publicada">
                  Invitada: {corta(hecho.cuenta)} ya puede dejar su huella con el sello.{" "}
                  <a href={hecho.enlace} target="_blank" rel="noopener noreferrer">Ver el comprobante ↗</a>
                </p>
              )}
              {error && <p className="error">{error}</p>}
            </div>
          </div>
          <aside className="encuentro-sala">
            <p className="sub">Para quien llega: que escanee este código, entre con su billetera y te muestre el suyo.</p>
            <div className="encuentro-qr chico" role="img" aria-label="Código QR para que quien llega abra su código" dangerouslySetInnerHTML={{ __html: qrSala }} />
          </aside>
        </div>
      )}
    </section>
  );
}
