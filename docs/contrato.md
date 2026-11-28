# El contrato

Contrato en Soroban (soroban-sdk 30), en `contrato/contracts/umbral/src/lib.rs`. Desplegado en la red de pruebas: [`CBPXN2SA…V3TP`](https://stellar.expert/explorer/testnet/contract/CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP).

## Funciones y quién puede llamarlas

| Función | Quién firma | Qué hace |
|---|---|---|
| `dejar_huella` | Quien expone la obra | Expone una obra. El precio va entero a umbral. Si es una visita invitada por una sala, paga el fondo de la sala. |
| `comentar` | Quien continúa | Continúa una huella. El 80% queda a nombre del artista que expuso la obra y el 20% va a umbral. Durante una muestra aceptada por el artista, umbral recibe el 30%, la sala su parte y el artista el resto, nunca menos del 30%. |
| `apoyar` | Quien apoya | Apoyo de monto libre: 80% para el artista, 20% para umbral. |
| `cobrar` | El artista | Retira todo su saldo en una moneda. |
| `retirar` | Quien escribió la huella | La marca como retirada. |
| `renovar`, `renovar_saldo`, `renovar_fondo`, `renovar_sala`, `renovar_acuerdo` | Cualquiera | Extienden la vigencia de una huella, de un saldo sin cobrar, de un fondo, de una sala o del acuerdo de un artista con una muestra. |
| `abrir_sala` | El museo | Registra una sala a su nombre. El identificador lo calcula el contrato con la cuenta del museo y una semilla (`id_sala`), así nadie puede ocupar el de otro. Lo devuelve. |
| `patrocinar` | Quien aporta | Carga fondos en una sala. No se devuelven a quien patrocinó. |
| `retirar_fondo` | El museo de la sala | Retira lo que no se usó del fondo. Va al museo. |
| `invitar` | El museo de la sala | Invita a una cuenta. La invitación se usa una sola vez. |
| `abrir_muestra` | El administrador | Abre la muestra de una sala: fechas (hasta 180 días; empieza como mucho 1 día antes y 365 días después de hoy) y parte de la sala (0% a 40%). Una sala no puede tener dos muestras a la vez. |
| `cerrar_muestra` | El museo de la sala o el administrador | Cierra la muestra antes de su fecha. |
| `aceptar_muestra` | El artista | Acepta el reparto de esa muestra: firma las fechas y la parte de la sala que vio. Sin esta firma, su obra queda afuera. Si se abre otra muestra, aunque empiece el mismo día, tiene que firmar de nuevo. |
| `fijar_precios` | El administrador | Precios por moneda. Valen hacia adelante. Sin plazo de aviso: quien paga está cubierto por `precio_max`. |
| `quitar_moneda` | El administrador | Deja de aceptar una moneda para pagos nuevos. Los saldos y fondos ya guardados se siguen cobrando y retirando. |
| `moderar` | El administrador | Retira una huella por moderación. Queda dicho que fue por moderación. |
| `proponer_parte_autor` / `aplicar_parte_autor` | El administrador | Cambia la parte del artista, en dos pasos. Nunca menos del 30%. Los saldos ya anotados no cambian. |
| `proponer_actualizacion` / `aplicar_actualizacion` | El administrador | Cambia el código del contrato por uno ya subido a la red, en dos pasos, sin perder huellas, saldos ni fondos. |
| `proponer_tesoro` / `aplicar_tesoro` | El administrador | Cambia la cuenta que recibe la parte de umbral, en dos pasos. |
| `proponer_admin` / `aplicar_admin` | Propone el administrador; aplica el nuevo | Pasa el contrato a otra cuenta (por ejemplo, una de varias firmas). Lo firma la cuenta nueva, para no entregarlo a una que nadie controla. Borra las demás propuestas pendientes. |
| `cancelar_propuesta` | El administrador | Cancela una propuesta pendiente. |
| `obtener`, `saldo`, `precios`, `id_de`, `id_sala`, `invitada`, `museo_de`, `muestra`, `acepto_muestra`, `fondo`, `parte_autor`, `tesoro`, `administrador`, `plazo_aviso`, `propuesta` | Nadie (lectura) | Consultas. |

**Cambios en dos pasos.** Los cuatro cambios sensibles (parte del artista, código, tesoro y administrador) no se aplican al momento: primero se proponen, y queda publicado qué cambia y desde cuándo. Recién se pueden aplicar cuando pasa el plazo de aviso, que se fija al desplegar (entre 1 hora y 90 días) y se lee con `plazo_aviso`. Una propuesta que no se aplica vence a los 14 días. Cualquiera puede ver la propuesta pendiente con `propuesta`.

Toda acción que cobra lleva `precio_max`: si el precio subió por encima de lo que aceptó quien firma, la acción falla en vez de cobrar de más.

## Almacenamiento y vigencia

- **Instance:** administrador, tesoro, parte del artista, plazo de aviso, propuestas pendientes y precios por moneda.
- **Persistent:** huellas, salas, muestras, acuerdos de artistas, fondos, invitaciones y saldos.
- **Vigencia (TTL):** 120 días. Se renueva sola en cada acción que toca el dato, y cualquiera puede renovar una huella con `renovar`.
- **Qué se guarda de cada huella:** autor, artista que expuso la obra, código del contenido (32 bytes), huella de la que nace, obra con la que empezó la cadena, sala, si la pagó el fondo de una sala por invitación (encuentro en persona), si admite respuestas y si está activa. Si la obra raíz se retira, toda su cadena deja de admitir continuaciones y apoyos. El contenido (textos, fotos, audios) no va a la red.
- **Saldos:** los artistas acumulan su parte y la retiran juntos, para no hacer una transferencia por cada pago.

## Eventos

`Creado`, `HuellaDejada`, `HuellaApoyada`, `HuellaRetirada`, `Cobro`, `SaldoAcreditado`, `SalaAbierta`, `SalaPatrocinada`, `VisitanteInvitado`, `FondoUsado`, `FondoRetirado`, `MuestraAbierta`, `MuestraCerrada`, `MuestraAceptada`, `PreciosFijados`, `MonedaQuitada`, `CambioPropuesto`, `CambioAplicado` y `PropuestaCancelada`.

El servidor usa `HuellaDejada` para confirmar que un comprobante es el de esa huella antes de publicarla.

## Pruebas

56 pruebas automáticas (`cd contrato && cargo test`). Cubren repartos, piso del artista, muestras y firmas, invitaciones y fondos, montos absurdos, precios que suben, unidades que no se pierden y vigencia.

## Compilar igual que lo desplegado

`contrato/rust-toolchain.toml` fija Rust 1.100.0. Con esa versión, `stellar contract build` da el mismo código que está en la red desde el 28/11: `54c8d2b3…a105` (26.204 bytes). Antes del reparto 80/20 era `276f4d85…0fc7`. El contrato anterior, `CCFQDRBG…W4N66`, daba `ccc8f647…c8773` con esa misma versión.
