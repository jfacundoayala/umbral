#!/usr/bin/env bash
# Despliega el contrato de UMBRAL en una red de Stellar (mainnet o testnet), fija precios en XLM y USDC
# y deja una prueba chica: 1 exponer, 1 continuar y 1 cobrar, con centavos.
#
# Guía completa: docs/mainnet.md. Se corre en WSL, desde la carpeta del repo:
#   SIMULAR=1 RED=mainnet ADMIN=G... ./contrato/mainnet.sh   # primero: simula, no envía nada
#   RED=mainnet ADMIN=G... ./contrato/mainnet.sh             # después: frena y pide SI antes de cada paso que gasta
#
# La clave nunca se lee, se imprime ni se copia: el script solo le pasa su alias a stellar-cli (--source-account)
# para que firme. ADMIN es la dirección PÚBLICA (G...) de esa cuenta.
set -euo pipefail

RED="${RED:-testnet}"                  # mainnet | testnet
CLAVE="${CLAVE:-umbral-main}"          # alias de stellar-cli que firma
ADMIN="${ADMIN:?Falta ADMIN: la dirección pública (G...) de la cuenta $CLAVE}"
TESORO="${TESORO:-$ADMIN}"             # adónde va la parte de UMBRAL
PARTE_AUTOR_BPS="${PARTE_AUTOR_BPS:-7000}"   # 70% para el artista
SIMULAR="${SIMULAR:-0}"                # 1 = simula todo y no envía nada
CONTRATO="${CONTRATO:-}"               # si ya se desplegó, se saltean subir y desplegar
CONFIRMAR_TODO="${CONFIRMAR_TODO:-0}"  # solo para probar en testnet sin preguntar

# Precios en la unidad mínima de cada moneda (7 decimales: 1 XLM = 10.000.000).
# Por defecto, centavos para la prueba. Los precios de verdad se fijan después (ver docs/mainnet.md).
PRECIO_XLM_HUELLA="${PRECIO_XLM_HUELLA:-500000}"       # 0,05 XLM
PRECIO_XLM_COMENTARIO="${PRECIO_XLM_COMENTARIO:-200000}" # 0,02 XLM
PRECIO_USDC_HUELLA="${PRECIO_USDC_HUELLA:-500000}"     # 0,05 USDC
PRECIO_USDC_COMENTARIO="${PRECIO_USDC_COMENTARIO:-200000}" # 0,02 USDC

# El mismo código que está en testnet (CBPXN2SA…V3TP), compilado con Rust 1.100.0. No se recompila acá.
CARPETA="$(cd "$(dirname "$0")" && pwd)"
WASM="${WASM:-$CARPETA/target/wasm32v1-none/release/umbral.wasm}"
WASM_ESPERADO="54c8d2b3d1288b105831c4725d80018458b09cfe02c7b6f3fa59da9a0768a105"

case "$RED" in
  mainnet)
    FRASE="Public Global Stellar Network ; September 2015"
    RPC="${RPC:-https://mainnet.sorobanrpc.com}"
    XLM_SAC="CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA"
    USDC_SAC="CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75"
    EXPLORADOR="https://stellar.expert/explorer/public"
    # Comisiones: la subida, simulada en mainnet el 27/11/2026; el resto, medido en testnet x10
    # (en mainnet escribir datos cuesta ~10 veces más: la misma subida da 3,07 XLM en testnet y 30,75 en mainnet).
    C_SUBIR="~31 XLM"; C_DESPLEGAR="~0,1 XLM"; C_PRECIOS="~1,3 XLM"; C_PRECIOS2="~0,5 XLM"
    C_EXPONER="~1,4 XLM"; C_CONTINUAR="~2,2 XLM"; C_COBRAR="~0,01 XLM"
    ;;
  testnet)
    FRASE="Test SDF Network ; September 2015"
    RPC="${RPC:-https://soroban-testnet.stellar.org}"
    XLM_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
    USDC_SAC="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
    EXPLORADOR="https://stellar.expert/explorer/testnet"
    # Comisiones medidas en testnet el 27/11/2026.
    C_SUBIR="~3,1 XLM (0 si ese código ya está subido)"; C_DESPLEGAR="~0,006 XLM"; C_PRECIOS="~0,13 XLM"; C_PRECIOS2="~0,05 XLM"
    C_EXPONER="~0,14 XLM"; C_CONTINUAR="~0,22 XLM"; C_COBRAR="~0,001 XLM"
    ;;
  *) echo "RED tiene que ser mainnet o testnet." >&2; exit 1 ;;
