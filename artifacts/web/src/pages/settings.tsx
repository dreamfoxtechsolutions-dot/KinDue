import { useUser } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Smartphone,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type NotificationSettings = {
  id: number;
  userId: number;
  emailOverdue: boolean;
  emailPendingApproval: boolean;
  emailBillPaid: boolean;
  emailBillRejected: boolean;
  emailLowBalance: boolean;
  pushOverdue: boolean;
  pushPendingApproval: boolean;
  pushBillPaid: boolean;
  pushBillRejected: boolean;
  pushLowBalance: boolean;
  updatedAt: string;
};

type DbUser = {
  id: number;
  displayName: string | null;
  email: string;
};

const NOTIFICATION_PREFS = [
  {
    label: "Overdue alerts",
    sub: "Get alerted when bills become overdue",
    emailKey: "emailOverdue" as keyof NotificationSettings,
    pushKey: "pushOverdue" as keyof NotificationSettings,
  },
  {
    label: "Approval requests",
    sub: "Notify when a bill is submitted for approval",
    emailKey: "emailPendingApproval" as keyof NotificationSettings,
    pushKey: "pushPendingApproval" as keyof NotificationSettings,
  },
  {
    label: "Payment confirmations",
    sub: "Notify when a payment is recorded",
    emailKey: "emailBillPaid" as keyof NotificationSettings,
    pushKey: "pushBillPaid" as keyof NotificationSettings,
  },
  {
    label: "Bill rejected",
    sub: "Notify when a bill is rejected",
    emailKey: "emailBillRejected" as keyof NotificationSettings,
    pushKey: "pushBillRejected" as keyof NotificationSettings,
  },
  {
    label: "Low balance alerts",
    sub: "Get alerted when account balance is low",
    emailKey: "emailLowBalance" as keyof NotificationSettings,
    pushKey: "pushLowBalance" as keyof NotificationSettings,
  },
];

export default function Settings() {
  const { user } = useUser();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [showClerkProfile, setShowClerkProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const { data: dbUser, isLoading: dbUserLoading } = useQuery<DbUser>({
    queryKey: ["me"],
    queryFn: () => api.get("/me"),
  });

  useEffect(() => {
    if (dbUser?.displayName != null) {
      setDisplayName(dbUser.displayName);
    } else if (user) {
      const clerkName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      setDisplayName(clerkName);
    }
  }, [dbUser, user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { displayName: string }) => api.patch("/me", data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.success("Display name saved");
    },
    onError: () => {
      toast.error("Failed to save display name");
    },
  });

  const { data: notifSettings, isLoading: notifLoading } = useQuery<NotificationSettings>({
    queryKey: ["notification-settings"],
    queryFn: () => api.get("/me/notification-settings"),
  });

  const updateNotifMutation = useMutation({
    mutationFn: (updates: Partial<NotificationSettings>) =>
      api.patch("/me/notification-settings", updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(["notification-settings"], updated);
    },
    onError: () => {
      toast.error("Failed to update notification setting");
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });

  function handleToggle(key: keyof NotificationSettings, currentValue: boolean) {
    updateNotifMutation.mutate({ [key]: !currentValue });
  }

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    updateProfileMutation.mutate({ displayName: displayName.trim() });
  }

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon size={22} /> Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and household preferences</p>
        </div>

        {/* Profile section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-2xl font-bold">
                    {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || "?"}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>

            {/* Display name form wired to PATCH /me */}
            <form onSubmit={handleProfileSave} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                {dbUserLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How your name appears to household members"
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={updateProfileMutation.isPending || !displayName.trim()}
                      className="gap-1.5 shrink-0"
                    >
                      <Check size={14} />
                      {updateProfileMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  This name is shown to other household members in the app.
                </p>
              </div>
            </form>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClerkProfile((v) => !v)}
              >
                {showClerkProfile ? "Close" : "Edit Email & Password"}
              </Button>
            </div>

            {showClerkProfile && (
              <div className="mt-2">
                <UserProfile
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border border-border",
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell size={16} /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-0 items-center mb-2">
              <div />
              <span className="text-xs font-medium text-muted-foreground text-center">Email</span>
              <span className="text-xs font-medium text-muted-foreground text-center">Push</span>
            </div>
            <div className="space-y-0">
              {notifLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center py-3 border-b border-border last:border-0">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-52" />
                    </div>
                    <Skeleton className="h-5 w-9 rounded-full" />
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </div>
                ))
              ) : (
                NOTIFICATION_PREFS.map((pref) => {
                  const emailVal = notifSettings ? Boolean(notifSettings[pref.emailKey]) : false;
                  const pushVal = notifSettings ? Boolean(notifSettings[pref.pushKey]) : false;
                  return (
                    <div
                      key={pref.label}
                      className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <Label className="text-sm font-medium text-foreground cursor-default">
                          {pref.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{pref.sub}</p>
                      </div>
                      <Switch
                        checked={emailVal}
                        onCheckedChange={() => handleToggle(pref.emailKey, emailVal)}
                        disabled={updateNotifMutation.isPending}
                        aria-label={`${pref.label} email`}
                      />
                      <Switch
                        checked={pushVal}
                        onCheckedChange={() => handleToggle(pref.pushKey, pushVal)}
                        disabled={updateNotifMutation.isPending}
                        aria-label={`${pref.label} push`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} /> Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <IntegrationRow
              icon={<CreditCard size={18} className="text-indigo-600" />}
              name="Plaid"
              desc="Link bank accounts and track transactions"
              status="Connect via Accounts page"
            />
            <IntegrationRow
              icon={<Mail size={18} className="text-red-500" />}
              name="Gmail"
              desc="Scan emails for bill statements automatically"
              status="Not connected"
            />
            <IntegrationRow
              icon={<Smartphone size={18} className="text-green-600" />}
              name="Push Notifications"
              desc="Mobile push notifications for the companion app"
              status="Not configured"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function IntegrationRow({
  icon,
  name,
  desc,
  status,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{status}</span>
        <Button variant="outline" size="sm" disabled>Connect</Button>
      </div>
    </div>
  );
}
