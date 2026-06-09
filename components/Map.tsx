"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
  LayersControl,
  GeoJSON,
  useMap,
} from "react-leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import { colorPorTipo, etiquetaTipo, type TipoZona, type ZonasFeatureCollection } from "@/lib/zonas";

export interface MapProps {
  embalse: { lat: number; lon: number; nombre: string };
  estacion?: { lat: number; lon: number; codigo: string };
  hidro: { volumen_hm3: number; llenado_pct: number; nivel_msnm?: number; capacidad_hm3?: number };
  viento: { kmh: number; deg: number; rumbo: string };
  zonas?: ZonasFeatureCollection | null;
}

function fmt(n: number, d = 0) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Pin SVG como divIcon (evita depender de los assets de icono de Leaflet). */
function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="26" height="36" viewBox="0 0 26 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.3 13 23 13 23s13-13.7 13-23C26 5.8 20.2 0 13 0z" fill="${color}"/>
      <circle cx="13" cy="13" r="5" fill="#fff"/></svg>`,
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -32],
  });
}

function arrowIcon(deg: number) {
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${deg}deg); font-size:28px; line-height:1; filter: drop-shadow(0 1px 1px rgba(0,0,0,.4))">⬇</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function estiloZona(feature?: Feature) {
  const props = feature?.properties as { tipo?: TipoZona; color?: string } | undefined;
  const color = props?.color ?? (props?.tipo ? colorPorTipo(props.tipo) : "#64748b");
  return { color, fillColor: color, fillOpacity: 0.25, weight: 2 };
}

function popupZona(feature: Feature, layer: { bindPopup: (html: string) => void }) {
  const p = feature.properties as { nombre?: string; tipo?: TipoZona; nota?: string };
  const tipo = p.tipo ? etiquetaTipo(p.tipo) : "";
  layer.bindPopup(
    `<strong>${p.nombre ?? ""}</strong><br/>${tipo}${p.nota ? `<br/>${p.nota}` : ""}`
  );
}

/** Ajusta la vista para que entren la silueta del embalse y los marcadores. */
function FitToData({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 1) map.setView(puntos[0], 13);
    else if (puntos.length > 1) map.fitBounds(puntos, { padding: [30, 30] });
  }, [map, puntos]);
  return null;
}

export default function Map({ embalse, estacion, hidro, viento, zonas }: MapProps) {
  const center: [number, number] = [embalse.lat, embalse.lon];

  // Puntos para el encuadre: vértices de las zonas + marcadores.
  const puntos: [number, number][] = [center];
  if (estacion) puntos.push([estacion.lat, estacion.lon]);
  if (zonas) {
    for (const f of zonas.features)
      for (const ring of f.geometry.coordinates)
        for (const [lon, lat] of ring) puntos.push([lat, lon]);
  }

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
      <FitToData puntos={puntos} />
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Mapa">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite">
          <TileLayer
            attribution="&copy; Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        {zonas && zonas.features.length > 0 && (
          <LayersControl.Overlay checked name="Zonas de pesca">
            <GeoJSON
              data={zonas as unknown as GeoJsonObject}
              style={estiloZona}
              onEachFeature={popupZona}
            />
          </LayersControl.Overlay>
        )}
      </LayersControl>

      {/* Embalse (vaso): marcador con datos hidrológicos en vivo */}
      <CircleMarker center={center} radius={10} pathOptions={{ color: "#0ea5e9", fillOpacity: 0.5 }}>
        <Tooltip>{embalse.nombre}</Tooltip>
        <Popup>
          <strong>{embalse.nombre}</strong>
          <br />
          {fmt(hidro.volumen_hm3, 1)} hm³
          {hidro.capacidad_hm3 ? ` de ${fmt(hidro.capacidad_hm3)}` : ""} ({fmt(hidro.llenado_pct, 1)} %)
          {hidro.nivel_msnm !== undefined && (
            <>
              <br />
              Cota: {fmt(hidro.nivel_msnm, 1)} msnm
            </>
          )}
        </Popup>
      </CircleMarker>

      {/* Estación SAIH (coords reales) */}
      {estacion && (
        <Marker position={[estacion.lat, estacion.lon]} icon={pinIcon("#16a34a")}>
          <Tooltip>Estación SAIH {estacion.codigo}</Tooltip>
          <Popup>
            <strong>Estación SAIH {estacion.codigo}</strong>
            <br />
            Origen de los datos hidrológicos (CHTajo).
          </Popup>
        </Marker>
      )}

      {/* Dirección del viento (en vivo) sobre el vaso */}
      <Marker position={center} icon={arrowIcon(viento.deg)}>
        <Tooltip>
          Viento del {viento.rumbo} · {fmt(viento.kmh)} km/h
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
