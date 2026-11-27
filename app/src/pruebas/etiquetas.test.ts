import { describe, expect, it } from "vitest";
import { cajaDeNombre, etiquetasVisibles, type Candidato } from "../etiquetas";

const punto = (id: string, x: number, y: number, z: number, prioridad = 0, r = 10): Candidato => ({
  id,
  z,
  caja: cajaDeNombre(id.toUpperCase(), x, y + 20, 10),
  circulo: { x, y, r },
  prioridad,
});

describe("nombres de la constelación", () => {
  it("si no se tocan, se ven todos", () => {
    expect(etiquetasVisibles([punto("ana", 0, 0, 0), punto("beto", 200, 0, 5), punto("caro", -200, 0, -5)])).toEqual(new Set(["ana", "beto", "caro"]));
  });

  it("si dos se pisan, queda el de adelante", () => {
    const v = etiquetasVisibles([punto("atras", 0, 0, -50), punto("adelante", 6, 2, 50)]);
    expect(v.has("adelante")).toBe(true);
    expect(v.has("atras")).toBe(false);
  });

  it("la huella que se mira gana aunque esté atrás", () => {
    const v = etiquetasVisibles([punto("atras", 0, 0, -50, 2), punto("adelante", 6, 2, 50)]);
    expect(v.has("atras")).toBe(true);
    expect(v.has("adelante")).toBe(false);
  });

  it("un nombre debajo de un círculo que está más adelante se oculta", () => {
    // La obra, grande y en el centro; una huella atrás con su nombre justo encima de la obra.
    const obra: Candidato = { ...punto("obra", 0, 0, 0, 1, 40), caja: cajaDeNombre("OBRA", 0, 60, 10) };
    const tapada = { ...punto("tomi", 0, -10, -80), caja: cajaDeNombre("TOMI", 0, 5, 10) };
    const v = etiquetasVisibles([obra, tapada]);
    expect(v.has("obra")).toBe(true);
    expect(v.has("tomi")).toBe(false);
  });

  it("un círculo de atrás no oculta el nombre de uno de adelante", () => {
    const atras: Candidato = { ...punto("atras", 0, 0, -80, 0, 40) };
    const adelante = { ...punto("adelante", 0, -10, 80), caja: cajaDeNombre("ADELANTE", 0, 5, 10) };
    expect(etiquetasVisibles([atras, adelante]).has("adelante")).toBe(true);
  });
});
