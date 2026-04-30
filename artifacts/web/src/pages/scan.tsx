import { useUser } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Mail,
  Plus,
  RefreshCw,
  ScanLine,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useScanGmail } from "@workspace/api-client-react";
import { useInvalidateHouseholdData } from "@/lib/api-hooks";
import { useActiveHousehold } from "@/lib/active-household";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { useScanCapability } from "@/hooks/use-scan-capability";

const MAX_SCAN_EMAILS = 5;
const MAX_LINKED_INSTITUTIONS = 5;

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

type ScanAccountResult = {
  label: string;
  scanned: number;
  found: number;
  newlyAdded: number;
  error?: string;
};

type ScanSummary = {
  scanned: number;
  found: number;
  newlyAdded: number;
  accounts?: ScanAccountResult[];
};

type InstitutionCategory = "wallet" | "bank" | "card";

type Institution = {
  id: string;
  name: string;
  category: InstitutionCategory;
  icon: LucideIcon;
  description: string;
};

type LinkedInstitution = {
  id: string;
  connectedAt: string; // ISO
};

const INSTITUTIONS: Institution[] = [
  {
    id: "paypal",
    name: "PayPal",
    category: "wallet",
    icon: Wallet,
    description: "Detect subscription charges and recurring payments.",
  },
  {
    id: "cashapp",
    name: "Cash App",
    category: "wallet",
    icon: Banknote,
    description: "Scan for recurring transfers and bill pay.",
  },
  {
    id: "venmo",
    name: "Venmo",
    category: "wallet",
    icon: Wallet,
    description: "Catch split utilities and shared recurring payments.",
  },
  {
    id: "zelle",
    name: "Zelle",
    category: "wallet",
    icon: Banknote,
    description: "Identify landlord and recurring transfers.",
  },
  {
    id: "bank",
    name: "Bank account",
    category: "bank",
    icon: Landmark,
    description: "ACH drafts, auto-pays, and recurring debits.",
  },
  {
    id: "credit-card",
    name: "Credit card",
    category: "card",
    icon: CreditCard,
    description: "Subscription charges and annual fees.",
  },
  {
    id: "other-bank",
    name: "Other institution",
    category: "bank",
    icon: Building2,
    description: "Brokerage, HSA, student loan servicers, and more.",
  },
];

const CATEGORY_LABEL: Record<InstitutionCategory, string> = {
  wallet: "Wallet",
  bank: "Bank",
  card: "Card",
};

