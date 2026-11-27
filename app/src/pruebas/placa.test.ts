import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { Keypair } from "@stellar/stellar-sdk";
import { codigoCorto, firmaEnHex, mensajePlaca, placaFirmada, type ObraFirmable } from "../placa-firma";

const ID = "d387c0738f34fd75510735cd50a625fd657be543f17183ab7910743c2a4deab6";
const DIGEST = "ab".repeat(32);
const SITIO = "umbralmuseo.vercel.app";

/** Firma SEP-53, como hace la billetera. */
async function firmar(kp: Keypair, mensaje: string) {
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("Stellar Signed Message:\n" + mensaje)));
  return Buffer.from(kp.sign(hash));
}
const obraDe = (kp: Keypair, cambios: Partial<ObraFirmable> = {}): ObraFirmable => ({ id: ID, digest: DIGEST, autor: kp.publicKey(), ...cambios });

describe("placa firmada", () => {
  it("acepta la firma de la cuenta que expuso la obra (hex o base64)", async () => {
    const artista = Keypair.random();
    const firma = await firmar(artista, mensajePlaca(obraDe(artista), SITIO));
    expect(await placaFirmada(obraDe(artista), firmaEnHex(firma.toString("hex")), SITIO)).toBe(true);
    expect(await placaFirmada(obraDe(artista), firmaEnHex(firma.toString("base64")), SITIO)).toBe(true);
  });

  it("rechaza la firma de otra cuenta", async () => {
    const artista = Keypair.random();
    const otro = Keypair.random();
    const firma = await firmar(otro, mensajePlaca(obraDe(artista), SITIO));
    expect(await placaFirmada(obraDe(artista), firma.toString("hex"), SITIO)).toBe(false);
  });

  it("una placa auténtica no sirve para otra obra, otro contenido ni otro sitio", async () => {
    const artista = Keypair.random();
    const firma = (await firmar(artista, mensajePlaca(obraDe(artista), SITIO))).toString("hex");
    expect(await placaFirmada(obraDe(artista, { id: "ff".repeat(32) }), firma, SITIO)).toBe(false);
    expect(await placaFirmada(obraDe(artista, { digest: "cd".repeat(32) }), firma, SITIO)).toBe(false);
    expect(await placaFirmada(obraDe(artista), firma, "sitio-trucho.app")).toBe(false);
  });

  it("rechaza una firma vacía o rota", async () => {
    const artista = Keypair.random();
    expect(await placaFirmada(obraDe(artista), "", SITIO)).toBe(false);
    expect(await placaFirmada(obraDe(artista), "zz", SITIO)).toBe(false);
  });

  it("el código corto sale del id", () => {
    expect(codigoCorto(ID)).toBe("D387-C073");
  });
});
