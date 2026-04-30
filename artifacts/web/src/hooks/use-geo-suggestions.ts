import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useListSubscriptions, updateSubscription } from "@workspace/api-client-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { getAlertSettings } from "@/hooks/use-bill-alerts";
import { useHouseholdMe, HOUSEHOLD_ME_KEY } from "@/hooks/use-household";
import { householdApi } from "@/lib/household-api";

const NEAR_VISIT_RADIUS_KM = 2;
const SAMPLE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SAMPLE_KEY = "bg:geo:lastSampleAt";

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

type Sub = {
  id: number;
  serviceLat: number | null;
  serviceLng: number | null;
  lastNearVisitAt: string | null;
  dismissed: boolean;
  status: string;
};

/**
 * Background geo sampler. Runs (at most) every 6 hours while the app is open
 * and the user has opted in. For each subscription with a tagged location, if
 * the user is within NEAR_VISIT_RADIUS_KM, stamps lastNearVisitAt = now.
 */
export function useGeoSampler() {
  const { user, isLoaded } = useUser();
  const { data } = useListSubscriptions();
  const { data: householdMe } = useHouseholdMe();
  const queryClient = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || !data) return;
    if (ranRef.current) return;

    const settings = getAlertSettings(
      user.unsafeMetadata as Record<string, unknown>,
    );
    if (!settings.geoEnabled) return;
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    let last = 0;
    try {
      last = Number(localStorage.getItem(SAMPLE_KEY) ?? 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - last < SAMPLE_INTERVAL_MS) return;

    ranRef.current = true;
    (async () => {
      const here = await getCurrentPosition();
      if (!here) {
        ranRef.current = false;
        return;
      }
      try {
        localStorage.setItem(SAMPLE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      const subs = data as unknown as Sub[];
      if (!Array.isArray(subs)) return;

      for (const s of subs) {
        if (s.dismissed) continue;
        if (s.status !== "active") continue;
        if (typeof s.serviceLat !== "number" || typeof s.serviceLng !== "number")
          continue;
        const km = haversineKm(here, { lat: s.serviceLat, lng: s.serviceLng });
        if (km <= NEAR_VISIT_RADIUS_KM) {
          try {
            await updateSubscription(s.id, {
              lastNearVisitAt: new Date().toISOString(),
            });
          } catch {
            /* ignore */
          }
        }
      }

      // Wellness check-in: if the household tracks a parent / dependent
      // and we know their home coords, stamp lastVisitedCaregiverAt
      // when the caregiver is physically near. This drives the "you
      // haven't visited Mom in X days" card on Home.
      const homeLat = householdMe?.household.caregiverHomeLat;
      const homeLng = householdMe?.household.caregiverHomeLng;
      if (
        householdMe &&
        householdMe.me.role !== "alerts_only" &&
        typeof homeLat === "number" &&
        typeof homeLng === "number"
      ) {
        const km = haversineKm(here, { lat: homeLat, lng: homeLng });
        if (km <= NEAR_VISIT_RADIUS_KM) {
          try {
            await householdApi.recordWellnessCheckin({ kind: "visited" });
            queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
          } catch {
            /* ignore */
          }
        }
      }
    })();
  }, [isLoaded, user, data, householdMe, queryClient]);
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
