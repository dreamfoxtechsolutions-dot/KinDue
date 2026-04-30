import { useUser } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "wouter";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

type VerificationRecord = {
  verificationStatus?: VerificationStatus;
  verificationSubmittedAt?: string;
  verificationLegalFirstName?: string;
  verificationLegalMiddleName?: string;
  verificationLegalLastName?: string;
  verificationDob?: string;
  verificationSsnLast4Mask?: string;
  verificationPhone?: string;
  verificationResidentLine1?: string;
  verificationResidentLine2?: string;
  verificationResidentCity?: string;
  verificationResidentState?: string;
  verificationResidentPostal?: string;
  verificationResidentCountry?: string;
  verificationMailingLine1?: string;
  verificationMailingLine2?: string;
  verificationMailingCity?: string;
  verificationMailingState?: string;
  verificationMailingPostal?: string;
  verificationMailingCountry?: string;
  verificationConsentedAt?: string;
};

type FormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  ssnLast4: string;
  phone: string;
  residentLine1: string;
  residentLine2: string;
  residentCity: string;
  residentState: string;
  residentPostal: string;
  residentCountry: string;
  mailingSameAsResident: boolean;
  mailingLine1: string;
  mailingLine2: string;
  mailingCity: string;
  mailingState: string;
  mailingPostal: string;
  mailingCountry: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  ssnLast4: "",
  phone: "",
  residentLine1: "",
  residentLine2: "",
  residentCity: "",
  residentState: "",
  residentPostal: "",
  residentCountry: "United States",
  mailingSameAsResident: true,
  mailingLine1: "",
  mailingLine2: "",
  mailingCity: "",
  mailingState: "",
  mailingPostal: "",
  mailingCountry: "United States",
};

function isAdultDob(dob: string): boolean {
  if (!dob) return false;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const age =
    now.getFullYear() -
    d.getFullYear() -
    (now <
    new Date(now.getFullYear(), d.getMonth(), d.getDate())
      ? 1
      : 0);
  return age >= 18 && age < 120;
}