export function ScanPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const { householdId } = useActiveHousehold();
  const invalidate = useInvalidateHouseholdData();
  const [, setLocation] = useLocation();

  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [lastScan, setLastScan] = useState<ScanSummary | null>(null);
  const [linkedInstitutions, setLinkedInstitutions] = useState<
    LinkedInstitution[]
  >([]);
  const [institutionSavingId, setInstitutionSavingId] = useState<string | null>(
    null,
  );
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const md = (user.unsafeMetadata ?? {}) as {
      scanEmails?: string[];
      linkedInstitutions?: LinkedInstitution[];
    };
    const primaryGmail =
      user.emailAddresses?.find((e: { emailAddress: string }) =>
        e.emailAddress.toLowerCase().endsWith("@gmail.com"),
      )?.emailAddress ?? "";
    setEmails(
      md.scanEmails && md.scanEmails.length > 0
        ? md.scanEmails.slice(0, MAX_SCAN_EMAILS)
        : primaryGmail
          ? [primaryGmail]
          : [],
    );
    setLinkedInstitutions(md.linkedInstitutions ?? []);
  }, [user]);

  const persistEmails = async (next: string[]) => {
    if (!user) return;
    setEmailSaving(true);
    try {
      const prev = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
      await user.update({
        unsafeMetadata: { ...prev, scanEmails: next },
      });
      setEmails(next);
    } catch (err: any) {
      toast({
        title: "Could not update linked inboxes",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEmailSaving(false);
    }
  };

  const onAdd = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    setEmailError(null);
    if (!trimmed) {
      setEmailError("Enter an email address.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("That doesn't look like a valid email.");
      return;
    }
    if (emails.includes(trimmed)) {
      setEmailError("That address is already linked.");
      return;
    }
    if (emails.length >= MAX_SCAN_EMAILS) {
      setEmailError(`You can link at most ${MAX_SCAN_EMAILS} inboxes.`);
      return;
    }
    await persistEmails([...emails, trimmed]);
    setNewEmail("");
  };

  const onRemove = async (addr: string) => {
    await persistEmails(emails.filter((e) => e !== addr));
  };

  const toggleInstitution = async (id: string) => {
    if (!user) return;
    const isLinked = linkedInstitutions.some((l) => l.id === id);
    if (!isLinked && linkedInstitutions.length >= MAX_LINKED_INSTITUTIONS) {
      toast({
        title: "Connection limit reached",
        description: `You can link at most ${MAX_LINKED_INSTITUTIONS} financial accounts.`,
        variant: "destructive",
      });
      return;
    }
    const next = isLinked
      ? linkedInstitutions.filter((l) => l.id !== id)
      : [
          ...linkedInstitutions,
          { id, connectedAt: new Date().toISOString() },
        ];
    setInstitutionSavingId(id);
    try {
      const prev = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
      await user.update({
        unsafeMetadata: { ...prev, linkedInstitutions: next },
      });
      setLinkedInstitutions(next);
      const inst = INSTITUTIONS.find((i) => i.id === id);
      if (inst) {
        toast({
          title: isLinked
            ? `${inst.name} disconnected`
            : `${inst.name} connected`,
          description: isLinked
            ? "Kindue will no longer scan this source."
            : "Authorization will be requested on your next scan.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Could not update connections",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setInstitutionSavingId(null);
    }
  };

  const scanBills = useScanGmail({
    mutation: {
      onSuccess: (data) => {
        invalidate();
        setLastScan({
          scanned: data.scanned,
          found: data.found,
          newlyAdded: data.newlyAdded,
          accounts: (data as { accounts?: ScanAccountResult[] }).accounts,
        });
        toast({
          title: "Inbox scan complete",
          description: `Scanned ${data.scanned} emails · Found ${data.found} bills · ${data.newlyAdded} awaiting your review`,
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

  const { canScan: roleCanScan } = useScanCapability();

  const canScan = useMemo(
    // `roleCanScan` is undefined while scan-status is loading; we
    // treat that as "not yet allowed" so a click can't slip through
    // and 403 before the role is known.
    () => roleCanScan === true && emails.length > 0 && !scanBills.isPending,
    [roleCanScan, emails.length, scanBills.isPending],
  );

  if (!isLoaded) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-3xl">
        <div>
          <button
            onClick={() => setLocation("/")}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to dashboard
          </button>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Scan for bills
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Link email inboxes and financial accounts. Kindue scans them
            for bills, due dates, and subscription charges.
          </p>
        </div>

        {/* Linked emails list */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4" />
                <h2 className="font-serif text-xl font-medium tracking-tight">
                  Linked email accounts
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                The addresses below will all be scanned when you press Scan
                now.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground shrink-0">
              {emails.length} / {MAX_SCAN_EMAILS}
            </span>
          </div>

          {emails.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background mb-4">
              {emails.map((addr, idx) => (
                <li
                  key={addr}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm truncate">{addr}</span>
                    {idx === 0 && (
                      <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-primary shrink-0">
                        Primary
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => onRemove(addr)}
                    disabled={emailSaving || scanBills.isPending}
                    aria-label={`Remove ${addr}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground mb-4">
              No inboxes linked yet. Add one below to start scanning.
            </div>
          )}

          {emails.length < MAX_SCAN_EMAILS && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAdd();
                    }
                  }}
                  placeholder="name@gmail.com"
                  disabled={emailSaving || scanBills.isPending}
                />
                {emailError && (
                  <div className="text-xs text-destructive mt-1.5">
                    {emailError}
                  </div>
                )}
              </div>
              <Button
                onClick={onAdd}
                disabled={
                  emailSaving || scanBills.isPending || !newEmail.trim()
                }
                variant="outline"
                className="sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {emailSaving ? "Linking…" : "Link inbox"}
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Each Gmail inbox must also be authorized through the integrations
            pane so Kindue has permission to read it.
          </div>
        </section>

        {/* Financial institutions */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Landmark className="h-4 w-4" />
                <h2 className="font-serif text-xl font-medium tracking-tight">
                  Financial accounts
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect wallets, banks, and cards so Kindue can spot
                recurring charges and auto-pays that never hit your inbox.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground shrink-0">
              {linkedInstitutions.length} / {MAX_LINKED_INSTITUTIONS}
            </span>
          </div>

          {/* Linked accounts list */}
          {linkedInstitutions.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-background mb-4">
              {linkedInstitutions.map((link) => {
                const inst = INSTITUTIONS.find((i) => i.id === link.id);
                if (!inst) return null;
                const Icon = inst.icon;
                const isSaving = institutionSavingId === inst.id;
                return (
                  <li
                    key={inst.id}
                    className="flex items-center justify-between px-4 py-3 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-md border border-border bg-background p-1.5 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {inst.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
                            {CATEGORY_LABEL[inst.category]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {inst.description}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => toggleInstitution(inst.id)}
                      disabled={isSaving || scanBills.isPending}
                      aria-label={`Disconnect ${inst.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground mb-4">
              No financial accounts connected yet. Pick one below to get
              started.
            </div>
          )}

          {/* Dropdown + Connect */}
          {(() => {
            const atLimit =
              linkedInstitutions.length >= MAX_LINKED_INSTITUTIONS;
            const availableInstitutions = INSTITUTIONS.filter(
              (inst) => !linkedInstitutions.some((l) => l.id === inst.id),
            );
            if (atLimit) {
              return (
                <div className="rounded-md border border-dashed border-border px-4 py-3 text-center text-xs text-muted-foreground">
                  You've reached the {MAX_LINKED_INSTITUTIONS}-account limit.
                  Disconnect one above to add another.
                </div>
              );
            }
            if (availableInstitutions.length === 0) {
              return (
                <div className="text-xs text-muted-foreground text-center py-2">
                  All available institutions are connected.
                </div>
              );
            }
            return (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedInstitutionId}
                    onValueChange={setSelectedInstitutionId}
                    disabled={!!institutionSavingId || scanBills.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a financial account to connect…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInstitutions.map((inst) => {
                        const Icon = inst.icon;
                        return (
                          <SelectItem key={inst.id} value={inst.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{inst.name}</span>
                              <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
                                {CATEGORY_LABEL[inst.category]}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={async () => {
                    if (!selectedInstitutionId) return;
                    const id = selectedInstitutionId;
                    await toggleInstitution(id);
                    setSelectedInstitutionId("");
                  }}
                  disabled={
                    !selectedInstitutionId ||
                    !!institutionSavingId ||
                    scanBills.isPending
                  }
                  className="sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {institutionSavingId ? "Connecting…" : "Connect"}
                </Button>
              </div>
            );
          })()}

          <div className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Connecting marks the source for scanning. Kindue will prompt
            for each provider's authorization on your next scan.
          </div>
        </section>

        {/* Scan action */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-medium tracking-tight mb-1">
                Ready to scan
              </h2>
              <p className="text-sm text-muted-foreground">
                {roleCanScan === false
                  ? "Caregiver accounts can't run scans. The household admin handles this."
                  : emails.length === 0
                    ? "Link at least one inbox above to enable scanning."
                    : `Scan ${emails.length} inbox${emails.length === 1 ? "" : "es"}${linkedInstitutions.length > 0 ? ` and ${linkedInstitutions.length} financial account${linkedInstitutions.length === 1 ? "" : "s"}` : ""} now. Detected bills land in the review queue.`}
              </p>
            </div>
            {roleCanScan === false ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0" tabIndex={0}>
                      <Button
                        disabled
                        aria-disabled
                        className="shrink-0 gap-2 h-11 px-6 pointer-events-none"
                      >
                        <ScanLine className="h-4 w-4" />
                        Scan now
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Only the household admin can scan inboxes.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              // `roleCanScan === undefined` (still loading) keeps the
              // button disabled via `canScan` so a too-early click can't
              // 403; admins see it light up the moment status resolves.
              <Button
                onClick={() =>
                  householdId != null && scanBills.mutate({ householdId })
                }
                disabled={!canScan || householdId == null}
                className="shrink-0 gap-2 h-11 px-6"
              >
                {scanBills.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4" />
                    Scan now
                  </>
                )}
              </Button>
            )}
          </div>
          {roleCanScan === false && <ViewOnlyNotice className="mt-4" />}

          {lastScan && (
            <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-primary">
                    Last scan complete
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="font-mono text-lg">{lastScan.scanned}</div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Emails scanned
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-lg">{lastScan.found}</div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Bills found
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-lg">
                        {lastScan.newlyAdded}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Need review
                      </div>
                    </div>
                  </div>
                  {lastScan.accounts && lastScan.accounts.length > 0 && (
                    <div className="mt-4 space-y-1.5 border-t border-primary/15 pt-3">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                        By account
                      </div>
                      {lastScan.accounts.map((acc) => (
                        <div
                          key={acc.label}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="truncate text-foreground/80 mr-2">
                            {acc.label}
                          </span>
                          <span className={acc.error ? "text-destructive" : "text-muted-foreground"}>
                            {acc.error
                              ? "Failed"
                              : `${acc.scanned} scanned · ${acc.newlyAdded} new`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {lastScan.newlyAdded > 0 && (
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => setLocation("/")}
                    >
                      Review pending bills
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