esac
EN_RED=(--rpc-url "$RPC" --network-passphrase "$FRASE")
LOG="${LOG:-$HOME/umbral-$RED-$(date +%Y%m%d-%H%M%S).log}"

if [ "$CONFIRMAR_TODO" = 1 ] && [ "$RED" != testnet ]; then
  echo "CONFIRMAR_TODO solo vale en testnet. En mainnet se confirma paso por paso." >&2; exit 1
fi

decir() { echo "$*" | tee -a "$LOG"; }

# Antes de cada paso que gasta: dice qué hace y cuánto cuesta, y espera un SI escrito.
confirmar() {
  decir ""
  decir "== $1"
  decir "   Costo estimado: $2"
  if [ "$SIMULAR" = 1 ]; then decir "   (simulación: no se firma ni se envía nada)"; return 0; fi
  if [ "$CONFIRMAR_TODO" = 1 ]; then decir "   (testnet, confirmado de antemano)"; return 0; fi
  local r
  read -r -p "   Escribí SI para hacerlo (cualquier otra cosa corta acá): " r </dev/tty
  if [ "$r" != "SI" ]; then decir "Cortado antes de: $1. No se envió nada en este paso."; exit 1; fi
}

# Firma con el alias, o simula con la dirección pública (sin clave).
quien() { if [ "$SIMULAR" = 1 ]; then echo "$ADMIN"; else echo "$CLAVE"; fi; }
enviar() { if [ "$SIMULAR" = 1 ]; then echo "--send=no"; else echo "--send=yes"; fi; }

invocar() { # invocar <función> [args...]
  stellar contract invoke --id "$CONTRATO" --source-account "$(quien)" "${EN_RED[@]}" "$(enviar)" -- "$@" 2> >(tee -a "$LOG" >&2) | tee -a "$LOG"
}
leer() { # leer <función> [args...]: solo lectura, nunca se envía
  stellar contract invoke --id "$CONTRATO" --source-account "$ADMIN" "${EN_RED[@]}" --send=no -- "$@" 2>>"$LOG"
}
codigo() { od -An -tx1 -N32 /dev/urandom | tr -d ' \n'; }

decir "UMBRAL en $RED · RPC $RPC · admin $ADMIN · tesoro $TESORO · registro en $LOG"
[ "$SIMULAR" = 1 ] && decir "MODO SIMULACIÓN: no se envía ninguna transacción."

# 0. Controles que no gastan
command -v stellar >/dev/null || { echo "Falta stellar-cli." >&2; exit 1; }
HASH_LOCAL="$(sha256sum "$WASM" | cut -d' ' -f1)"
if [ "$HASH_LOCAL" != "$WASM_ESPERADO" ]; then
  echo "El wasm no es el desplegado en testnet ($HASH_LOCAL). No sigo: compilá con Rust 1.100.0 el commit desplegado." >&2; exit 1
fi
decir "Wasm verificado: $HASH_LOCAL ($(stat -c %s "$WASM") bytes)."
if [ "$RED" = mainnet ] && [ "$SIMULAR" != 1 ]; then
  read -r -p "Esto gasta XLM de verdad en MAINNET. Escribí MAINNET para empezar: " r </dev/tty
  [ "$r" = "MAINNET" ] || { echo "Cortado. No se envió nada."; exit 1; }
fi

