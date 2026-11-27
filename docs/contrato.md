# El contrato

Contrato en Soroban (soroban-sdk 30), en `contrato/contracts/umbral/src/lib.rs`. Desplegado en la red de pruebas: [`CCFQDRBG…W4N66`](https://stellar.expert/explorer/testnet/contract/CCFQDRBGXVE4EIXZMBKA4GXXJV3BV6IZNSNXLPJHTDKEGN3SYYIW4N66).

## Funciones y quién puede llamarlas

| Función | Quién firma | Qué hace |
|---|---|---|
| `dejar_huella` | Quien expone la obra | Expone una obra. El precio va entero a umbral. Si es una visita invitada por una sala, paga el fondo de la sala. |
| `comentar` | Quien continúa | Continúa una huella. El 70% queda a nombre del artista que expuso la obra y el 30% va a umbral. Durante una muestra aceptada por el artista, la sala recibe su parte de lo del artista. |
| `apoyar` | Quien apoya | Apoyo de monto libre: 70% para el artista, 30% para umbral. |
| `cobrar` | El artista | Retira todo su saldo en una moneda. |
| `retirar` | Quien escribió la huella | La marca como retirada. |
| `renovar` | Cualquiera | Extiende la vigencia de una huella. |
| `abrir_sala` | El museo | Registra una sala a su nombre. |
| `patrocinar` | Quien aporta | Carga fondos en una sala. No se devuelven a quien patrocinó. |
| `retirar_fondo` | El museo de la sala | Retira lo que no se usó del fondo. Va al museo. |
| `invitar` | El museo de la sala | Invita a una cuenta. La invitación se usa una sola vez. |
| `abrir_muestra` | El administrador | Abre la muestra de una sala: fechas (hasta 90 días) y parte de la sala (0% a 40%). |
| `aceptar_muestra` | El artista | Acepta el reparto de esa muestra: firma las fechas y la parte de la sala que vio. Sin esta firma, su obra queda afuera. Si se abre otra muestra, aunque empiece el mismo día, tiene que firmar de nuevo. |
| `fijar_precios` | El administrador | Precios por moneda. Valen hacia adelante. |
| `fijar_parte_autor` | El administrador | Parte del artista. Nunca menos del 30%. |
| `moderar` | El administrador | Retira una huella por moderación. Queda dicho que fue por moderación. |
| `actualizar` | El administrador | Cambia el código del contrato por uno ya subido a la red, sin perder huellas, saldos ni fondos. |
| `obtener`, `saldo`, `precios`, `id_de`, `invitada`, `museo_de`, `muestra`, `acepto_muestra`, `fondo`, `parte_autor`, `tesoro` | Nadie (lectura) | Consultas. |

Toda acción que cobra lleva `precio_max`: si el precio subió por encima de lo que aceptó quien firma, la acción falla en vez de cobrar de más.

## Almacenamiento y vigencia

- **Instance:** administrador, tesoro, parte del artista y precios por moneda.
- **Persistent:** huellas, salas, muestras, acuerdos de artistas, fondos, invitaciones y saldos.
- **Vigencia (TTL):** 120 días. Se renueva sola en cada acción que toca el dato, y cualquiera puede renovar una huella con `renovar`.
- **Qué se guarda de cada huella:** autor, artista que expuso la obra, código del contenido (32 bytes), huella de la que nace, sala, si admite respuestas y si está activa. El contenido (textos, fotos, audios) no va a la red.
- **Saldos:** los artistas acumulan su parte y la retiran juntos, para no hacer una transferencia por cada pago.

## Eventos

`HuellaDejada`, `HuellaApoyada`, `HuellaRetirada`, `Cobro`, `SaldoAcreditado`, `SalaAbierta`, `SalaPatrocinada`, `VisitanteInvitado`, `FondoUsado`, `FondoRetirado`, `MuestraAbierta`, `MuestraAceptada`, `PreciosFijados` y `ParteAutorFijada`.

El servidor usa `HuellaDejada` para confirmar que un comprobante es el de esa huella antes de publicarla.

## Pruebas

55 pruebas automáticas (`cd contrato && cargo test`). Cubren repartos, piso del artista, muestras y firmas, invitaciones y fondos, montos absurdos, precios que suben, unidades que no se pierden y vigencia.

## Compilar igual que lo desplegado

`contrato/rust-toolchain.toml` fija Rust 1.100.0. Con esa versión, `stellar contract build` da el mismo código que está en la red (`ccc8f647…c8773` para el contrato de hoy).
