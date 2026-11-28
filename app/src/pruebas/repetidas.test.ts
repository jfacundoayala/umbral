// Una obra nunca se ve dos veces, ni en El cielo ni en la tira de la portada.
import { describe, expect, it } from "vitest";
import { sinRepetidas } from "../base";
import { idsDePortada, OBRAS_DE_PORTADA } from "../portadaObras";

const obra = (id: string, titulo: string, nombre: string, recibido: string) => ({ id: id.repeat(64), titulo, nombre, recibido });

describe("sinRepetidas", () => {
  it("de dos obras con el mismo título y la misma firma queda la más nueva", () => {
    const vieja = obra("a", "Entre raíces", "Lucía", "2026-11-27T10:00:00Z");
    const nueva = obra("b", "Entre raíces", "Lucía", "2026-11-28T10:00:00Z");
    expect(sinRepetidas([vieja, nueva])).toEqual([nueva]);
    expect(sinRepetidas([nueva, vieja])).toEqual([nueva]);
  });

  it("no importan mayúsculas, espacios de más ni cómo se escribió el acento", () => {
    const vieja = obra("a", "  entre   RAÍCES ", "lucía", "2026-11-27T10:00:00Z");
    const nueva = obra("b", "Entre raíces", "Lucía", "2026-11-28T10:00:00Z");
    expect(sinRepetidas([vieja, nueva])).toEqual([nueva]);
  });

  it("mismo título de otra persona, o misma persona con otro título, son obras distintas", () => {
    const lista = [
      obra("a", "Sin título", "Lucía", "2026-11-28T10:00:00Z"),
      obra("b", "Sin título", "Mirta", "2026-11-28T10:01:00Z"),
      obra("c", "Otra", "Lucía", "2026-11-28T10:02:00Z"),
    ];
    expect(sinRepetidas(lista)).toEqual(lista);
  });

  it("conserva el orden de las que quedan (el de más huellas primero, por ejemplo)", () => {
    const a = obra("a", "Uno", "Ana", "2026-11-28T10:00:00Z");
    const b1 = obra("b", "Dos", "Beto", "2026-11-27T10:00:00Z");
    const c = obra("c", "Tres", "Caro", "2026-11-28T09:00:00Z");
    const b2 = obra("d", "Dos", "Beto", "2026-11-28T11:00:00Z");
    expect(sinRepetidas([a, b1, c, b2]).map((h) => h.id[0])).toEqual(["a", "c", "d"]);
  });

  it("tres siembras de la misma obra dejan una sola", () => {
    const tres = ["2026-11-26", "2026-11-28", "2026-11-27"].map((d, i) => obra("abc"[i], "Lluvia en el techo de chapa", "Sol", `${d}T10:00:00Z`));
    expect(sinRepetidas(tres).map((h) => h.id[0])).toEqual(["b"]);
  });
});

describe("la tira de la portada", () => {
  it("son seis obras de títulos distintos", () => {
    expect(OBRAS_DE_PORTADA).toHaveLength(6);
    expect(new Set(OBRAS_DE_PORTADA.map((o) => o.titulo.toLowerCase())).size).toBe(6);
    expect(new Set(OBRAS_DE_PORTADA.map((o) => o.disciplina)).size).toBe(6);
  });

  const entradas = [
    { id: "a".repeat(64), disciplina: "Escultura", titulo: "Entre raíces" },
    { disciplina: "Museo", titulo: "La escalinata del museo" },
  ];

  it("usa el id escrito si la obra sigue en El cielo", () => {
    const ids = idsDePortada(entradas, [{ id: "a".repeat(64), titulo: "Entre raíces" }]);
    expect(ids.get("Entre raíces")).toBe("a".repeat(64));
  });

  it("después de sembrar de nuevo, encuentra la obra por su título aunque el id sea otro", () => {
    const ids = idsDePortada(entradas, [
      { id: "c".repeat(64), titulo: "Entre raíces" },
      { id: "d".repeat(64), titulo: "La escalinata del museo" },
    ]);
    expect(ids.get("Entre raíces")).toBe("c".repeat(64));
    expect(ids.get("La escalinata del museo")).toBe("d".repeat(64));
  });

  it("una obra sin id que todavía no está publicada no ocupa tarjeta", () => {
    const ids = idsDePortada(entradas, []);
    expect([...ids.keys()]).toEqual(["Entre raíces"]);
  });

  it("si una elegida no está publicada, su lugar lo ocupa otra obra distinta de El cielo, primero las que tienen foto", () => {
    const ids = idsDePortada(entradas, [
      { id: "a".repeat(64), titulo: "Entre raíces", foto_ruta: "x" },
      { id: "e".repeat(64), titulo: "Solo texto", foto_ruta: null },
      { id: "f".repeat(64), titulo: "Con foto", foto_ruta: "y" },
    ]);
    expect([...ids]).toEqual([
      ["Entre raíces", "a".repeat(64)],
      ["Con foto", "f".repeat(64)],
    ]);
  });

  it("dos entradas nunca apuntan a la misma obra", () => {
    const dobles = [...entradas, { disciplina: "Arte", titulo: "entre raíces" }];
    const ids = idsDePortada(dobles, [{ id: "c".repeat(64), titulo: "Entre raíces" }]);
    expect([...ids.values()]).toEqual(["c".repeat(64)]);
  });
});
