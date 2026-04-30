import {
  ShieldCheck,
  Mail,
  CheckCircle2,
  XCircle,
  Lock,
  EyeOff,
  Trash2,
  ScanLine,
  HeartPulse,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { PrivacyFooter } from "@/components/privacy-footer";

// A plain-language privacy summary explaining exactly what Kindue
// reads from a connected Gmail inbox and what it never stores. Linked
// from Settings → Connections so caregivers can answer "what is this
// app doing with my parent's email?" in under thirty seconds.
export function PrivacyPage() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Privacy
          </p>
          <h1 className="font-serif text-2xl font-medium tracking-tight mt-1">
            Your Gmail, your control
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We treat your parent's information the way a hospital treats a
            chart — read only what we need, store as little as possible, and
            never share it. Here's exactly what that looks like.
          </p>
        </div>

        {/* Health-information posture — caregivers expect HIPAA-style
            language even though a household ledger isn't a covered entity.
            We're explicit about what we are and aren't, then describe the
            protections in the same vocabulary they'd hear at a clinic. */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HeartPulse className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-medium">
              Health information &amp; insurance
            </h2>
          </div>
          <p className="text-sm leading-relaxed">
            Bills from doctors, hospitals, pharmacies, Medicare, Medigap,
            long-term care insurance and similar senders often contain
            sensitive health details. Kindue isn't a healthcare provider
            or insurer, so we aren't a "covered entity" under HIPAA — but we
            handle this information with HIPAA-style protections because
            caregivers reasonably expect that:
          </p>
          <ul className="space-y-2.5 text-sm">
            <PrivacyItem positive>
              <strong>Minimum necessary.</strong> We capture amount due,
              due date, and the provider's name — not diagnosis codes,
              procedure descriptions, prescriptions, or lab results.
            </PrivacyItem>
            <PrivacyItem positive>
              <strong>Encrypted in transit and at rest</strong> using
              industry-standard TLS and database encryption.
            </PrivacyItem>
            <PrivacyItem positive>
              <strong>Access on a need-to-know basis</strong> — visible only
              to caregivers in your household, with role-based permissions
              and a full audit trail.
            </PrivacyItem>
            <PrivacyItem positive>
              <strong>No secondary use.</strong> Health-related data is
              never sold, shared with advertisers, used to train AI models,
              or used for any purpose beyond protecting your parent.
            </PrivacyItem>
            <PrivacyItem positive>
              <strong>Right to delete.</strong> One owner-initiated step in
              Settings erases everything — health-related bills,
              insurance-card uploads, and notification history all included.
            </PrivacyItem>
          </ul>
          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            If a healthcare provider asks you to sign a Business Associate
            Agreement before forwarding records to Kindue, please pause
            and contact us first — we'll help you find the right path.
          </p>
        </section>

        {/* What we read */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-medium">
              What we read from Gmail
            </h2>
          </div>
          <ul className="space-y-2.5 text-sm">
            <PrivacyItem positive>
              The <strong>sender</strong>, <strong>subject</strong>, and
              <strong> date</strong> of messages that look like bills,
              receipts, or subscription renewals.
            </PrivacyItem>
            <PrivacyItem positive>
              The <strong>amount due</strong> and <strong>due date</strong>{" "}
              when those appear in a billing email.
            </PrivacyItem>
            <PrivacyItem positive>
              The merchant or service name so we can show "Netflix · $15.99"
              instead of a raw email line.
            </PrivacyItem>
          </ul>
        </section>

        {/* What we never store */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <EyeOff className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-medium">
              What we never store
            </h2>
          </div>
          <ul className="space-y-2.5 text-sm">
            <PrivacyItem>
              <strong>Full email bodies.</strong> We extract a handful of
              fields and discard the rest the moment the scan ends.
            </PrivacyItem>
            <PrivacyItem>
              <strong>Personal letters, photos, or attachments.</strong>{" "}
              Anything that doesn't look like a bill is skipped entirely.
            </PrivacyItem>
            <PrivacyItem>
              <strong>Passwords, account numbers, or card numbers</strong>{" "}
              even when they appear in receipts.
            </PrivacyItem>
            <PrivacyItem>
              <strong>Conversation threads or contacts.</strong> We never
              read who you write to or what you say.
            </PrivacyItem>
            <PrivacyItem>
              <strong>Anything from senders we don't recognize as billers</strong>{" "}
              (utilities, telecoms, streaming, insurance, healthcare,
              banks, and similar).
            </PrivacyItem>
          </ul>
        </section>

        {/* How we protect it */}
        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg font-medium">
              How we protect what we keep
            </h2>
          </div>
          <ul className="space-y-2.5 text-sm">
            <PrivacyItem positive>
              Encrypted in transit (TLS) and at rest in our database.
            </PrivacyItem>
            <PrivacyItem positive>
              Visible only to verified caregivers in your household.
            </PrivacyItem>
            <PrivacyItem positive>
              Never sold, never shared with advertisers, never used to train
              outside AI models.
            </PrivacyItem>
            <PrivacyItem positive>
              You can disconnect Gmail or delete every stored bill at any
              time from the connections page.
            </PrivacyItem>
          </ul>
        </section>

        {/* Your control */}
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-base font-medium">
              You stay in control
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Connecting Gmail is optional. You can add bills by hand and never
            link an inbox at all. If you do link one, every scan is logged so
            you can see what was read and when.
          </p>
          <div className="pt-2 flex flex-wrap gap-2 text-xs">
            <a
              href="/scan"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 hover:bg-foreground/5"
            >
              <ScanLine className="h-3.5 w-3.5" />
              Manage connected accounts
            </a>
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 hover:bg-foreground/5 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete stored data
            </a>
          </div>
        </section>

        <PrivacyFooter />
      </div>
    </Layout>
  );
}

function PrivacyItem({
  children,
  positive = false,
}: {
  children: React.ReactNode;
  positive?: boolean;
}) {
  const Icon = positive ? CheckCircle2 : XCircle;
  return (
    <li className="flex items-start gap-2.5">
      <Icon
        className={
          "h-4 w-4 shrink-0 mt-0.5 " +
          (positive ? "text-emerald-700" : "text-destructive")
        }
        aria-hidden="true"
      />
      <span className="leading-relaxed text-foreground">{children}</span>
    </li>
  );
}
