"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { KIND_COLOR, KIND_LABEL, whenLabel, type Disruption } from "@/lib/disruptions";

const DHAKA: [number, number] = [23.7808, 90.4093];

function Frame({ items, focus }: { items: Disruption[]; focus: string | null }) {
  const map = useMap();
  useEffect(() => {
    const target = items.find((d) => d.id === focus);
    if (target) {
      map.setView([target.lat, target.lon], 14);
    } else if (items.length > 0) {
      map.fitBounds(items.map((d) => [d.lat, d.lon] as [number, number]), { padding: [40, 40], maxZoom: 13 });
    }
  }, [items, focus, map]);
  return null;
}

export default function DisruptionMap({ items, focus }: { items: Disruption[]; focus: string | null }) {
  return (
    <MapContainer center={DHAKA} zoom={11} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <Frame items={items} focus={focus} />
      {items.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.lat, d.lon]}
          radius={d.id === focus ? 14 : 10}
          pathOptions={{
            color: KIND_COLOR[d.kind],
            fillColor: KIND_COLOR[d.kind],
            fillOpacity: d.status === "planned" ? 0.25 : 0.7,
            weight: 2,
            dashArray: d.status === "planned" ? "4 4" : undefined,
          }}
        >
          <Popup>
            <strong>{KIND_LABEL[d.kind]}</strong>: {d.place}
            <br />
            {d.title}
            <br />
            <span style={{ color: "#71717a" }}>{whenLabel(d)}</span>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
