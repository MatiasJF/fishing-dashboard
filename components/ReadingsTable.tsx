import type { Reading, Snapshot } from "@/lib/types";
import { fuenteLabel, hora, fechaCorta, num } from "@/lib/display";

interface Fila {
  magnitud: string;
  valor: string;
  reading: Reading<number>;
}

function momento(fetched_at: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(fetched_at) ? fechaCorta(fetched_at) : hora(fetched_at);
}

function filasDe(snapshot: Snapshot): Fila[] {
  const m = snapshot.meteo;
  const h = snapshot.hidro;
  const filas: Fila[] = [
    { magnitud: "Temperatura aire", valor: `${num(m.temp_c.value, 1)} °C`, reading: m.temp_c },
    { magnitud: "Humedad", valor: `${num(m.humedad_pct.value)} %`, reading: m.humedad_pct },
    { magnitud: "Presión", valor: `${num(m.presion_hpa.value, 1)} hPa`, reading: m.presion_hpa },
    { magnitud: "Δ presión 24 h", valor: `${num(m.presion_delta_24h.value, 1)} hPa`, reading: m.presion_delta_24h },
    { magnitud: "Δ presión 48 h", valor: `${num(m.presion_delta_48h.value, 1)} hPa`, reading: m.presion_delta_48h },
    { magnitud: "Viento", valor: `${num(m.viento_kmh.value)} km/h`, reading: m.viento_kmh },
    { magnitud: "Dirección viento", valor: `${num(m.viento_dir_deg.value)}°`, reading: m.viento_dir_deg },
    { magnitud: "Rachas", valor: `${num(m.rachas_kmh.value)} km/h`, reading: m.rachas_kmh },
    { magnitud: "Volumen", valor: `${num(h.volumen_hm3.value, 1)} hm³`, reading: h.volumen_hm3 },
    { magnitud: "Llenado", valor: `${num(h.llenado_pct.value, 1)} %`, reading: h.llenado_pct },
  ];
  if (h.nivel_msnm) filas.push({ magnitud: "Nivel", valor: `${num(h.nivel_msnm.value, 1)} msnm`, reading: h.nivel_msnm });
  if (h.caudal_entrada_m3s) filas.push({ magnitud: "Caudal entrada", valor: `${num(h.caudal_entrada_m3s.value, 2)} m³/s`, reading: h.caudal_entrada_m3s });
  if (h.caudal_salida_m3s) filas.push({ magnitud: "Desembalse", valor: `${num(h.caudal_salida_m3s.value, 2)} m³/s`, reading: h.caudal_salida_m3s });
  return filas;
}

export function ReadingsTable({ snapshot }: { snapshot: Snapshot }) {
  const filas = filasDe(snapshot);
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-3">Magnitud</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Fuente</th>
            <th className="px-4 py-3">Dato</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filas.map((f) => (
            <tr key={f.magnitud}>
              <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-300">{f.magnitud}</td>
              <td className="px-4 py-2.5 font-medium tabular-nums">{f.valor}</td>
              <td className="px-4 py-2.5 text-zinc-500">{fuenteLabel(f.reading.source)}</td>
              <td className="px-4 py-2.5 tabular-nums text-zinc-500">{momento(f.reading.fetched_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
