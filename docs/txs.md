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

## Lo que no está en esta lista

- Una acción rechazada (por ejemplo, continuar una huella retirada): está cubierta por las pruebas automáticas, no por una transacción.
- Transacciones hechas desde la web: estas se hicieron con la línea de comandos de Stellar.
