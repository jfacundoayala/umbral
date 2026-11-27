# Arquitectura de UMBRAL

## Las piezas

| Pieza | Dónde está | Qué hace | Estado |
|---|---|---|---|
| Contrato | `contrato/` | Cobra, reparte y registra cada huella en Stellar | Hecho, 51 pruebas, desplegado en la red de pruebas |
| App | `app/` | Las pantallas reales: entrar, ver la constelación, abrir, continuar, apoyar, cobrar | En construcción |
| Maqueta | `web/` | Portada y app simulada, para decidir pantallas sin gastar nada | Hecha |
| Base de datos | `supabase/esquema.sql` | Guarda textos, fotos, audios y favoritos. A la red solo va un código | Hecha y probada |
| Servidor | `supabase/functions/` | `publicar` comprueba el pago en la red; `retirar` refleja un retiro hecho en la red; `favoritos` comprueba la firma | Hecho y probado |
| Documentos | `SPEC.md`, `README.md`, `docs/` | Fuente de la verdad, presentación, evidencia, cuidado | Al día |

## Carpetas

```
SPEC.md            Fuente de la verdad. Manda sobre todo lo demás.
README.md          Presentación para el jurado. Sale del SPEC.
contrato/          Contrato en Rust (Soroban) y sus pruebas.
app/               App en React + Vite + TypeScript.
  src/config.ts      Red, contrato y moneda. Nada secreto.
  src/billetera.ts   Ingreso con Stellar Wallets Kit.
  src/umbral.ts      Acciones: dejar, continuar, apoyar, cobrar, saldo.
  src/contrato/      Cliente generado desde el contrato. No se edita a mano.
supabase/          Esquema de la base y funciones del servidor.
web/               Portada y maqueta navegable.
docs/              Transacciones, cuidado de las personas, arquitectura e identidad.
```

## Qué pasa cuando alguien continúa una huella

1. La persona entra: elige su billetera en la ventana de Stellar Wallets Kit.
2. Escribe su huella. La app arma un documento (texto, nombre, fecha y un texto al azar) y calcula su código.
3. La app guarda el documento como borrador invisible. Si el texto tiene una palabra bloqueada, se frena acá, antes de cobrar.
4. La app le pide al contrato que simule la acción, y muestra cuánto cuesta.
5. La persona firma con su billetera.
6. El contrato cobra 1 USDC, anota la parte del artista, manda el resto a UMBRAL y registra la huella.
7. La app manda el comprobante a la función `publicar`, que lee la huella en el contrato, confirma que el comprobante es suyo y que el contenido da el mismo código, y recién ahí la publica.
8. La constelación se vuelve a dibujar con la huella nueva.

## Reglas de diseño

- Las pantallas no saben de billeteras ni de contratos: solo llaman a las funciones de `umbral.ts`.
- Cualquier forma de ingreso sirve si da una cuenta y una función para firmar.
- El cliente del contrato se genera desde el contrato compilado. Si cambia el contrato, se vuelve a generar.
- Ningún secreto vive en la app ni en el repositorio.

## Qué usamos de Stellar

| Componente | Para qué |
|---|---|
| Soroban (soroban-sdk 30) | El contrato |
| Contrato de activo de Stellar (USDC, XLM) | Los pagos |
| Stellar Wallets Kit | El ingreso y la firma |
| SDK de JavaScript de Stellar | Armar, simular y mandar cada pedido |
| Stellar CLI | Compilar, generar el cliente y desplegar |
| Stellar Expert | El comprobante público de cada acción |
| Raven | Buscar proyectos parecidos y auditar la propuesta |
