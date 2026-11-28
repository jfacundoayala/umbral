// "Contanos qué te pareció": formulario corto y opcional, sin billetera.
import { useState } from "react";
import { enviarOpinion } from "./base";
import { mensajeError } from "./comun";
import { armarOpinion, LARGO_APODO, LARGO_TEXTO, PUDO, ROLES, type Desde, type Pudo, type Rol } from "./opiniones";
import "./Formularios.css";

export function Opinion({ desde }: { desde: Desde }) {
  const [rol, setRol] = useState<Rol | null>(null);
  const [pudo, setPudo] = useState<Pudo | null>(null);
  const [costo, setCosto] = useState("");
  const [cambiaria, setCambiaria] = useState("");
  const [apodo, setApodo] = useState("");
  const [citar, setCitar] = useState(false);
  const [estado, setEstado] = useState<"" | "enviando" | "listo">("");
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const o = armarOpinion({ desde, rol, pudo, costo, cambiaria, apodo, citar });
    if (typeof o === "string") return setError(o);
    setEstado("enviando");
    try {
      await enviarOpinion(o);
      setEstado("listo");
    } catch (err) {
      setEstado("");
      setError(mensajeError(err));
    }
  }

  if (estado === "listo") {
    return (
      <section className="hoja opinion">
        <h1 className="titulo">Gracias</h1>
        <p role="status">Recibimos tu opinión. Nos ayuda a mejorar UMBRAL.</p>
        <p><a className="btn" href="#/cielo">Volver al cielo</a></p>
      </section>
    );
  }

  return (
    <section className="hoja opinion">
      <div className="form-cabeza">
        <h1 className="titulo">Contanos qué te pareció</h1>
        <p className="sub">
          Es opcional y toma un minuto. No pide tu billetera ni tu cuenta. Lo usamos solo para mejorar UMBRAL y, si marcás la casilla del final, para citarte en la entrega del hackatón. No escribas tu correo, teléfono ni documento.
        </p>
      </div>
      <form className="form-pasos opinion-form" onSubmit={enviar}>
        <fieldset className="derechos tarjetas-derechos">
          <legend>1. ¿Qué sos?</legend>
          {ROLES.map(([valor, texto]) => (
            <label key={valor} className="opcion-derecho">
              <input type="radio" name="rol" value={valor} checked={rol === valor} onChange={() => setRol(valor)} required />
              <span>{texto}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="derechos tarjetas-derechos">
          <legend>2. ¿Pudiste dejar tu huella solo/a?</legend>
          {PUDO.map(([valor, texto]) => (
            <label key={valor} className="opcion-derecho">
              <input type="radio" name="pudo" value={valor} checked={pudo === valor} onChange={() => setPudo(valor)} required />
              <span>{texto}</span>
            </label>
          ))}
        </fieldset>
        <label className="campo">
          <span>3. ¿Qué te costó o te confundió?</span>
          <textarea value={costo} onChange={(e) => setCosto(e.target.value)} maxLength={LARGO_TEXTO} placeholder="Por ejemplo: no entendí qué era la billetera." />
        </label>
        <label className="campo">
          <span>4. ¿Qué cambiarías?</span>
          <textarea value={cambiaria} onChange={(e) => setCambiaria(e.target.value)} maxLength={LARGO_TEXTO} placeholder="Lo que se te ocurra." />
        </label>
        <label className="campo">
          <span>5. Un nombre o apodo (opcional)</span>
          <input value={apodo} onChange={(e) => setApodo(e.target.value)} maxLength={LARGO_APODO} placeholder="Como quieras que te nombremos" />
        </label>
        <label className="check permiso">
          <input type="checkbox" checked={citar} onChange={(e) => setCitar(e.target.checked)} />
          <span>Pueden citar lo que escribí en la entrega del hackatón, con el nombre o apodo de arriba (o sin nombre si lo dejé vacío).</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <p>
          <button className="btn lleno" type="submit" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando…" : "Enviar"}
          </button>
        </p>
      </form>
    </section>
  );
}
