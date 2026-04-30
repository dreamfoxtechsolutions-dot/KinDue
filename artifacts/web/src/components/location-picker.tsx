import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { geocodeSearch, type GeocodeResult } from "@/hooks/use-geo-suggestions";

export function LocationPicker({
  initialLabel,
  onPick,
  onClear,
  busy,
}: {
  initialLabel?: string;
  onPick: (r: GeocodeResult) => void;
  onClear?: () => void;
  busy?: boolean;
}) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!touched) return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      const r = await geocodeSearch(q, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setResults(r);
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, touched]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setTouched(true);
              setQuery(e.target.value);
            }}
            placeholder="Search address, gym, salon, parking…"
            className="pl-8 h-9 text-sm"
            disabled={busy}
          />
        </div>
        {onClear && initialLabel && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={onClear}
            disabled={busy}
            type="button"
          >
            Remove
          </Button>
        )}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Searching…
        </div>
      )}
      {!loading && touched && query.trim().length >= 3 && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No results.</p>
      )}
      {results.length > 0 && (
        <ul className="border border-border rounded-md divide-y divide-border bg-background max-h-56 overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(r);
                  setResults([]);
                  setQuery(r.label);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                disabled={busy}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground">
        Locations powered by OpenStreetMap.
      </p>
    </div>
  );
}
