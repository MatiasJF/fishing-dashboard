import { describe, it, expect } from "vitest";
import { hora, fechaCorta, rumbo, num, tendenciaPresion, fuenteLabel } from "./display";

describe("display helpers", () => {
  it("hora extrae HH:mm del ISO de Madrid", () => {
    expect(hora("2026-06-09T13:31:34+02:00")).toBe("13:31");
    expect(hora(null)).toBe("—");
  });

  it("fechaCorta devuelve DD/MM", () => {
    expect(fechaCorta("2026-06-01")).toBe("01/06");
    expect(fechaCorta("2026-06-09T13:31:34+02:00")).toBe("09/06");
  });

  it("rumbo mapea grados a la rosa de los vientos", () => {
    expect(rumbo(0)).toBe("N");
    expect(rumbo(90)).toBe("E");
    expect(rumbo(180)).toBe("S");
    expect(rumbo(270)).toBe("O");
    expect(rumbo(360)).toBe("N");
  });

  it("num usa formato español", () => {
    expect(num(92.03, 1)).toBe("92,0");
    expect(num(1234, 0)).toBe("1234");
  });

  it("tendenciaPresion clasifica caída/subida/estable", () => {
    expect(tendenciaPresion(-3).tono).toBe("baja");
    expect(tendenciaPresion(3).tono).toBe("alza");
    expect(tendenciaPresion(0).tono).toBe("estable");
  });

  it("fuenteLabel traduce ids conocidos", () => {
    expect(fuenteLabel("embalsesnet")).toBe("embalses.net");
    expect(fuenteLabel("desconocida")).toBe("desconocida");
  });
});
