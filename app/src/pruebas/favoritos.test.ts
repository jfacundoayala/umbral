// La firma de un favorito vale para una sola acción sobre una sola huella, y por pocos minutos.
// Prueba el mismo código que corre en el servidor (supabase/functions/favoritos/firma.ts).
import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";

vi.mock("../base", () => ({ publicar: vi.fn(), guardarBorrador: vi.fn(), subirArchivo: vi.fn() }));
vi.mock("../achicar", () => ({ achicarFoto: vi.fn() }));
// La billetera de la prueba firma como manda SEP-53, con la clave de `persona`.
const persona = Keypair.random();
async function firmarSep53(clave: Keypair, mensaje: string): Promise<string> {
  const datos = new TextEncoder().encode("Stellar Signed Message:\n" + mensaje);
  const hash = Buffer.from(await crypto.subtle.digest("SHA-256", datos));
  return Buffer.from(clave.sign(hash)).toString("base64");
}
vi.mock("../billetera", () => ({ firmar: vi.fn(), firmarMensaje: vi.fn((mensaje: string) => firmarSep53(persona, mensaje)) }));

import { firmaDeFavoritos, mensajeFavorito } from "../acciones";
import { firmaValida, mensajeDe, VALE_MINUTOS, vigente } from "../../../supabase/functions/favoritos/firma.ts";

const cuenta = persona.publicKey();
const clave = new Uint8Array(persona.rawPublicKey());
const OBRA = "a".repeat(64);
const OTRA = "b".repeat(64);

describe("firma de favoritos", () => {
  it("la app y el servidor arman el mismo mensaje", () => {
    const fecha = "2026-11-28T12:00:00.000Z";
    expect(mensajeFavorito("guardar", OBRA, cuenta, fecha)).toBe(mensajeDe("guardar", OBRA, cuenta, fecha));
    expect(mensajeFavorito("quitar", OBRA, cuenta, fecha)).toBe(mensajeDe("quitar", OBRA, cuenta, fecha));
  });

  it("el servidor acepta la firma que arma la app para esa acción y esa huella", async () => {
    const { fecha, firma } = await firmaDeFavoritos(cuenta, "guardar", OBRA);
    expect(vigente(fecha)).toBe(true);
    expect(await firmaValida(clave, mensajeDe("guardar", OBRA, cuenta, fecha), firma)).toBe(true);
  });

  it("la misma firma no sirve para otra huella ni para la acción contraria", async () => {
    const { fecha, firma } = await firmaDeFavoritos(cuenta, "guardar", OBRA);
    expect(await firmaValida(clave, mensajeDe("guardar", OTRA, cuenta, fecha), firma)).toBe(false);
    expect(await firmaValida(clave, mensajeDe("quitar", OBRA, cuenta, fecha), firma)).toBe(false);
  });

  it("no sirve la firma de otra cuenta ni con otra fecha", async () => {
    const { fecha, firma } = await firmaDeFavoritos(cuenta, "guardar", OBRA);
    const ajena = new Uint8Array(Keypair.random().rawPublicKey());
    expect(await firmaValida(ajena, mensajeDe("guardar", OBRA, cuenta, fecha), firma)).toBe(false);
    const despues = new Date(Date.parse(fecha) + 60_000).toISOString();
    expect(await firmaValida(clave, mensajeDe("guardar", OBRA, cuenta, despues), firma)).toBe(false);
  });

  it("acepta la firma en hexadecimal y rechaza basura", async () => {
    const fecha = new Date().toISOString();
    const m = mensajeDe("quitar", OBRA, cuenta, fecha);
    const hex = Buffer.from(await firmarSep53(persona, m), "base64").toString("hex");
    expect(await firmaValida(clave, m, hex)).toBe(true);
    expect(await firmaValida(clave, m, "no es una firma")).toBe(false);
    expect(await firmaValida(clave, m, "")).toBe(false);
  });

  it("vence a los pocos minutos", () => {
    const ahora = Date.parse("2026-11-28T12:00:00Z");
    const hace = (min: number) => new Date(ahora - min * 60_000).toISOString();
    expect(vigente(hace(1), ahora)).toBe(true);
    expect(vigente(hace(VALE_MINUTOS - 0.1), ahora)).toBe(true);
    expect(vigente(hace(VALE_MINUTOS + 0.1), ahora)).toBe(false);
    expect(vigente(hace(12 * 60), ahora)).toBe(false);
    expect(vigente(hace(-2), ahora)).toBe(false); // fecha del futuro
    expect(vigente("cualquier cosa", ahora)).toBe(false);
  });

  it("la app no guarda la firma: cada acción pide una nueva", async () => {
    const a = await firmaDeFavoritos(cuenta, "guardar", OBRA);
    const b = await firmaDeFavoritos(cuenta, "quitar", OBRA);
    expect(a.firma).not.toBe(b.firma);
  });
});
