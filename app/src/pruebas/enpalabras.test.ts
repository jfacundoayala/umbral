import { beforeEach, describe, expect, it, vi } from "vitest";
import { enPalabras } from "../umbral";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const msg = (e: unknown) => enPalabras(e).message;

describe("enPalabras", () => {
  it("contrato #14: el precio cambió", () => {
    expect(msg(new Error("HostError: Error(Contract, #14)"))).toMatch(/precio cambió/);
  });

  it("contrato #1 y #7 con su texto", () => {
    expect(msg(new Error("Error(Contract, #1)"))).toBe("Ya dejaste esta huella.");
    expect(msg(new Error("Error(Contract, #7)"))).toBe("No tenés nada para cobrar.");
  });

  it("contrato #13 (trustline) y #10 (saldo)", () => {
    expect(msg(new Error("Error(Contract, #13)"))).toMatch(/USDC habilitado/);
    expect(msg(new Error("Error(Contract, #10)"))).toMatch(/saldo/);
  });

  it("trustline faltante", () => {
    expect(msg(new Error("trustline entry is missing for account"))).toMatch(/USDC habilitado/);
  });

  it("saldo insuficiente", () => {
    expect(msg(new Error("balance is not sufficient"))).toMatch(/saldo/);
    expect(msg(new Error("tx_insufficient_balance"))).toMatch(/saldo/);
    expect(msg(new Error("op_underfunded"))).toMatch(/saldo/);
  });

  it("cuenta que no existe", () => {
    expect(msg(new Error("account not found"))).toMatch(/todavía no existe/);
  });

  it("cancelar la firma", () => {
    expect(msg(new Error("User declined access"))).toMatch(/Cancelaste/);
    expect(msg(new Error("The user rejected the request"))).toMatch(/Cancelaste/);
    expect(msg(new Error("Modal closed"))).toMatch(/Cancelaste/);
  });

  it("red caída", () => {
    expect(msg(new Error("Failed to fetch"))).toMatch(/No pudimos hablar con la red/);
    expect(msg(new Error("NetworkError when attempting to fetch resource"))).toMatch(/No pudimos hablar con la red/);
    expect(msg(new Error("request timed out"))).toMatch(/No pudimos hablar con la red/);
  });

  it("error técnico desconocido: mensaje genérico y lo deja en consola", () => {
    expect(msg(new Error("HostError: Error(WasmVm, InvalidAction)"))).toMatch(/rechazó la acción/);
    expect(console.error).toHaveBeenCalled();
  });

  it("código de contrato sin traducción cae en el genérico", () => {
    expect(msg(new Error("Error(Contract, #99)"))).toMatch(/rechazó la acción/);
  });

  it("un mensaje corto y legible se deja tal cual", () => {
    expect(msg(new Error("Algo raro"))).toBe("Algo raro");
  });

  it("acepta valores que no son Error", () => {
    expect(msg("Failed to fetch")).toMatch(/No pudimos hablar con la red/);
    expect(enPalabras("texto suelto")).toBeInstanceOf(Error);
  });
});