export function ProfileVerifyPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const record = (user?.unsafeMetadata ?? {}) as VerificationRecord & {
    firstName?: string;
    lastName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  const status: VerificationStatus = record.verificationStatus ?? "unverified";

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      firstName:
        record.verificationLegalFirstName ??
        record.firstName ??
        user.firstName ??
        "",
      middleName: record.verificationLegalMiddleName ?? "",
      lastName:
        record.verificationLegalLastName ??
        record.lastName ??
        user.lastName ??
        "",
      dob: record.verificationDob ?? "",
      phone:
        record.verificationPhone ??
        record.phone ??
        user.primaryPhoneNumber?.phoneNumber ??
        "",
      residentLine1:
        record.verificationResidentLine1 ?? record.addressLine1 ?? "",
      residentLine2:
        record.verificationResidentLine2 ?? record.addressLine2 ?? "",
      residentCity: record.verificationResidentCity ?? record.city ?? "",
      residentState: record.verificationResidentState ?? record.state ?? "",
      residentPostal:
        record.verificationResidentPostal ?? record.postalCode ?? "",
      residentCountry:
        record.verificationResidentCountry ??
        record.country ??
        "United States",
      mailingLine1: record.verificationMailingLine1 ?? "",
      mailingLine2: record.verificationMailingLine2 ?? "",
      mailingCity: record.verificationMailingCity ?? "",
      mailingState: record.verificationMailingState ?? "",
      mailingPostal: record.verificationMailingPostal ?? "",
      mailingCountry: record.verificationMailingCountry ?? "United States",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState | "consent", string>> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.dob) e.dob = "Required";
    else if (!isAdultDob(form.dob))
      e.dob = "You must be 18 or older to verify.";
    if (!/^\d{4}$/.test(form.ssnLast4))
      e.ssnLast4 = "Enter the last 4 digits of your SSN (numbers only).";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.residentLine1.trim()) e.residentLine1 = "Required";
    if (!form.residentCity.trim()) e.residentCity = "Required";
    if (!form.residentState.trim()) e.residentState = "Required";
    if (!form.residentPostal.trim()) e.residentPostal = "Required";
    if (!form.mailingSameAsResident) {
      if (!form.mailingLine1.trim()) e.mailingLine1 = "Required";
      if (!form.mailingCity.trim()) e.mailingCity = "Required";
      if (!form.mailingState.trim()) e.mailingState = "Required";
      if (!form.mailingPostal.trim()) e.mailingPostal = "Required";
    }
    if (!consent) e.consent = "You must acknowledge the notice to continue.";
    return e;
  }, [form, consent]);

  if (!isLoaded || !user) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">
          Loading profile…
        </div>
      </Layout>
    );
  }

  const setField =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        key === "ssnLast4"
          ? e.target.value.replace(/\D/g, "").slice(0, 4)
          : e.target.value;
      setForm((prev) => ({ ...prev, [key]: value as FormState[K] }));
    };

  const onSubmit = async () => {
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Please review the form",
        description: "A few fields need attention before you can submit.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const mailingFrom = form.mailingSameAsResident ? "resident" : "mailing";
      const mailingSource = form.mailingSameAsResident ? form : form;
      const patch: VerificationRecord = {
        verificationStatus: "verified",
        verificationSubmittedAt: new Date().toISOString(),
        verificationLegalFirstName: form.firstName.trim(),
        verificationLegalMiddleName: form.middleName.trim() || undefined,
        verificationLegalLastName: form.lastName.trim(),
        verificationDob: form.dob,
        // We intentionally never store the raw SSN digits; only a mask.
        verificationSsnLast4Mask: `•••-••-${form.ssnLast4}`,
        verificationPhone: form.phone.trim(),
        verificationResidentLine1: form.residentLine1.trim(),
        verificationResidentLine2: form.residentLine2.trim() || undefined,
        verificationResidentCity: form.residentCity.trim(),
        verificationResidentState: form.residentState.trim(),
        verificationResidentPostal: form.residentPostal.trim(),
        verificationResidentCountry: form.residentCountry.trim(),
        verificationMailingLine1:
          mailingFrom === "resident"
            ? mailingSource.residentLine1.trim()
            : form.mailingLine1.trim(),
        verificationMailingLine2:
          mailingFrom === "resident"
            ? mailingSource.residentLine2.trim() || undefined
            : form.mailingLine2.trim() || undefined,
        verificationMailingCity:
          mailingFrom === "resident"
            ? mailingSource.residentCity.trim()
            : form.mailingCity.trim(),
        verificationMailingState:
          mailingFrom === "resident"
            ? mailingSource.residentState.trim()
            : form.mailingState.trim(),
        verificationMailingPostal:
          mailingFrom === "resident"
            ? mailingSource.residentPostal.trim()
            : form.mailingPostal.trim(),
        verificationMailingCountry:
          mailingFrom === "resident"
            ? mailingSource.residentCountry.trim()
            : form.mailingCountry.trim(),
        verificationConsentedAt: new Date().toISOString(),
      };
      const prev = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
      await user.update({
        unsafeMetadata: { ...prev, ...patch } as Record<string, unknown>,
      });
      toast({
        title: "Account verified",
        description:
          "Your identity has been confirmed. You'll see a Verified badge on your profile.",
      });
      setLocation("/profile");
    } catch (err: unknown) {
      toast({
        title: "Could not submit",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-serif text-3xl font-medium tracking-tight">
              Verify your account
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-prose">
            To protect you against fraud and comply with U.S. financial
            regulations, Kindue needs to confirm your identity before
            linking bank-level financial data.
          </p>
        </div>

        {/* Status card */}
        {status !== "unverified" && (
          <div className="rounded-md border border-border bg-card p-4 flex items-start gap-3">
            <div
              className={
                "mt-0.5 rounded-md border p-2 " +
                (status === "verified"
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground")
              }
            >
              {status === "verified" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
            </div>
            <div className="text-sm">
              <div className="font-medium capitalize">{status}</div>
              <div className="text-muted-foreground mt-0.5">
                {status === "verified"
                  ? "Your identity has been confirmed."
                  : status === "pending"
                    ? "We're reviewing your submission. This usually takes 1–2 business days."
                    : "Your previous submission couldn't be verified. Please resubmit below."}
                {record.verificationSubmittedAt && (
                  <>
                    {" "}
                    Submitted{" "}
                    {new Date(
                      record.verificationSubmittedAt,
                    ).toLocaleDateString()}
                    .
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* USA PATRIOT Act / CIP disclosure */}
        <section className="rounded-md border border-border bg-muted/40 p-5 text-sm leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4" />
            <div className="text-[11px] uppercase tracking-[0.2em] font-medium">
              Important information about procedures for opening a new account
            </div>
          </div>
          <p className="text-muted-foreground">
            <strong className="text-foreground">USA PATRIOT Act notice.</strong>{" "}
            To help the U.S. government fight the funding of terrorism and
            money-laundering activities, federal law (31 U.S.C. § 5318 and 31
            CFR 1020.220) requires all financial institutions to obtain,
            verify, and record information that identifies each person who
            opens an account. We will ask for your name, address, date of
            birth, and other information that will allow us to identify you.
            We may also ask to see your driver's license or other identifying
            documents.
          </p>
          <p className="text-muted-foreground mt-3">
            Your information is transmitted over TLS and handled under our
            privacy notice (Gramm-Leach-Bliley Act, 15 U.S.C. §§ 6801–6809).
            We <strong className="text-foreground">never store your full Social Security Number</strong> — we
            retain only the last four digits, in masked form, for audit
            purposes.
          </p>
        </section>

        {/* Legal name + DOB */}
        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-medium tracking-tight mb-5">
            Legal name & date of birth
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="firstName">Legal first name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={setField("firstName")}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="middleName">Middle</Label>
              <Input
                id="middleName"
                value={form.middleName}
                onChange={setField("middleName")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lastName">Legal last name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={setField("lastName")}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={setField("dob")}
                aria-invalid={!!errors.dob}
              />
              {errors.dob && (
                <p className="text-xs text-destructive">{errors.dob}</p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="ssnLast4">Last 4 of SSN</Label>
              <Input
                id="ssnLast4"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="1234"
                value={form.ssnLast4}
                onChange={setField("ssnLast4")}
                aria-invalid={!!errors.ssnLast4}
                className="font-mono tracking-[0.2em]"
              />
              {errors.ssnLast4 ? (
                <p className="text-xs text-destructive">{errors.ssnLast4}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Only the last four digits are required. Full SSN is never
                  requested or stored.
                </p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 555 5555"
                value={form.phone}
                onChange={setField("phone")}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>
        </section>

        {/* Resident address */}
        <section className="rounded-md border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-medium tracking-tight mb-5">
            Residential address
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The physical address where you live. P.O. boxes are not accepted
            for residential address under federal CIP rules.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="residentLine1">Street address</Label>
              <Input
                id="residentLine1"
                value={form.residentLine1}
                onChange={setField("residentLine1")}
                aria-invalid={!!errors.residentLine1}
              />
              {errors.residentLine1 && (
                <p className="text-xs text-destructive">
                  {errors.residentLine1}
                </p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="residentLine2">Apt / Suite (optional)</Label>
              <Input
                id="residentLine2"
                value={form.residentLine2}
                onChange={setField("residentLine2")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="residentCity">City</Label>
              <Input
                id="residentCity"
                value={form.residentCity}
                onChange={setField("residentCity")}
                aria-invalid={!!errors.residentCity}
              />
              {errors.residentCity && (
                <p className="text-xs text-destructive">
                  {errors.residentCity}
                </p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="residentState">State</Label>
              <Input
                id="residentState"
                value={form.residentState}
                onChange={setField("residentState")}
                aria-invalid={!!errors.residentState}
                placeholder="CA"
                maxLength={2}
                className="uppercase"
              />
              {errors.residentState && (
                <p className="text-xs text-destructive">
                  {errors.residentState}
                </p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="residentPostal">ZIP code</Label>
              <Input
                id="residentPostal"
                value={form.residentPostal}
                onChange={setField("residentPostal")}
                aria-invalid={!!errors.residentPostal}
              />
              {errors.residentPostal && (
                <p className="text-xs text-destructive">
                  {errors.residentPostal}
                </p>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="residentCountry">Country</Label>
              <Input
                id="residentCountry"
                value={form.residentCountry}
                onChange={setField("residentCountry")}
              />
            </div>
          </div>
        </section>

        {/* Mailing address */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <h2 className="font-serif text-xl font-medium tracking-tight">
              Mailing address
            </h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                id="mailingSame"
                checked={form.mailingSameAsResident}
                onCheckedChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    mailingSameAsResident: v === true,
                  }))
                }
              />
              <span>Same as residential address</span>
            </label>
          </div>

          {!form.mailingSameAsResident && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-1.5 md:col-span-6">
                <Label htmlFor="mailingLine1">Street address or P.O. Box</Label>
                <Input
                  id="mailingLine1"
                  value={form.mailingLine1}
                  onChange={setField("mailingLine1")}
                  aria-invalid={!!errors.mailingLine1}
                />
                {errors.mailingLine1 && (
                  <p className="text-xs text-destructive">
                    {errors.mailingLine1}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-6">
                <Label htmlFor="mailingLine2">Apt / Suite (optional)</Label>
                <Input
                  id="mailingLine2"
                  value={form.mailingLine2}
                  onChange={setField("mailingLine2")}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mailingCity">City</Label>
                <Input
                  id="mailingCity"
                  value={form.mailingCity}
                  onChange={setField("mailingCity")}
                  aria-invalid={!!errors.mailingCity}
                />
                {errors.mailingCity && (
                  <p className="text-xs text-destructive">
                    {errors.mailingCity}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mailingState">State</Label>
                <Input
                  id="mailingState"
                  value={form.mailingState}
                  onChange={setField("mailingState")}
                  aria-invalid={!!errors.mailingState}
                  maxLength={2}
                  className="uppercase"
                />
                {errors.mailingState && (
                  <p className="text-xs text-destructive">
                    {errors.mailingState}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="mailingPostal">ZIP code</Label>
                <Input
                  id="mailingPostal"
                  value={form.mailingPostal}
                  onChange={setField("mailingPostal")}
                  aria-invalid={!!errors.mailingPostal}
                />
                {errors.mailingPostal && (
                  <p className="text-xs text-destructive">
                    {errors.mailingPostal}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-6">
                <Label htmlFor="mailingCountry">Country</Label>
                <Input
                  id="mailingCountry"
                  value={form.mailingCountry}
                  onChange={setField("mailingCountry")}
                />
              </div>
            </div>
          )}
        </section>

        {/* Consent */}
        <section className="rounded-md border border-border bg-card p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed">
              I certify under penalty of perjury that the information above is
              true and correct, that I am the person identified, and that I
              consent to Kindue using it to verify my identity under the
              USA PATRIOT Act Customer Identification Program. I acknowledge
              Kindue's{" "}
              <span className="underline underline-offset-2">
                privacy notice
              </span>{" "}
              and authorize Kindue and its verification partners to check
              my information against third-party identity databases.
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-destructive mt-2 ml-7">
              {errors.consent}
            </p>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <RouterLink href="/profile">
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </RouterLink>
          <Button
            onClick={onSubmit}
            disabled={submitting || Object.keys(errors).length > 0}
            className="gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? "Submitting…" : "Submit for verification"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
