# Demo para el jurado

Video de 2 minutos, con la voz de Facundo y sin música. Se graba sobre la app, conectada a la red de pruebas de Stellar: los fondos son de prueba y no tienen valor real.

Antes de grabar:

- Una cuenta de artista y una del público, las dos con XLM de prueba. Moneda elegida en la app: XLM.
- La obra de la demo lista para exponer: título, descripción y foto. Si es una escultura de Resistencia, con permiso de su escultor: en Argentina una obra en la calle sigue teniendo autor.
- Una pestaña con Stellar Expert para el cierre.

## Guion

| Minuto | Qué se ve | Qué se dice |
|---|---|---|
| 0:00 a 0:10 | Portada: el nombre, "Más allá de lo tangible." y la constelación | "umbral es un museo vivo: los artistas exponen obras y el público las continúa con palabras." |
| 0:10 a 0:30 | La ficha de una escultura de Resistencia en la app | "En Resistencia hay más de 650 esculturas en la calle. El escultor cobra una vez, cuando la hace, y nunca más sabe qué despierta su obra ni recibe nada por ella." |
| 0:30 a 0:50 | La artista entra con su billetera, va a "Exponer una obra", completa título, descripción y foto. Se ve el precio, 20 XLM. Firma | "La artista expone su obra. Ve el precio antes de firmar y la obra queda registrada a su nombre en Stellar." |
| 0:50 a 1:15 | Otra persona escribe lo que la obra le despertó. Se ve el aviso del 70%. Firma y aparece un punto nuevo. Después apoya con 5 XLM | "Alguien del público deja su huella: paga 10 XLM y el 70% es para la artista. Quien escribe no cobra. También puede apoyar con lo que quiera: 5 XLM." |
| 1:15 a 1:35 | La artista entra a "Cobrar": saldo **10,5 XLM**. Toca "Retirar XLM" y queda en 0 | "70% de 10 son 7, y 70% de 5 son 3,5. La artista cobra 10,5 XLM cuando quiere, sin pedirle permiso a nadie." |
| 1:35 a 1:50 | "Ver el comprobante en Stellar Expert" abre la transacción | "No hace falta creernos: cada huella, cada apoyo y cada cobro tiene su comprobante público en Stellar." |
| 1:50 a 2:00 | La constelación con las huellas de las pruebas | "Lo probaron [N] personas de afuera del equipo. [Lo que más dijeron.] umbral: lo que la obra despierta, la obra lo cobra." |

Prueba hecha el 27/11/2026 con la app, en la red de pruebas, con estos mismos montos. La artista tenía 10,5 XLM para cobrar y después del retiro quedó en 0. Comprobantes:

- Exponer la obra: [33b9741b…](https://stellar.expert/explorer/testnet/tx/33b9741b3b0eef86859fd5d8310552a7f4cc2178c4f0b168beb5f275d6296792)
- Continuar: [866a6d51…](https://stellar.expert/explorer/testnet/tx/866a6d51f51cf66528b82739745cd7d5699a935860f355bd610b7e593bb582d9)
- Apoyar con 5 XLM: [460732b2…](https://stellar.expert/explorer/testnet/tx/460732b263c61c6c53f979b03afe8390f098e719b33fec85a3f2629c2c2f8dd1)
- La artista cobra: [1c41f69e…](https://stellar.expert/explorer/testnet/tx/1c41f69ebd315df4c3e9558db92dee056659a4203ea9d09e72357d5456a20ff1)

## Plan B: si la red falla en vivo

1. No se improvisa. Se dice: "La red de pruebas está lenta; les mostramos las transacciones que ya hicimos."
2. Se abre `docs/txs.md` y se recorre la misma historia con transacciones ya hechas, con su comprobante:
   - Ana expone la obra: 2 USDC.
   - Beto la continúa y Caro continúa la respuesta de Beto: 1 USDC cada uno. Beto no cobra.
   - Beto apoya: 1 USDC.
   - Ana cobra **2,10 USDC** (0,70 + 0,70 + 0,70) y su saldo queda en 0.
3. Se cierra igual: un comprobante abierto en Stellar Expert.
4. Si no hay internet, se muestran las capturas de la app y la tabla de `docs/txs.md` impresa.

## Las 6 preguntas más difíciles

**¿Por qué blockchain? ¿No alcanza con una base de datos?**
Por el cobro y la prueba. La parte de la artista queda guardada en el contrato a su nombre, y la cobra ella sola, cuando quiere; UMBRAL no puede quedársela ni demorarla. Además, cada huella tiene un comprobante público que nadie puede editar. El contenido (textos y fotos) no está en la red: en la red queda solo su huella digital (un código), y así se puede borrar el contenido sin romper el registro.

**¿Qué pasa si el público también quiere cobrar?**
No cobra, a propósito. Quien continúa paga por ser parte de la obra, como una entrada. Si el público cobrara, se llenaría de respuestas hechas para ganar dinero. En toda la cadena de respuestas cobra solo quien expuso la obra.

**¿Qué controla el administrador?**
Puede fijar los precios, ajustar la parte del artista y retirar una huella por moderación. No puede tocar el saldo de un artista ni cobrar en su nombre, y no puede bajar la parte del artista por debajo del 30% de cada continuación: ese piso está escrito en el contrato. Una moderación no borra el registro: queda dicho que fue por moderación.

**¿Y el contenido ofensivo?**
Tres capas. Antes de pagar, un filtro frena insultos de odio y amenazas en las respuestas del público: si el texto no pasa, no se llega a pagar. Después, el autor puede retirar su huella y el administrador puede moderar. Al retirar, el texto y las fotos se borran de la base; en la red queda solo un código que ya no se puede vincular con nada. El filtro es solo para el público: las obras de los artistas no se filtran, las revisa una persona.

> Para el equipo: el filtro ya está en la base, pero la lista de palabras todavía no se cargó. Cargarla antes de grabar.

**¿Por qué el museo se puede llevar hasta 40%?**
Es un tope, no un precio fijo. Solo pasa cuando un museo hace una muestra con fecha (como máximo 90 días). La parte del museo sale de la del artista, y el artista tiene que aceptarla firmando, viendo el porcentaje. En la prueba que hicimos la sala se llevó 20%. Fuera de la muestra, vuelve el reparto de siempre: 70% artista, 30% UMBRAL.

**¿Cuánto cuesta y cómo escala?**
Las comisiones de la red son mínimas: en nuestras pruebas, entre 0,001 y 0,2 XLM por acción (la más cara es continuar, porque guarda un registro nuevo). Mirar y guardar favoritos es gratis y no toca la red. Los textos y las fotos viven en una base de datos común y la red guarda solo códigos, así que no crece el costo con el tamaño del contenido. Para más volumen se suman servidores de lectura; el contrato no cambia.
