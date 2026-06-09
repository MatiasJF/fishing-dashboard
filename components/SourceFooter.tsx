/** Pie con atribución de fuentes (CLAUDE.md §7: citar MITECO/AEMET; embalses.net CC BY 4.0). */
export function SourceFooter() {
  return (
    <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
      <p>
        Fuentes:{" "}
        <a className="underline" href="https://open-meteo.com/">Open-Meteo</a>,{" "}
        <a className="underline" href="https://opendata.aemet.es/">AEMET OpenData</a>,{" "}
        <a className="underline" href="https://saihtajo.chtajo.es/">SAIH Tajo (CHTajo)</a> y{" "}
        <a className="underline" href="https://www.embalses.net/pantano-1178-san-juan.html">
          embalses.net
        </a>{" "}
        (datos hidrológicos MITECO, CC BY 4.0). Siluetas de los embalses:{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{" "}
        (ODbL). Cálculo solunar local con SunCalc.
      </p>
      <p className="mt-1">
        Herramienta orientativa para planificar jornadas de pesca. Verifica siempre la normativa de
        vedas vigente.
      </p>
    </footer>
  );
}
