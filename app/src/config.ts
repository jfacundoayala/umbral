// Datos de la red y del contrato. Nada de esto es secreto.
// Contrato desplegado en la red de pruebas el 27/11/2026. Se puede cambiar con variables de entorno.
export const RED = {
  nombre: "Red de pruebas de Stellar",
  rpcUrl: "https://soroban-testnet.stellar.org",
  frase: "Test SDF Network ; September 2015",
  explorador: "https://stellar.expert/explorer/testnet",
  horizonUrl: "https://horizon-testnet.stellar.org",
  /** Da XLM de prueba gratis a una cuenta nueva. Solo existe en la red de pruebas. */
  friendbot: "https://friendbot.stellar.org",
};

export const CONTRATO_ID: string = import.meta.env.VITE_CONTRATO_ID ?? "CBE4RP5RRN7HKZLQKYZKNZFVCGDOFB74JPWGGWSIAUNNLR3R3IUXJ4ZM";
export const MONEDA_ID: string = import.meta.env.VITE_MONEDA_ID ?? "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
/** El XLM como moneda del contrato. */
export const XLM_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/** El USDC de la red de pruebas. Un activo se reconoce por código Y emisor: otro "USDC" con otro emisor no vale.
 *  Quien paga, quien cobra y la cuenta de UMBRAL tienen que haber aceptado este activo antes (trustline). */
export const USDC = { codigo: "USDC", emisor: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" };

/** 7 decimales, como USDC y XLM en Stellar. */
export const UNIDAD = 10_000_000n;

export const listoParaLaRed = () => CONTRATO_ID !== "" && MONEDA_ID !== "";

// Base de datos (Supabase). Esta clave es la pública: está hecha para ir en el navegador.
// La clave de servicio nunca va en este repositorio.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://nznearthcpgbeyyeuhyy.supabase.co";
export const SUPABASE_CLAVE_PUBLICA = import.meta.env.VITE_SUPABASE_CLAVE_PUBLICA ?? "sb_publishable_MBT_2R-srFcN-4Ar832Sfw_cZTqj5zf";
