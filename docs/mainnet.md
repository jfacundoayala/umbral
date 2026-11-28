# Pasar UMBRAL a mainnet

Guía para desplegar el contrato en la red principal de Stellar, donde los fondos son reales. **Nada de esto se ejecutó en mainnet.** El script se probó entero en la red de pruebas y en modo simulación, que no envía nada.

## Qué hace `contrato/mainnet.sh`

1. Comprueba que el wasm sea el mismo que corre en testnet (`276f4d85…0fc7`, 26.205 bytes). No recompila: si el archivo cambió, no sigue.
2. Sube el código y despliega el contrato, con administrador, tesoro y parte del artista (80%).
3. Fija precios en XLM y en USDC.
4. Hace una prueba chica en XLM, con centavos: expone una obra, la continúa y el artista cobra.

Antes de **cada** paso que gasta, muestra qué va a hacer y cuánto cuesta, y espera que escribas `SI`. En mainnet, además, al empezar pide escribir `MAINNET`. Con cualquier otra respuesta corta sin enviar nada.

La clave no se lee, no se imprime ni se copia. El script solo le pasa el alias `umbral-main` a stellar-cli para que firme (`--source-account umbral-main`). Para simular usa la dirección pública, que no necesita la clave.

## Datos de la red (verificados el 27/11/2026)

