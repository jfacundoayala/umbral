# UMBRAL — Especificación

Qué es UMBRAL, qué se decidió y qué funciona hoy. Si otro documento dice otra cosa, vale lo que dice acá.
Cada cambio se anota al final, con fecha y motivo.

Última actualización: 27/11/2026.

## Núcleo: lo que no se contradice

1. Leer es gratis y sin cuenta, siempre.
2. Participar se paga: dejar una huella y continuarla.
3. El artista que expuso la obra cobra en cada continuación de toda la cadena, nunca menos del 30%. El público paga por ser parte y no cobra: el dinero va a quien creó la obra, a la sala y a UMBRAL.
4. El dinero de cada artista queda anotado a su nombre en el contrato y lo retira él, sin pedirnos permiso.
5. A la red va un código del contenido, nunca el contenido.
6. Sirve para cualquier artista o museo: obras, objetos, esculturas, artesanías; artistas conocidos, locales, artesanos o under. Las esculturas de Resistencia son el ejemplo de la demo.
7. La identidad visual es la de [docs/identidad/identidad.jpg](identidad/identidad.jpg).
8. No prometemos lo que no hacemos: lo simulado se avisa.

## 1. Qué somos

UMBRAL — "Más allá de lo tangible". Un museo vivo en internet: un artista o un museo expone una obra, la gente la continúa con lo que esa obra le despertó, y todo queda unido en una constelación. Cada participación mueve dinero hacia quien creó.

## 2. Qué problema resolvemos

- El artista cobra una sola vez (o nunca) y no se entera de lo que provoca su obra.
- Lo que la gente siente o recuerda frente a una obra no queda en ningún lado.
- Las redes muestran la obra un día y la entierran; el artista depende de que una plataforma le liquide.

## 3. Cómo lo resolvemos

1. Leer es gratis y sin cuenta.
2. Dejar una obra (una "huella") cuesta 2 USDC o 20 XLM.
3. Continuar una huella cuesta 1 USDC o 10 XLM. Una parte va al artista que expuso la obra, siempre.
4. Quien quiera apoya con el monto que elija.
5. El contrato anota a nombre del artista lo que le toca; el artista lo retira cuando quiere.
6. La constelación muestra todo lo que una obra provocó.

## 4. Para quién

| Quién | Por qué le sirve |
|---|---|
| Cliente ideal: artista independiente o museo/sala chica con obra a la vista del público | Cobra por lo que su obra provoca y ve el mapa de eso |
| El público: quien visita, mira y acompaña a un artista | Lee gratis; si participa, queda dentro de la obra |
| Instituciones (más adelante) | Eventos de sala con números a la vista |

Caso de la demo: las esculturas de Resistencia, Chaco. Es el ejemplo, no el límite del producto.
No decimos que hay ni que no hay acuerdo con ninguna institución.

## 5. Por qué blockchain y por qué Stellar

- Las reglas del reparto son públicas y el saldo del artista no depende de que nosotros le paguemos.
- El registro (quién, de qué huella nació, cuándo) lo comprueba cualquiera.
- Stellar: mover 1 USDC cuesta una fracción de centavo y llega en segundos.
- Para la gente no tiene que ser técnico: se entra eligiendo una billetera en una ventana (Stellar Wallets Kit), y más adelante con correo. Las palabras son "huella", "continuar", "apoyar", "cobrar".

## 6. Modelo de negocio (decidido)

| Acción | Precio | UMBRAL | Autores |
|---|---|---|---|
| Leer | Gratis | — | — |
| Dejar una huella | 2 USDC o 20 XLM | 100% | — |
| Continuar la obra original | 1 USDC o 10 XLM | 20% | 80% al artista |
| Continuar una respuesta | 1 USDC o 10 XLM | 20% | 80% al artista original. Quien respondió no cobra |
| Apoyar cualquier huella | Libre | 20% | 80% al artista de esa obra |

### La muestra con fecha de una sala (programada en el contrato; nombre a confirmar)

Nombre provisorio: convocatoria, apertura o temporada. Lo elige Lucía.

- Una sala convoca a dejar huellas alrededor de una muestra, con una consigna y fechas de inicio y de fin.
- La sala no paga por abrir: carga un fondo (mínimo 20 USDC) que son huellas invitadas para sus artistas y visitantes.
- Cualquiera puede sumar al fondo: un comercio, un vecino, una marca. Es un padrino: gana visibilidad (su nombre aparece en la muestra), no dinero.
- Mientras dura, la sala recibe una parte de cada continuación hecha ahí. Esa parte se acuerda para cada muestra, entre 0% y 40%, según el peso del museo, su público y su alcance. Sale de la parte del artista, que nunca baja del 30%. Ejemplos: muestra común, 50% artista, 20% sala, 30% UMBRAL; museo de mucho peso, 30% artista, 40% sala, 30% UMBRAL.
- Al cerrar, la constelación queda sellada como la obra colectiva de esa muestra, con su comprobante público.
- Lo que no se usó del fondo lo puede retirar la sala que lo cargó (`retirar_fondo`).

