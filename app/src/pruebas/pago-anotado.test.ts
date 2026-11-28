// El pago se anota apenas sale hacia la red, y la billetera tiene que firmar con la cuenta que entró.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Account, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

vi.mock("../base", () => ({ publicar: vi.fn(), guardarBorrador: vi.fn(), subirArchivo: vi.fn() }));
vi.mock("../billetera", () => ({ firmar: vi.fn(), firmarMensaje: vi.fn() }));
vi.mock("../achicar", () => ({ achicarFoto: vi.fn() }));

import { publicar } from "../base";
import { pagarYPublicar } from "../acciones";
import { anotar } from "../pendientes";
import { enPalabras, firmadaPor, firmarComo, PagoSinConfirmar, RechazadaPorLaRed } from "../umbral";

const CLAVE = "umbral-pendientes";
const ID = "a".repeat(64);
const H1 = "1".repeat(64);
const H2 = "2".repeat(64);
const recibo = (hash: string) => ({ hash, enlace: `https://ejemplo/tx/${hash}` });

let almacen: Map<string, string>;
const guardado = () => JSON.parse(almacen.get(CLAVE) ?? "[]") as { id: string; hash: string }[];
const publicarMock = vi.mocked(publicar);

beforeEach(() => {
  almacen = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  });
  publicarMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("el pago se anota apenas sale", () => {
  it("queda guardado antes de que la red conteste (pestaña cerrada en la espera)", async () => {
    let alSalir = () => {};
    const salio = new Promise<void>((r) => (alSalir = r));
    // El pago sale y la respuesta de la red no llega nunca: como si se cerrara la pestaña.
    void pagarYPublicar(
      ID,
      (alEnviar) => {
        alEnviar(H1);
        alSalir();
        return new Promise<never>(() => {});
      },
      () => {},
    );
    await salio;
    expect(guardado()).toMatchObject([{ id: ID, hash: H1 }]);
  });

  it("si todo sale bien, publica con ese comprobante y borra la nota", async () => {
    publicarMock.mockResolvedValue(H1 as never);
    await pagarYPublicar(ID, async (alEnviar) => (alEnviar(H1), recibo(H1)), () => {});
    expect(publicarMock).toHaveBeenCalledWith(ID, H1);
    expect(guardado()).toEqual([]);
  });

  it("si la red la rechaza, no deja la nota de este intento", async () => {
    const pago = pagarYPublicar(
      ID,
      async (alEnviar) => {
        alEnviar(H1);
        throw new RechazadaPorLaRed("La red rechazó la acción.");
      },
      () => {},
    );
    await expect(pago).rejects.toThrow(/rechazó/);
    expect(guardado()).toEqual([]);
  });

  it("un rechazo no borra la nota de un intento anterior que pudo haberse pagado", async () => {
    anotar(ID, H1);
    const pago = pagarYPublicar(
      ID,
      async (alEnviar) => {
        alEnviar(H2);
        throw new RechazadaPorLaRed("La red rechazó la acción.");
      },
      () => {},
    );
    await expect(pago).rejects.toThrow();
    expect(guardado().map((p) => p.id)).toEqual([ID]);
  });

  it("si se cancela la firma (nada salió), no anota nada", async () => {
    const pago = pagarYPublicar(ID, async () => Promise.reject(new Error("Cancelaste la firma en tu billetera. No se cobró nada.")), () => {});
    await expect(pago).rejects.toThrow(/Cancelaste/);
    expect(guardado()).toEqual([]);
  });

  it("sin confirmación de la red, la nota queda para reintentar", async () => {
    const pago = pagarYPublicar(
      ID,
      async (alEnviar) => {
        alEnviar(H1);
        throw new PagoSinConfirmar(H1);
      },
      () => {},
    );
    await expect(pago).rejects.toBeInstanceOf(PagoSinConfirmar);
    expect(guardado()).toMatchObject([{ id: ID, hash: H1 }]);
  });
});

describe("la billetera firma con la cuenta que entró", () => {
  const mia = Keypair.random();
  const otra = Keypair.random();
  const pedido = () =>
    new TransactionBuilder(new Account(mia.publicKey(), "1"), { fee: "100", networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.bumpSequence({ bumpTo: "5" }))
      .setTimeout(30)
      .build();
  const firmadoPor = (clave: Keypair) => {
    const tx = pedido();
    tx.sign(clave);
    return tx.toXDR();
  };

  it("reconoce la firma de la cuenta y la de otra", () => {
    expect(firmadaPor(firmadoPor(mia), mia.publicKey())).toBe(true);
    expect(firmadaPor(firmadoPor(otra), mia.publicKey())).toBe(false);
  });

  it("sin firmas o ilegible no opina: decide la red", () => {
    expect(firmadaPor(pedido().toXDR(), mia.publicKey())).toBe(true);
    expect(firmadaPor("no es un pedido", mia.publicKey())).toBe(true);
  });

  it("le pasa la cuenta a la billetera y frena si firmó otra", async () => {
    const billetera = vi.fn(async () => ({ signedTxXdr: firmadoPor(otra) }));
    const c = mia.publicKey();
    await expect(firmarComo(c, billetera)(pedido().toXDR())).rejects.toThrow(
      `Tu billetera está en otra cuenta. Cambiá a la cuenta ${c.slice(0, 4)}…${c.slice(-4)} y probá de nuevo.`,
    );
    expect(billetera).toHaveBeenCalledWith(expect.any(String), c);
  });

  it("deja pasar la firma correcta", async () => {
    const xdr = firmadoPor(mia);
    await expect(firmarComo(mia.publicKey(), async () => ({ signedTxXdr: xdr }))(pedido().toXDR())).resolves.toEqual({ signedTxXdr: xdr });
  });

  it("el aviso llega entero a la pantalla", () => {
    const aviso = "Tu billetera está en otra cuenta. Cambiá a la cuenta GABC…WXYZ y probá de nuevo.";
    expect(enPalabras(new Error(aviso)).message).toBe(aviso);
    expect(enPalabras(new Error('{"errorResult":"tx_bad_auth"}')).message).toMatch(/firmó con otra cuenta/);
    expect(enPalabras(new Error("txBadAuth")).message).toMatch(/firmó con otra cuenta/);
  });
});
