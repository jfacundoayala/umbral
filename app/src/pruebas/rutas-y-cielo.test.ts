import { describe, expect, it } from "vitest";
import { plata, rutaDe } from "../comun";
import { enElCielo, OBRA_CON_SELLO } from "../base";

const SALA = "ec6b502e".padEnd(64, "a");

describe("rutas", () => {
  it("lleva cada pantalla a su lugar", () => {
    expect(rutaDe("#/")).toEqual({ pantalla: "portada" });
    expect(rutaDe("#/cielo")).toEqual({ pantalla: "cielo" });
    expect(rutaDe("#/cuentas")).toEqual({ pantalla: "cuentas" });
    expect(rutaDe(`#/obra/${OBRA_CON_SELLO}`)).toMatchObject({ pantalla: "obra", id: OBRA_CON_SELLO, placa: undefined });
  });

  it("una ruta inventada vuelve a la portada", () => {
    expect(rutaDe("#/no-existe")).toEqual({ pantalla: "portada" });
    expect(rutaDe("")).toEqual({ pantalla: "portada" });
  });

  it("la invitación de una sala solo vale con un código de sala bien formado", () => {
    expect(rutaDe(`#/abrir?sala=${SALA}`)).toEqual({ pantalla: "abrir", sala: SALA });
    expect(rutaDe("#/abrir?sala=cualquiercosa")).toEqual({ pantalla: "abrir", sala: undefined });
    expect(rutaDe("#/abrir?sala=<script>")).toEqual({ pantalla: "abrir", sala: undefined });
  });

  it("la puerta de un encuentro pide una sala válida y la pasa a minúsculas", () => {
    expect(rutaDe(`#/puerta/${SALA.toUpperCase()}`)).toEqual({ pantalla: "puerta", sala: SALA });
    expect(rutaDe("#/puerta/abc")).toEqual({ pantalla: "portada" });
  });

  it("la llegada desde una placa trae la firma", () => {
    expect(rutaDe(`#/obra/${OBRA_CON_SELLO}?desde=placa&f=ABCD`)).toMatchObject({ placa: { firma: "abcd" } });
    expect(rutaDe(`#/obra/${OBRA_CON_SELLO}?f=ABCD`)).toMatchObject({ placa: undefined });
  });
});

describe("qué obras se ven en El cielo", () => {
  it("se ven las del contrato final, desde el 28/11 a las 11:30 UTC", () => {
    expect(enElCielo({ id: OBRA_CON_SELLO, recibido: "2026-11-28T11:34:36Z" })).toBe(true);
    expect(enElCielo({ id: "a".repeat(64), recibido: "2026-11-29T00:00:00Z" })).toBe(true);
  });

  it("no se ven los ensayos ni los contratos anteriores", () => {
    expect(enElCielo({ id: "f".repeat(64), recibido: "2026-11-27T12:00:00Z" })).toBe(false);
    expect(enElCielo({ id: "b".repeat(64), recibido: "2026-11-28T09:41:06Z" })).toBe(false);
  });
});

describe("montos", () => {
  it("se leen en castellano, con coma decimal", () => {
    expect(plata(80_000_000n, "XLM")).toBe("8 XLM");
    expect(plata(21_000_000n, "USDC")).toBe("2,1 USDC");
  });
});
