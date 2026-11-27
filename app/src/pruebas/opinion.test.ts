import { describe, expect, it } from "vitest";
import { armarOpinion, LARGO_APODO, LARGO_TEXTO, type Respuestas } from "../opiniones";

const base: Respuestas = { desde: "huella", rol: "publico", pudo: "si", costo: "", cambiaria: "", apodo: "", citar: false };

describe("armarOpinion", () => {
  it("pide qué sos y si pudo dejar la huella", () => {
    expect(armarOpinion({ ...base, rol: null })).toMatch(/qué sos/);
    expect(armarOpinion({ ...base, pudo: null })).toMatch(/pudiste/);
  });

  it("los textos vacíos van como null y se limpian los espacios", () => {
    const o = armarOpinion({ ...base, costo: "   ", cambiaria: "  más   grande  ", apodo: " Tomi " });
    expect(o).toEqual({ desde: "huella", rol: "publico", pudo: "si", costo: null, cambiaria: "más grande", apodo: "Tomi", citar: false });
  });

  it("frena textos y apodos demasiado largos", () => {
    expect(armarOpinion({ ...base, costo: "a".repeat(LARGO_TEXTO + 1) })).toMatch(/hasta/);
    expect(armarOpinion({ ...base, apodo: "a".repeat(LARGO_APODO + 1) })).toMatch(/apodo/);
    expect(typeof armarOpinion({ ...base, costo: "a".repeat(LARGO_TEXTO), apodo: "a".repeat(LARGO_APODO) })).toBe("object");
  });

  it("no manda nada que no esté en la tabla", () => {
    const o = armarOpinion({ ...base, citar: true });
    expect(Object.keys(o as object).sort()).toEqual(["apodo", "cambiaria", "citar", "costo", "desde", "pudo", "rol"]);
  });
});
