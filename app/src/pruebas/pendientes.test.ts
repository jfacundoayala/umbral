import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../base", () => ({ publicar: vi.fn() }));

import { publicar } from "../base";
import { anotar, anotarSiFalta, quitar, reintentarPendientes } from "../pendientes";

const CLAVE = "umbral-pendientes";
const HORA = 3_600_000;
const ID1 = "a".repeat(64);
const ID2 = "b".repeat(64);
const H1 = "1".repeat(64);
const H2 = "2".repeat(64);

let almacen: Map<string, string>;
const guardado = () => JSON.parse(almacen.get(CLAVE) ?? "[]") as { id: string; hash: string; desde: number }[];
const publicarMock = vi.mocked(publicar);

beforeEach(() => {
  almacen = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-26T12:00:00Z"));
  publicarMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("pendientes", () => {
  it("anotar guarda id, comprobante y fecha", () => {
    anotar(ID1, H1);
    expect(guardado()).toEqual([{ id: ID1, hash: H1, desde: Date.now() }]);
  });

  it("anotar el mismo id dos veces no lo duplica y se queda con el último comprobante", () => {
    anotar(ID1, H1);
    anotar(ID1, H2);
    expect(guardado()).toHaveLength(1);
    expect(guardado()[0].hash).toBe(H2);
  });

  it("quitar saca solo el id pedido", () => {
    anotar(ID1, H1);
    anotar(ID2, H2);
    quitar(ID1);
    expect(guardado().map((p) => p.id)).toEqual([ID2]);
  });

  it("si publicar sale bien, lo quita y cuenta la huella", async () => {
    anotar(ID1, H1);
    publicarMock.mockResolvedValue(undefined as never);
    expect(await reintentarPendientes()).toBe(1);
    expect(publicarMock).toHaveBeenCalledWith(ID1, H1);
    expect(guardado()).toEqual([]);
  });

  it("si publicar falla, la huella sigue anotada y no cuenta", async () => {
    anotar(ID1, H1);
    publicarMock.mockRejectedValue(new Error("sin red"));
    expect(await reintentarPendientes()).toBe(0);
    expect(guardado().map((p) => p.id)).toEqual([ID1]);
  });

  it("un fallo no frena a las demás", async () => {
    anotar(ID1, H1);
    anotar(ID2, H2);
    publicarMock.mockRejectedValueOnce(new Error("sin red")).mockResolvedValueOnce(undefined as never);
    expect(await reintentarPendientes()).toBe(1);
    expect(guardado().map((p) => p.id)).toEqual([ID1]);
  });

  it("si el comprobante guardado no sirve, publica sin comprobante", async () => {
    // Un segundo intento que la red rechazó pisó el comprobante del pago bueno.
    anotar(ID1, H2);
    publicarMock.mockRejectedValueOnce(new Error("El pago quedó hecho, pero no se pudo publicar: Ese comprobante no es el de esta huella.")).mockResolvedValueOnce(null);
    expect(await reintentarPendientes()).toBe(1);
    expect(publicarMock).toHaveBeenNthCalledWith(1, ID1, H2);
    expect(publicarMock).toHaveBeenNthCalledWith(2, ID1);
    expect(guardado()).toEqual([]);
  });

  it("si falla por otra cosa, no insiste sin comprobante", async () => {
    anotar(ID1, H1);
    publicarMock.mockRejectedValue(new Error("sin red"));
    expect(await reintentarPendientes()).toBe(0);
    expect(publicarMock).toHaveBeenCalledTimes(1);
  });

  it("anotarSiFalta guarda una huella pagada sin comprobante y no pisa uno que ya estaba", async () => {
    anotarSiFalta(ID1);
    expect(guardado()).toEqual([{ id: ID1, hash: "", desde: Date.now() }]);
    anotar(ID2, H2);
    anotarSiFalta(ID2);
    expect(guardado().find((p) => p.id === ID2)?.hash).toBe(H2);
    publicarMock.mockResolvedValue(null);
    expect(await reintentarPendientes()).toBe(2);
    expect(publicarMock).toHaveBeenCalledWith(ID1, "");
  });

  it("a los 7 días exactos todavía se reintenta", async () => {
    anotar(ID1, H1);
    vi.advanceTimersByTime(7 * 24 * HORA);
    publicarMock.mockResolvedValue(undefined as never);
    expect(await reintentarPendientes()).toBe(1);
  });

  it("pasados los 7 días se descarta sin intentar publicar", async () => {
    anotar(ID1, H1);
    vi.advanceTimersByTime(7 * 24 * HORA + 1);
    expect(await reintentarPendientes()).toBe(0);
    expect(publicarMock).not.toHaveBeenCalled();
    expect(guardado()).toEqual([]);
  });

  it("un almacenamiento con basura se trata como vacío", async () => {
    almacen.set(CLAVE, "{no es json");
    expect(await reintentarPendientes()).toBe(0);
    almacen.set(CLAVE, '{"a":1}');
    expect(await reintentarPendientes()).toBe(0);
  });

  it("sin localStorage disponible no revienta", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(() => anotar(ID1, H1)).not.toThrow();
    expect(() => quitar(ID1)).not.toThrow();
  });
});
