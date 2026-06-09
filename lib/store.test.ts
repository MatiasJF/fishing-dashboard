import { describe, it, expect } from "vitest";
import { getSites, getSite, getDefaultSite } from "./store";

describe("store · sitios", () => {
  it("getSites devuelve embalses con los campos esenciales", () => {
    const sites = getSites();
    expect(sites.length).toBeGreaterThan(0);
    for (const s of sites) {
      expect(s.slug).toBeTruthy();
      expect(s.nombre).toBeTruthy();
      expect(typeof s.lat).toBe("number");
      expect(typeof s.lon).toBe("number");
      expect(s.comunidad).toBeTruthy();
    }
  });

  it("incluye San Juan con su token SAIH y avisos", () => {
    const sj = getSite("san-juan");
    expect(sj).toBeDefined();
    expect(sj!.saih?.token).toBeTruthy();
    expect(sj!.comunidad).toBe("Madrid");
    expect((sj!.avisos ?? []).length).toBeGreaterThan(0);
  });

  it("slugs únicos", () => {
    const slugs = getSites().map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("getSite desconocido → undefined; getDefaultSite existe", () => {
    expect(getSite("no-existe")).toBeUndefined();
    expect(getDefaultSite().slug).toBeTruthy();
  });
});
