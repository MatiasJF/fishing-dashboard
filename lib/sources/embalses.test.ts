import { describe, it, expect } from "vitest";
import { parseEmbalses, parseEsNumber } from "./embalses";

describe("parseEsNumber", () => {
  it("convierte formato español a Number", () => {
    expect(parseEsNumber("127")).toBe(127);
    expect(parseEsNumber("92,03")).toBe(92.03);
    expect(parseEsNumber("1.234,56")).toBe(1234.56);
  });
});

describe("parseEmbalses", () => {
  it("extrae volumen, % y fecha del texto real", () => {
    // Markup real de embalses.net (etiqueta y valores en <div> separados).
    const html = `<div class="Titulo"><strong>Agua embalsada (01-06-2026):</strong></div>
      <div class="Resultado"><strong>127</strong></div>
      <div class="Unidad"><strong>hm<sup style="font-size:10px">3</sup></strong></div>
      <div class="Resultado"><strong>92,03</strong></div>
      <div class="Unidad2"><strong>%</strong></div>`;
    const r = parseEmbalses(html);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.volumen_hm3).toBe(127);
    expect(r.data.llenado_pct).toBe(92.03);
    expect(r.data.fecha_dato).toBe("2026-06-01");
    expect(r.data.source).toBe("embalsesnet");
  });

  it("ok:false si no encuentra el patrón", () => {
    expect(parseEmbalses("<html>sin datos</html>").ok).toBe(false);
  });
});
