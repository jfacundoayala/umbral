import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Keypair } from "@stellar/stellar-sdk";
import AvisoPlaca from "../AvisoPlaca";
import { mensajePlaca, placaFirmada, type ObraFirmable } from "../placa-firma";

const ID = "d387c0738f34fd75510735cd50a625fd657be543f17183ab7910743c2a4deab6";
const DIGEST = "ab".repeat(32);
const SITIO = "umbralmuseo.vercel.app";

/** Firma SEP-53, como hace la billetera. */
async function firmar(kp: Keypair, mensaje: string) {
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("Stellar Signed Message:\n" + mensaje)));
  return Buffer.from(kp.sign(hash)).toString("hex");
}

/** Lo que ve quien escanea: se comprueba la firma de la placa y se dibuja el aviso, como en la ficha. */
async function avisoAlEscanear(obra: ObraFirmable, firma: string) {
  const firmada = await placaFirmada(obra, firma, SITIO);
  return renderToStaticMarkup(createElement(AvisoPlaca, { firmada, obra }));
}

describe("aviso de la placa en la ficha", () => {
  it("placa válida: confirma la cuenta y muestra el código para comparar", async () => {
    const artista = Keypair.random();
    const obra = { id: ID, digest: DIGEST, autor: artista.publicKey() };
    const html = await avisoAlEscanear(obra, await firmar(artista, mensajePlaca(obra, SITIO)));
    expect(html).toContain('role="status"');
    expect(html).not.toContain("falsa");
    expect(html).toContain("✓ Placa firmada por la cuenta que expuso esta obra");
    expect(html).toContain(`${artista.publicKey().slice(0, 4)}…${artista.publicKey().slice(-4)}`);
    expect(html).toContain("<b>D387-C073</b>");
  });

  it("placa trucha (firmada por otra cuenta): alerta y pide no pagar", async () => {
    const artista = Keypair.random();
    const obra = { id: ID, digest: DIGEST, autor: artista.publicKey() };
    const html = await avisoAlEscanear(obra, await firmar(Keypair.random(), mensajePlaca(obra, SITIO)));
    expect(html).toContain('class="aviso-placa falsa"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("no pagues si no confiás en ella");
    expect(html).not.toContain("✓");
  });

  it("placa auténtica de otra obra: también es trucha", async () => {
    const artista = Keypair.random();
    const obra = { id: ID, digest: DIGEST, autor: artista.publicKey() };
    const deOtra = await firmar(artista, mensajePlaca({ ...obra, id: "ff".repeat(32) }, SITIO));
    expect(await avisoAlEscanear(obra, deOtra)).toContain('role="alert"');
  });

  it("mientras se comprueba no muestra nada", () => {
    expect(renderToStaticMarkup(createElement(AvisoPlaca, { firmada: null, obra: { id: ID, autor: "G".repeat(56) } }))).toBe("");
  });
});
