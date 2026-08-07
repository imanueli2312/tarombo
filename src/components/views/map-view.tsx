"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";

// Leaflet is loaded dynamically to avoid SSR issues (it uses `window`)
let L: typeof import("leaflet") | null = null;
async function loadLeaflet() {
  if (L) return L;
  await import("leaflet/dist/leaflet.css");
  L = await import("leaflet");
  return L;
}

interface BurialPerson {
  id: string;
  name: string;
  nickname: string | null;
  gender: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  generation: number;
  burial_name: string | null;
  burial_address: string | null;
  burial_lat: number;
  burial_lng: number;
}

export function MapView() {
  const { t, lang } = useLanguage();
  const [persons, setPersons] = useState<BurialPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/burials");
        if (!res.ok) throw new Error();
        setPersons(await res.json());
      } catch {
        toast.error(t("map.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  useEffect(() => {
    if (loading || persons.length === 0 || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const leaflet = await loadLeaflet();
      if (cancelled || !mapRef.current) return;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      const map = leaflet.map(mapRef.current).setView([0, 0], 5);
      mapInstance.current = map;

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];
      for (const p of persons) {
        const lat = p.burial_lat;
        const lng = p.burial_lng;
        const marker = leaflet.marker([lat, lng]).addTo(map);
        const yearStr = (d: string | null) => d ? new Date(d).getFullYear() : "";
        const dates = yearStr(p.date_of_birth) || yearStr(p.date_of_death)
          ? `${yearStr(p.date_of_birth) || "?"}–${yearStr(p.date_of_death) || (p.date_of_death ? "?" : "present")}`
          : "";
        marker.bindPopup(`
          <div style="min-width:180px">
            <strong>${p.name}</strong>${p.nickname ? ` ("${p.nickname}")` : ""}<br/>
            ${dates ? `<span style="font-size:11px;color:#666">${dates}</span><br/>` : ""}
            Gen ${p.generation}<br/>
            ${p.burial_name ? `<span style="font-size:11px">📍 ${p.burial_name}</span><br/>` : ""}
            ${p.burial_address ? `<span style="font-size:11px;color:#666">${p.burial_address}</span>` : ""}
          </div>
        `);
        bounds.push([lat, lng]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loading, persons, lang]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t("map.title")}</span>
          <span className="text-xs text-muted-foreground">
            {t("map.persons", { count: persons.length })}
          </span>
        </div>
      </div>
      {persons.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t("map.empty")}
        </div>
      ) : (
        <div ref={mapRef} className="flex-1" style={{ minHeight: "400px" }} />
      )}
    </div>
  );
}
