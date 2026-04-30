import {
  Eye,
  EyeOff,
  Users,
  KeyRound,
  Trash2,
  Lock,
  ListChecks,
  Download,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { TrustBadgesRow } from "@/components/marketing/trust-badges-row";

// Public, plain-language security page. This is the marketing-side
// summary aimed at first-time visitors deciding whether to trust us
// with a parent's inbox. The deeper, signed-in privacy summary
// lives at /settings/privacy and answers the same questions in
// product context.
//
// Hard rule: only claim what we actually do today. If we don't have
// SOC 2 in progress, we say so plainly rather than dressing it up.

export function SecurityPage() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Security
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
          Built like a chart, not a wallet.
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          We treat your loved one's information the way a clinic treats a
          chart: read only what we need, store as little as possible, and
          never share it. Here is exactly what that looks like — without the
          marketing fluff.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-10">
        <div className="rounded-md border border-border bg-card/40 p-6">
          <TrustBadgesRow />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 space-y-5">
        <Block
          icon={<Eye className="h-4 w-4" />}
          title="What we read from a connected inbox"
        >
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Sender, subject, and date</strong> of messages that look
              like bills, receipts, or subscription renewals.
            </li>
            <li>
              <strong>Amount due</strong> and <strong>due date</strong> when
              they appear in a billing email.
            </li>
            <li>
              The merchant or service name, so we can render a clean line
              like &quot;Duke Energy · $142.50&quot; instead of a raw email
              snippet.
            </li>
            <li>
              For each scan, a small log entry so you can see what was read
              and when.
            </li>
          </ul>
        </Block>

        <Block
          icon={<EyeOff className="h-4 w-4" />}
          title="What we never read or store"
          tone="warn"
        >
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Full email bodies.</strong> We extract a handful of
              fields and discard the rest the moment a scan ends.
            </li>
            <li>
              <strong>Personal letters, photos, or attachments.</strong>{" "}
              Anything that doesn&apos;t look like a bill is skipped.
            </li>
            <li>
              <strong>Account numbers, passwords, or card numbers</strong>{" "}
              even when they appear inside a receipt.
            </li>
            <li>
              <strong>Conversation threads or contacts.</strong> We never see
              who you write to or what you say.
            </li>
            <li>
              <strong>Anything from senders we don&apos;t recognize</strong>{" "}
              as billers — utilities, telecoms, streaming, insurance,
              healthcare, banks, and similar.
            </li>
          </ul>
        </Block>

        <Block
          icon={<Users className="h-4 w-4" />}
          title="Who can see what inside your household"
        >
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Primary user</strong> (the caregiver who created the
              household) can see everything and invite or remove other
              members.
            </li>
            <li>
              <strong>Family members</strong> see bills, the calendar, and
              the activity feed — no admin controls.
            </li>
            <li>
              <strong>Caregivers</strong> can act on bills (claim, comment,
              mark paid) and their actions are logged for the whole circle.
            </li>
            <li>
              <strong>Alerts-only members</strong> receive notifications but
              cannot see bill details.
            </li>
            <li>
              Every action — who connected an inbox, who marked a bill paid,
              who removed a caregiver — is recorded in the audit log and
              visible to the whole circle.
            </li>
          </ul>
        </Block>

        <Block
          icon={<Download className="h-4 w-4" />}
          title="Exporting your household's data"
        >
          <p className="text-sm leading-relaxed mb-3">
            Your data is yours. You can take it with you whenever you want,
            without filing a request or waiting for support to email it to
            you.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <strong>Where to click:</strong> open Settings → Export data.
              Any caregiver in the household can run an export.
            </li>
            <li>
              <strong>What you get:</strong> a printable monthly statement
              listing every detected bill (merchant, amount, due date,
              status) plus your stored documents and the activity log.
            </li>
            <li>
              <strong>Format:</strong> a PDF for easy sharing with a
              relative or advisor, and a CSV of bills for spreadsheets.
            </li>
            <li>
              <strong>Scope:</strong> exports cover the current household
              only. If you steward more than one household, switch
              households first and run the export again.
            </li>
            <li>
              Exports are generated on demand — we don&apos;t pre-bake or
              store copies on our side.
            </li>
          </ul>
        </Block>

        <Block
          icon={<KeyRound className="h-4 w-4" />}
          title="Revoking access and deleting data"
        >
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              The Primary user can remove any caregiver from the Members
              page in one click. Removal is immediate.
            </li>
            <li>
              Disconnecting the inbox from the connections page stops all
              future scans. Existing bills remain so the household ledger
              stays intact — or you can wipe them in the next step.
            </li>
            <li>
              From Settings → Delete data, the Primary user can erase the
              household and every bill, document, and notification with
              one confirmation.
            </li>
            <li>
              Deletion is permanent. We do not keep a shadow copy or a
              &quot;just in case&quot; backup of personal data after
              deletion.
            </li>
          </ul>
        </Block>

        <Block
          icon={<Lock className="h-4 w-4" />}
          title="Encryption posture"
        >
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              All traffic is encrypted in transit with TLS 1.2 or higher.
            </li>
            <li>Data at rest is encrypted at the database layer.</li>
            <li>
              OAuth tokens for connected inboxes are stored encrypted and
              never returned to the browser.
            </li>
            <li>
              Sign-in is handled by Clerk. We never see or store your
              password.
            </li>
          </ul>
        </Block>

        <Block
          icon={<ListChecks className="h-4 w-4" />}
          title="Honest security roadmap"
          tone="muted"
        >
          <p className="text-sm leading-relaxed">
            Kindue is a small team and we are not going to pretend
            otherwise. Here is what we have done, what we are doing, and
            what we have not yet done — without the usual hand-waving:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm mt-3">
            <li>
              <strong>Done:</strong> read-only inbox access, full audit log
              of every member action, household-scoped data isolation,
              one-click delete.
            </li>
            <li>
              <strong>In progress:</strong> third-party penetration testing
              and an external review of our access policies.
            </li>
            <li>
              <strong>Not yet done:</strong> SOC 2 attestation, HIPAA
              Business Associate Agreement, ISO 27001. We will say so on
              this page the day any of those change.
            </li>
          </ul>
        </Block>

        <Block
          icon={<Trash2 className="h-4 w-4" />}
          title="Reporting a security issue"
        >
          <p className="text-sm leading-relaxed">
            If you find a security issue, please email{" "}
            <a
              href="mailto:security@billguard.app"
              className="underline underline-offset-2 hover:text-foreground"
            >
              security@billguard.app
            </a>
            . We acknowledge every report within two business days and we
            will not pursue legal action against good-faith research.
          </p>
        </Block>
      </section>
    </MarketingShell>
  );
}

function Block({
  icon,
  title,
  children,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "warn" | "muted";
}) {
  const toneClasses =
    tone === "warn"
      ? "border-amber-200/60 bg-amber-50/50"
      : tone === "muted"
        ? "border-border bg-muted/30"
        : "border-border bg-card";
  return (
    <section className={`rounded-md border p-6 ${toneClasses}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border bg-background">
          {icon}
        </span>
        <h2 className="font-serif text-lg font-medium tracking-tight">
          {title}
        </h2>
      </div>
      <div className="text-foreground/90">{children}</div>
    </section>
  );
}
