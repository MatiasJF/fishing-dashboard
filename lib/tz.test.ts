import { describe, it, expect } from "vitest";
import { offsetMinutes, toMadridISO, madridYMD, madridStartOfDay } from "./tz";

describe("tz (Europe/Madrid)", () => {
  it("offset es +120 min en verano (CEST) y +60 en invierno (CET)", () => {
    expect(offsetMinutes(new Date("2026-06-09T12:00:00Z"))).toBe(120);
    expect(offsetMinutes(new Date("2026-01-09T12:00:00Z"))).toBe(60);
  });

  it("toMadridISO formatea con el offset correcto", () => {
    expect(toMadridISO(new Date("2026-06-09T12:00:00Z"))).toBe(
      "2026-06-09T14:00:00+02:00"
    );
    expect(toMadridISO(new Date("2026-01-09T12:00:00Z"))).toBe(
      "2026-01-09T13:00:00+01:00"
    );
  });

  it("madridYMD usa el día natural de Madrid (no UTC)", () => {
    // 23:30 UTC del 9 jun = 01:30 del 10 jun en Madrid.
    expect(madridYMD(new Date("2026-06-09T23:30:00Z"))).toEqual({
      year: 2026,
      month: 6,
      day: 10,
    });
  });

  it("madridStartOfDay devuelve las 00:00 locales", () => {
    const start = madridStartOfDay(new Date("2026-06-09T12:00:00Z"));
    expect(toMadridISO(start)).toBe("2026-06-09T00:00:00+02:00");
  });
});