| Dato | Valor | Fuente |
|---|---|---|
| Frase de la red | `Public Global Stellar Network ; September 2015` | [Stellar Docs](https://developers.stellar.org/docs/tools/cli/agent-cli/reference/troubleshooting) |
| RPC de mainnet | `https://mainnet.sorobanrpc.com` (público, sin registrarse) | [Proveedores de RPC](https://developers.stellar.org/docs/data/apis/rpc/providers) y [Stellar Docs](https://developers.stellar.org/docs/tools/cli/agent-cli/reference/troubleshooting) |
| USDC, emisor | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | [Circle](https://developers.circle.com/stablecoins/usdc-contract-addresses) |
| USDC, contrato (SAC) | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` | [Stellar Docs](https://developers.stellar.org/docs/build/agentic-payments/x402/index#mainnet-usdc) |
| XLM, contrato (SAC) | `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA` | Derivado con stellar-cli (abajo) |

- La Stellar Development Foundation no da un RPC público para mainnet ([Stellar Docs](https://developers.stellar.org/docs/learn/fundamentals/stellar-stack#rpc)).
- `mainnet.sorobanrpc.com` sirve para empezar. Para producción conviene un proveedor con acuerdo de servicio, de la misma lista: Gateway, Nodies, OnFinality, Lightsail, Ankr y otros.
- Con la variable `RPC=…` se usa otro.

No hace falta creerle a una dirección copiada: los SAC se derivan del activo, sin cuenta y sin gastar.

```bash
stellar contract id asset --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN \
  --rpc-url https://mainnet.sorobanrpc.com --network-passphrase "Public Global Stellar Network ; September 2015"
# CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75
stellar contract id asset --asset native \
  --rpc-url https://mainnet.sorobanrpc.com --network-passphrase "Public Global Stellar Network ; September 2015"
# CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
```

## Cuánto cuesta (estimado)

| Paso | Testnet (medido) | Mainnet (estimado) |
|---|---|---|
| Subir el wasm (26 KB) | 3,07 XLM | **30,75 XLM** (simulado en mainnet) |
| Desplegar | 0,005 XLM | ~0,1 XLM |
| Precios en XLM | 0,12 XLM | ~1,3 XLM |
| Precios en USDC | 0,04 XLM | ~0,5 XLM |
| Exponer (comisión) | 0,14 XLM | ~1,4 XLM |
| Continuar (comisión) | 0,22 XLM | ~2,2 XLM |
| Cobrar | 0,001 XLM | ~0,01 XLM |
| **Total** | **~3,6 XLM** | **~36 XLM** |

- La subida es el único paso que se pudo simular en mainnet antes de desplegar. Subir los mismos 26 KB cuesta 3,07 XLM en testnet y 30,75 XLM en mainnet, porque en mainnet guardar datos sale unas 10 veces más.
- Los otros pasos se estimaron con lo medido en testnet multiplicado por 10, para quedar del lado seguro.
- Los precios de la prueba (0,05 + 0,02 XLM) vuelven a la misma cuenta cuando admin, tesoro y artista son la misma.
- **Conviene tener 40 XLM** en la cuenta, más la reserva mínima de la red (1 XLM por cuenta y 0,5 XLM por cada activo aceptado, como USDC).
- Las comisiones cambian con el uso de la red: el script muestra el costo antes de cada paso, y la simulación da el número del momento.

## Pasos

Todo se corre en WSL, desde la carpeta del repo.

```bash
cd /mnt/c/Users/Usuario/Documents/umbral
export ADMIN=G...   # la dirección PÚBLICA de umbral-main (se ve con: stellar keys address umbral-main)
```

1. **Simular** (no envía nada, no usa la clave):
   ```bash
   SIMULAR=1 RED=mainnet ./contrato/mainnet.sh
   ```
   Dice si la subida se puede armar y cuánto cuesta.
2. **Desplegar y probar** (pide `MAINNET` y después `SI` en cada paso):
   ```bash
   RED=mainnet ./contrato/mainnet.sh
   ```
   Al final imprime el contrato y el enlace a la cuenta en Stellar Expert. El registro queda en `~/umbral-mainnet-<fecha>.log`, y solo tiene datos públicos.
3. **Si se corta a la mitad**, se sigue desde los precios sin volver a desplegar:
   ```bash
   CONTRATO=C... RED=mainnet ./contrato/mainnet.sh
   ```
4. **Simular con el contrato ya creado** (precios y exponer):
   ```bash
   SIMULAR=1 CONTRATO=C... RED=mainnet ./contrato/mainnet.sh
   ```
5. **Precios de verdad.** La prueba deja precios de centavos. Para cambiarlos, en unidades mínimas (1 XLM o 1 USDC = 10.000.000):
   ```bash
   stellar contract invoke --id C... --source-account umbral-main \
     --rpc-url https://mainnet.sorobanrpc.com --network-passphrase "Public Global Stellar Network ; September 2015" \
     -- fijar_precios --moneda CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75 \
     --precios '{"huella":"20000000","comentario":"10000000"}'    # 2 USDC exponer, 1 USDC continuar
   ```

Otras variables:
- `TESORO=G...`: adónde va la parte de UMBRAL. Por defecto, la misma cuenta.
- `PARTE_AUTOR_BPS=7000`: la parte del artista.
- `PRECIO_XLM_HUELLA` y los demás `PRECIO_…`: los precios de la prueba.
- `RPC=https://...`: otro proveedor de RPC.

## Cómo se probó

**En testnet**, con una cuenta descartable nueva, sin usar `umbral-main`. El recorrido entero salió bien, con contrato [`CCHCSYFT…FB5D`](https://stellar.expert/explorer/testnet/contract/CCHCSYFTVJMTIJGAZ3YNCPFRIKTZE2NCTP7N4IA7Q5QO4T42XCPIFB5D):
- precios en XLM y USDC;
- exponer (0,05 XLM);
- continuar (0,02 XLM: 0,014 para el artista);
- cobrar (0,014 XLM; el saldo quedó en 0).

La cuenta gastó 0,53 XLM en comisiones. La subida no se cobró porque ese código ya estaba en testnet.

**Con `SIMULAR=1`:**
- en testnet, el saldo de la cuenta no cambió;
- en mainnet, se simuló solo la subida, con una cuenta pública cualquiera como origen, sin firmar.

**Corte:** responder algo distinto de `SI` corta el script antes de enviar.

## Qué falta para que la app use mainnet (no está hecho)

- `app/src/config.ts`:
  - `RED` apunta a testnet: RPC, frase, explorador y Horizon. Hay que pasar a los de mainnet y sacar Friendbot, que no existe en mainnet.
  - `XLM_ID` y el emisor de `USDC` también son de testnet.
  - `VITE_CONTRATO_ID` y `VITE_MONEDA_ID` se cambian por variables de entorno.
- `supabase/functions/publicar` y `supabase/functions/retirar` leen la red de pruebas para confirmar los comprobantes.
- El aviso "Red de pruebas de Stellar" de la app.
- Antes de producción, la llave de administrador, que puede usar `actualizar`, pasa a varias firmas con aviso de días, o la función se quita (ver `README.md`).
