import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Phone,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link as RouterLink } from "wouter";
import {
  notificationPrefsApi,
  type NotificationChannel,
  type PreferencesResponse,
} from "@/lib/notification-prefs-api";

const QUIET_HOUR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "off", label: "Off" },
  ...Array.from({ length: 24 }, (_, h) => ({
    value: String(h),
    label: `${h.toString().padStart(2, "0")}:00`,
  })),
];

export function ProfileNotificationsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PreferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());

  // Phone capture flow
  const [phoneInput, setPhoneInput] = useState("");
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [confirmingCode, setConfirmingCode] = useState(false);

  const [tzDraft, setTzDraft] = useState("");
  const [savingQuiet, setSavingQuiet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    notificationPrefsApi
      .get()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setTzDraft(d.contact.quietHoursTimezone || "");
      })
      .catch((err: unknown) => {
        toast({
          title: "Couldn't load notification settings",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const updateCell = async (
    category: string,
    channel: NotificationChannel,
    enabled: boolean,
  ) => {
    const cellKey = `${category}:${channel}`;
    // Track every in-flight cell so concurrent toggles don't clobber each
    // other and the spinner state stays per-cell.
    setSavingCells((prev) => {
      const next = new Set(prev);
      next.add(cellKey);
      return next;
    });
    // Optimistically update via functional setState so we always merge
    // against the freshest matrix, never a stale closure.
    setData((prev) =>
      prev
        ? {
            ...prev,
            matrix: {
              ...prev.matrix,
              [category]: { ...prev.matrix[category], [channel]: enabled },
            },
          }
        : prev,
    );
    try {
      const res = await notificationPrefsApi.update([
        { category, channel, enabled },
      ]);
      // Only adopt the server matrix entry for the cell we just changed —
      // wholesale replace would overwrite cells still in flight.
      setData((prev) =>
        prev
          ? {
              ...prev,
              matrix: {
                ...prev.matrix,
                [category]: {
                  ...prev.matrix[category],
                  [channel]: !!res.matrix[category]?.[channel],
                },
              },
            }
          : prev,
      );
    } catch (err) {
      toast({
        title: "Couldn't save preference",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      // Revert just this cell on failure.
      setData((prev) =>
        prev
          ? {
              ...prev,
              matrix: {
                ...prev.matrix,
                [category]: {
                  ...prev.matrix[category],
                  [channel]: !enabled,
                },
              },
            }
          : prev,
      );
    } finally {
      setSavingCells((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  const startVerify = async () => {
    const phone = phoneInput.trim();
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      toast({
        title: "Use the international format",
        description: "Phone must start with +country code, e.g. +14155551234.",
        variant: "destructive",
      });
      return;
    }
    setVerifyingPhone(true);
    try {
      const r = await notificationPrefsApi.startPhoneVerify(phone);
      setPendingCode(true);
      setDevCode(r.devCode ?? null);
      toast({
        title: r.sent ? "Code sent" : "Code generated",
        description: r.sent
          ? "Check your phone for a 6-digit code."
          : "SMS provider not configured; use the code shown below.",
      });
      // Refresh contact (now shows unverified phone)
      const fresh = await notificationPrefsApi.get();
      setData(fresh);
    } catch (err) {
      toast({
        title: "Couldn't start verification",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingPhone(false);
    }
  };

  const confirmVerify = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      toast({
        title: "6-digit code required",
        variant: "destructive",
      });
      return;
    }
    setConfirmingCode(true);
    try {
      const contact = await notificationPrefsApi.confirmPhoneVerify(
        code.trim(),
      );
      setData((prev) => (prev ? { ...prev, contact } : prev));
      setPendingCode(false);
      setCode("");
      setDevCode(null);
      setPhoneInput("");
      toast({
        title: "Phone verified",
        description: "You'll now receive SMS for enabled categories.",
      });
    } catch (err) {
      toast({
        title: "Couldn't verify code",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmingCode(false);
    }
  };

  const removePhone = async () => {
    try {
      await notificationPrefsApi.removePhone();
      const fresh = await notificationPrefsApi.get();
      setData(fresh);
      setPendingCode(false);
      setCode("");
      setDevCode(null);
      toast({ title: "Phone removed" });
    } catch (err) {
      toast({
        title: "Couldn't remove phone",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveQuietHours = async (patch: {
    quietHoursStart: number | null;
    quietHoursEnd: number | null;
    quietHoursTimezone: string;
  }) => {
    setSavingQuiet(true);
    try {
      const contact = await notificationPrefsApi.updateContact(patch);
      setData((prev) => (prev ? { ...prev, contact } : prev));
      toast({ title: "Quiet hours saved" });
    } catch (err) {
      toast({
        title: "Couldn't save quiet hours",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingQuiet(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }
  if (!data) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">
          Couldn't load settings.
        </div>
      </Layout>
    );
  }

  const contact = data.contact;

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-3xl">
        <RouterLink href="/profile/alerts">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back to alert settings
          </Button>
        </RouterLink>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Real-time channels
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Notification preferences
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-prose">
            Choose how Kindue reaches you for each kind of event. In-app
            always shows in the bell; email and SMS fan out only when you opt
            in. SMS requires a verified phone number.
          </p>
        </div>

        {/* Channel × category matrix */}
        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-medium tracking-tight mb-4">
            Channels by category
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="text-left py-2 pr-4">Category</th>
                  {data.channels.map((ch) => (
                    <th key={ch.id} className="text-center py-2 px-3 w-24">
                      {ch.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.categories.map((cat) => (
                  <tr key={cat.id} className="border-t border-border">
                    <td className="py-3 pr-4 align-top">
                      <div className="font-medium">{cat.label}</div>
                      <div className="text-xs text-muted-foreground max-w-md">
                        {cat.description}
                      </div>
                    </td>
                    {data.channels.map((ch) => {
                      const cell = `${cat.id}:${ch.id}`;
                      const enabled = !!data.matrix[cat.id]?.[ch.id];
                      // SMS preference is independent of phone status —
                      // we still surface the stored value so the user can
                      // see/turn off what would activate once they verify.
                      const smsNeedsPhone =
                        ch.id === "sms" && !contact.phoneVerified;
                      return (
                        <td key={ch.id} className="text-center py-3 px-3">
                          <Switch
                            checked={enabled}
                            disabled={savingCells.has(cell)}
                            onCheckedChange={(v) =>
                              void updateCell(cat.id, ch.id, v)
                            }
                            aria-label={`${cat.label} via ${ch.label}`}
                          />
                          {smsNeedsPhone && enabled && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              verify phone to receive
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Phone */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-start gap-2 mb-4">
            <Smartphone className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <h2 className="font-serif text-xl font-medium tracking-tight">
                Phone number for SMS
              </h2>
              <p className="text-sm text-muted-foreground max-w-prose">
                We'll only text you for the categories you enable above. Use
                the international format (e.g. +14155551234).
              </p>
            </div>
          </div>

          {contact.phoneE164 && contact.phoneVerified ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span className="font-mono text-sm">{contact.phoneE164}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-700">
                  Verified
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive"
                onClick={() => void removePhone()}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          ) : pendingCode ? (
            <div className="flex flex-col gap-3">
              <div className="text-sm">
                Enter the 6-digit code we sent to{" "}
                <span className="font-mono">{contact.phoneE164}</span>.
              </div>
              {devCode && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Dev mode — your code is{" "}
                  <span className="font-mono font-medium">{devCode}</span>.
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="font-mono w-32"
                />
                <Button
                  onClick={() => void confirmVerify()}
                  disabled={confirmingCode}
                  className="gap-2"
                >
                  {confirmingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Verify
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPendingCode(false);
                    setCode("");
                    setDevCode(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 flex flex-col gap-2">
                <Label
                  htmlFor="phone"
                  className="text-xs uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Phone (E.164)
                </Label>
                <Input
                  id="phone"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+14155551234"
                  className="font-mono"
                  inputMode="tel"
                />
              </div>
              <Button
                onClick={() => void startVerify()}
                disabled={verifyingPhone}
                className="gap-2"
              >
                {verifyingPhone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Send code
              </Button>
            </div>
          )}
        </section>

        {/* Quiet hours */}
        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-medium tracking-tight mb-1">
            Quiet hours
          </h2>
          <p className="text-sm text-muted-foreground max-w-prose mb-5">
            Don't text me between these hours (in your time zone). Email and
            in-app are unaffected — only SMS is held back.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Quiet from
              </Label>
              <Select
                value={
                  contact.quietHoursStart == null
                    ? "off"
                    : String(contact.quietHoursStart)
                }
                onValueChange={(v) => {
                  const start = v === "off" ? null : Number(v);
                  void saveQuietHours({
                    quietHoursStart: start,
                    quietHoursEnd:
                      start == null ? null : (contact.quietHoursEnd ?? 7),
                    quietHoursTimezone: tzDraft || contact.quietHoursTimezone,
                  });
                }}
                disabled={savingQuiet}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIET_HOUR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Until
              </Label>
              <Select
                value={
                  contact.quietHoursEnd == null
                    ? "off"
                    : String(contact.quietHoursEnd)
                }
                onValueChange={(v) => {
                  const end = v === "off" ? null : Number(v);
                  void saveQuietHours({
                    quietHoursStart:
                      end == null ? null : (contact.quietHoursStart ?? 22),
                    quietHoursEnd: end,
                    quietHoursTimezone: tzDraft || contact.quietHoursTimezone,
                  });
                }}
                disabled={
                  savingQuiet || contact.quietHoursStart == null
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIET_HOUR_OPTIONS.filter((o) => o.value !== "off").map(
                    (o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Time zone (IANA)
              </Label>
              <Input
                value={tzDraft}
                onChange={(e) => setTzDraft(e.target.value)}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v === contact.quietHoursTimezone) return;
                  void saveQuietHours({
                    quietHoursStart: contact.quietHoursStart,
                    quietHoursEnd: contact.quietHoursEnd,
                    quietHoursTimezone: v,
                  });
                }}
                placeholder="America/New_York"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
