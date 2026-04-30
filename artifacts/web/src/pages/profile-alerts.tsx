import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  BellRing,
  BellOff,
  Save,
  Send,
  MapPin,
  Mail,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import {
  householdApi,
  type DigestCadence,
  type DigestPreferencesResponse,
} from "@/lib/household-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AWAY_THRESHOLD_OPTIONS,
} from "@/hooks/use-bill-alerts";
import {
  getCurrentPosition,
  queryGeoPermission,
} from "@/hooks/use-geo-suggestions";
import { Link as RouterLink } from "wouter";
import {
  DEFAULT_ALERT_SETTINGS,
  getAlertSettings,
  requestNotificationPermission,
  type AlertSettings,
} from "@/hooks/use-bill-alerts";

export function ProfileAlertsPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AlertSettings>(
    DEFAULT_ALERT_SETTINGS,
  );
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "denied",
  );
  const [geoPermission, setGeoPermission] = useState<
    PermissionState | "unknown"
  >("unknown");
  const [saving, setSaving] = useState(false);
  const [digest, setDigest] = useState<DigestPreferencesResponse | null>(null);
  const [digestSavingScope, setDigestSavingScope] = useState<
    "member" | "defaults" | null
  >(null);
  // Separate draft state for the timezone inputs so the on-blur "did this
  // change?" check compares the draft to the persisted value, not to itself.
  const [memberTzDraft, setMemberTzDraft] = useState("");
  const [defaultsTzDraft, setDefaultsTzDraft] = useState("");

  useEffect(() => {
    if (digest) {
      setMemberTzDraft(digest.member.timezone);
      setDefaultsTzDraft(digest.defaults.timezone);
    }
  }, [digest?.member.timezone, digest?.defaults.timezone]);

  useEffect(() => {
    void queryGeoPermission().then(setGeoPermission);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void householdApi
      .digestPreferences()
      .then((d) => {
        if (!cancelled) setDigest(d);
      })
      .catch(() => {
        // If the user isn't part of a household yet, hide the section silently.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveDigestMember = async (
    patch: Partial<{ cadence: DigestCadence; hourLocal: number; timezone: string }>,
  ) => {
    if (!digest) return;
    setDigestSavingScope("member");
    try {
      const res = await householdApi.updateDigestPreferences(patch);
      setDigest({ ...digest, member: { ...digest.member, ...res.member } });
      toast({ title: "Digest preferences saved" });
    } catch (err) {
      toast({
        title: "Couldn't save digest preferences",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDigestSavingScope(null);
    }
  };

  const saveDigestDefaults = async (
    patch: Partial<{ cadence: DigestCadence; hourLocal: number; timezone: string }>,
  ) => {
    if (!digest) return;
    setDigestSavingScope("defaults");
    try {
      const res = await householdApi.updateDigestDefaults(patch);
      setDigest({ ...digest, defaults: { ...digest.defaults, ...res.defaults } });
      toast({ title: "Household digest defaults saved" });
    } catch (err) {
      toast({
        title: "Couldn't save defaults",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDigestSavingScope(null);
    }
  };

  useEffect(() => {
    if (!isLoaded || !user) return;
    setSettings(
      getAlertSettings(user.unsafeMetadata as Record<string, unknown>),
    );
  }, [isLoaded, user]);

  if (!isLoaded || !user) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  const updateLead = (idx: 0 | 1 | 2, value: number) => {
    setSettings((prev) => {
      const next: [number, number, number] = [...prev.leadDays];
      next[idx] = Math.max(0, Math.min(365, Math.floor(value || 0)));
      return { ...prev, leadDays: next };
    });
  };

  const handleEnable = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next !== "granted") {
      toast({
        title: "Notifications blocked",
        description:
          "Allow notifications in your browser settings to receive critical bill alerts on this device.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sorted: [number, number, number] = [...settings.leadDays].sort(
        (a, b) => b - a,
      ) as [number, number, number];
      const next: AlertSettings = {
        enabled: settings.enabled,
        leadDays: sorted,
        geoEnabled: settings.geoEnabled,
        awayThresholdDays: settings.awayThresholdDays,
      };
      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata as Record<string, unknown>),
          alertSettings: next,
        },
      });
      setSettings(next);
      toast({
        title: "Alert preferences saved",
        description: settings.enabled
          ? `You'll be alerted ${sorted.join(", ")} days before each critical bill is due.`
          : "Device alerts are turned off.",
      });
    } catch (err) {
      toast({
        title: "Couldn't save preferences",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    if (permission !== "granted") {
      toast({
        title: "Enable notifications first",
        description:
          "Click 'Enable on this device' so your browser can show alerts.",
      });
      return;
    }
    try {
      new Notification("Kindue · Test alert", {
        body: "This is what a critical bill alert will look like.",
        icon: "/favicon.ico",
      });
    } catch {
      toast({
        title: "Test failed",
        description: "Your browser blocked the test notification.",
        variant: "destructive",
      });
    }
  };

  const supported =
    typeof window !== "undefined" && "Notification" in window;

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-3xl">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Notifications
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Critical bill alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-prose">
            Kindue will send a device notification ahead of any bill marked
            high or critical risk. Defaults: 14 days, 7 days, then 24 hours
            before the due date.
          </p>
        </div>

        {/* Real-time channels (matrix + phone + quiet hours) live on a
            dedicated page so this page stays focused on device push. */}
        <RouterLink href="/profile/notifications">
          <button
            type="button"
            className="w-full text-left rounded-md border border-border bg-card p-5 hover:bg-accent transition-colors flex items-start gap-3"
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Email & SMS preferences</div>
              <div className="text-sm text-muted-foreground">
                Choose which categories reach you by email or text message,
                add a verified phone number, and set quiet hours.
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
          </button>
        </RouterLink>

        {/* Device permission */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {permission === "granted" ? (
                  <BellRing className="h-4 w-4 text-emerald-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <h2 className="font-serif text-xl font-medium tracking-tight">
                  Device permission
                </h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-prose">
                {!supported
                  ? "This browser doesn't support notifications. Try Chrome, Edge, Safari, or Firefox on desktop or Android."
                  : permission === "granted"
                    ? "This device is allowed to show Kindue notifications."
                    : permission === "denied"
                      ? "Notifications are blocked. Update your browser site settings to allow them."
                      : "Click below and allow notifications when your browser asks."}
              </p>
            </div>
            <span
              className={
                "text-[10px] uppercase tracking-[0.18em] font-medium shrink-0 " +
                (permission === "granted"
                  ? "text-emerald-600"
                  : permission === "denied"
                    ? "text-destructive"
                    : "text-muted-foreground")
              }
            >
              {permission === "granted"
                ? "Allowed"
                : permission === "denied"
                  ? "Blocked"
                  : "Not asked"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleEnable}
              disabled={!supported || permission === "granted"}
              className="gap-2"
            >
              <BellRing className="h-4 w-4" />
              {permission === "granted"
                ? "Enabled on this device"
                : "Enable on this device"}
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={permission !== "granted"}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send test alert
            </Button>
          </div>
        </section>

        {/* Cadence */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h2 className="font-serif text-xl font-medium tracking-tight mb-1">
                Alert cadence
              </h2>
              <p className="text-sm text-muted-foreground max-w-prose">
                Set how many days before a critical bill's due date each
                reminder should fire. Once an alert fires for a given bill it
                won't repeat at that lead time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="alerts-enabled"
                className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
              >
                Enabled
              </Label>
              <Switch
                id="alerts-enabled"
                checked={settings.enabled}
                onCheckedChange={(v) =>
                  setSettings((prev) => ({ ...prev, enabled: v }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {(["First alert", "Second alert", "Final alert"] as const).map(
              (label, i) => (
                <div key={label} className="flex flex-col gap-2">
                  <Label
                    htmlFor={`lead-${i}`}
                    className="text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {label}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`lead-${i}`}
                      type="number"
                      min={0}
                      max={365}
                      inputMode="numeric"
                      value={settings.leadDays[i as 0 | 1 | 2]}
                      onChange={(e) =>
                        updateLead(i as 0 | 1 | 2, Number(e.target.value))
                      }
                      className="font-mono"
                      disabled={!settings.enabled}
                    />
                    <span className="text-sm text-muted-foreground shrink-0">
                      days before
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>

        </section>

        {/* Geo-based cancellation suggestions */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-serif text-xl font-medium tracking-tight">
                  Unused subscription detection
                </h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-prose">
                Kindue can flag subscriptions tied to a physical place
                (gym, car wash, parking, salon) when you haven't been near
                that location for a while. Tag a service location on each
                subscription to enable this.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="geo-enabled"
                className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
              >
                Enabled
              </Label>
              <Switch
                id="geo-enabled"
                checked={settings.geoEnabled}
                onCheckedChange={async (v) => {
                  if (v) {
                    const here = await getCurrentPosition();
                    if (!here) {
                      toast({
                        title: "Location access blocked",
                        description:
                          "Allow location for this site in your browser settings, then try again.",
                        variant: "destructive",
                      });
                      const next = await queryGeoPermission();
                      setGeoPermission(next);
                      return;
                    }
                    setGeoPermission("granted");
                  }
                  setSettings((prev) => ({ ...prev, geoEnabled: v }));
                }}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-background p-4 mb-5 text-xs leading-relaxed text-muted-foreground space-y-2">
            <p className="font-medium text-foreground tracking-[0.04em] uppercase text-[10px]">
              What we store
            </p>
            <p>
              We never store a location history. For each subscription with a
              tagged location we only keep the date you were last seen near
              it (within 2 km). Sampling happens at most every 6 hours and
              only while Kindue is open in your browser.
            </p>
            <p>
              Status:{" "}
              <span
                className={
                  geoPermission === "granted"
                    ? "text-emerald-700"
                    : geoPermission === "denied"
                      ? "text-destructive"
                      : "text-foreground"
                }
              >
                {geoPermission === "granted"
                  ? "Location allowed"
                  : geoPermission === "denied"
                    ? "Location blocked"
                    : geoPermission === "prompt"
                      ? "Will ask on first sample"
                      : "Permissions API unavailable"}
              </span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="threshold"
                className="text-xs uppercase tracking-[0.14em] text-muted-foreground"
              >
                Suggest cancellation after
              </Label>
              <Select
                value={String(settings.awayThresholdDays)}
                onValueChange={(v) =>
                  setSettings((prev) => ({
                    ...prev,
                    awayThresholdDays: Number(v),
                  }))
                }
                disabled={!settings.geoEnabled}
              >
                <SelectTrigger id="threshold" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AWAY_THRESHOLD_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} days away
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground sm:pb-2">
              Default 90 days. Add a service location on each subscription
              from the Subscriptions page.
            </p>
          </div>
        </section>

        {/* Digest email cadence */}
        {digest ? (
          <section className="rounded-md border border-border bg-card p-6">
            <div className="flex items-start gap-2 mb-1">
              <Mail className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <h2 className="font-serif text-xl font-medium tracking-tight">
                  Email digest
                </h2>
                <p className="text-sm text-muted-foreground max-w-prose">
                  How often should Kindue email you a summary of upcoming
                  household bills? Unsubscribing from a digest email also
                  switches this to "Off".
                </p>
              </div>
            </div>

            {digest.member.unsubscribed ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                You've unsubscribed from digest emails. Set a cadence below to
                opt back in.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3 mt-5">
              <div className="flex flex-col gap-2">
                <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Cadence
                </Label>
                <Select
                  value={digest.member.cadence}
                  onValueChange={(v) =>
                    void saveDigestMember({ cadence: v as DigestCadence })
                  }
                  disabled={digestSavingScope === "member"}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly (every 7 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Send hour (local)
                </Label>
                <Select
                  value={String(digest.member.hourLocal)}
                  onValueChange={(v) =>
                    void saveDigestMember({ hourLocal: Number(v) })
                  }
                  disabled={
                    digest.member.cadence === "off" ||
                    digestSavingScope === "member"
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Time zone
                </Label>
                <Input
                  value={memberTzDraft}
                  onChange={(e) => setMemberTzDraft(e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v || v === digest.member.timezone) {
                      setMemberTzDraft(digest.member.timezone);
                      return;
                    }
                    void saveDigestMember({ timezone: v });
                  }}
                  placeholder="America/New_York"
                  className="font-mono text-xs"
                  disabled={
                    digest.member.cadence === "off" ||
                    digestSavingScope === "member"
                  }
                />
              </div>
            </div>

            {digest.canEditDefaults ? (
              <div className="mt-6 pt-5 border-t border-border">
                <h3 className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-1">
                  Defaults for new household members
                </h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-prose">
                  New caregivers added to your household will start with these
                  settings. Existing members keep their personal choices.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Default cadence
                    </Label>
                    <Select
                      value={digest.defaults.cadence}
                      onValueChange={(v) =>
                        void saveDigestDefaults({ cadence: v as DigestCadence })
                      }
                      disabled={digestSavingScope === "defaults"}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Default hour
                    </Label>
                    <Select
                      value={String(digest.defaults.hourLocal)}
                      onValueChange={(v) =>
                        void saveDigestDefaults({ hourLocal: Number(v) })
                      }
                      disabled={digestSavingScope === "defaults"}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, h) => (
                          <SelectItem key={h} value={String(h)}>
                            {h.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Default time zone
                    </Label>
                    <Input
                      value={defaultsTzDraft}
                      onChange={(e) => setDefaultsTzDraft(e.target.value)}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (!v || v === digest.defaults.timezone) {
                          setDefaultsTzDraft(digest.defaults.timezone);
                          return;
                        }
                        void saveDigestDefaults({ timezone: v });
                      }}
                      placeholder="America/New_York"
                      className="font-mono text-xs"
                      disabled={digestSavingScope === "defaults"}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
