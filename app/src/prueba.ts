// Firmante de prueba: SOLO en modo desarrollo y SOLO si la dirección tiene "?prueba".
// Sirve para recorrer la app de punta a punta sin billetera de navegador.
// Las cuentas se crean al momento (Keypair.random), se fondean con Friendbot (XLM de prueba)
// y viven solo en la memoria de la pestaña: ninguna clave se guarda en archivos ni en el navegador.
import { Buffer } from "buffer";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { RED } from "./config";

export const modoPrueba = import.meta.env.DEV && new URLSearchParams(location.search).has("prueba");

const cuentas = new Map<string, Keypair>();
let activa: string | null = null;

function actual(): Keypair {
  if (!activa || !cuentas.has(activa)) throw new Error("No hay cuenta de prueba activa.");
  return cuentas.get(activa)!;
}

/** Crea una cuenta nueva, la fondea con Friendbot y la deja activa. Devuelve su dirección pública.
 *  Con `sinFondos`, la cuenta queda sin crear en la red (sirve para probar el botón "Cargar fondos de prueba"). */
async function crear(nombre: string, sinFondos = false): Promise<string> {
  const kp = Keypair.random();
  if (!sinFondos) {
    const r = await fetch(`${RED.friendbot}/?addr=${kp.publicKey()}`);
    if (!r.ok) throw new Error(`Friendbot no fondeó la cuenta (${r.status}).`);
  }
  cuentas.set(nombre, kp);
  activa = nombre;
  return kp.publicKey();
}

function usar(nombre: string): string {
  if (!cuentas.has(nombre)) throw new Error(`No existe la cuenta de prueba ${nombre}.`);
  activa = nombre;
  return cuentas.get(nombre)!.publicKey();
}

export const cuentaDePrueba = () => actual().publicKey();

export async function firmarDePrueba(xdr: string): Promise<{ signedTxXdr: string }> {
  const tx = TransactionBuilder.fromXDR(xdr, RED.frase);
  tx.sign(actual());
  return { signedTxXdr: tx.toXDR() };
}

/** SEP-53: se firma el SHA-256 de "Stellar Signed Message:\n" + mensaje. */
export async function firmarMensajeDePrueba(mensaje: string): Promise<string> {
  const datos = new TextEncoder().encode("Stellar Signed Message:\n" + mensaje);
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", datos));
  return Buffer.from(actual().sign(hash)).toString("base64");
}

if (import.meta.env.DEV && modoPrueba) {
  // Para manejar la prueba desde la consola o un script. Solo expone direcciones públicas.
  (window as unknown as { umbralPrueba: unknown }).umbralPrueba = { crear, usar, cuentas: () => [...cuentas].map(([n, k]) => [n, k.publicKey()]) };
}