Programado en el contrato: UMBRAL abre la muestra a pedido de la sala, dura como mucho 90 días, una sala no tiene dos a la vez, y la parte de la sala (de 0% a 40%, publicada al abrir la muestra) sale de la parte del artista sin bajarlo nunca del 30%. El reparto de la muestra vale para las obras de un artista solo si ese artista lo aceptó con su firma, viendo el porcentaje; sin su firma, ese artista queda afuera de la muestra: su obra no aparece ahí, no lleva el sello y no recibe la difusión de la sala; sigue en UMBRAL con el reparto de siempre. Una obra entra a una muestra cuando la sala la eligió y el artista firmó. El acuerdo entre la sala y UMBRAL es anterior y no depende de cada artista. El cierre sellado y el fondo mínimo no están programados.

Cómo se elige la parte de la sala, por lo que la sala aporta:

| La sala aporta | Su parte |
|---|---|
| Solo difusión o espacio virtual | hasta 10% |
| Lugar físico y difusión | hasta 20% |
| Lugar, difusión y público comprobado | hasta 30% |
| Todo lo anterior en una institución con convocatoria grande | hasta 40% |

La transmisión en vivo se define en conjunto, caso por caso.

Los precios son una hipótesis: no están validados con gente real.

### Idea a futuro: una escultura nueva hecha entre todos (no entra en esta entrega)

- La comunidad junta fondos para encargar una escultura nueva. Cada aporte es una huella: la constelación de la obra empieza antes de que la obra exista.
- El dinero queda en custodia y se libera al escultor por etapas (boceto, avance, emplazamiento). Para eso sirve Trustless Work.
- Los padrinos ganan visibilidad, no dinero.
- Emplazarla en la calle depende del municipio y de quien cuida el patrimonio escultórico. Sin ese permiso no se promete un lugar.
- Los aportes son donaciones para una obra, no una inversión.

## 7. Qué es real hoy

