# Demo para el jurado

Video de 2 minutos, con la voz de Facundo y sin música. Se graba sobre la app, conectada a la red de pruebas de Stellar: los fondos son de prueba y no tienen valor real.

Antes de grabar:

- Una cuenta de artista y una del público, las dos con XLM de prueba. Moneda elegida en la app: XLM.
- La obra de la demo lista para exponer: título, descripción y foto. Si es una escultura de Resistencia, con permiso de su escultor: en Argentina una obra en la calle sigue teniendo autor.
- Una pestaña con Stellar Expert para el cierre.
- La placa con QR de una obra de muestra (impresa o en otra pantalla) y un celular para escanearla.

## Guion

| Minuto | Qué se ve | Qué se dice |
|---|---|---|
| 0:00 a 0:10 | Portada: el nombre, "Más allá de lo tangible." y la constelación | "umbral es un museo vivo: los artistas exponen obras y el público las continúa con palabras." |
| 0:10 a 0:30 | Con el celular se escanea la placa con QR de una obra de muestra (sin fotos de esculturas reales). Se abre la ficha: arriba el título y la miniatura, el aviso "✓ Placa firmada por la cuenta que expuso esta obra" y debajo la constelación | "En Resistencia hay más de 650 esculturas en la calle. El escultor cobra una vez, cuando la hace, y nunca más sabe qué despierta su obra ni recibe nada por ella." |
| 0:30 a 0:50 | La artista entra con su billetera, va a "Exponer una obra", completa título, descripción y foto. Se ve el precio, 20 XLM. Firma | "La artista expone su obra. Ve el precio antes de firmar y la obra queda registrada a su nombre en Stellar." |
| 0:50 a 1:15 | Otra persona escribe lo que la obra le despertó. Se ve el aviso del 70%. Firma y aparece un punto nuevo. Después apoya con 5 XLM | "Alguien del público deja su huella: paga 10 XLM y el 70% es para la artista. Quien escribe no cobra. También puede apoyar con lo que quiera: 5 XLM." |
| 1:15 a 1:35 | La artista entra a "Cobrar": saldo **10,5 XLM**. Toca "Retirar XLM" y queda en 0 | "70% de 10 son 7, y 70% de 5 son 3,5. La artista cobra 10,5 XLM cuando quiere, sin pedirle permiso a nadie." |
| 1:35 a 1:45 | "Ver el comprobante en Stellar Expert" abre la transacción | "No hace falta creernos: cada huella, cada apoyo y cada cobro tiene su comprobante público en Stellar." |
| 1:45 a 1:52 | En la puerta de la sala: la visitante muestra "Mi código para el encuentro", la sala lo escanea en "Invitar en la puerta" y sale "Invitada". Corte a su obra con el sello (el aro de puntos) | "La sala escanea en la puerta el código de quien está ahí. Su fondo paga la obra y queda el sello Estuve ahí: no se consigue desde la casa." |
| 1:52 a 2:00 | La constelación con las huellas de las pruebas | "Lo probaron [N] personas de afuera del equipo. [Lo que más dijeron.] umbral: lo que la obra despierta, la obra lo cobra." |

Prueba hecha el 27/11/2026 con la app, en la red de pruebas, sobre el contrato actual (`CBPXN2SA…V3TP`), con estos mismos montos. La artista tenía 10,5 XLM para cobrar y después del retiro quedó en 0. Comprobantes:

- Exponer la obra: [62cc4bbc…](https://stellar.expert/explorer/testnet/tx/62cc4bbcc5e52bfb53544c2991ab0cec1b79ec6f07805039a5cb5a1a586da460)
- Continuar: [8e925f15…](https://stellar.expert/explorer/testnet/tx/8e925f15a5be66343e18cfa5b2a8a8d4fb713a3cbd788f5e9ffaadd49095eadc)
- Apoyar con 5 XLM: [16c5e098…](https://stellar.expert/explorer/testnet/tx/16c5e098953a7d7bd21db7bc70142dc052cd7aa290c6609443b9086e64007da6)
- La artista cobra: [a6400840…](https://stellar.expert/explorer/testnet/tx/a64008402fd261eb064b095d8d511f54c38c0fe361f58853bc1d93eba93ec497)

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
Puede fijar los precios, ajustar la parte del artista y retirar una huella por moderación. Con las reglas actuales no puede tocar el saldo de un artista ni cobrar en su nombre, y no puede bajar la parte del artista por debajo del 30% de cada continuación: ese piso está escrito en el contrato. Una moderación no borra el registro: queda dicho que fue por moderación. Lo que sí puede es actualizar el código del contrato (`actualizar`), y un código nuevo podría cambiar esas reglas. En la red de pruebas lo dejamos para corregir errores; antes de producción esa llave pasa a varias firmas con aviso de días, o la función se quita.

**¿Y el contenido ofensivo?**
Tres capas. Antes de pagar, un filtro frena insultos de odio y amenazas en las respuestas del público: si el texto no pasa, no se llega a pagar. Después, el autor puede retirar su huella y el administrador puede moderar. Al retirar, el texto y las fotos se borran de la base; en la red queda solo un código que ya no se puede vincular con nada. El filtro es solo para el público: las obras de los artistas no se filtran, las revisa una persona.

**¿Por qué el museo se puede llevar hasta 40%?**
Es un tope, no un precio fijo. Solo pasa cuando un museo hace una muestra con fecha (como máximo 90 días). La parte del museo sale de la del artista, y el artista tiene que aceptarla firmando, viendo el porcentaje. En la prueba que hicimos la sala se llevó 20%. Fuera de la muestra, vuelve el reparto de siempre: 70% artista, 30% UMBRAL.

**¿Cuánto cuesta y cómo escala?**
Las comisiones de la red son mínimas: en nuestras pruebas, entre 0,001 y 0,2 XLM por acción (la más cara es continuar, porque guarda un registro nuevo). Mirar y guardar favoritos es gratis y no toca la red. Los textos y las fotos viven en una base de datos común y la red guarda solo códigos, así que no crece el costo con el tamaño del contenido. Para más volumen se suman servidores de lectura; el contrato no cambia.
