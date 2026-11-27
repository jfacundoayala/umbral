import { describe, expect, it } from "vitest";
import { achicarFoto, medidaNueva, necesitaAchicar, LADO_MAX, PESO_CHICO, type Herramientas } from "../achicar";
import { codigoDeArchivo } from "../umbral";

const archivo = (bytes: number, tipo = "image/jpeg", nombre = "obra.jpg") => new File([new Uint8Array(bytes)], nombre, { type: tipo });

/** Imagen falsa: anota a qué medida se dibujó y devuelve bytes fijos del tipo pedido (o PNG si "no sabe" WebP). */
function herramientas(ancho: number, alto: number, opciones: { sinWebp?: boolean; salida?: number } = {}) {
  const dibujos: { ancho: number; alto: number; tipo: string }[] = [];
  let cerrada = false;
  const h: Herramientas = {
    leer: async () => ({
      ancho,
      alto,
      cerrar: () => { cerrada = true; },
      dibujar: async (a, b, tipo) => {
        dibujos.push({ ancho: a, alto: b, tipo });
        const real = tipo === "image/webp" && opciones.sinWebp ? "image/png" : tipo;
        return new Blob([new Uint8Array(opciones.salida ?? 1000).fill(7)], { type: real });
      },
    }),
  };
  return { h, dibujos, cerrada: () => cerrada };
}

describe("cuándo se achica una foto", () => {
  it("una foto liviana y de buena medida queda igual", () => {
    expect(necesitaAchicar(PESO_CHICO - 1, 1200, 900)).toBe(false);
    expect(necesitaAchicar(PESO_CHICO - 1, LADO_MAX, LADO_MAX)).toBe(false);
  });
  it("se achica si pesa 300 KB o más, o si un lado pasa de 1600 px", () => {
    expect(necesitaAchicar(PESO_CHICO, 800, 600)).toBe(true);
    expect(necesitaAchicar(1000, LADO_MAX + 1, 100)).toBe(true);
  });
  it("la medida nueva respeta la forma y no agranda", () => {
    expect(medidaNueva(4000, 3000)).toEqual({ ancho: 1600, alto: 1200 });
    expect(medidaNueva(3000, 4000)).toEqual({ ancho: 1200, alto: 1600 });
    expect(medidaNueva(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });
});

describe("achicarFoto", () => {
  it("devuelve el mismo archivo si no hace falta achicarlo", async () => {
    const f = archivo(1000);
    const { h, dibujos, cerrada } = herramientas(800, 600);
    expect(await achicarFoto(f, h)).toBe(f);
    expect(dibujos).toEqual([]);
    expect(cerrada()).toBe(true);
  });

  it("una foto grande sale en WebP, a 1600 px de lado mayor", async () => {
    const { h, dibujos } = herramientas(4032, 3024);
    const nueva = await achicarFoto(archivo(4_000_000, "image/jpeg", "IMG_1234.jpg"), h);
    expect(dibujos).toEqual([{ ancho: 1600, alto: 1200, tipo: "image/webp" }]);
    expect(nueva.type).toBe("image/webp");
    expect(nueva.name).toBe("IMG_1234.webp");
    expect(nueva.size).toBe(1000);
  });

  it("si el navegador no sabe escribir WebP, sale en JPG", async () => {
    const { h, dibujos } = herramientas(3000, 2000, { sinWebp: true });
    const nueva = await achicarFoto(archivo(2_000_000, "image/png", "obra.png"), h);
    expect(dibujos.map((d) => d.tipo)).toEqual(["image/webp", "image/jpeg"]);
    expect(nueva.type).toBe("image/jpeg");
    expect(nueva.name).toBe("obra.jpg");
  });

  it("si la nueva pesa más y la medida ya estaba bien, queda la original", async () => {
    const f = archivo(400_000);
    const { h } = herramientas(1000, 800, { salida: 500_000 });
    expect(await achicarFoto(f, h)).toBe(f);
  });

  it("si leer la imagen falla, queda la original", async () => {
    const f = archivo(4_000_000);
    const h: Herramientas = { leer: async () => { throw new Error("no es una imagen"); } };
    expect(await achicarFoto(f, h)).toBe(f);
  });

  it("lo que se hashea es lo mismo que se sube: dos lecturas del archivo achicado dan el mismo código", async () => {
    const { h } = herramientas(4000, 3000);
    const nueva = await achicarFoto(archivo(3_000_000), h);
    const copiaSubida = new Blob([await nueva.arrayBuffer()], { type: nueva.type });
    expect(await codigoDeArchivo(nueva)).toBe(await codigoDeArchivo(copiaSubida));
  });
});
