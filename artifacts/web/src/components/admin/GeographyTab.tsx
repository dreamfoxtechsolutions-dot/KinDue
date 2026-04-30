import { useMemo } from "react";
import {
  useAdminGeography,
  getAdminGeographyQueryKey,
} from "@workspace/api-client-react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, MapPin, Building2, Map as MapIcon, Hash } from "lucide-react";

const US_TOPO =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const FILL_BUCKETS = [
  "hsl(var(--muted))",
  "color-mix(in oklab, hsl(var(--primary)) 22%, hsl(var(--muted)))",
  "color-mix(in oklab, hsl(var(--primary)) 38%, hsl(var(--muted)))",
  "color-mix(in oklab, hsl(var(--primary)) 56%, hsl(var(--muted)))",
  "color-mix(in oklab, hsl(var(--primary)) 74%, hsl(var(--muted)))",
  "hsl(var(--primary))",
];

// us-atlas topojson uses numeric STATE FIPS codes — map to USPS state codes.
const FIPS_TO_USPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "72": "PR",
};

export function GeographyTab() {
  const { data, isLoading } = useAdminGeography({
    query: {
      queryKey: getAdminGeographyQueryKey(),
      refetchInterval: 60_000,
    },
  });

  const stateCounts = useMemo(() => {
    const m = new Map<string, number>();
    (data?.byRegion ?? []).forEach((r) => {
      // Only U.S. regions feed the U.S. state choropleth — other countries
      // can share two-letter codes and would contaminate state totals.
      if (r.countryCode === "US" && r.regionCode) {
        m.set(r.regionCode.toUpperCase(), r.count);
      }
    });
    return m;
  }, [data]);

  const maxCount = useMemo(() => {
    let max = 0;
    stateCounts.forEach((v) => {
      if (v > max) max = v;
    });
    return max;
  }, [stateCounts]);

  const colorScale = useMemo(
    () =>
      scaleQuantize<string>()
        .domain([1, Math.max(1, maxCount)])
        .range(FILL_BUCKETS.slice(1)),
    [maxCount],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!data || data.totals.tracked === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          <Globe className="h-8 w-8 mx-auto mb-3 opacity-40" />
          No location data has been collected yet. Locations are derived from
          the IP address of authenticated users on each request, refreshed once
          per day per user. Have a few users sign in to populate this view.
        </CardContent>
      </Card>
    );
  }

  const totalUS = (data.byRegion ?? [])
    .filter((r) => r.countryCode === "US")
    .reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-5">
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Tracked users" value={data.totals.tracked} />
        <StatTile label="Countries" value={data.totals.countries} />
        <StatTile label="States / regions" value={data.totals.regions} />
        <StatTile label="U.S. users" value={totalUS} />
      </div>

      {/* US Choropleth */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              U.S. distribution by state
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Color shaded by user count. Markers show top cities.
            </p>
          </div>
          <Legend max={maxCount} />
        </CardHeader>
        <CardContent>
          <div className="w-full" style={{ aspectRatio: "16 / 9" }}>
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 1000 }}
              style={{ width: "100%", height: "100%" }}
            >
              <Geographies geography={US_TOPO}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const fips = String(geo.id).padStart(2, "0");
                    const usps = FIPS_TO_USPS[fips];
                    const c = usps ? stateCounts.get(usps) ?? 0 : 0;
                    const fill =
                      c > 0 ? colorScale(c) : FILL_BUCKETS[0];
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke="hsl(var(--border))"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            outline: "none",
                            fill: "hsl(var(--primary))",
                            opacity: 0.85,
                          },
                          pressed: { outline: "none" },
                        }}
                      >
                        <title>
                          {geo.properties?.name ?? usps ?? "Unknown"}: {c} user
                          {c === 1 ? "" : "s"}
                        </title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
              {(data.points ?? [])
                .filter(
                  (p) =>
                    p.regionCode &&
                    Object.values(FIPS_TO_USPS).includes(
                      p.regionCode.toUpperCase(),
                    ),
                )
                .slice(0, 60)
                .map((p, i) => (
                  <Marker
                    key={`${p.latitude}-${p.longitude}-${i}`}
                    coordinates={[p.longitude, p.latitude]}
                  >
                    <circle
                      r={Math.min(8, 2 + Math.sqrt(p.count) * 1.5)}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.55}
                      stroke="hsl(var(--background))"
                      strokeWidth={0.75}
                    >
                      <title>
                        {p.city || "Unknown"}
                        {p.region ? `, ${p.region}` : ""}: {p.count} user
                        {p.count === 1 ? "" : "s"}
                      </title>
                    </circle>
                  </Marker>
                ))}
            </ComposableMap>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankCard
          title="States / regions"
          icon={<MapIcon className="h-4 w-4" />}
          headers={["Region", "Country", "Users"]}
          rows={(data.byRegion ?? []).slice(0, 25).map((r) => [
            <span key="r" className="font-medium">
              {r.region}
              {r.regionCode ? (
                <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                  {r.regionCode}
                </span>
              ) : null}
            </span>,
            <span key="c" className="font-mono text-xs">
              {r.countryCode || "—"}
            </span>,
            <span key="n" className="font-mono">
              {r.count}
            </span>,
          ])}
        />

        <RankCard
          title="Cities"
          icon={<Building2 className="h-4 w-4" />}
          headers={["City", "Region", "Users"]}
          rows={(data.byCity ?? []).map((r) => [
            <span key="c" className="font-medium">
              {r.city}
            </span>,
            <span key="r" className="text-xs text-muted-foreground">
              {r.region || "—"}
              {r.regionCode ? ` (${r.regionCode})` : ""}
            </span>,
            <span key="n" className="font-mono">
              {r.count}
            </span>,
          ])}
        />

        <RankCard
          title="Counties"
          icon={<MapPin className="h-4 w-4" />}
          headers={["County", "Region", "Users"]}
          rows={(data.byCounty ?? []).map((r) => [
            <span key="c" className="font-medium">
              {r.county}
            </span>,
            <span key="r" className="text-xs text-muted-foreground">
              {r.region || "—"}
            </span>,
            <span key="n" className="font-mono">
              {r.count}
            </span>,
          ])}
          empty="County data is not provided by the IP geolocation source. Country, region, city, and ZIP are populated."
        />

        <RankCard
          title="ZIP / postal codes"
          icon={<Hash className="h-4 w-4" />}
          headers={["ZIP", "City / region", "Users"]}
          rows={(data.byPostalCode ?? []).map((r) => [
            <span key="z" className="font-mono">
              {r.postalCode}
            </span>,
            <span key="c" className="text-xs text-muted-foreground">
              {[r.city, r.regionCode].filter(Boolean).join(", ") || "—"}
            </span>,
            <span key="n" className="font-mono">
              {r.count}
            </span>,
          ])}
        />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
        {label}
      </div>
      <div className="font-mono text-2xl text-foreground mt-1">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Legend({ max }: { max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground font-mono">0</span>
      <div className="flex h-3 w-32 overflow-hidden rounded-sm border border-border">
        {FILL_BUCKETS.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">
        {max.toLocaleString()}
      </span>
    </div>
  );
}

function RankCard({
  title,
  icon,
  headers,
  rows,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  headers: string[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-base font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {empty ?? "No data yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h, i) => (
                    <TableHead
                      key={h}
                      className={i === headers.length - 1 ? "text-right w-[80px]" : ""}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((cells, ri) => (
                  <TableRow key={ri}>
                    {cells.map((cell, ci) => (
                      <TableCell
                        key={ci}
                        className={
                          ci === cells.length - 1 ? "text-right" : ""
                        }
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
