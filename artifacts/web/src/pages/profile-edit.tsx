import { useUser } from "@clerk/react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation } from "wouter";
import {
  ArrowLeft,
  UserIcon,
  Camera,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PrivacyFooter } from "@/components/privacy-footer";
import { useToast } from "@/hooks/use-toast";

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

export function ProfileEditPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<HouseholdInfo>({});
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const md = (user.unsafeMetadata ?? {}) as HouseholdInfo & {
      fullName?: string;
    };
    const legacyFull = md.fullName ?? user.fullName ?? "";
    const [legacyFirst, ...legacyRest] = legacyFull.trim().split(/\s+/);
    const legacyLast = legacyRest.length > 0 ? legacyRest.join(" ") : "";
    const primaryGmail =
      user.emailAddresses?.find((e: { emailAddress: string }) =>
        e.emailAddress.toLowerCase().endsWith("@gmail.com"),
      )?.emailAddress ?? "";
    setInfo({
      firstName: md.firstName ?? user.firstName ?? legacyFirst ?? "",
      middleInitial: md.middleInitial ?? "",
      lastName: md.lastName ?? user.lastName ?? legacyLast ?? "",
      gmail:
        md.gmail ??
        primaryGmail ??
        user.primaryEmailAddress?.emailAddress ??
        "",
      phone: md.phone ?? user.primaryPhoneNumber?.phoneNumber ?? "",
      addressLine1: md.addressLine1 ?? "",
      addressLine2: md.addressLine2 ?? "",
      city: md.city ?? "",
      state: md.state ?? "",
      postalCode: md.postalCode ?? "",
      country: md.country ?? "",
      timezone:
        md.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone ??
        "",
      reminderHour: md.reminderHour ?? "09:00",
      emergencyName: md.emergencyName ?? "",
      emergencyPhone: md.emergencyPhone ?? "",
      emergencyAddress: md.emergencyAddress ?? "",
      emergencyRelationship: md.emergencyRelationship ?? "",
      notes: md.notes ?? "",
    });
  }, [user]);

  if (!isLoaded || !user) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">
          Loading profile…
        </div>
      </Layout>
    );
  }

  const onChange =
    (k: keyof HouseholdInfo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setInfo((prev) => ({ ...prev, [k]: e.target.value }));

  const handlePhotoFile = async (file: File | null | undefined) => {
    if (!file || !user) return;
    setPhotoBusy(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      toast({
        title: "Photo updated",
        description: "Your profile picture has been changed.",
      });
    } catch (err: unknown) {
      toast({
        title: "Could not update photo",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!user) return;
    setPhotoBusy(true);
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
      toast({
        title: "Photo removed",
        description: "Your profile picture has been cleared.",
      });
    } catch (err: unknown) {
      toast({
        title: "Could not remove photo",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const photoInitials =
    ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).trim() ||
    user.username?.[0] ||
    user.primaryEmailAddress?.emailAddress?.[0] ||
    "U";

  const onSave = async () => {
    setSaving(true);
    try {
      const prev = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
      await user.update({
        unsafeMetadata: { ...prev, ...info } as Record<string, unknown>,
      });
      toast({
        title: "Profile saved",
        description: "Your household information has been updated.",
      });
      setLocation("/profile");
    } catch (err: unknown) {
      toast({
        title: "Could not save",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Edit Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update your household information and emergency contact details.
          </p>
        </div>

        {/* Profile photo editor */}
        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Camera className="h-4 w-4" />
            <h2 className="font-serif text-xl font-medium tracking-tight">
              Profile photo
            </h2>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="relative">
              <Avatar className="h-20 w-20 border border-border">
                <AvatarImage
                  src={user.imageUrl}
                  alt={user.fullName ?? "Profile photo"}
                />
                <AvatarFallback className="text-base font-medium">
                  {photoInitials.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {photoBusy ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={photoBusy}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={photoBusy}
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              {user.imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  disabled={photoBusy}
                  onClick={() => void handlePhotoRemove()}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Use a clear, recent photo. JPG or PNG, at least 200×200 pixels.
          </p>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handlePhotoFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              void handlePhotoFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserIcon className="h-4 w-4" />
            <h2 className="font-serif text-xl font-medium tracking-tight">
              Household Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={info.firstName ?? ""}
                onChange={onChange("firstName")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="middleInitial">M.I.</Label>
              <Input
                id="middleInitial"
                value={info.middleInitial ?? ""}
                onChange={onChange("middleInitial")}
                maxLength={2}
                placeholder="A"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={info.lastName ?? ""}
                onChange={onChange("lastName")}
              />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="gmail">Gmail</Label>
              <Input
                id="gmail"
                type="email"
                value={info.gmail ?? ""}
                onChange={onChange("gmail")}
                placeholder="you@gmail.com"
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={info.phone ?? ""}
                onChange={onChange("phone")}
                placeholder="+1 555 555 5555"
              />
            </div>

            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input
                id="addressLine1"
                value={info.addressLine1 ?? ""}
                onChange={onChange("addressLine1")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input
                id="addressLine2"
                value={info.addressLine2 ?? ""}
                onChange={onChange("addressLine2")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={info.city ?? ""}
                onChange={onChange("city")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="state">State / Region</Label>
              <Input
                id="state"
                value={info.state ?? ""}
                onChange={onChange("state")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input
                id="postalCode"
                value={info.postalCode ?? ""}
                onChange={onChange("postalCode")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={info.country ?? ""}
                onChange={onChange("country")}
                placeholder="United States"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={info.timezone ?? ""}
                onChange={onChange("timezone")}
                placeholder="America/Los_Angeles"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="reminderHour">Daily reminder time</Label>
              <Input
                id="reminderHour"
                type="time"
                value={info.reminderHour ?? ""}
                onChange={onChange("reminderHour")}
              />
            </div>

            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={info.notes ?? ""}
                onChange={onChange("notes")}
                rows={3}
              />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserIcon className="h-4 w-4" />
            <h2 className="font-serif text-xl font-medium tracking-tight">
              Emergency Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="emergencyName">Full name</Label>
              <Input
                id="emergencyName"
                value={info.emergencyName ?? ""}
                onChange={onChange("emergencyName")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="emergencyPhone">Phone</Label>
              <Input
                id="emergencyPhone"
                value={info.emergencyPhone ?? ""}
                onChange={onChange("emergencyPhone")}
                placeholder="+1 555 555 5555"
              />
            </div>
            <div className="space-y-1.5 md:col-span-4">
              <Label htmlFor="emergencyAddress">Address</Label>
              <Input
                id="emergencyAddress"
                value={info.emergencyAddress ?? ""}
                onChange={onChange("emergencyAddress")}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="emergencyRelationship">Relationship</Label>
              <Input
                id="emergencyRelationship"
                value={info.emergencyRelationship ?? ""}
                onChange={onChange("emergencyRelationship")}
                placeholder="Spouse, parent…"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <RouterLink href="/profile">
            <Button variant="outline" disabled={saving}>
              Cancel
            </Button>
          </RouterLink>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <PrivacyFooter />
      </div>
    </Layout>
  );
}
