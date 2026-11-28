// Qué obras llevan placa con QR: las que existen en el mundo. Los casos son las obras reales del cielo.
import { describe, expect, it } from "vitest";
import { esObraFisica } from "../fisica";

const obra = (titulo: string, descripcion: string, audio = false) => ({ titulo, descripcion, audio_ruta: audio ? "a.mp3" : null });

describe("esObraFisica", () => {
  it.each([
    ["Entre raíces", "Dos formas talladas en un mismo tronco de algarrobo nacen juntas, se separan y vuelven a encontrarse."],
    ["Frida", "Frida fue la compañera de Fernando, el perro de mi infancia. La hice en chapa oxidada, recostada como esperaba en la puerta."],
    ["Siesta", "Tres franjas para la hora en que el pueblo se detiene. Acrílico sobre tela."],
    ["Guarda del mediodía", "Tejido en telar de cuatro pedales con algodón chaqueño y tintes de cáscara de cebolla y yerba."],
    ["Cestería de palma", "Hojas de palma caranday, de los palmares del Chaco, entrelazadas una a una con un gesto repetido y paciente."],
    ["Trama de algodón", "El algodón chaqueño, crudo y sin teñir, se vuelve relieve, nudo y vacío. Cada puntada recuerda a las manos que lo cosecharon."],
    ["Quebracho al atardecer", "Grabado en linóleo, impreso a mano en mi taller de Fontana."],
    ["El río que se mueve", "Dibujé con tinta, línea por línea, el agua del Paraná frente a Barranqueras."],
    ["Cianotipo del patio", "Apoyé helechos del patio de mi abuela sobre papel sensible y los dejé al sol del mediodía."],
    ["Vereda de lapacho", "Imprimí las baldosas y las flores en dos pasadas, con el registro corrido a propósito."],
    ["Mural de los oficios", "Mural en la pared de un club: algodoneros, costureras, albañiles y maestras."],
    ["Óleo", "Un óleo chico, pintado en la galería de casa."],
  ])("%s es física: lleva placa", (titulo, descripcion) => {
    expect(esObraFisica(obra(titulo, descripcion))).toBe(true);
  });

  it.each([
    ["Estuve en la puerta", "La noche del encuentro hice fila en la vereda. En la puerta escanearon mi código y entré. Así me quedó grabada: la luz de adentro, tibia."],
    ["Carta a quienes todavía no llegaron", "Si estás leyendo esto dentro de cien años, ojalá Resistencia siga teniendo árboles, esculturas y personas que se detengan a conversar."],
    ["Cuando las puertas quedaban abiertas", "Cuando era chica, en mi barrio las puertas quedaban abiertas. A la tardecita sacábamos las sillas a la vereda."],
    ["La sopa paraguaya de Mirta", "Esta es la receta de mi abuela Mirta, quien llegó desde Paraguay a los diez años."],
    ["El río que canta", "Un minuto del río Negro corriendo bajo un puente de la ciudad, grabado al amanecer."],
    ["Sin descripción", ""],
  ])("%s no es física: no lleva placa", (titulo, descripcion) => {
    expect(esObraFisica(obra(titulo, descripcion))).toBe(false);
  });

  it("una obra de sonido no lleva placa aunque nombre un material", () => {
    expect(esObraFisica(obra("Lluvia en el techo de chapa", "Escuchábamos la lluvia sobre la chapa de madera.", true))).toBe(false);
  });
});
