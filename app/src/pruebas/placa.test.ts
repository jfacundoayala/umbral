import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { Keypair } from "@stellar/stellar-sdk";
import { codigoCorto, firmaEnHex, mensajePlaca, placaFirmada } from "../placa-firma";

const ID = "d387c0738f34fd75510735cd50a625fd657be543f17183ab7910743c2a4deab6";

/** Firma SEP-53, como hace la billetera. */
async function firmar(kp: Keypair, mensaje: string) {
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("Stellar Signed Message:\n" + mensaje)));
  return Buffer.from(kp.sign(hash));
}

describe("placa firmada", () => {
  it("acepta la firma de quien expuso la obra (hex o base64)", async () => {
    const artista = Keypair.random();
    const firma = await firmar(artista, mensajePlaca(ID));
    expect(await placaFirmada(ID, artista.publicKey(), firmaEnHex(firma.toString("hex")))).toBe(true);
    expect(await placaFirmada(ID, artista.publicKey(), firmaEnHex(firma.toString("base64")))).toBe(true);
  });

  it("rechaza la firma de otra cuenta", async () => {
    const artista = Keypair.random();
    const otro = Keypair.random();
    const firma = await firmar(otro, mensajePlaca(ID));
    expect(await placaFirmada(ID, artista.publicKey(), firma.toString("hex"))).toBe(false);
  });

  it("rechaza la firma de otra obra, una vacía o una rota", async () => {
    const artista = Keypair.random();
    const deOtraObra = await firmar(artista, mensajePlaca("ff".repeat(32)));
    expect(await placaFirmada(ID, artista.publicKey(), deOtraObra.toString("hex"))).toBe(false);
    expect(await placaFirmada(ID, artista.publicKey(), "")).toBe(false);
    expect(await placaFirmada(ID, artista.publicKey(), "zz")).toBe(false);
  });

  it("el código corto sale del id", () => {
    expect(codigoCorto(ID)).toBe("D387-C073");
  });
});
