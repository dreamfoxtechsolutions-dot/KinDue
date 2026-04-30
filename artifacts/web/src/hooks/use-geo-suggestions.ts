import { differenceInCalendarDays, parseISO } from "date-fns";

const NEAR_VISIT_RADIUS_KM = 2;

export type GeoPoint = { lat: number; lng: number };

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function getCurrentPosition(): Promise<GeoPoint | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );
  });
}

export function geoPermissionGranted(): boolean {
  // Permissions API isn't synchronous; we infer "granted" by attempting a sample.
  return typeof window !== "undefined" && "geolocation" in navigator;
}

export async function queryGeoPermission(): Promise<PermissionState | "unknown"> {
  if (typeof navigator === "undefined" || !("permissions" in navigator)) {
    return "unknown";
  }
  try {
    const status = await (navigator as Navigator).permissions.query({
      name: "geolocation" as PermissionName,
    });
    return status.state;
  } catch {
    return "unknown";
  }
}

/**
 * Background geo sampler.
 *
 * TODO: backend not implemented — the real Subscription schema has no
 * `serviceLat` / `serviceLng` / `lastNearVisitAt` columns yet, and
 * there's no wellness-checkin endpoint. The previous implementation
 * patched both via fictitious endpoints. Until the geo presence
 * backend lands this is a no-op so the App.tsx mount point doesn't
 * break.
 */
export function useGeoSampler(): void {
  // intentionally empty
}

export type GeoSuggestion = {
  subscriptionId: number;
  name: string;
  amount: number;
  daysAway: number;
  serviceLocationLabel: string;
};

export type AwaySubscriptionInput = {
  id: number;
  name: string;
  amount: number;
  serviceLat?: number | null;
  serviceLng?: number | null;
  serviceLocationLabel: string;
  lastNearVisitAt?: string | null;
  createdAt: string;
  dismissed: boolean;
  status: string;
};

export function computeAwaySuggestions(
  subs: ReadonlyArray<AwaySubscriptionInput>,
  thresholdDays: number,
): GeoSuggestion[] {
  const today = new Date();
  const out: GeoSuggestion[] = [];
  for (const s of subs) {
    if (s.dismissed) continue;
    if (s.status !== "active") continue;
    if (typeof s.serviceLat !== "number" || typeof s.serviceLng !== "number")
      continue;
    const lastVisit = s.lastNearVisitAt
      ? parseISO(s.lastNearVisitAt)
      : parseISO(s.createdAt);
    const days = differenceInCalendarDays(today, lastVisit);
    if (days >= thresholdDays) {
      out.push({
        subscriptionId: s.id,
        name: s.name,
        amount: s.amount,
        daysAway: days,
        serviceLocationLabel: s.serviceLocationLabel || "tagged location",
      });
    }
  }
  return out.sort((a, b) => b.daysAway - a.daysAway);
}

// ---------------------------------------------------------------------------
// Nominatim (OpenStreetMap) free geocoder — no key required
// ---------------------------------------------------------------------------

export type GeocodeResult = {
  label: string;
  lat: number;
  lng: number;
};

export async function geocodeSearch(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return data.map((r) => ({
      label: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
}
