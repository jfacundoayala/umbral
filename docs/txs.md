# Transacciones en la red de pruebas de Stellar

Red: Stellar Testnet. El USDC y el XLM usados no tienen valor real. Fecha: 27/11/2026.

Contrato: `CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP`
[Ver el contrato en Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP)

Es el segundo contrato. El primero, `CCFQDRBGXVE4EIXZMBKA4GXXJV3BV6IZNSNXLPJHTDKEGN3SYYIW4N66`, sigue en la red con sus comprobantes, pero la app ya no lo usa. El segundo suma los arreglos de la auditoría: la firma del artista vale solo para la muestra exacta que vio, el museo puede retirar lo que no se usó del fondo y el administrador puede actualizar el código.

**28/11/2026: reparto nuevo.** El mismo contrato se actualizó con `actualizar`, que conserva todas las obras, huellas y saldos. Ahora quien hizo la obra recibe el 80% y UMBRAL el 20%, también en los apoyos. En una muestra con una sala, UMBRAL se queda con el 30%, la sala con su parte (hasta 40%) y el artista con el resto, nunca menos del 30%. Las transacciones de abajo son anteriores y muestran el reparto 70/30 de ese momento.

| Acción | Quién firma | Detalle | Comprobante |
|---|---|---|---|
| Instalar el código nuevo y actualizar el contrato | UMBRAL | Código `54c8d2b3…a105` | [8ce25766…](https://stellar.expert/explorer/testnet/tx/8ce25766157fef6702d69d5ef1a4c00bf132d75c2a452fb29f5f8fe7d74cd3d7) |
| Fijar la parte del artista en 80% | UMBRAL | `parte_autor` = 8000 | [b45ff446…](https://stellar.expert/explorer/testnet/tx/b45ff446aa3fd4473f80c7564dbca120621055e493bffad29fc415f8574abc89) |

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

## Colección del 28/11/2026

Dieciocho obras expuestas desde la web, cada una con su foto (y su audio cuando tiene) y 20 XLM. "La sopa paraguaya de Mirta" la expone Lucía P.

| Obra | Expone | Comprobante |
|---|---|---|
| [La sopa paraguaya de Mirta](https://umbralmuseo.vercel.app/#/obra/8d78f8c880d97a97b4cc6127719c086707843d79a933e3b1c59ec3e6753d551b) | Lucía P. | [814c8f44…](https://stellar.expert/explorer/testnet/tx/814c8f44a8792536cc2a830da3f2948ae6a4f7e54be04d159a343ba0a447c20a) |
| [Entre raíces](https://umbralmuseo.vercel.app/#/obra/84dae87eddfb37fb8ec42cd8b82e01ac816e0806f5f44925e2032bb9459e70e5) | Julián Romero | [bf9414b9…](https://stellar.expert/explorer/testnet/tx/bf9414b9fbc126356afbd205f5c5f54ab10f4f1844ae91b91c9a285e56f82e81) |
| [Trama de algodón](https://umbralmuseo.vercel.app/#/obra/3659f7c92201365481b7156ed5a298383a87e1252b75b52af741ed25370cd7e6) | Rosa Benítez | [9a117d3b…](https://stellar.expert/explorer/testnet/tx/9a117d3baf46ccbcdf4dfe83dce8628fca256ec6592400750d367fbef0101f56) |
| [Las voces del Impenetrable](https://umbralmuseo.vercel.app/#/obra/a02fc7a515f3743d7c34c7da2b98c8ea4875672f726ff87f5be25160e3fa2b57) | Martín Ojeda | [53e73c4c…](https://stellar.expert/explorer/testnet/tx/53e73c4c1d090065467ce68a5819a5e6c52f3b177aa4b1a8fc3ad8dc37b008f0) |
| [Frida](https://umbralmuseo.vercel.app/#/obra/a3ea7865bc61ab8657234ed0aaed8de2e39c3d5f43596085c9f808d072016550) | Carla Méndez | [cc36c567…](https://stellar.expert/explorer/testnet/tx/cc36c567d75919251973d9582fa627b36cc592088705ee3b63c23baf91254d2c) |
| [Cestería de palma](https://umbralmuseo.vercel.app/#/obra/73be8241b594c38d7ca9eed03fa2dde34c0563181810c9dad7b9c2973b63bafa) | Ana Galarza | [d1cbaa00…](https://stellar.expert/explorer/testnet/tx/d1cbaa001380cf9c440d846d1aeccb86f3d8301b511ea1841b73ce9a4ebbb595) |
| [Lluvia en el techo de chapa](https://umbralmuseo.vercel.app/#/obra/12175dffb8a0af6949af4a4abd0823e8f016b86ffc555e7dc713014211de5532) | Beatriz Leiva | [5655602f…](https://stellar.expert/explorer/testnet/tx/5655602f72fe052a2f1f9fc5615efd6cec51a5f4130f30cbc87537368af1a68b) |
| [Noche de verano en el barrio](https://umbralmuseo.vercel.app/#/obra/697b592a36591b0c58130e2641aa547193d916b7ff806032dd329cf6c36ff6a2) | Hugo Maidana | [674c1b4b…](https://stellar.expert/explorer/testnet/tx/674c1b4bc2dd47f02d1be6dc372b2f72570f90a4ae1f776558527de63096bcce) |
| [La costanera del Paraná](https://umbralmuseo.vercel.app/#/obra/554e2cd3ff41b6cf65da785d0242dd1075d9f280e248ebd4ca59b1c9dc4e301f) | Valentina Sosa | [5baeb967…](https://stellar.expert/explorer/testnet/tx/5baeb967e3bdb7aeb859301a5b7d46c8ceaf08e5ac5bf29281ec3d20bc16ead8) |
| [La pava de la mañana](https://umbralmuseo.vercel.app/#/obra/58d19220750df68029b6bc94cc4450f1d1201d20fa8cf0632824d1ebf6431504) | Ernesto Duarte | [0ebe5474…](https://stellar.expert/explorer/testnet/tx/0ebe54741f8512896587e010d6c00f849d912e0fafc0c07c508ceb7bde919603) |
| [Carta a quienes todavía no llegaron](https://umbralmuseo.vercel.app/#/obra/609a3c9382621db501214c9174d340a540f48eb50dbf9cc84c853b7258781811) | Victoria Acosta | [f5cbf660…](https://stellar.expert/explorer/testnet/tx/f5cbf6601f19b4c355c3d183a4f8c010fba8e4170bdc04117b2cc4cbc562a350) |
| [Cuando las puertas quedaban abiertas](https://umbralmuseo.vercel.app/#/obra/81a25c9fcaf2eea0093df4c63e3262b19c595745a6b14a3e5777df5f5e2e579a) | Marta Ríos | [50fd81d1…](https://stellar.expert/explorer/testnet/tx/50fd81d15ff8f1b6df45499b5cd92516fd13bf634162588f706ae7fa4e58fbd8) |
| [El río que se mueve](https://umbralmuseo.vercel.app/#/obra/467bc2e4bade846e1f903792c86758080b10abb0d0297b0b8e7990b79cb0f589) | Tomás Aguirre | [9d0726f4…](https://stellar.expert/explorer/testnet/tx/9d0726f41f67c403311770000091125ba506c4fd0239ffb7ed20e3b5e5db7c0b) |
| [Quebracho al atardecer](https://umbralmuseo.vercel.app/#/obra/c8986e17ee839fb2dcd914b3f3573e344d724abbf6e8ecfce7d0ae646f3a09df) | Graciela Ferreyra | [0ac2802a…](https://stellar.expert/explorer/testnet/tx/0ac2802a7ccd0ccff40b0226c1e951964cee2f4dbc5b890bf7a1a7dc0b505856) |
| [Siesta](https://umbralmuseo.vercel.app/#/obra/6d081996f7d5df387359302e297f232b3ace442173b000f36b7137cf2bd396a3) | Pablo Gómez | [91c72dd3…](https://stellar.expert/explorer/testnet/tx/91c72dd3cc7eab91daaf9a6459654b2b9a58ba5baa6bb40350f605918a21bf2c) |
| [Vereda de lapacho](https://umbralmuseo.vercel.app/#/obra/ba3226387ce391d99cc63acc9f902596e936bb4543f37e556cb41ebe05e119cb) | Sofía Ledesma | [50811adb…](https://stellar.expert/explorer/testnet/tx/50811adb7831417409cae2f9e24bfac02096ec826ce45bfb39db3a878c70de1e) |
| [Cianotipo del patio](https://umbralmuseo.vercel.app/#/obra/b763135027f7e38cc8df4d812f6eb1571e968b618e792b5cb8341978b6813710) | Nicolás Vera | [4fa9d904…](https://stellar.expert/explorer/testnet/tx/4fa9d904bff26ce7234f5873afdc1cdef5dcd0619d57e176e1ac00693f13b147) |
| [Guarda del mediodía](https://umbralmuseo.vercel.app/#/obra/004c75547fd4f26a7525eccc1cdde7f809cfda2153fdea6616d2ec5be3b7e266) | Inés Cabrera | [f89c8954…](https://stellar.expert/explorer/testnet/tx/f89c8954dac8b3fde8a9c0d66b31bcf7abb3cb767285d6e543c8791800ab21ac) |

### Huellas y apoyos

Pagados en la red de pruebas desde varias cuentas, a través de la app.

| Obra | Qué | Dónde | Comprobante |
|---|---|---|---|
| Entre raíces | Huella de Elena | continúa la obra | [af642a4a…](https://stellar.expert/explorer/testnet/tx/af642a4aea6357b20aedc74944e83c3dc3fcc9288f2df9717469ae9aab21eecf) |
| Entre raíces | Huella de Mateo | continúa a Elena | [1ac916d1…](https://stellar.expert/explorer/testnet/tx/1ac916d1ef04b0c26332a737cc438b3a7ad716acb33323db9f941cb5d2bf8b4e) |
| Entre raíces | Huella de Valentina | continúa la obra | [8f674e63…](https://stellar.expert/explorer/testnet/tx/8f674e63d4f2793585aae714821ebf16c287e68d7a47fc9d946da058673a8347) |
| Entre raíces | Huella de Rocío | continúa a Mateo | [a8fbbcc9…](https://stellar.expert/explorer/testnet/tx/a8fbbcc9ec828bd77b772598cbb5a636c874a0a8cbab94a88e8d3c2f8c22f2aa) |
| Entre raíces | Huella de Joaquín | continúa la obra | [2fd81567…](https://stellar.expert/explorer/testnet/tx/2fd81567e937084585f27a05abd1b42b06ea20385dfe785302bc8de0ef52bd1f) |
| Entre raíces | Apoyo de 5 XLM | a la obra | [10be5e3a…](https://stellar.expert/explorer/testnet/tx/10be5e3aa892fb2b03f325cec54c7b93a66085806a990a16be1c7e4bafa75894) |
| Trama de algodón | Huella de Marta | continúa la obra | [79360440…](https://stellar.expert/explorer/testnet/tx/79360440aa916e10f1e86b0af011ce4cb13b813925f368b6c600fef72fa11c2a) |
| Trama de algodón | Huella de Lautaro | continúa a Marta | [f55af8dd…](https://stellar.expert/explorer/testnet/tx/f55af8dd9512cd5ed13c3a66412fbb58f1009fef656ab54fce544faa149832c1) |
| Trama de algodón | Huella de Sofía | continúa la obra | [a153bc2d…](https://stellar.expert/explorer/testnet/tx/a153bc2dfec5af7ed3c09475c803c14a01f1ef5f0e98bac5d3a02a882803090e) |
| Trama de algodón | Huella de Gonzalo | continúa a Sofía | [f081241f…](https://stellar.expert/explorer/testnet/tx/f081241f94dcec7fe1a236017e7f2a1aa0cc9d463c479a27a23e3dad429938ec) |
| Trama de algodón | Huella de Ana | continúa a Gonzalo | [dc844075…](https://stellar.expert/explorer/testnet/tx/dc844075484decbf3339020420a39c58d0b6e8c610d0997b2552e086a35a536c) |
| Las voces del Impenetrable | Huella de Ramiro | continúa la obra | [68e60264…](https://stellar.expert/explorer/testnet/tx/68e60264475bf160a2a4c66a3a9178eec6e6fd381cefa95a963f7414ac66f665) |
| Las voces del Impenetrable | Huella de Luz | continúa a Ramiro | [319502c1…](https://stellar.expert/explorer/testnet/tx/319502c1b49d09bf3c98b383a037a1d579ecee1187e4b244728d88849b3f4302) |
| Las voces del Impenetrable | Huella de Ramiro | continúa a Luz | [bf5355cf…](https://stellar.expert/explorer/testnet/tx/bf5355cfff53930bc0e949feb551336624a68cf1e82d1b106bae7f7de3cd4975) |
| Las voces del Impenetrable | Huella de Carla | continúa la obra | [49c6fdea…](https://stellar.expert/explorer/testnet/tx/49c6fdea4b5d9406d081892ef697d11c26d5474fcd561784ca944b10788f4b21) |
| Frida | Huella de Nico | continúa la obra | [9d300be2…](https://stellar.expert/explorer/testnet/tx/9d300be229e85033f4f36dbd6f1e3e568643a42d9d40ee394bea212330d9f194) |
| Frida | Huella de Belén | continúa a Nico | [8118db59…](https://stellar.expert/explorer/testnet/tx/8118db594f402ee8a10d4605fdee9ee49d5a3c066652a252f538d2f1a85ff2df) |
| Frida | Huella de Tomás | continúa la obra | [86e2e990…](https://stellar.expert/explorer/testnet/tx/86e2e99015e3b88ad29ee050fb2159add72c500001640f6044ed9f1f73527712) |
| Frida | Huella de Paula | continúa la obra | [f5b3c0a3…](https://stellar.expert/explorer/testnet/tx/f5b3c0a3ed8e77f11010624b4f4fba022a4d947d23191379859e9e21759d57dc) |
| Frida | Huella de Mica | continúa a Paula | [3a6df8ee…](https://stellar.expert/explorer/testnet/tx/3a6df8ee96071d28b0524910ca268f32616ad184982e5c643a5c5b0eedf8bb6d) |
| Frida | Apoyo de 3 XLM | a la obra | [c9fff56a…](https://stellar.expert/explorer/testnet/tx/c9fff56a6c8c793c7165a9c42cd3400e5ec94429cc4cfe02b5e5bb5c3033c238) |
| Cestería de palma | Huella de Teresa | continúa la obra | [56ac9662…](https://stellar.expert/explorer/testnet/tx/56ac9662660858a0df415c1d1320029144f66641fdb6bbaa86cb907cee796e79) |
| Cestería de palma | Huella de Julieta | continúa a Teresa | [cbf97880…](https://stellar.expert/explorer/testnet/tx/cbf978803968ba6ed56d7499be5e5f170669464d1430f3b6d74c42beda2d64d5) |
| Cestería de palma | Huella de Teresa | continúa a Julieta | [87bcf58c…](https://stellar.expert/explorer/testnet/tx/87bcf58ce8f073cbfdd74b6882fa8813a606a352c5196c2b7137c4ac88d038d4) |
| Cestería de palma | Huella de Martín | continúa la obra | [6d95a13a…](https://stellar.expert/explorer/testnet/tx/6d95a13af492920e88926270c30953fbe57e9ccce3fbcd6fc4fe4a92f56cdad8) |
| Lluvia en el techo de chapa | Huella de Carolina | continúa la obra | [cc817c2e…](https://stellar.expert/explorer/testnet/tx/cc817c2e70a7ec2668d9e64f7b2352ff5d3ed90f6d0c53d1b938d672cbea330e) |
| Lluvia en el techo de chapa | Huella de Diego | continúa a Carolina | [ba54ce0e…](https://stellar.expert/explorer/testnet/tx/ba54ce0ea783d67e06db729ad553eaee123a8bdceb1ba0db75028134587afe10) |
| Lluvia en el techo de chapa | Huella de Flor | continúa la obra | [dffbbf00…](https://stellar.expert/explorer/testnet/tx/dffbbf00e81b94ba1f4ff8d5f367463292bdf57556c2e6b61ad99798f9b36931) |
| Noche de verano en el barrio | Huella de Pablo | continúa la obra | [3b1ac5c5…](https://stellar.expert/explorer/testnet/tx/3b1ac5c55eab75d5929437a841e592d686a9d87e7c9b32f10ba4b892193812a5) |
| Noche de verano en el barrio | Huella de Inés | continúa a Pablo | [6da0a035…](https://stellar.expert/explorer/testnet/tx/6da0a03538e5e0dbfd5072a6371cd9a2cd8f87cb527ea518cc35980c9d9b358b) |
| Noche de verano en el barrio | Huella de Lucas | continúa la obra | [4ce89c34…](https://stellar.expert/explorer/testnet/tx/4ce89c34f57fccbdb7238ab64d16234528179f95677184fd1ce7579fcc2d744a) |
| La costanera del Paraná | Huella de Agustina | continúa la obra | [1d9ffbfe…](https://stellar.expert/explorer/testnet/tx/1d9ffbfe087f2b351b0ec859d14573a46f82984391fd5fbd9c279b2cf9ab7dbf) |
| La costanera del Paraná | Huella de Martín | continúa a Agustina | [3d0fd2c8…](https://stellar.expert/explorer/testnet/tx/3d0fd2c8775a64775187fdbd6c83bbc08cbcd6df3f186e05dd4a3929ebcadde0) |
| La pava de la mañana | Huella de Sergio | continúa la obra | [304f628f…](https://stellar.expert/explorer/testnet/tx/304f628f1ee819b5ea21532157f21a2c3cbaaf46d972894ae286960dc7e3a737) |
| La pava de la mañana | Huella de Lorena | continúa a Sergio | [73b65158…](https://stellar.expert/explorer/testnet/tx/73b65158005519073a9df03cebe3c351933ae5e7a65a01b73276fafaf3b22004) |
| La pava de la mañana | Huella de Sergio | continúa a Lorena | [c38f79bf…](https://stellar.expert/explorer/testnet/tx/c38f79bfb537503ed94d3432d2cbb2e0f5296ddb1ce15ef0be1b424e3111320a) |
| Carta a quienes todavía no llegaron | Huella de Isabel | continúa la obra | [486764c5…](https://stellar.expert/explorer/testnet/tx/486764c5bbd75f0540763ce170f313b4653bf8663d479445e4abe1f62a8a38ee) |
| Carta a quienes todavía no llegaron | Huella de Franco | continúa a Isabel | [0a1417c6…](https://stellar.expert/explorer/testnet/tx/0a1417c620fdaada6f81900a72ba689a7075ffffa5d0f5aaa72153b2520f7629) |
| Carta a quienes todavía no llegaron | Huella de Julia | continúa la obra | [ec8653f0…](https://stellar.expert/explorer/testnet/tx/ec8653f02818bda169d8ebe82b2ee09e8e968bff6777c68884dda10479bf9dcf) |
| Cuando las puertas quedaban abiertas | Huella de Ricardo | continúa la obra | [a1d7d189…](https://stellar.expert/explorer/testnet/tx/a1d7d18983018478c1e17de0165d02b2e4dfffb9b593042726fc86e95a7bf50c) |
| Cuando las puertas quedaban abiertas | Huella de Camila | continúa a Ricardo | [72067454…](https://stellar.expert/explorer/testnet/tx/7206745432d16a684dca71b61c476ef65ce69c3d66bb233303d9056ce83d2de0) |
| La sopa paraguaya de Mirta | Huella de Graciela | continúa la obra | [effef484…](https://stellar.expert/explorer/testnet/tx/effef484c847363e9a2a4595e6a53f312d3e272c1e4dedf8d27def2a67f7090d) |
| La sopa paraguaya de Mirta | Huella de Hernán | continúa a Graciela | [a578e5ae…](https://stellar.expert/explorer/testnet/tx/a578e5ae758e1a2c09f9805f57c136132f5ce64b4043b8ad5574b4a2094863e2) |
| La sopa paraguaya de Mirta | Huella de Silvia | continúa a Hernán | [4f613206…](https://stellar.expert/explorer/testnet/tx/4f613206b071eb4be3d4324302a53f452f5dcf6bb48e43a80a84a086a20df70a) |
| La sopa paraguaya de Mirta | Huella de Omar | continúa la obra | [51720e78…](https://stellar.expert/explorer/testnet/tx/51720e7860a9fc79dc4f5525a364d7c3ef1285b8674a499e310ea539aa7b9be2) |
| La sopa paraguaya de Mirta | Huella de Rosa | continúa la obra | [4e453b7b…](https://stellar.expert/explorer/testnet/tx/4e453b7ba153309addb9be1870536f22eeb1a1d991efb1198e3dfd54b4763911) |
| El río que se mueve | Huella de Lautaro | continúa la obra | [7749e322…](https://stellar.expert/explorer/testnet/tx/7749e322edab6f7a80c542c2ef8664cf8461690c8e91c3abc439e81bcfdc65e1) |
| El río que se mueve | Huella de Mariana | continúa la obra | [a126b438…](https://stellar.expert/explorer/testnet/tx/a126b438edfa8d94726bca3653c800690a50f5b1b9beadf12fe9ca638b9de414) |
| El río que se mueve | Huella de Ramón | continúa la obra | [f74d30d7…](https://stellar.expert/explorer/testnet/tx/f74d30d7b41a0b6fa22ae7572d502be8d32a9c05ec45e274063aaff82848f864) |
| Quebracho al atardecer | Huella de Darío | continúa la obra | [9c065c1d…](https://stellar.expert/explorer/testnet/tx/9c065c1d2cba006162cc306bb5c00e9208005fb54212588ac1443d76444bf97a) |
| Quebracho al atardecer | Huella de Abril | continúa la obra | [60de325c…](https://stellar.expert/explorer/testnet/tx/60de325cea67c0dcaba150db239c06d8bb18a47c84f918794e780a49ab0e8151) |
| Quebracho al atardecer | Huella de Silvia | continúa la obra | [1c07ebc7…](https://stellar.expert/explorer/testnet/tx/1c07ebc7174ee8416e32f6fa4117817bf07b655b8549e1b19eb4b19f9e1b99c7) |
| Quebracho al atardecer | Huella de Joaquín | continúa la obra | [65138ecd…](https://stellar.expert/explorer/testnet/tx/65138ecd6ef2b3067248527cbe643b4e5412710139c83460cec15b20adb3d9a7) |
| Siesta | Huella de Carolina | continúa la obra | [7ba401a4…](https://stellar.expert/explorer/testnet/tx/7ba401a40e6209adfc403eff14598922a221237dd09f7cf58789f69f92063bf0) |
| Siesta | Huella de Gustavo | continúa la obra | [647a9139…](https://stellar.expert/explorer/testnet/tx/647a9139cd68f705909f732f443fcedf7ee68d6ec17240acc6a3aa50b100132e) |
| Siesta | Huella de Micaela | continúa la obra | [99047c86…](https://stellar.expert/explorer/testnet/tx/99047c8622bf67b250a90af509f4837b6efe021954443aa04e4f0597bce05ae1) |
| Siesta | Apoyo de 2 XLM | a la obra | [7fb45eb5…](https://stellar.expert/explorer/testnet/tx/7fb45eb5cec53bd5020c10ed0af3794695e081744410772f4901d3f8403cfd1b) |
| Vereda de lapacho | Huella de Valeria | continúa la obra | [8b99b9e2…](https://stellar.expert/explorer/testnet/tx/8b99b9e2317660751312a414082c0be0741233cc6bcde2ebeeb620d2111017ab) |
| Vereda de lapacho | Huella de Federico | continúa la obra | [0f70a15c…](https://stellar.expert/explorer/testnet/tx/0f70a15c4db4733a37a45012aee6f3830bf4e3cc97b0ad7245bb46bebf40b1e5) |
| Vereda de lapacho | Huella de Luz | continúa la obra | [81521ef0…](https://stellar.expert/explorer/testnet/tx/81521ef021478ccfcf6424396af58356b0ad525c287c88e52db9541cf74132dc) |
| Cianotipo del patio | Huella de Ana | continúa la obra | [e4ec045a…](https://stellar.expert/explorer/testnet/tx/e4ec045a9c7e8ec5de68eb6158cb8eecfb5e72b958d76c097de7dbe76c90f5a1) |
| Cianotipo del patio | Huella de Tobías | continúa la obra | [fdca7576…](https://stellar.expert/explorer/testnet/tx/fdca75760628d46c3f86d4b5c7bb67c91411f156ad3899a007277b1c5a2131b2) |
| Guarda del mediodía | Huella de Norma | continúa la obra | [72740694…](https://stellar.expert/explorer/testnet/tx/727406947578bc1820c8f27770f5f23f46c2a267751e185cd8bc3f8a89e62ce1) |
| Guarda del mediodía | Huella de Camila | continúa la obra | [5f3fc709…](https://stellar.expert/explorer/testnet/tx/5f3fc7096f8dd49f9e569884c54d29d147d0c31bffabd8fdaa30dd69b8636e58) |
| Guarda del mediodía | Huella de Héctor | continúa la obra | [8fa5719d…](https://stellar.expert/explorer/testnet/tx/8fa5719d0c348560897a7d41666c4338d175d0918ee6d29c588b5a8ecf9a657a) |

### Versiones reemplazadas

La descripción entra en el código firmado y no se puede editar: para cambiar un texto hay que volver a exponer la obra. Estas versiones anteriores quedan fuera de El cielo.

- Primera tanda de la Colección 001: [9ee8bab1…](https://umbralmuseo.vercel.app/#/obra/9ee8bab1aef222423dba5e444dac6711e53710ebc06697f56acf1eb9d28164ab), [457b0aad…](https://umbralmuseo.vercel.app/#/obra/457b0aaddfdb36c9c288b760bc240282d74bab68443220467dc5d1c15fa975a4), [fc3d8585…](https://umbralmuseo.vercel.app/#/obra/fc3d85853f491e1f4aacd69afbf9a590ecfc52c50d86bd1af1b5c3ee5bf65070), [eaf89619…](https://umbralmuseo.vercel.app/#/obra/eaf896193daf133b4eab573a41b76d7162b2f5b18cd2030804e82879b6d4bb35), [f64ef3f9…](https://umbralmuseo.vercel.app/#/obra/f64ef3f9c42005a7ead7efbe2c1421ca50bb6572851338da6e5d7daad2a554dd), [6ba5e569…](https://umbralmuseo.vercel.app/#/obra/6ba5e56940b74c80c20dfde1df1091e0cb25b9d723afede8f28782641eaa269e).
- Segunda tanda de la Colección 001 (con sus huellas): [e11edfb7…](https://umbralmuseo.vercel.app/#/obra/e11edfb7b8f6b72e5f3f6cd7f48e85229cf3dd5eef60825f999586ffa6d0f607), [a785e3e7…](https://umbralmuseo.vercel.app/#/obra/a785e3e70f00ab0f7670ca1d832455b987078b09798ccf7361d2fbdd905f64a9), [9710b66b…](https://umbralmuseo.vercel.app/#/obra/9710b66b5cd43c637d5ea76c726c13fbfe0ab13abec925fb92cc66f2595bd26a), [7f1d2afb…](https://umbralmuseo.vercel.app/#/obra/7f1d2afb74b440ee4ff3c07ee3af6e7643add9823601455936a5a6c99a5e27d5), [6814681e…](https://umbralmuseo.vercel.app/#/obra/6814681e44916030685330cde2bec8e03354a661130690b888ec9c3d43806095).
- Tercera tanda: Voces con audio y las seis obras sonoras y escritas: [18774dce…](https://umbralmuseo.vercel.app/#/obra/18774dce94bbdd3701b37ba8490b4befe20f68c2b07c7aea0e72498f20e6350b), [e013d989…](https://umbralmuseo.vercel.app/#/obra/e013d989a30ef9637144aea6e21883c37a39fb4c80af3ffe77f48123df0cef44), [907d8a60…](https://umbralmuseo.vercel.app/#/obra/907d8a6090bb14313690f49b2f66b30989387a6c9761d89393046db4a6be2424), [d89a5ac5…](https://umbralmuseo.vercel.app/#/obra/d89a5ac5d501fbe5293b20b82d6f73fee2acdfff49809ce0c38e69116b1499a1), [34886974…](https://umbralmuseo.vercel.app/#/obra/3488697455c610e91b9b48d3e16fa52173bb3891696b4243530e3cc95f444e21), [7650c56e…](https://umbralmuseo.vercel.app/#/obra/7650c56e4291f0ab9da34f0417aab259ab161cb137c88872f2cb07af98588d9b), [33656a1b…](https://umbralmuseo.vercel.app/#/obra/33656a1ba6684df7d5d7e8218917d3b1660d9a007f30c8c4e4e6bbd4301d869c).
- Cuarta tanda: Lluvia, Costanera y Pava con tapa nueva (con sus huellas): [de9f1d60…](https://umbralmuseo.vercel.app/#/obra/de9f1d6046fbb3531c9c8f046cf39fa901157932584c6ae2b63d40ccc179b912), [c2718482…](https://umbralmuseo.vercel.app/#/obra/c2718482c1b2a223252a64beacd1968826ae90bc96910c6b55fbf55ac73a7e72), [9da2e812…](https://umbralmuseo.vercel.app/#/obra/9da2e812e6aa6c03814a44efcdd63bcad3b589758dd8fc0ffd52dd793f1e2094).

## Lo que no está en esta lista

- Una acción rechazada (por ejemplo, continuar una huella retirada): está cubierta por las pruebas automáticas, no por una transacción.
