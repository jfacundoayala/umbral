// Aviso de la ficha cuando se llega escaneando la placa: dice si la firmó la cuenta que expuso la obra.
import { corta } from "./comun";
import { codigoCorto } from "./placa-firma";

/** `firmada` es null mientras se comprueba: no se muestra nada. */
export default function AvisoPlaca({ firmada, obra }: { firmada: boolean | null; obra: { id: string; autor: string } }) {
  if (firmada === null) return null;
  if (!firmada) {
    return (
      <p className="aviso-placa falsa" role="alert">
        Esta placa no está firmada por la cuenta que expuso la obra. Puede ser falsa o de otra obra: no pagues si no confiás en ella.
      </p>
    );
  }
  return (
    <p className="aviso-placa" role="status">
      ✓ Placa firmada por la cuenta que expuso esta obra ({corta(obra.autor)}). Fijate que el código <b>{codigoCorto(obra.id)}</b> y el título sean los de la placa y la obra que tenés enfrente. Contá qué te despierta.
    </p>
  );
}
