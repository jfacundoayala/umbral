import { describe, expect, it } from "vitest";
import { cuentaDeCodigo } from "../codigo-encuentro";

const G = "GAUUBHLF6KMFVJS2YK2WNLAFFAVKIAMJQJ34DZUJNZMJOW5SH7BZIMMB";

describe("cuentaDeCodigo", () => {
  it("lee la cuenta sola, con espacios o en minúsculas", () => {
    expect(cuentaDeCodigo(G)).toBe(G);
    expect(cuentaDeCodigo(`  ${G}\n`)).toBe(G);
    expect(cuentaDeCodigo(G.toLowerCase())).toBe(G);
  });

  it("encuentra la cuenta dentro de un enlace de pago", () => {
    expect(cuentaDeCodigo(`web+stellar:pay?destination=${G}&amount=1`)).toBe(G);
  });

  it("rechaza lo que no es una cuenta", () => {
    expect(cuentaDeCodigo("")).toBeNull();
    expect(cuentaDeCodigo("hola")).toBeNull();
    expect(cuentaDeCodigo(G.slice(0, 40))).toBeNull();
    expect(cuentaDeCodigo("CBPXN2SA3RPEUXQIOSWVBSQQ2ENJCZWT2E4ZPUEG3SR34RMANEMFV3TP")).toBeNull();
  });
});
