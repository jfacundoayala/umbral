// Achica la foto de una obra en el navegador ANTES de calcular su código.
// El archivo que devuelve es el que se hashea y el que se sube: los mismos bytes.

/** Lado mayor máximo de la foto que se guarda. */
export const LADO_MAX = 1600;
/** Por debajo de este peso (y de LADO_MAX) la foto queda como vino. */
export const PESO_CHICO = 300 * 1024;
const CALIDAD = 0.82;

/** Una foto se deja como está si ya es liviana y no pasa de LADO_MAX. */
export const necesitaAchicar = (peso: number, ancho: number, alto: number) =>
  peso >= PESO_CHICO || Math.max(ancho, alto) > LADO_MAX;

/** Medida nueva, sin deformar y sin agrandar. */
export function medidaNueva(ancho: number, alto: number, max = LADO_MAX) {
  const escala = Math.min(1, max / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

export type Herramientas = {
  /** Lee la imagen y devuelve su tamaño y una forma de dibujarla a otra medida. */
  leer: (f: File) => Promise<{ ancho: number; alto: number; dibujar: (ancho: number, alto: number, tipo: string, calidad: number) => Promise<Blob | null>; cerrar: () => void }>;
};

const nombreCon = (nombre: string, ext: string) => (nombre.replace(/\.[^.]*$/, "") || "foto") + "." + ext;

/** Devuelve la foto lista para hashear y subir. Si no hace falta achicarla, o algo falla, devuelve la original. */
export async function achicarFoto(foto: File, h: Herramientas = navegador): Promise<File> {
  let img: Awaited<ReturnType<Herramientas["leer"]>> | null = null;
  try {
    img = await h.leer(foto);
    if (!necesitaAchicar(foto.size, img.ancho, img.alto)) return foto;
    const m = medidaNueva(img.ancho, img.alto);
    // WebP primero; algunos navegadores no lo saben escribir y devuelven PNG: ahí va JPG.
    let blob = await img.dibujar(m.ancho, m.alto, "image/webp", CALIDAD);
    if (!blob || blob.type !== "image/webp") blob = await img.dibujar(m.ancho, m.alto, "image/jpeg", CALIDAD);
    if (!blob || (blob.type !== "image/webp" && blob.type !== "image/jpeg")) return foto;
    // Si la foto ya tenía buena medida y la nueva pesa más, no se gana nada.
    if (blob.size >= foto.size && Math.max(img.ancho, img.alto) <= LADO_MAX) return foto;
    return new File([blob], nombreCon(foto.name, blob.type === "image/webp" ? "webp" : "jpg"), { type: blob.type, lastModified: foto.lastModified });
  } catch {
    return foto;
  } finally {
    img?.cerrar();
  }
}

const navegador: Herramientas = {
  async leer(f) {
    // "from-image" respeta la orientación que guarda el celular en la foto.
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    return {
      ancho: bmp.width,
      alto: bmp.height,
      cerrar: () => bmp.close(),
      dibujar: (ancho, alto, tipo, calidad) => {
        const lienzo = document.createElement("canvas");
        lienzo.width = ancho;
        lienzo.height = alto;
        const ctx = lienzo.getContext("2d");
        if (!ctx) return Promise.resolve(null);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bmp, 0, 0, ancho, alto);
        return new Promise((r) => lienzo.toBlob(r, tipo, calidad));
      },
    };
  },
};