| Parte | Estado |
|---|---|
| Contrato (Soroban, soroban-sdk 30) | Hecho. 56 pruebas pasan. Desplegado en la red de pruebas: `CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP`. |
| Maqueta navegable (`docs/diseno/prototipo/`) | Hecha con la identidad anterior y dinero de mentira. Quedó como registro del proceso. |
| App real (`app/`) | Hecha: portada, cielo de obras, constelación, ficha, exponer, continuar, apoyar, cobrar y favoritos. Probada de punta a punta en la red de pruebas el 27/11/2026 (abrir 20 XLM, continuar 10, apoyar 5, la artista cobró 10,5 y su saldo quedó en 0). Guion en `docs/demo-jurado.md`, guía para quienes prueban en `docs/guia-pruebas.md`. También: audio, sello "Estuve ahí", placa con QR firmada y constelación en 3D. 103 pruebas de la app y 17 recorridos en el navegador. |
| Servidor: retirar | Hecho: borra el contenido de una huella solo si en la red figura retirada. Probado. |
| Base de datos (Supabase, proyecto `umbral`) | Hecha: `supabase/esquema.sql` aplicado. 30 pruebas de reglas de acceso pasan. |
| Servidor: publicar | Hecho: publica una huella solo si el pago está en la red y el contenido coincide con el código. Probado con un pago real en la red de pruebas. |
| Servidor: favoritos | Hecho: guarda o quita un favorito solo con la firma de la billetera (SEP-53). Probado. |
| Comprobantes en la red de pruebas | Hechos: 19 transacciones en `docs/txs.md`. |
| Web publicada | Hecha: [umbralmuseo.vercel.app](https://umbralmuseo.vercel.app), publicada el 27/11/2026. Con 19 obras y sus huellas en la red de pruebas. |
| Prueba con gente real | Falta. |
| Video y entrega | Vence el sábado 28/11/2026 a las 23:59. |

## 8. Identidad

- La identidad la cerró Lucía el 27 y 28/11 (reemplaza la anterior con cobalto, Bodoni Moda e Inter).
- Colores: Marfil #F2EDE3, Tinta #1E1B18, Petróleo #314B49 (acción y logo), Musgo #5E6654, Gris mineral #626B6A, Niebla #D5D9D3, Grafito #243330, Noche #0B1613.
- Letras: Manrope para todo lo funcional; Cormorant Garamond solo en títulos, nombres de obras y frases destacadas (en prueba).
- Logo: "resonancia orgánica", tres trazos curvos y un punto en el centro (app/src/Isotipo.tsx). El nombre va en mayúsculas espaciadas.
- Constelación: se puede arrastrar y girar, y muestra el nombre o la frase de cada huella al tocarla.

## 9. Reglas del contrato

- Solo cobra en monedas que el administrador habilitó.
- Quien paga firma. Nadie puede cobrar el saldo de otro.
- El artista que expuso la obra cobra en toda la cadena de continuaciones.
- Los cambios de precios o porcentajes valen solo hacia adelante y dejan un aviso público.
- A la red va un código del contenido, nunca el contenido.
- El contrato calcula el identificador de cada huella con la cuenta del autor y el código del contenido. Nadie puede ocupar el de otro.
- La parte del artista en una continuación nunca baja del 30%. Ni el administrador puede.
- Quien paga firma también el precio máximo que acepta. Si el precio subió, la acción falla en vez de cobrar de más.
- Un precio no puede ser cero.
- El aviso de una huella retirada dice si la retiró su autor o la moderación.
- Cada vez que el fondo de una sala paga una huella, queda un aviso público.
- El fondo de una sala solo paga la huella de las cuentas que el museo de esa sala invitó, una vez por cuenta.
- El administrador puede reemplazar el código del contrato (`actualizar`) sin perder huellas, saldos ni fondos. En la red principal esa llave pasa a varias firmas, con aviso previo de cada cambio.

## 10. Decisiones abiertas

1. Muestra con fecha: programada en el contrato. Falta su pantalla y su nombre.
2. Ingreso con correo: decidido como paso siguiente, no se programa en esta entrega (ver registro de cambios).
3. Nombre y logo finales (Lucía).
4. Para quién lo contamos en el video (Lucía y Facundo). Opción en estudio: los escultores de Resistencia y la gente que pasa frente a sus obras. El caso de las esculturas nació para validar identidad cultural y territorio; falta decidir si es el centro o un ejemplo. La decisión se toma con investigación que la respalde.
5. Qué obras usa la demo (Lucía y Facundo). Opciones: obras argentinas de dominio público abiertas por un "Museo de ejemplo" (lista con licencias verificadas), obras reales con permiso de su artista o museo (esculturas de Resistencia, Museo de Medios), u obras ficticias. Nada se carga hasta decidirlo.
6. Mostrar "el 80% va a la artista" antes de pagar: solo si lo recomiendan los mentores. El precio se muestra siempre.
7. Si decimos "Museo vivo", "Más allá de lo tangible" o las dos (Lucía).
8. Cómo funciona el encuentro presencial (pop-up) y qué ventaja tiene ir en persona (Lucía). Hoy el contrato permite que una sala invite huellas pagadas por su fondo.

## 11. Lo que no hacemos en esta entrega

Mainnet, dinero real, NFT, reventa, app de celular, menores de 18.

## Registro de cambios

- 27/11/2026 — Se escribe esta versión. Reemplaza a la versión anterior. Contrato pasa a soroban-sdk 30, suma avisos de reparto y de cambio de reglas, y 26 pruebas.
- 27/11/2026 — Decisiones cerradas por Facundo: el contrato calcula el identificador; piso de 30% para los autores; contrato fijo; el fondo de sala solo paga a invitados del museo. Los eventos de sala entran en el modelo. 29 pruebas.
- 27/11/2026 — Se agrega el núcleo. El reparto interno de tareas sale de este documento.
- 27/11/2026 — Ingreso con Stellar Wallets Kit. Nueva versión de la muestra con fecha. `docs/cuidado.md` pasa a versión 2 y se suma `docs/arquitectura.md`. Los documentos viejos salen del repositorio.
- 27/11/2026 — Muestra con fecha: el fondo no se devuelve y el padrino gana visibilidad, no dinero. Se anota la idea a futuro de la escultura nueva.
- 27/11/2026 — Decisión de Facundo: el público no cobra. Continuar reparte siempre 50% al artista y 50% a UMBRAL, en cualquier nivel de la cadena, y el apoyo va 70% al artista. Tras dos auditorías del contrato, se suma precio máximo firmado, rechazo de precio cero, control de montos, renovación de vigencia en cada acción y avisos más completos. 40 pruebas.
- 27/11/2026 — Decisión de Facundo: continuar reparte 70% al artista y 30% a UMBRAL, igual que el apoyo. Es el reparto de lanzamiento: la comisión de UMBRAL puede subir más adelante, sin bajar nunca al artista del 30%.
- 27/11/2026 — Decididos: mirar sin cuenta y participar con billetera (el correo queda para después de la entrega). Largos: título hasta 20 palabras, descripción hasta 400 caracteres, respuesta hasta 300.
- 27/11/2026 — La pregunta de los cien años se sacó de la portada.
- 27/11/2026 — Decididos: durante la muestra de una sala, 50% artista, 20% sala, 30% UMBRAL (sin programar). Antes de cobrar, un filtro automático frena insultos y textos vacíos; la moderación puede retirar una huella después.
- 27/11/2026 — Decididos: quien expone una obra puede usar texto, foto o audio; quien responde solo escribe. Favoritos: gratis, solo con cuenta e ingreso hecho. Base de datos: Supabase, con las claves fuera del repositorio. Orden de trabajo: contrato en la red de pruebas, acciones con texto y foto, favoritos, audio, sello de pop-up; la meta es llegar con todo.
- 27/11/2026 — Paso siguiente decidido: entrar con correo, para que participe gente que nunca usó cripto. La persona entra con su correo y UMBRAL la guía para crear su billetera de Stellar. Suma usuarios nuevos a la red. UMBRAL no cambia pesos por cripto ni cobra con tarjeta: eso lo hacen servicios habilitados, no nosotros.
- 27/11/2026 — Decididos: en favoritos se guardan obras y huellas. El cielo muestra primero las obras con más huellas, con un botón para ver las más nuevas. Precio en XLM: 20 exponer una obra y 10 continuar (hipótesis). Audio: solo al exponer una obra, hasta 30 segundos, propio o con permiso; una canción conocida va como enlace. Foto y audio se publican al pagar y la moderación los puede retirar. El sábado a la mañana lo prueban cinco personas de afuera del equipo con una guía de tres pasos.
- 27/11/2026 — Cierre del repaso de decisiones con Facundo. Dos notas: las pantallas siguen el orden del video (una frase del producto, el problema, un caso normal, un caso con un número concreto, y el comprobante en la red como cierre); y la muestra de una sala se programa una vez confirmado su reparto.
- 27/11/2026 — El contrato suma la muestra con fecha de una sala (50% artista, 20% sala, 30% UMBRAL mientras dura). 46 pruebas.
- 27/11/2026 — Decisión de Facundo: la parte de la sala se elige en cada muestra, entre 0% y 40%, según la importancia del museo, su concurrencia y su popularidad. 48 pruebas.
- 27/11/2026 — El reparto de una muestra necesita la firma del artista: sin ella, sus obras siguen con el reparto de siempre. Escala para elegir la parte de la sala según lo que aporta. 51 pruebas.
- 27/11/2026 — Decisión de Facundo: el artista que no firma queda afuera de la muestra. La sala y UMBRAL ya tienen su acuerdo; cada artista decide si entra.
- 27/11/2026 — Con el OK de Facundo, contrato desplegado en la red de pruebas (70% artista; 2 y 1 USDC; 20 y 10 XLM) y 18 transacciones del guion con sus comprobantes.
- 27/11/2026 — Base de datos aplicada en Supabase y probada; funciones `publicar` y `favoritos` desplegadas y probadas. Proyecto del equipo publicado en Circli. Repositorio ordenado: fuera material ajeno al proyecto, los bocetos de logo y los restos de plantilla; README reescrito (el público no cobra en ningún caso).
- 27/11/2026 — App: audio en las obras y sello "Estuve ahí" en pantalla, probados en la red. Quien expone una obra declara sus derechos (autoría, dominio público o autorización); la base lo exige y entra en el código del contenido. En Argentina no hay libertad de panorama: una escultura en la calle necesita permiso de su autor. Se suman `docs/terminos.md`, `docs/privacidad.md` (datos en San Pablo, Brasil) y `docs/contrato.md`. La marca "UMBRAL" sola está tomada en el INPI en las clases 41 y 35: se presenta con este nombre y la marca se decide antes de producción. Clientes que pagan: artistas independientes y salas. Video de 2 minutos con la voz de Facundo y sin música. Equipo: Facundo Ayala y Lucía Paz.
- 27/11/2026 — Auditoría: la firma del artista vale solo para la muestra exacta que vio (fechas y parte de la sala); el museo puede retirar lo que no se usó del fondo; el administrador puede actualizar el código del contrato. Rust fijo en 1.100.0 para compilar igual que lo desplegado. 55 pruebas. Hace falta desplegar el contrato de nuevo para que valga.
- 27/11/2026 — Con el OK de Facundo, segundo contrato desplegado en la red de pruebas con los arreglos de la auditoría: `CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP`. Se rehicieron las transacciones del guion (19, con el retiro del fondo de la sala) en `docs/txs.md`. El primer contrato queda en la red y la app ya no lo usa. El fondo de una sala ya no queda trabado: el museo puede retirar lo que no se usó.
- 28/11/2026 — Decisión de Facundo: el reparto de lanzamiento pasa a 80% para el artista y 20% para UMBRAL, al continuar y al apoyar. En una muestra no cambia: UMBRAL 30%, la sala hasta 40% y el artista nunca menos del 30%.
- 28/11/2026 — Este documento pasa a `docs/spec.md`. La maqueta navegable con la identidad anterior pasa a `docs/diseno/prototipo/`.
