import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { codigoDe, documentoOrdenado, idDe, type Documento } from "../umbral";

// Copia del cuerpo de documentoOrdenado en supabase/functions/publicar/index.ts (corre en Deno, no se puede importar acá).
// Si cambia allá, hay que actualizar esta copia.
function documentoOrdenadoServidor(d: Record<string, string | null | undefined>): string {
  const t = (x?: string | null) => (x ?? "").normalize("NFC");
  return JSON.stringify({
    audio: d.audio ?? "",
    creado: d.creado,
    derechos: d.derechos ?? "",
    descripcion: t(d.descripcion),
    enlace: d.enlace ?? "",
    foto: d.foto ?? "",
    nombre: t(d.nombre),
    sal: d.sal,
    texto: t(d.texto),
    titulo: t(d.titulo),
  });
}

const base: Documento = { texto: "hola", nombre: "Ana", creado: "2026-11-26T10:00:00.000Z", sal: "ab".repeat(16) };
const HEX = "f".repeat(64);

const casos: Record<string, Documento> = {
  "mínimo (sin foto ni audio)": base,
  "acentos y eñes": { ...base, texto: "Canción de la niña ñandú", nombre: "José", titulo: "Mañana", descripcion: "Más allá" },
  "NFD (descompuesto)": { ...base, texto: "Canción", nombre: "José", titulo: "Mañana", descripcion: "Más" },
  "foto llena, audio vacío": { ...base, foto: HEX },
  "audio lleno, foto vacía": { ...base, audio: HEX },
  "foto y audio llenos": { ...base, foto: HEX, audio: "0".repeat(64) },
  "foto y audio como cadena vacía": { ...base, foto: "", audio: "" },
  "derechos autoria": { ...base, derechos: "autoria", titulo: "Obra" },
  "derechos dominio_publico": { ...base, derechos: "dominio_publico" },
  "derechos autorizacion con enlace": { ...base, derechos: "autorizacion", enlace: "https://ejemplo.org/a?b=1&c=ñ" },
  "emoji y comillas": { ...base, texto: 'Dijo "hola" \n\t 🎨', descripcion: "línea1\nlínea2" },
  "todo junto": { texto: "t", nombre: "n", titulo: "ti", descripcion: "de", foto: HEX, audio: HEX, enlace: "https://x.y", derechos: "autoria", creado: "2026-01-01T00:00:00Z", sal: "00" },
};

describe("documentoOrdenado: app y servidor dan el mismo texto", () => {
  for (const [nombre, doc] of Object.entries(casos)) {
    it(nombre, () => {
      expect(documentoOrdenado(doc)).toBe(documentoOrdenadoServidor({ ...doc }));
    });
  }

  it("el servidor recibe null de la base y la app undefined: mismo resultado", () => {
    const deBase = { texto: "x", nombre: "n", titulo: null, descripcion: null, enlace: null, foto: "", audio: "", derechos: null, creado: base.creado, sal: base.sal };
    expect(documentoOrdenadoServidor(deBase)).toBe(documentoOrdenado({ texto: "x", nombre: "n", creado: base.creado, sal: base.sal }));
  });

  it("NFC y NFD dan el mismo texto y el mismo código", async () => {
    const nfc = { ...base, texto: "canción", nombre: "José" };
    const nfd = { ...base, texto: "canción", nombre: "José" };
    expect(documentoOrdenado(nfc)).toBe(documentoOrdenado(nfd));
    expect((await codigoDe(nfc)).toString("hex")).toBe((await codigoDe(nfd)).toString("hex"));
  });

  it("las claves salen siempre en orden alfabético", () => {
    const claves = Object.keys(JSON.parse(documentoOrdenado(base)));
    expect(claves).toEqual([...claves].sort());
  });

  it("cambiar la sal cambia el código", async () => {
    const a = await codigoDe(base);
    const b = await codigoDe({ ...base, sal: "cd".repeat(16) });
    expect(a.equals(b)).toBe(false);
  });
});

describe("idDe coincide con id_de del contrato", () => {
  // Valores de contrato/contracts/umbral/src/test.rs: el_identificador_coincide_con_el_que_calcula_la_app
  const CUENTA = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const ESPERADO = "56bfc9f0595c71a8d5f13aef5f554c125e30de0a9be1e10698bfe730d6db6dfd";

  it("misma cuenta y digest fijo (32 bytes de 0x07)", async () => {
    const id = await idDe(CUENTA, Buffer.alloc(32, 7));
    expect(id.toString("hex")).toBe(ESPERADO);
  });

  it("otra cuenta o otro digest dan otro id", async () => {
    expect((await idDe(CUENTA, Buffer.alloc(32, 8))).toString("hex")).not.toBe(ESPERADO);
  });
});
