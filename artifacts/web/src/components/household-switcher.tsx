import { useState } from "react";
import { Check, ChevronsUpDown, Home, Loader2, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { householdApi, type HouseholdSummary } from "@/lib/household-api";
import { HOUSEHOLD_ME_KEY, useHouseholdMe } from "@/hooks/use-household";

export function HouseholdSwitcher() {
  const qc = useQueryClient();
  const { data, isLoading } = useHouseholdMe();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [caregiverFor, setCaregiverFor] = useState("");

  // Switching households changes nearly every server-side fact (bills,
  // dashboard, subscriptions, members, notifications), so we invalidate
  // the entire react-query cache rather than enumerate keys.
  const switchHousehold = useMutation({
    mutationFn: (id: number) => householdApi.switchHousehold(id),
    onSuccess: async () => {
      await qc.invalidateQueries();
    },
    onError: (err: { message?: string }) =>
      toast({
        title: "Couldn't switch household",
        description: err?.message ?? "Try again in a moment.",
        variant: "destructive",
      }),
  });

  const createHousehold = useMutation({
    mutationFn: () =>
      householdApi.createHousehold({
        name: name.trim(),
        caregiverFor: caregiverFor.trim() || undefined,
      }),
    onSuccess: async (res) => {
      setCreateOpen(false);
      setName("");
      setCaregiverFor("");
      await qc.invalidateQueries();
      toast({
        title: "Household created",
        description: `You're now managing "${res.household.name}".`,
      });
    },
    onError: (err: { message?: string }) =>
      toast({
        title: "Couldn't create household",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  if (isLoading || !data) {
    return null;
  }

  const households: HouseholdSummary[] = data.households ?? [];
  const active =
    households.find((h) => h.isActive) ??
    ({
      id: data.household.id,
      name: data.household.name,
      role: data.me.role,
      roleLabel: data.me.roleLabel,
      caregiverFor: data.household.caregiverFor,
      memberCount: data.members.length,
      isActive: true,
    } satisfies HouseholdSummary);

  // If the user only belongs to one household and there's nothing to switch
  // to, render a compact "+ Add household" button so they can still create
  // a second one without showing a noisy dropdown.
  const onlyOne = households.length <= 1;

  if (onlyOne) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          data-testid="household-switcher-create-only"
        >
          <Plus className="h-3.5 w-3.5" />
          Add household
        </Button>
        <CreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          name={name}
          setName={setName}
          caregiverFor={caregiverFor}
          setCaregiverFor={setCaregiverFor}
          onSubmit={() => createHousehold.mutate()}
          submitting={createHousehold.isPending}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 max-w-[180px] sm:max-w-[220px]"
            data-testid="household-switcher-trigger"
          >
            {switchHousehold.isPending ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Home className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate text-xs font-medium">
              {active.name}
            </span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[260px]">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-normal">
            Your households
          </DropdownMenuLabel>
          {households.map((h) => (
            <DropdownMenuItem
              key={h.id}
              disabled={switchHousehold.isPending}
              onClick={() => {
                if (!h.isActive) switchHousehold.mutate(h.id);
              }}
              className={cn(
                "flex items-start gap-2",
                h.isActive && "bg-muted/40",
              )}
              data-testid={`household-switcher-item-${h.id}`}
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 mt-0.5 shrink-0",
                  h.isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">
                  {h.name}
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {h.roleLabel} · {h.memberCount}{" "}
                  {h.memberCount === 1 ? "member" : "members"}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            data-testid="household-switcher-create"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create another household
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={name}
        setName={setName}
        caregiverFor={caregiverFor}
        setCaregiverFor={setCaregiverFor}
        onSubmit={() => createHousehold.mutate()}
        submitting={createHousehold.isPending}
      />
    </>
  );
}

function CreateDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (v: string) => void;
  caregiverFor: string;
  setCaregiverFor: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const {
    open,
    onOpenChange,
    name,
    setName,
    caregiverFor,
    setCaregiverFor,
    onSubmit,
    submitting,
  } = props;
  const canSubmit = name.trim().length > 0 && !submitting;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create another household</DialogTitle>
          <DialogDescription>
            You'll be the Primary Caregiver. You can invite family members and
            switch back any time from the header.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-2">
            <Label htmlFor="household-name">Household name</Label>
            <Input
              id="household-name"
              autoFocus
              maxLength={80}
              placeholder="e.g. Mom's bills"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="create-household-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caregiver-for">
              Whose bills are these?{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="caregiver-for"
              maxLength={80}
              placeholder="e.g. Mom, Dad, Aunt Lin"
              value={caregiverFor}
              onChange={(e) => setCaregiverFor(e.target.value)}
              data-testid="create-household-caregiver-for"
            />
            <p className="text-[11px] text-muted-foreground">
              We'll use this to personalize the dashboard greeting.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              data-testid="create-household-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create household"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
