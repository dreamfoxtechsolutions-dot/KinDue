import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineError } from "@/components/inline-error";
import { useToast } from "@/hooks/use-toast";
import {
  useListSubscriptions,
  useScanGmail,
  useUpdateSubscription,
  useDeleteSubscription,
} from "@workspace/api-client-react";
import type { Subscription } from "@workspace/api-client-react";
import { useActiveHousehold } from "@/lib/active-household";

// TODO: backend not implemented — `/subscriptions/:id/cancel-info` doesn't
// exist on the real API. Until it lands, the cancel drawer relies entirely
// on the static fields the subscription itself carries (cancelUrl,
// cancelPhone, cancelEmail, notes). This local type mirrors what that
// endpoint used to return so the existing UI shape is preserved.
type CancelInfo = {
  url?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  tips?: string[];
};
import {
  Mail,
  ScanLine,
  Trash2,
  BellOff,
  PhoneCall,
  Globe,
  MailOpen,
  Info,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Copy,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { RedactedChip, isRedacted } from "@/components/redacted-chip";
import { useUser } from "@clerk/react";
import { LocationPicker } from "@/components/location-picker";
import {
  computeAwaySuggestions,
  type GeoSuggestion,
} from "@/hooks/use-geo-suggestions";
import { getAlertSettings } from "@/hooks/use-bill-alerts";
import { Link as RouterLink } from "wouter";

function CycleLabel({ cycle }: { cycle: string }) {
  const map: Record<string, string> = {
    monthly: "Monthly",
    yearly: "Yearly / Annual",
    weekly: "Weekly",
  };
  return <span>{map[cycle] ?? cycle}</span>;
}

function CancelDrawer({
  subscription,
  open,
  onClose,
}: {
  subscription: Subscription;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [info, setInfo] = useState<CancelInfo | null>(null);

  // TODO: backend not implemented — fall back to whatever the subscription
  // itself carries. Once `/subscriptions/:id/cancel-info` ships, swap this
  // local stub for the real generated mutation.
  const getCancelInfo = {
    isPending: false,
    mutate: () => {
      const fallback: CancelInfo = {
        url: subscription.cancelUrl ?? null,
        phone: subscription.cancelPhone ?? null,
        email: subscription.cancelEmail ?? null,
      };
      const hasAnything = fallback.url || fallback.phone || fallback.email;
      setInfo(hasAnything ? fallback : null);
      if (!hasAnything) {
        toast({
          title: "No saved cancel info",
          description:
            "We don't have contact details for this subscription yet. Try the provider's website.",
        });
      }
    },
  };

  const handleFetch = () => {
    getCancelInfo.mutate();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: `${label} copied!` })
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Cancel {subscription.name}</SheetTitle>
          <SheetDescription>
            We'll find the contact info you need to cancel this subscription
            quickly — no runaround.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          {/* Detected info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm flex flex-col gap-1">
              <p>
                <span className="text-muted-foreground">Provider: </span>
                <strong>{subscription.provider || subscription.name}</strong>
              </p>
              {subscription.amount > 0 && (
                <p>
                  <span className="text-muted-foreground">Amount: </span>
                  <strong>${subscription.amount.toFixed(2)} / <CycleLabel cycle={subscription.billingCycle} /></strong>
                </p>
              )}
              {isRedacted(subscription.redactedFields, "emailSender") ? (
                <p className="text-xs text-muted-foreground break-all">
                  Detected from: <RedactedChip />
                </p>
              ) : subscription.emailSender ? (
                <p className="text-xs text-muted-foreground break-all">
                  Detected from: {subscription.emailSender}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Cancel-info redacted notice for non-Trustees */}
          {isRedacted(subscription.redactedFields, "cancelUrl") && !info && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  Saved Cancel Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RedactedChip />
              </CardContent>
            </Card>
          )}

          {/* Already stored cancel info */}
          {!isRedacted(subscription.redactedFields, "cancelUrl") &&
            (subscription.cancelUrl || subscription.cancelPhone || subscription.cancelEmail) && !info && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  Saved Cancel Info
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {subscription.cancelUrl && (
                  <a
                    href={subscription.cancelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary underline underline-offset-2"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    Cancel Online
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {subscription.cancelPhone && (
                  <button
                    onClick={() => copy(subscription.cancelPhone, "Phone number")}
                    className="flex items-center gap-2 text-left"
                  >
                    <PhoneCall className="w-4 h-4 shrink-0 text-muted-foreground" />
                    {subscription.cancelPhone}
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
                {subscription.cancelEmail && (
                  <button
                    onClick={() => copy(subscription.cancelEmail, "Email address")}
                    className="flex items-center gap-2 text-left"
                  >
                    <MailOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
                    {subscription.cancelEmail}
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fetched live cancel info */}
          {info && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  How to Cancel {info.providerName}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {info.cancelUrl && (
                  <a
                    href={info.cancelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary underline underline-offset-2 font-medium"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    Cancel Online
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {info.cancelPhone && (
                  <button
                    onClick={() => copy(info.cancelPhone, "Phone number")}
                    className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                  >
                    <PhoneCall className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span>{info.cancelPhone}</span>
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
                {info.cancelEmail && (
                  <button
                    onClick={() => copy(info.cancelEmail, "Email address")}
                    className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                  >
                    <MailOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span>{info.cancelEmail}</span>
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}

                {info.tips.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Tips</p>
                    <ul className="flex flex-col gap-1">
                      {info.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="mt-0.5 shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleFetch}
            disabled={getCancelInfo.isPending}
            className="gap-2"
            variant={info ? "outline" : "default"}
          >
            {getCancelInfo.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ScanLine className="w-4 h-4" />
            )}
            {info ? "Refresh Cancel Info" : "Find Cancellation Contact Info"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubscriptionCard({
  sub,
  onDismiss,
  onDelete,
  onCancel,
  onUpdateLocation,
  onClearLocation,
  onMarkVisited,
  awayDays,
  thresholdDays,
}: {
  sub: Subscription;
  onDismiss: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onUpdateLocation: (lat: number, lng: number, label: string) => void;
  onClearLocation: () => void;
  onMarkVisited: () => void;
  awayDays?: number;
  thresholdDays?: number;
}) {
  const yearly = sub.billingCycle === "yearly" ? sub.amount : sub.amount * 12;
  const [editingLoc, setEditingLoc] = useState(false);
  const flagged =
    typeof awayDays === "number" &&
    typeof thresholdDays === "number" &&
    awayDays >= thresholdDays;

  return (
    <Card className={sub.dismissed ? "opacity-60" : ""}>
      <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="font-semibold text-sm">{sub.name}</span>
            {sub.detectedFrom === "gmail" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Mail className="w-3 h-3" /> Gmail
              </Badge>
            )}
            {sub.dismissed && (
              <Badge variant="outline" className="text-xs">Dismissed</Badge>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {sub.amount > 0 && (
              <span>
                ${sub.amount.toFixed(2)} / <CycleLabel cycle={sub.billingCycle} />
                {" · "}
                ~${yearly.toFixed(0)}/yr
              </span>
            )}
            {isRedacted(sub.redactedFields, "emailSender") ? (
              <RedactedChip />
            ) : sub.emailSender ? (
              <span className="truncate max-w-[220px]">{sub.emailSender}</span>
            ) : null}
          </div>

          {isRedacted(sub.redactedFields, "emailSubject") ? (
            <p className="mt-1 text-xs text-muted-foreground italic">
              <RedactedChip />
            </p>
          ) : sub.emailSubject ? (
            <p className="mt-1 text-xs text-muted-foreground italic truncate max-w-sm">
              "{sub.emailSubject}"
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isRedacted(sub.redactedFields, "serviceLocationLabel") ? (
              <RedactedChip />
            ) : sub.serviceLocationLabel ? (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[260px]">
                  {sub.serviceLocationLabel}
                </span>
              </Badge>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setEditingLoc((v) => !v)}
              >
                <MapPin className="w-3 h-3" />
                Tag service location
              </button>
            )}
            {sub.serviceLocationLabel && (
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={() => setEditingLoc((v) => !v)}
              >
                edit
              </button>
            )}
            {flagged && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <CalendarClock className="w-3 h-3" />
                Unused {awayDays}d
              </Badge>
            )}
          </div>

          {editingLoc && (
            <div className="mt-3 rounded-md border border-border bg-background p-3">
              <LocationPicker
                initialLabel={sub.serviceLocationLabel || ""}
                onPick={(r) => {
                  onUpdateLocation(r.lat, r.lng, r.label);
                  setEditingLoc(false);
                }}
                onClear={
                  sub.serviceLocationLabel
                    ? () => {
                        onClearLocation();
                        setEditingLoc(false);
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {flagged && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={onMarkVisited}
              title="Reset away counter — I still use this"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Still using
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={onCancel}>
            <PhoneCall className="w-3.5 h-3.5" />
            How to Cancel
          </Button>
          {!sub.dismissed && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onDismiss} title="Dismiss alert">
              <BellOff className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={onDelete} title="Remove">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SubscriptionsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { householdId } = useActiveHousehold();
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);

  const {
    data: subscriptions = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useListSubscriptions();

  const alertSettings = getAlertSettings(
    (user?.unsafeMetadata ?? {}) as Record<string, unknown>,
  );
  const suggestions: GeoSuggestion[] = alertSettings.geoEnabled
    ? computeAwaySuggestions(
        subscriptions,
        alertSettings.awayThresholdDays,
      )
    : [];
  const awayMap = new Map<number, number>(
    suggestions.map((s) => [s.subscriptionId, s.daysAway]),
  );

  const scanGmail = useScanGmail({
    mutation: {
      onSuccess: (data) => {
        refetch();
        toast({
          title: `Scan complete`,
          description: `Scanned ${data.scanned} emails · Found ${data.found} subscriptions · ${data.newlyAdded} newly added`,
        });
      },
      onError: (err: any) =>
        toast({
          title: "Gmail scan failed",
          description: err?.message ?? "Could not connect to Gmail.",
          variant: "destructive",
        }),
    },
  });

  const updateSub = useUpdateSubscription({
    mutation: {
      onSuccess: () => refetch(),
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const deleteSub = useDeleteSubscription({
    mutation: {
      onSuccess: () => {
        refetch();
        toast({ title: "Subscription removed" });
      },
      onError: () => toast({ title: "Delete failed", variant: "destructive" }),
    },
  });

  const active = subscriptions.filter((s) => !s.dismissed);
  const dismissed = subscriptions.filter((s) => s.dismissed);
  const monthlyTotal = active.reduce((sum, s) => {
    if (s.billingCycle === "yearly") return sum + s.amount / 12;
    if (s.billingCycle === "weekly") return sum + s.amount * 4;
    return sum + s.amount;
  }, 0);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Subscriptions</h1>
            <p className="text-muted-foreground mt-1">
              Recurring charges detected from your inbox — see what you're paying and cancel what you don't need.
            </p>
          </div>
          <Button
            onClick={() =>
              householdId != null && scanGmail.mutate({ householdId })
            }
            disabled={scanGmail.isPending || householdId == null}
            className="shrink-0 gap-2 h-10 px-5 shadow-sm"
          >
            {scanGmail.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="h-4 w-4" />
            )}
            Scan Gmail Inbox
          </Button>
        </div>

        {/* Summary cards */}
        {active.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{active.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Est. Monthly Cost</p>
                <p className="text-2xl font-bold">${monthlyTotal.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Est. Annual Cost</p>
                <p className="text-2xl font-bold">${(monthlyTotal * 12).toFixed(0)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Call to action */}
        {subscriptions.length === 0 && !isLoading && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertTitle>No subscriptions found yet</AlertTitle>
            <AlertDescription>
              Click <strong>Scan Gmail Inbox</strong> above to automatically detect recurring charges from your email.
              We'll scan for receipts, billing confirmations, and renewal notices.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Inline error with retry — friendlier than a toast for older
            caregivers who may have missed a fleeting message. */}
        {isError && !isLoading && (
          <InlineError
            title="We couldn't load your subscriptions"
            description="Check your connection and try again — your saved data is safe."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        )}

        {/* Geo-based suggestions */}
        {suggestions.length > 0 && (
          <Alert className="border-amber-300/60 bg-amber-50/60 text-foreground">
            <MapPin className="h-4 w-4 text-amber-700" />
            <AlertTitle className="font-serif text-base">
              You may not be using {suggestions.length} subscription
              {suggestions.length === 1 ? "" : "s"}
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {suggestions.slice(0, 5).map((s) => (
                  <li key={s.subscriptionId} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">
                      · last near {s.serviceLocationLabel} {s.daysAway} days ago
                      · ${s.amount.toFixed(2)}/cycle
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Adjust the threshold or turn this off in{" "}
                <RouterLink
                  href="/profile/alerts"
                  className="underline-offset-2 underline"
                >
                  alert preferences
                </RouterLink>
                .
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Geo opt-in nudge when off */}
        {!alertSettings.geoEnabled && active.length > 0 && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertTitle>Catch unused location-based subscriptions</AlertTitle>
            <AlertDescription>
              Tag a service location on a subscription (gym, car wash, salon)
              and Kindue will flag it when you haven't been near in a
              while.{" "}
              <RouterLink
                href="/profile/alerts"
                className="underline-offset-2 underline"
              >
                Enable in alert preferences
              </RouterLink>
              .
            </AlertDescription>
          </Alert>
        )}

        {/* Active subscriptions */}
        {active.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              Active Subscriptions
            </h2>
            {active.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                onDismiss={() => updateSub.mutate({ id: sub.id, data: { dismissed: true } })}
                onDelete={() => deleteSub.mutate({ id: sub.id })}
                onCancel={() => setCancelTarget(sub)}
                onUpdateLocation={(lat, lng, label) =>
                  // TODO: backend not implemented — `serviceLat`,
                  // `serviceLng`, and `lastNearVisitAt` aren't on the
                  // canonical UpdateSubscriptionBody schema yet. The
                  // request will be rejected until the geo presence
                  // backend lands.
                  updateSub.mutate({
                    id: sub.id,
                    data: {
                      serviceLocationLabel: label,
                      ...({
                        serviceLat: lat,
                        serviceLng: lng,
                        lastNearVisitAt: new Date().toISOString(),
                      } as object),
                    },
                  })
                }
                onClearLocation={() =>
                  updateSub.mutate({
                    id: sub.id,
                    data: {
                      serviceLocationLabel: "",
                      ...({
                        serviceLat: null,
                        serviceLng: null,
                        lastNearVisitAt: null,
                      } as object),
                    },
                  })
                }
                onMarkVisited={() =>
                  updateSub.mutate({
                    id: sub.id,
                    data: {
                      ...({
                        lastNearVisitAt: new Date().toISOString(),
                      } as object),
                    },
                  })
                }
                awayDays={awayMap.get(sub.id)}
                thresholdDays={alertSettings.awayThresholdDays}
              />
            ))}
          </div>
        )}

        {/* Dismissed */}
        {dismissed.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BellOff className="w-4 h-4" />
              Dismissed
            </h2>
            {dismissed.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                onDismiss={() => {}}
                onDelete={() => deleteSub.mutate({ id: sub.id })}
                onCancel={() => setCancelTarget(sub)}
                onUpdateLocation={() => {}}
                onClearLocation={() => {}}
                onMarkVisited={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel info drawer */}
      {cancelTarget && (
        <CancelDrawer
          subscription={cancelTarget}
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </Layout>
  );
}
