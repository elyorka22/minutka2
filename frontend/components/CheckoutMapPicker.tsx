"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CHUST_DEFAULT_COORDS } from "../lib/map-defaults";

function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Faqat geolokatsiya (flyTrigger oshganda) — map click bilan chalkashmaydi */
function FlyToPosition({
  lat,
  lng,
  flyTrigger,
}: {
  lat: number;
  lng: number;
  flyTrigger: number;
}) {
  const map = useMap();
  const prevTrigger = useRef(0);
  useEffect(() => {
    if (flyTrigger > prevTrigger.current) {
      prevTrigger.current = flyTrigger;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    }
  }, [flyTrigger, lat, lng, map]);
  return null;
}

export function CheckoutMapPicker({
  lat,
  lng,
  onChange,
  height = 280,
  flyTrigger = 0,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
  /** Har safar oshganda (masalan geolokatsiya) xarita yangi nuqtaga «uchadi» */
  flyTrigger?: number;
}) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const centerLat = Number.isFinite(lat) ? lat : CHUST_DEFAULT_COORDS.lat;
  const centerLng = Number.isFinite(lng) ? lng : CHUST_DEFAULT_COORDS.lng;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={16}
      style={{
        height,
        width: "100%",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
      }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToPosition lat={lat} lng={lng} flyTrigger={flyTrigger} />
      <MapClickHandler onPick={onChange} />
      <Marker
        position={[lat, lng]}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng();
            onChange(p.lat, p.lng);
          },
        }}
      />
    </MapContainer>
  );
}
