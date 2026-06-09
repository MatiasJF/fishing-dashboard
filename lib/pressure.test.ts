import { describe, it, expect } from "vitest";
import { pressureDeltas, findHourIndex } from "./pressure";

// 49 horas (de -48 h a 0). pressures[i] = 1000 + i.
const times = Array.from({ length: 49 }, (_, i) => {
  const base = new Date("2026-06-07T00:00:00Z").getTime() + i * 3600_000;
  return new Date(base).toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
});
const pressures = times.map((_, i) => 1000 + i);

describe("findHourIndex", () => {
  it("encuentra la hora exacta", () => {
    expect(findHourIndex(times, times[48])).toBe(48);
  });
  it("trunca minutos a la hora", () => {
    const conMinutos = times[48].slice(0, 13) + ":37";
    expect(findHourIndex(times, conMinutos)).toBe(48);
  });
});

describe("pressureDeltas", () => {
  it("calcula deltas 24/48 h hacia atrás", () => {
    const r = pressureDeltas(times, pressures, times[48], pressures[48]);
    expect(r.delta24h).toBe(24); // 1048 - 1024
    expect(r.delta48h).toBe(48); // 1048 - 1000
  });

  it("delta = 0 cuando no hay histórico suficiente", () => {
    const r = pressureDeltas(times, pressures, times[10], pressures[10]);
    expect(r.delta48h).toBe(0); // idx 10 - 48 < 0
  });
});
