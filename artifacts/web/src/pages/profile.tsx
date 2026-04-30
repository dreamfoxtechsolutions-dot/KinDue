import { useUser } from "@clerk/react";
import { Link as RouterLink } from "wouter";
import {
  Pencil,
  Mail,
  Phone,
  MapPin,
  Clock,
  HeartPulse,
  StickyNote,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PrivacyFooter } from "@/components/privacy-footer";

type HouseholdInfo = {
  firstName?: string;
  middleInitial?: string;
  lastName?: string;
  gmail?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  reminderHour?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyAddress?: string;
  emergencyRelationship?: string;
  notes?: string;
};

// The Profile page is intentionally narrow: it only shows the personal
// details of the signed-in user. All edits — including the profile
// photo — happen on /profile/edit. Other surfaces (security, alerts,
// connections, display, household members, admin, etc.) live in the
// Settings hub at /settings.
export function ProfilePage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">
          Loading profile…
        </div>
      </Layout>
    );
  }

  const md = (user.unsafeMetadata ?? {}) as HouseholdInfo;

  const initials =
    ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).trim() ||
    user.username?.[0] ||
    user.primaryEmailAddress?.emailAddress?.[0] ||
    "U";

  const fullName =
    [md.firstName ?? user.firstName, md.middleInitial, md.lastName ?? user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.fullName ||
    user.username ||
    "Your account";

  const addressParts = [
    md.addressLine1,
    md.addressLine2,
    [md.city, md.state, md.postalCode].filter(Boolean).join(", "),
    md.country,
  ].filter((p): p is string => Boolean(p && p.trim()));
  const address = addressParts.length > 0 ? addressParts.join(" · ") : null;

  const phone =
    md.phone ||
    user.primaryPhoneNumber?.phoneNumber ||
    user.phoneNumbers?.[0]?.phoneNumber ||
    null;

  const email =
    md.gmail || user.primaryEmailAddress?.emailAddress || null;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header — name, photo, single edit action */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-border shrink-0">
            <AvatarImage src={user.imageUrl} alt={fullName} />
            <AvatarFallback className="text-base font-medium">
              {initials.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Profile
            </p>
            <h1 className="font-serif text-2xl font-medium tracking-tight mt-1 truncate">
              {fullName}
            </h1>
            {email ? (
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            ) : null}
          </div>
          <RouterLink href="/profile/edit">
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </RouterLink>
        </div>

        {/* Personal details */}
        <section className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
          <DetailRow icon={Mail} label="Email" value={email} />
          <DetailRow icon={Phone} label="Phone" value={phone} />
          <DetailRow icon={MapPin} label="Address" value={address} />
          <DetailRow icon={Clock} label="Time zone" value={md.timezone} />
        </section>

        {/* Emergency contact */}
        <section className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium px-1">
            Emergency contact
          </p>
          <div className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
            <DetailRow icon={HeartPulse} label="Name" value={md.emergencyName} />
            <DetailRow
              icon={HeartPulse}
              label="Relationship"
              value={md.emergencyRelationship}
            />
            <DetailRow icon={Phone} label="Phone" value={md.emergencyPhone} />
            <DetailRow
              icon={MapPin}
              label="Address"
              value={md.emergencyAddress}
            />
          </div>
        </section>

        {md.notes ? (
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium px-1">
              Notes
            </p>
            <div className="rounded-md border border-border bg-card p-4 flex gap-3 text-sm">
              <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="whitespace-pre-wrap">{md.notes}</p>
            </div>
          </section>
        ) : null}

        <p className="text-xs text-muted-foreground px-1">
          Manage security, alerts, connections, and household members from{" "}
          <RouterLink href="/settings">
            <span className="underline cursor-pointer">Settings</span>
          </RouterLink>
          .
        </p>

        <PrivacyFooter />
      </div>
    </Layout>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
          {label}
        </p>
        <p
          className={
            "text-sm mt-0.5 break-words " +
            (value ? "text-foreground" : "text-muted-foreground italic")
          }
        >
          {value || "Not set"}
        </p>
      </div>
    </div>
  );
}
