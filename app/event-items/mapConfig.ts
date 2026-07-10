export const defaultMapCenter = {
  lat: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 52.1326),
  lng: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 5.2913),
};

export const defaultMapZoom = Number(process.env.NEXT_PUBLIC_MAP_ZOOM ?? 18);
export const defaultOverviewZoom = Number(process.env.NEXT_PUBLIC_MAP_OVERVIEW_ZOOM ?? defaultMapZoom);

export const tileLayerUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const tileLayerAttribution =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
