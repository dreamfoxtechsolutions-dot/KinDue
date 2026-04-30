import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useHouseholdMe, HOUSEHOLD_ME_KEY } from "@/hooks/use-household";
import { householdApi, can } from "@/lib/household-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { HeartHandshake, X, Loader2 } from "lucide-react";

export function RoleRefinementBanner() {
  const me = useHouseholdMe();
  const data = me.data;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dismiss = useMutation({
    mutationFn: () => householdApi.markRolesRefined(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_ME_KEY });
    },
    onError: (e: Error) =>
      toast({
        title: "Could not save",
        description: e.message,
        variant: "destructive",
      }),
  });

  if (!data) return null;
  if (data.household.rolesRefinedAt) return null;
  if (!can(data, "manage_members")) return null;
  // Only nudge households that already have someone besides the Primary
  // Caregiver — solo households have nothing to refine.
  if (data.members.length < 2) return null;

  return (
    <div className="border border-border bg-accent/40 rounded-md p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex items-start gap-3 flex-1">
        <div className="bg-foreground/10 rounded-md p-2 shrink-0">
          <HeartHandshake className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            One-time setup
          </span>
          <p className="text-sm font-medium">
            Refine your roles — Trustee, Family member, Caregiver
          </p>
          <p className="text-xs text-muted-foreground">
            Kindue's roles are now Trustee (full administrative access),
            Family member (can add bills, edit, and mark paid — no medical
            or legal documents), and Caregiver (read-only alerts and bills).
            Take a moment to set each person correctly.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
        <Button asChild size="sm" variant="default" className="gap-1.5">
          <Link href="/household">Review roles</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dismiss.mutate()}
          disabled={dismiss.isPending}
          aria-label="Dismiss"
        >
          {dismiss.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
