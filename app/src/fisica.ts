// ¿La obra existe en el mundo, como para pegarle una placa con QR al lado?
// La base no guarda la disciplina, así que se decide por lo que cuenta quien la expuso:
// si nombra una técnica o un material (tallado, acrílico, telar, chapa oxidada…), es física.
// Las obras con audio son de sonido: se escuchan en la web y no llevan placa.
import type { Huella } from "./base";

const TECNICAS = [
  "tallad[oa]s?",
  "escultura (?:en|de)",
  "mural",
  "acr[ií]lico",
  "[óo]leo",
  "sobre (?:tela|lienzo|madera|papel)",
  "telar",
  "tejid[oa]",
  "bordad[oa]",
  "puntadas?",
  "cester[ií]a",
  "entrelazad[oa]s?",
  "chapas? (?:oxidadas?|pintadas?)",
  "hierro|piedra|madera|algarrobo|bronce|cer[áa]mica|arcilla",
  "grabado en",
  "lin[óo]leo",
  "imprim[ií]",
  "impres[oa] a mano",
  "cianotipo",
  "papel sensible",
  "con tinta",
  "instalaci[óo]n",
  // Cada técnica se busca como palabra entera; los bordes cuentan las letras con tilde.
].map((t) => new RegExp(`(?<!\\p{L})(?:${t})(?!\\p{L})`, "u"));

export function esObraFisica(obra: Pick<Huella, "titulo" | "descripcion" | "audio_ruta">): boolean {
  if (obra.audio_ruta) return false;
  const texto = `${obra.titulo ?? ""} ${obra.descripcion ?? ""}`.toLowerCase();
  return TECNICAS.some((t) => t.test(texto));
}
