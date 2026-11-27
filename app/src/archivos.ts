// Qué fotos y audios se aceptan. Sin stellar-sdk: lo usa la pantalla Abrir antes de cargar lo demás.

export const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const PESO_MAX = 5 * 1024 * 1024;
/** Al elegirla se acepta hasta 20 MB: antes de subirla se achica (ver achicar.ts) y lo que se sube no pasa de 5 MB. */
export const fotoValida = (f: File) => f.size <= 20 * 1024 * 1024 && f.type in EXTENSION;

export const EXTENSION_AUDIO: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};
/** El navegador a veces agrega el códec ("audio/webm;codecs=opus"): se mira solo el tipo. */
export const tipoAudio = (f: File) => f.type.split(";")[0];
export const audioValido = (f: File) => f.size <= 5 * 1024 * 1024 && tipoAudio(f) in EXTENSION_AUDIO;