# 1. Subir el código
if [ -z "$CONTRATO" ]; then
  confirmar "Subir el wasm (26 KB) a $RED" "$C_SUBIR"
  if [ "$SIMULAR" = 1 ]; then
    stellar contract upload --wasm "$WASM" --source-account "$ADMIN" "${EN_RED[@]}" --build-only >/dev/null 2>>"$LOG" \
      && decir "   Simulado: la subida se puede armar." || decir "   La simulación de la subida falló (ver $LOG)."
    decir "   El despliegue y los pasos siguientes se simulan con CONTRATO=… una vez desplegado."
    exit 0
  fi
  HASH_RED="$(stellar contract upload --wasm "$WASM" --source-account "$CLAVE" "${EN_RED[@]}" 2> >(tee -a "$LOG" >&2))"
  decir "   Código en la red: $HASH_RED"

  # 2. Crear el contrato con su administrador, tesoro y parte del artista
  confirmar "Desplegar el contrato (admin $ADMIN, tesoro $TESORO, artista $PARTE_AUTOR_BPS bps)" "$C_DESPLEGAR"
  CONTRATO="$(stellar contract deploy --wasm-hash "$HASH_RED" --source-account "$CLAVE" "${EN_RED[@]}" \
    -- --admin "$ADMIN" --tesoro "$TESORO" --parte_autor_bps "$PARTE_AUTOR_BPS" 2> >(tee -a "$LOG" >&2))"
  decir "   Contrato: $CONTRATO · $EXPLORADOR/contract/$CONTRATO"
fi

# 3. Precios en XLM y USDC
confirmar "Fijar precios en XLM: exponer $PRECIO_XLM_HUELLA, continuar $PRECIO_XLM_COMENTARIO (unidades mínimas)" "$C_PRECIOS"
invocar fijar_precios --moneda "$XLM_SAC" --precios "{\"huella\":\"$PRECIO_XLM_HUELLA\",\"comentario\":\"$PRECIO_XLM_COMENTARIO\"}"
confirmar "Fijar precios en USDC: exponer $PRECIO_USDC_HUELLA, continuar $PRECIO_USDC_COMENTARIO (unidades mínimas)" "$C_PRECIOS2"
invocar fijar_precios --moneda "$USDC_SAC" --precios "{\"huella\":\"$PRECIO_USDC_HUELLA\",\"comentario\":\"$PRECIO_USDC_COMENTARIO\"}"

# 4. Prueba chica en XLM: exponer, continuar y cobrar. Los códigos son al azar: no hay texto ni foto detrás.
D_OBRA="$(codigo)"; D_HUELLA="$(codigo)"
confirmar "Exponer una obra de prueba (paga $PRECIO_XLM_HUELLA en XLM al tesoro)" "el precio + $C_EXPONER de comisión"
invocar dejar_huella --autor "$ADMIN" --digest "$D_OBRA" --admite_respuestas true --moneda "$XLM_SAC" --precio_max "$PRECIO_XLM_HUELLA"
ID_OBRA="$(leer id_de --autor "$ADMIN" --digest "$D_OBRA" | tr -d '"')"
decir "   Obra: $ID_OBRA"
if [ "$SIMULAR" = 1 ]; then
  decir "   Continuar y cobrar necesitan que esa obra exista de verdad: en simulación terminan acá."
  exit 0
fi

confirmar "Continuar la obra (paga $PRECIO_XLM_COMENTARIO en XLM: 70% queda para el artista)" "el precio + $C_CONTINUAR de comisión"
invocar comentar --autor "$ADMIN" --digest "$D_HUELLA" --padre "$ID_OBRA" --admite_respuestas true --moneda "$XLM_SAC" --precio_max "$PRECIO_XLM_COMENTARIO"
decir "   Saldo del artista: $(leer saldo --autor "$ADMIN" --moneda "$XLM_SAC")"

confirmar "Cobrar el saldo del artista en XLM" "$C_COBRAR"
invocar cobrar --autor "$ADMIN" --moneda "$XLM_SAC"
decir "   Saldo después de cobrar: $(leer saldo --autor "$ADMIN" --moneda "$XLM_SAC")"

decir ""
decir "Listo. Contrato $CONTRATO en $RED. Movimientos de la cuenta: $EXPLORADOR/account/$ADMIN"
