// Ingreso con Stellar Wallets Kit: la persona elige su billetera en una ventana.
// No dependemos de una sola. Cualquier otra forma de ingreso (por ejemplo, con correo)
// solo tiene que dar una cuenta y una función para firmar: las pantallas no cambian.
//
// El kit es uno solo para toda la app: se prepara una vez y después se usan sus funciones.
// Las seis billeteras son de la lista que la documentación oficial de Stellar da como
// compatibles y que no necesitan configuración extra. Varial es el nuevo nombre de Freighter.
import { Networks, StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { ALBEDO_ID, AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { VarialModule } from "@creit.tech/stellar-wallets-kit/modules/varial";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { RED } from "./config";
import type { Firmar } from "./umbral";
import { otraCuenta } from "./sin-red";
import { cuentaDePrueba, firmarDePrueba, firmarMensajeDePrueba, modoPrueba } from "./prueba";

StellarWalletsKit.init({
  modules: [
    new VarialModule(),
    new xBullModule(),
    new AlbedoModule(),
    new LobstrModule(),
    new HanaModule(),
    new RabetModule(),
  ],
  network: Networks.TESTNET,
});

/** Devuelve la cuenta de la persona. Con "albedo" va directo a esa billetera (se usa desde el navegador,
 *  sin instalar nada); sin nada, abre la ventana para elegir entre todas. */
export async function entrar(cual?: "albedo"): Promise<string> {
  if (modoPrueba) return cuentaDePrueba();
  if (cual === "albedo") {
    StellarWalletsKit.setWallet(ALBEDO_ID);
    return (await StellarWalletsKit.fetchAddress()).address;
  }
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

/** Si la persona ya había entrado antes, devuelve su cuenta sin preguntar. */
export async function cuentaGuardada(): Promise<string | null> {
  if (modoPrueba) return null;
  try {
    const { address } = await StellarWalletsKit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

export async function salir(): Promise<void> {
  if (modoPrueba) return;
  await StellarWalletsKit.disconnect();
}

/**
 * `true` o `false` si la billetera dice en qué red está; `null` si no lo informa
 * (no todas lo hacen). Sirve para avisar antes de firmar en la red equivocada.
 */
export async function enLaRedDePruebas(): Promise<boolean | null> {
  try {
    const { networkPassphrase } = await StellarWalletsKit.getNetwork();
    return networkPassphrase === RED.frase;
  } catch {
    return null;
  }
}

/** Firma con la billetera elegida. Si la billetera está en otra red, frena antes de firmar.
 *  Con `cuenta`, le pide a la billetera que firme esa cuenta y no la que tenga activa. */
export const firmar: Firmar = async (xdr, cuenta) => {
  if (modoPrueba) return firmarDePrueba(xdr);
  if ((await enLaRedDePruebas()) === false) {
    throw new Error("Tu billetera está en otra red. Cambiala a la red de pruebas (Testnet) y volvé a intentar.");
  }
  const { signedTxXdr, signerAddress } = await StellarWalletsKit.signTransaction(xdr, { networkPassphrase: RED.frase, ...(cuenta ? { address: cuenta } : {}) });
  if (cuenta && signerAddress && signerAddress !== cuenta) throw otraCuenta(cuenta);
  return { signedTxXdr };
};

/** Firma un mensaje (no una transacción: no cuesta nada). Sirve para probar que la cuenta es tuya. */
export async function firmarMensaje(mensaje: string, cuenta: string): Promise<string> {
  if (modoPrueba) return firmarMensajeDePrueba(mensaje);
  const { signedMessage } = await StellarWalletsKit.signMessage(mensaje, { networkPassphrase: RED.frase, address: cuenta });
  return signedMessage;
}
