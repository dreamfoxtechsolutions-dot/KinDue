import { useUser } from "@clerk/react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserProfile } from "@clerk/react";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const { user } = useUser();
  const [showProfile, setShowProfile] = useState(false);

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
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setShowProfile(true)}
              >
                Edit Profile
              </Button>
            </div>

            {showProfile && (
              <div className="mt-4">
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
            <div className="space-y-3">
              {[
                { label: "Bill due reminders", sub: "Get notified 7 days before bills are due", enabled: true },
                { label: "Approval requests", sub: "Notify when a bill is submitted for approval", enabled: true },
                { label: "Payment confirmations", sub: "Notify when a payment is recorded", enabled: true },
                { label: "Overdue alerts", sub: "Get alerted when bills become overdue", enabled: true },
                { label: "Triage updates", sub: "Notify when risk assessments change", enabled: false },
              ].map((pref) => (
                <div key={pref.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pref.sub}</p>
                  </div>
                  <Badge variant={pref.enabled ? "default" : "secondary"} className="text-xs">
                    {pref.enabled ? "On" : "Off"}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Notification management coming soon</p>
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
              status="Not connected"
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
