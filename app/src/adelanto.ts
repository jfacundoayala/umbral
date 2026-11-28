// Los datos de la primera pantalla se piden apenas arranca la app, mientras se baja el código de esa pantalla.
// Sin esto, el pedido a la base sale recién cuando la pantalla se monta, y la foto del cielo o el texto
// de la ficha esperan una vuelta más. Cada pedido adelantado se usa una sola vez: si la pantalla
// vuelve a pedir (cambio de orden, recarga de la ficha), va a la base de nuevo.
import { constelacion, obras, type Orden } from "./base";
import { rutaDe } from "./comun";

const guardados = new Map<string, Promise<unknown>>();

function guardar(clave: string, pedido: Promise<unknown>) {
  pedido.catch(() => undefined); // si falla, el error lo muestra la pantalla cuando lo usa
  guardados.set(clave, pedido);
}

function usar<T>(clave: string, pedir: () => Promise<T>): Promise<T> {
  const p = guardados.get(clave) as Promise<T> | undefined;
  guardados.delete(clave);
  return p ?? pedir();
}

/** El orden con el que abre el cielo. */
export const ORDEN_INICIAL: Orden = "huellas";

export const obrasPrimero = (orden: Orden) => usar(`obras:${orden}`, () => obras(orden));
export const constelacionPrimero = (id: string) => usar(`constelacion:${id}`, () => constelacion(id));

/** Se llama una vez, antes de dibujar la app. */
export function adelantar() {
  const ruta = rutaDe(location.hash);
  if (ruta.pantalla === "cielo") guardar(`obras:${ORDEN_INICIAL}`, obras(ORDEN_INICIAL));
  if (ruta.pantalla === "obra") guardar(`constelacion:${ruta.id}`, constelacion(ruta.id));
}
