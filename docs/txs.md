# Transacciones en la red de pruebas de Stellar

Red: Stellar Testnet. El USDC y el XLM usados no tienen valor real. Fecha: 27/11/2026.

Contrato: `CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP`
[Ver el contrato en Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP)

Es el segundo contrato. El primero, `CCFQDRBGXVE4EIXZMBKA4GXXJV3BV6IZNSNXLPJHTDKEGN3SYYIW4N66`, sigue en la red con sus comprobantes, pero la app ya no lo usa. El segundo suma los arreglos de la auditoría: la firma del artista vale solo para la muestra exacta que vio, el museo puede retirar lo que no se usó del fondo y el administrador puede actualizar el código.

Monedas aceptadas:

- USDC de prueba: emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, contrato del activo `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- XLM: contrato del activo `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`.

Las cuentas (UMBRAL, tesoro, Ana, Beto, Caro y el museo) son de prueba. Compraron su USDC en el mercado de la red de pruebas.

| Acción | Quién firma | Monto | Reparto | Comprobante |
|---|---|---:|---|---|
| Instalar el código del contrato | UMBRAL | — | Código `276f4d85…0fc7` | [b84d586b…](https://stellar.expert/explorer/testnet/tx/b84d586b74837dd636bd9d76dcee533df85e18fabda0247ac3cf768648bfe3bc) |
| Desplegar el contrato | UMBRAL | — | Artista 70%, UMBRAL 30% | [829a5827…](https://stellar.expert/explorer/testnet/tx/829a5827ce40f45b104088a01a9e7e922553b64a61c09b7baa9c1cb67130820d) |
| Fijar precios en USDC | UMBRAL | 2 y 1 USDC | Exponer una obra 2; continuar 1 | [b360fade…](https://stellar.expert/explorer/testnet/tx/b360fade88df293127fd8ca72992e0056bcb17459fdac9e2f1ccc318d4905844) |
| Fijar precios en XLM | UMBRAL | 20 y 10 XLM | Exponer una obra 20; continuar 10 | [3de5b2d8…](https://stellar.expert/explorer/testnet/tx/3de5b2d879308227556ebe756c1895e9d75de58a5c2e528564c6c4aa8165aa91) |
| Exponer una obra | Ana (artista) | 2 USDC | 2 USDC para UMBRAL | [a5837533…](https://stellar.expert/explorer/testnet/tx/a58375336fb73c41f72e904125aaeacf9e408eb38e82e3bfee3512a0c3b11d43) |
| Continuar la obra | Beto | 1 USDC | 0,70 para Ana; 0,30 para UMBRAL | [faae8bd6…](https://stellar.expert/explorer/testnet/tx/faae8bd6772af654545ee66a596b9103154bb6e3e0cdb810f58865885110df47) |
| Continuar la respuesta de Beto | Caro | 1 USDC | 0,70 para Ana; 0,30 para UMBRAL. Beto no cobra | [ab1da7ac…](https://stellar.expert/explorer/testnet/tx/ab1da7acb868a34f8022280a0c1e3c0e1f66576c0efe2d1a5aacaeb08eb33be5) |
| Apoyar la obra | Beto | 1 USDC | 0,70 para Ana; 0,30 para UMBRAL | [f706696f…](https://stellar.expert/explorer/testnet/tx/f706696f07603ad710cfa971c4bfdd5db448e6c52f571b130bd22c2f65cceba5) |
| Continuar pagando en XLM | Caro | 10 XLM | 7 XLM para Ana; 3 XLM para UMBRAL | [ab312b0c…](https://stellar.expert/explorer/testnet/tx/ab312b0c0605682d0ce42b37ff75e365311311ce05cd02fd89009933ba42247c) |
| La artista cobra | Ana | 2,10 USDC | Pasan a su cuenta; su saldo queda en 0 | [2569212d…](https://stellar.expert/explorer/testnet/tx/2569212d4047f4debfa49cdd8b5a596ee470c35861b8dfb1d84e7ae0ae8e1197) |
| El museo abre su sala | Museo | — | Sala creada | [3629939a…](https://stellar.expert/explorer/testnet/tx/3629939a23d67557a2f501005efa5b1025ef1a468048df951b0a6cdb4ccdb0a2) |
| El museo carga el fondo | Museo | 4 USDC | Quedan en el fondo de la sala | [1e317095…](https://stellar.expert/explorer/testnet/tx/1e31709523f59d849073d485e22e6c6bd7ae7467ea1bdee267bda291689e17e0) |
| El museo invita a la artista | Museo | — | Una huella paga para Ana | [49cd3a58…](https://stellar.expert/explorer/testnet/tx/49cd3a580650cddd0b122107ed50dc686599c4efbcab5eec25220b865c1a7ffe) |
| UMBRAL abre la muestra de la sala | UMBRAL | — | 7 días, 20% para la sala | [bd5f3871…](https://stellar.expert/explorer/testnet/tx/bd5f3871b8c3134719a501480b0287ab04a166c7695156a79bfbe65d92d18b9f) |
| La artista acepta la muestra | Ana | — | Firma las fechas y el 20% que vio | [a4348e55…](https://stellar.expert/explorer/testnet/tx/a4348e552781ab5ce262701a59cf0297d3160434aecd98fd4c2e225858d839a5) |
| Obra invitada en la sala | Ana | 2 USDC | Los paga el fondo de la sala, no Ana | [1ea298c9…](https://stellar.expert/explorer/testnet/tx/1ea298c93897431fbf3087c7966c035b66b05685b6a2d1144b47abd376ae04e4) |
| Continuar durante la muestra | Beto | 1 USDC | 0,50 para Ana; 0,20 para el museo; 0,30 para UMBRAL | [23500231…](https://stellar.expert/explorer/testnet/tx/23500231d9134deff73292741f6623859b910c84c44a489b25b30c5cdd43b9a2) |
| El museo cobra su parte | Museo | 0,20 USDC | Pasan a su cuenta | [1addef95…](https://stellar.expert/explorer/testnet/tx/1addef95d1792c30aaaeea31d43224a0f83c94f7b44d9affddd5433ff54b202c) |
| El museo retira lo que no se usó del fondo | Museo | 2 USDC | Pasan a la cuenta del museo; el fondo queda en 0 | [0c2cc774…](https://stellar.expert/explorer/testnet/tx/0c2cc7747443d5a9b45e20008a6545ef52992f820eef7afbf17b768a8850b5f5) |

## Comprobación posterior

Después de la última transacción consultamos el contrato y las cuentas:

| Qué | Esperado | Leído en la red |
|---|---|---|
| Tesoro de UMBRAL, en USDC | 5,20 más que antes del segundo contrato: 2 + 0,30 + 0,30 + 0,30 + 2 + 0,30 | 10,40 (5,20 del primer contrato + 5,20 de este) |
| Saldo de Ana a cobrar, en USDC | 0,50 (de la muestra) | 0,50 |
| Saldo de Ana a cobrar, en XLM | 7 | 7 |
| Saldo de Beto y de Caro a cobrar | 0: el público no cobra | 0 |
| Saldo del museo a cobrar | 0 (ya cobró 0,20) | 0 |
| Fondo de la sala | 4 − 2 de la obra invitada − 2 retirados = 0 | 0 |
| USDC guardado en el contrato | 0,50 de Ana | 0,50 |
| XLM guardado en el contrato | 7 de Ana | 7 |

El dinero guardado en el contrato coincide exactamente con lo que se debe: saldos a cobrar más fondos de sala (que ahora es 0).

## Hechas desde la web

La tabla de arriba se hizo con la línea de comandos de Stellar. Estas cuatro se hicieron desde la app, con la prueba de punta a punta (`npm run e2e`, ver [pruebas-e2e.md](pruebas-e2e.md)), el 27/11/2026 a las 22:52 UTC. En cada una la app simula, pide la firma, manda la transacción y espera la respuesta de la red: recién con "salió bien" publica y muestra el comprobante.

Pagan en XLM, con dos cuentas de prueba nuevas: una artista y una persona del público. La obra y la huella de prueba se borraron de la base después; los comprobantes siguen en la red.

| Acción | Quién firma | Qué mostró la app | Comprobante |
|---|---|---|---|
| Exponer una obra con foto | Artista | "Listo: tu obra ya está en el cielo." | [7a905a44…](https://stellar.expert/explorer/testnet/tx/7a905a442a3542e1adb2bf7741d92d209235896d540e4967dbf13085478818a9) |
| Continuar la obra | Público | "Listo: tu huella ya está en la constelación." | [e5e682c8…](https://stellar.expert/explorer/testnet/tx/e5e682c858cb4f0a4d71758ed9dfd540072d9bb1978db313ae608f4f8d573449) |
| Apoyar la obra | Público | "Gracias: tu apoyo llegó." | [a5323cea…](https://stellar.expert/explorer/testnet/tx/a5323cea9a0206c50a8027f07dfba116991974d7376fe8d6fa3c7dfcc219f2bb) |
| La artista cobra | Artista | Saldo de 10,5 XLM a 0 | [6c09fa05…](https://stellar.expert/explorer/testnet/tx/6c09fa0516a570510a35f1c941924d55e2d4edeaba6723d8a193237165575a33) |

## Colección 001 · Una ciudad que resuena

Curaduría de Lucía Paz. Seis obras expuestas desde la web el 28/11/2026, cada una con su foto y 20 XLM. Cinco son obras de muestra. "La sopa paraguaya de Mirta" es una historia familiar real: la expone Lucía P. y su constelación empieza vacía.

| Obra | Expone | Comprobante |
|---|---|---|
| [Entre raíces](https://umbralmuseo.vercel.app/#/obra/e11edfb7b8f6b72e5f3f6cd7f48e85229cf3dd5eef60825f999586ffa6d0f607) | Colección 001 (obra de muestra) | [bbd3e861…](https://stellar.expert/explorer/testnet/tx/bbd3e861620772741f35ae2175ec6009f3572961fe21b84cd46d87e432fa151c) |
| [Trama de algodón](https://umbralmuseo.vercel.app/#/obra/a785e3e70f00ab0f7670ca1d832455b987078b09798ccf7361d2fbdd905f64a9) | Colección 001 (obra de muestra) | [a243ab63…](https://stellar.expert/explorer/testnet/tx/a243ab636df45f5dc6822673978ef0cc4beb598310420b560038ff0fa3de06ba) |
| [La sopa paraguaya de Mirta](https://umbralmuseo.vercel.app/#/obra/8d78f8c880d97a97b4cc6127719c086707843d79a933e3b1c59ec3e6753d551b) | Lucía P. | [814c8f44…](https://stellar.expert/explorer/testnet/tx/814c8f44a8792536cc2a830da3f2948ae6a4f7e54be04d159a343ba0a447c20a) |
| [Las voces del Impenetrable](https://umbralmuseo.vercel.app/#/obra/9710b66b5cd43c637d5ea76c726c13fbfe0ab13abec925fb92cc66f2595bd26a) | Colección 001 (obra de muestra), audio en preparación | [1534384e…](https://stellar.expert/explorer/testnet/tx/1534384e1c85ee22071f93b77e1928d5dc05873e2e9432812e5e26d44c97729f) |
| [Frida](https://umbralmuseo.vercel.app/#/obra/7f1d2afb74b440ee4ff3c07ee3af6e7643add9823601455936a5a6c99a5e27d5) | Colección 001 (obra de muestra) | [22887742…](https://stellar.expert/explorer/testnet/tx/22887742cc88ee17e0c6d8a3e4854cc69bde7faa0009c4c700572fb9d5e9c10c) |
| [Cestería de palma](https://umbralmuseo.vercel.app/#/obra/6814681e44916030685330cde2bec8e03354a661130690b888ec9c3d43806095) | Colección 001 (obra de muestra) | [f9419898…](https://stellar.expert/explorer/testnet/tx/f9419898c03b3bda06c2996c319a609875ee4c25a3695903196ed9a21865d566) |

### Primera tanda (reemplazada)

Las mismas seis obras, expuestas primero con otro cierre en la descripción. Como la descripción entra en el código firmado, no se puede editar: se volvieron a exponer y estas quedan fuera de El cielo.

| Obra | Expone | Comprobante |
|---|---|---|
| [Entre raíces](https://umbralmuseo.vercel.app/#/obra/9ee8bab1aef222423dba5e444dac6711e53710ebc06697f56acf1eb9d28164ab) | Colección 001 (obra de muestra) | [61f327ff…](https://stellar.expert/explorer/testnet/tx/61f327ff397dd402a9e2728f7fc514778a93566adf93dc03ce38c1d75bc5cedc) |
| [Trama de algodón](https://umbralmuseo.vercel.app/#/obra/457b0aaddfdb36c9c288b760bc240282d74bab68443220467dc5d1c15fa975a4) | Colección 001 (obra de muestra) | [46cf2800…](https://stellar.expert/explorer/testnet/tx/46cf280097c3082d8c09b4f1a1c50ad4106bbda33fe0e820564f5ca0a1d3cb69) |
| [La sopa paraguaya de Mirta](https://umbralmuseo.vercel.app/#/obra/fc3d85853f491e1f4aacd69afbf9a590ecfc52c50d86bd1af1b5c3ee5bf65070) | Lucía P. | [36ddd3e0…](https://stellar.expert/explorer/testnet/tx/36ddd3e0ae2831908429be08f259ffefe2077d668d2dc351871dc95a497779b3) |
| [Las voces del Impenetrable](https://umbralmuseo.vercel.app/#/obra/eaf896193daf133b4eab573a41b76d7162b2f5b18cd2030804e82879b6d4bb35) | Colección 001 (obra de muestra), sin audio todavía | [72a07f31…](https://stellar.expert/explorer/testnet/tx/72a07f312d125d92d018e5d346664c80c6744bc1ec3d28e317871d071840dd27) |
| [Frida](https://umbralmuseo.vercel.app/#/obra/f64ef3f9c42005a7ead7efbe2c1421ca50bb6572851338da6e5d7daad2a554dd) | Colección 001 (obra de muestra) | [f80a8e9e…](https://stellar.expert/explorer/testnet/tx/f80a8e9efd2b60d7f97b99439a2e4bdfafa52b3199a5888f2c819a300172ff06) |
| [Cestería de palma](https://umbralmuseo.vercel.app/#/obra/6ba5e56940b74c80c20dfde1df1091e0cb25b9d723afede8f28782641eaa269e) | Colección 001 (obra de muestra) | [10e16b04…](https://stellar.expert/explorer/testnet/tx/10e16b04cbf345c552302fe9ea7cdf98250602927e768fb46dc5c40ad3c5b96e) |

## Lo que no está en esta lista

- Una acción rechazada (por ejemplo, continuar una huella retirada): está cubierta por las pruebas automáticas, no por una transacción.
