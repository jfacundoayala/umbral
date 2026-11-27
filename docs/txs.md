# Transacciones en la red de pruebas de Stellar

Red: Stellar Testnet. El USDC y el XLM usados no tienen valor real. Fecha: 27/11/2026.

Contrato: `CCFQDRBGXVE4EIXZMBKA4GXXJV3BV6IZNSNXLPJHTDKEGN3SYYIW4N66`
[Ver el contrato en Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCFQDRBGXVE4EIXZMBKA4GXXJV3BV6IZNSNXLPJHTDKEGN3SYYIW4N66)

Monedas aceptadas:

- USDC de prueba: emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, contrato del activo `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- XLM: contrato del activo `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`.

Las cuentas (UMBRAL, tesoro, Ana, Beto, Caro y el museo) son de prueba. Compraron su USDC en el mercado de la red de pruebas.

| Acción | Quién firma | Monto | Reparto | Comprobante |
|---|---|---:|---|---|
| Instalar el código del contrato | UMBRAL | — | Código `ccc8f647…c8773` | [b203ffc7…](https://stellar.expert/explorer/testnet/tx/b203ffc720a524de1b37a6638ea4150b112f7a888d3cf9090ae5a96529e8f338) |
| Desplegar el contrato | UMBRAL | — | Artista 70%, UMBRAL 30% | [bf38be6b…](https://stellar.expert/explorer/testnet/tx/bf38be6bc1f6fd9f9b671c14e4edb8193350584d70147e3f3a34677edb0fffdf) |
| Fijar precios en USDC | UMBRAL | 2 y 1 USDC | Exponer una obra 2; continuar 1 | [19c69ba0…](https://stellar.expert/explorer/testnet/tx/19c69ba03e04aed806fa1f5362ab12bbaa4f3140c9fc3b9927e25b3ff03c5d39) |
| Fijar precios en XLM | UMBRAL | 20 y 10 XLM | Exponer una obra 20; continuar 10 | [f4fb162e…](https://stellar.expert/explorer/testnet/tx/f4fb162e89bd5e1abaa09b8039c39904f3a49dd48eec001c66530abb6ce61c41) |
| Exponer una obra | Ana (artista) | 2 USDC | 2 USDC para UMBRAL | [2d584c0d…](https://stellar.expert/explorer/testnet/tx/2d584c0d02173ca60df9a16fa8a90e1c88bb417cc14ea388d669b2ecd6b490a9) |
| Continuar la obra | Beto | 1 USDC | 0,70 para Ana; 0,30 para UMBRAL | [85624606…](https://stellar.expert/explorer/testnet/tx/856246063cffeb5df33545f80d726710b2a2f4e75fc9a89d0cf778e3032cb889) |
| Continuar la respuesta de Beto | Caro | 1 USDC | 0,70 para Ana; 0,30 para UMBRAL. Beto no cobra | [609e9dab…](https://stellar.expert/explorer/testnet/tx/609e9dab9195d0bfbb78812402bdd22373fe029d3a7fc9c4947d175149c54f93) |
| Apoyar la obra | Beto | 1 USDC | 0,70 para Ana; 0,30 para UMBRAL | [11b5481f…](https://stellar.expert/explorer/testnet/tx/11b5481fe872c172b2e445d605723a3483854bf3050ad9e8ff95e7e7b03a19fe) |
| Continuar pagando en XLM | Caro | 10 XLM | 7 XLM para Ana; 3 XLM para UMBRAL | [a6e810bb…](https://stellar.expert/explorer/testnet/tx/a6e810bb975d953273b78f2d4451d72f9b5ed4e84aefde4762e2131fdaa06c91) |
| La artista cobra | Ana | 2,10 USDC | Pasan a su cuenta; su saldo queda en 0 | [fceedf09…](https://stellar.expert/explorer/testnet/tx/fceedf09b7b02d8a99fca73ee72f20d9ae3a4b8c99414cd95d27f3bd5a6d585a) |
| El museo abre su sala | Museo | — | Sala creada | [8f39d589…](https://stellar.expert/explorer/testnet/tx/8f39d589ac9dfb2ee39d441159a33ed2a61d8b587ec7dd03dad3c3b239a91daa) |
| El museo carga el fondo | Museo | 4 USDC | Quedan en el fondo de la sala | [a99e58dd…](https://stellar.expert/explorer/testnet/tx/a99e58dd2f9baaf123f7a28b4f9b05d684523667363733392c718a9be0b9c76b) |
| El museo invita a la artista | Museo | — | Una huella paga para Ana | [baa93e94…](https://stellar.expert/explorer/testnet/tx/baa93e94c3f98bb753280b572d594b77266f61e0a2fa73d36fbd327532edf281) |
| UMBRAL abre la muestra de la sala | UMBRAL | — | 7 días, 20% para la sala | [2daf1fc2…](https://stellar.expert/explorer/testnet/tx/2daf1fc2e1951c83f3206bc74854afec22e13adcd8cb2e77194ab6eeed2d3c2e) |
| La artista acepta la muestra | Ana | — | Firma viendo el 20% | [177f4be7…](https://stellar.expert/explorer/testnet/tx/177f4be7b92abf8be34f8ca170555e2d33da16befa17b3c2ea2c9e75aeae9676) |
| Obra invitada en la sala | Ana | 2 USDC | Los paga el fondo de la sala, no Ana | [1e26b027…](https://stellar.expert/explorer/testnet/tx/1e26b0279fa682b6aab6e62c0c4941a9b723b69e4caccffb1fe849aa5ec589c6) |
| Continuar durante la muestra | Beto | 1 USDC | 0,50 para Ana; 0,20 para el museo; 0,30 para UMBRAL | [80ee21f3…](https://stellar.expert/explorer/testnet/tx/80ee21f3b3f3f579d6e50835c8c69433da99afa16de9a730d03cec4e8f03cd94) |
| El museo cobra su parte | Museo | 0,20 USDC | Pasan a su cuenta | [c53b768b…](https://stellar.expert/explorer/testnet/tx/c53b768b47ab187644787eab171b937450eedb631b13b4739620bcb559c8b49f) |

## Comprobación posterior

Después de la última transacción consultamos el contrato y las cuentas:

| Qué | Esperado | Leído en la red |
|---|---|---|
| Tesoro de UMBRAL, en USDC | 2 + 0,30 + 0,30 + 0,30 + 2 + 0,30 = 5,20 | 5,20 |
| Tesoro de UMBRAL, en XLM | 3 más que al empezar | 10.002,99999 (empezó con 10.000 menos comisiones de red) |
| Saldo de Ana a cobrar, en USDC | 0,50 (de la muestra) | 0,50 |
| Saldo de Ana a cobrar, en XLM | 7 | 7 |
| Saldo de Beto y de Caro a cobrar | 0: el público no cobra | 0 |
| Saldo del museo a cobrar | 0 (ya cobró 0,20) | 0 |
| Fondo de la sala | 4 − 2 = 2 USDC | 2 |
| USDC guardado en el contrato | 0,50 de Ana + 2 del fondo = 2,50 | 2,50 |
| XLM guardado en el contrato | 7 de Ana | 7 |

El dinero guardado en el contrato coincide exactamente con lo que se debe: saldos a cobrar más fondos de sala.

## Lo que no está en esta lista

- Una acción rechazada (por ejemplo, continuar una huella retirada): está cubierta por las pruebas automáticas, no por una transacción.
- Transacciones hechas desde la web: estas se hicieron con la línea de comandos de Stellar.
