import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth, useUser } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { householdApi } from "@/lib/household-api";
import { HOUSEHOLD_ME_KEY } from "@/hooks/use-household";
import { useDisplayPrefs } from "@/hooks/use-display-prefs";
import { Loader2, ShieldCheck, Eye } from "lucide-react";

export function InvitePage() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token ?? "";
  const [, setLocation] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { update: updateDisplayPrefs } = useDisplayPrefs();
  const [enableSeniorMode, setEnableSeniorMode] = useState(false);

  const preview = useQuery({
    queryKey: ["invite", token],
    queryFn: () => householdApi.invitePreview(token),
    enabled: Boolean(token) && isLoaded && !!isSignedIn,
    retry: false,
  });

  useEffect(() => {
    const role = preview.data?.invite.role;
    if (role === "alerts_only" || role === "view_alerts") {
      setEnableSeniorMode(true);
    }
  }, [preview.data?.invite.role]);

  const accept = useMutation({
    mutationFn: () => householdApi.acceptInvite(token),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
      if (enableSeniorMode) {
        await updateDisplayPrefs({
          fontScale: "large",
          reducedMotion: true,
        }).catch(() => {});
      }
      toast({ title: "Welcome to the household" });
      setLocation("/");
    },
    onError: (e: Error) =>
      toast({ title: "Could not accept", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const redirect = encodeURIComponent(`/invite/${token}`);
      setLocation(`/sign-in?redirect_url=${redirect}`);
    }
  }, [isLoaded, isSignedIn, token, setLocation]);

  if (!token) {
    return (
      <Layout>
        <p className="text-sm text-muted-foreground">Missing invite token.</p>
      </Layout>
    );
  }

  if (!isLoaded || preview.isLoading) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Verifying invite…
        </div>
      </Layout>
    );
  }

  const data = preview.data;
  const expired = data?.expired || preview.error;

  const myEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const inviteEmail = data?.invite.email.toLowerCase() ?? "";
  const emailMismatch = data && myEmail && inviteEmail && myEmail !== inviteEmail;

  return (
    <Layout>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="font-serif text-2xl flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            You've been invited
          </CardTitle>
          <CardDescription>
            {data?.household
              ? `Join "${data.household.name}" on Kindue.`
              : "Join a Kindue household."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expired ? (
            <p className="text-sm text-destructive">
              This invite is no longer valid. Ask the sender for a new link.
            </p>
          ) : (
            <>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Invited as:</span>{" "}
                  <span className="font-medium">{data?.invite.roleLabel}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">For email:</span>{" "}
                  <span className="font-medium">{data?.invite.email}</span>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                {data?.invite.role === "owner" || data?.invite.role === "full"
                  ? "As a Trustee you'll have full power: add, edit, and pay bills, manage the document vault, and invite others. You can see sensitive details (SSN, account numbers, medical & legal documents)."
                  : data?.invite.role === "helper"
                    ? "As a Family member you can scan email for bills, add and edit them, mark them paid, and cancel subscriptions. You can't delete bills, invite others, or see sensitive details like SSN and account numbers. Medical and legal documents stay hidden."
                    : "As a Caregiver you'll have read-only access to the bill list and reminders. You can comment and coordinate with the household, but can't edit, pay, or scan. Sensitive details and medical/legal documents stay hidden."}
              </div>
              {emailMismatch && (
                <p className="text-xs text-destructive">
                  This invite was sent to {data?.invite.email}, but you're signed in as
                  {" "}{myEmail}. Sign in with the matching account to accept.
                </p>
              )}
              <label
                className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:border-foreground/40 transition-colors"
                data-testid="invite-senior-mode"
              >
                <Checkbox
                  checked={enableSeniorMode}
                  onCheckedChange={(v) => setEnableSeniorMode(v === true)}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <div className="font-medium flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Turn on Senior-Friendly Display
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {data?.invite.role === "view_alerts" ||
                    data?.invite.role === "alerts_only"
                      ? "Recommended for Caregivers. Larger text and calmer animations. You can change it any time under Profile → Display."
                      : "Larger text and calmer animations. You can change it any time under Profile → Display."}
                  </div>
                </div>
              </label>
              <Button
                onClick={() => accept.mutate()}
                disabled={accept.isPending || !!emailMismatch}
                className="w-full"
              >
                {accept.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Accept invitation
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
