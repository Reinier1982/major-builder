"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import {
  defaultMapCenter,
  defaultMapZoom,
  defaultOverviewZoom,
  tileLayerAttribution,
  tileLayerUrl,
} from "./mapConfig";
import { eventItemIcon, getEventItemLocation, statusColorByValue, statusLabelByValue, type EventItem, type EventItemLocation } from "./eventItemTypes";

type TerrainMapProps = {
  eventItems?: EventItem[];
  editablePoint?: EventItemLocation | null;
  onEditablePointChange?: (point: EventItemLocation) => void;
  className?: string;
  summaryLinks?: boolean;
};

function averageLocation(locations: EventItemLocation[]) {
  if (locations.length === 0) return defaultMapCenter;
  return {
    lat: locations.reduce((sum, location) => sum + location.lat, 0) / locations.length,
    lng: locations.reduce((sum, location) => sum + location.lng, 0) / locations.length,
  };
}

function markerIcon(L: typeof Leaflet, color: string, glyph = "", active = false) {
  const size = active ? 26 : 24;
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:white;font:700 12px/1 sans-serif;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);">${escapeHtml(glyph)}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function TerrainMap({
  eventItems = [],
  editablePoint,
  onEditablePointChange,
  className = "",
  summaryLinks = false,
}: TerrainMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const eventItemLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const editableMarkerRef = useRef<Leaflet.Marker | null>(null);
  const onEditablePointChangeRef = useRef(onEditablePointChange);
  const [mapReady, setMapReady] = useState(false);
  const editable = Boolean(onEditablePointChange);
  const eventItemLocations = useMemo(
    () => eventItems.map(getEventItemLocation).filter((location): location is EventItemLocation => location !== null),
    [eventItems],
  );
  const initialCenter = editablePoint ?? (editable ? averageLocation(eventItemLocations) : defaultMapCenter);
  const initialCenterRef = useRef(initialCenter);

  useEffect(() => {
    onEditablePointChangeRef.current = onEditablePointChange;
  }, [onEditablePointChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    setMapReady(false);

    async function setupMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      LRef.current = L;
      const map = L.map(containerRef.current, {
        center: [initialCenterRef.current.lat, initialCenterRef.current.lng],
        zoom: editable ? defaultMapZoom : defaultOverviewZoom,
        scrollWheelZoom: true,
      });

      L.tileLayer(tileLayerUrl, {
        attribution: tileLayerAttribution,
        maxZoom: 19,
      }).addTo(map);

      eventItemLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        if (!onEditablePointChangeRef.current) return;
        onEditablePointChangeRef.current({
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        });
      });
    }

    setupMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      eventItemLayerRef.current = null;
      editableMarkerRef.current = null;
      LRef.current = null;
    };
  }, [editable]);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = eventItemLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;

    layer.clearLayers();
    const bounds: Leaflet.LatLngTuple[] = [];

    for (const item of eventItems) {
      const location = getEventItemLocation(item);
      if (!location) continue;
      bounds.push([location.lat, location.lng]);
      const marker = L.marker([location.lat, location.lng], {
        icon: markerIcon(L, statusColorByValue[item.status] ?? statusColorByValue.planned, eventItemIcon(item.type.icon)),
        title: item.name,
      });
      const summary = item.description ? `<p style="margin:.25rem 0 0;color:#52525b;">${escapeHtml(item.description)}</p>` : "";
      const link = summaryLinks ? `<a href="/#event-item-${item.id}" style="display:inline-block;margin-top:.4rem;text-decoration:underline;">Naar Obstacle</a>` : "";
      marker.bindPopup(`
        <strong>${escapeHtml(item.name)}</strong>
        <div style="margin-top:.2rem;font-size:12px;">${escapeHtml(item.type.name)} · ${statusLabelByValue[item.status] ?? item.status}</div>
        ${summary}
        ${link}
      `);
      marker.addTo(layer);
    }

    if (!editable && bounds.length > 0) {
      const currentBounds = map.getBounds();
      const allPinsVisible = bounds.every((location) => currentBounds.contains(location));
      if (!allPinsVisible && bounds.length > 1) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: defaultMapZoom });
      } else if (!allPinsVisible) {
        map.setView(bounds[0], defaultMapZoom);
      }
    }
  }, [editable, eventItems, mapReady, summaryLinks]);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    if (!editablePoint) {
      editableMarkerRef.current?.remove();
      editableMarkerRef.current = null;
      return;
    }

    const latLng: Leaflet.LatLngExpression = [editablePoint.lat, editablePoint.lng];
    if (!editableMarkerRef.current) {
      const marker = L.marker(latLng, {
        draggable: editable,
        icon: markerIcon(L, "#111827", "⌖", true),
        title: "Obstacle locatie",
      }).addTo(map);
      marker.on("dragend", () => {
        const next = marker.getLatLng();
        onEditablePointChangeRef.current?.({ lat: next.lat, lng: next.lng });
      });
      editableMarkerRef.current = marker;
    } else {
      editableMarkerRef.current.setLatLng(latLng);
    }
  }, [editable, editablePoint, mapReady]);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[5/3] min-h-64 overflow-hidden rounded border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    />
  );
}
