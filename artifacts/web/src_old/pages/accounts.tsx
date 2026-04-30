import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Link as LinkIcon, Building, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Household = {
  id: number;
  name: string;
  myRole: string;
};

type LinkedAccount = {
  id: number;
  householdId: number;
  institutionName: string;
  institutionId: string;
  accountName: string;
  accountType: string;
  mask: string;
  currentBalance: number | null;
  availableBalance: number | null;
  lastSyncAt: string | null;
  createdAt: string;
};

const CAN_MANAGE_ACCOUNTS = ["primary_user", "trustee"];

export default function Accounts() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [sandboxInstitution, setSandboxInstitution] = useState("Chase");

  const { data: household, isLoading: householdLoading } = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => api.get("/households/mine"),
  });

  const householdId = household?.id;
  const canManage = household ? CAN_MANAGE_ACCOUNTS.includes(household.myRole) : false;

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<LinkedAccount[]>({
    queryKey: ["plaid-accounts", householdId],
    queryFn: () => api.get(`/households/${householdId}/accounts`),
    enabled: !!householdId && canManage,
  });

  const getLinkTokenMutation = useMutation({
    mutationFn: () => api.post(`/households/${householdId}/accounts/plaid-link-token`),
    onSuccess: (data: { linkToken: string; expiration: string }) => {
      setLinkToken(data.linkToken);
      setShowLinkDialog(true);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start account linking");
    },
  });

  const exchangeMutation = useMutation({
    mutationFn: (payload: { publicToken: string; institutionId: string; institutionName: string }) =>
      api.post(`/households/${householdId}/accounts/exchange`, payload),
    onSuccess: () => {
      toast.success("Account linked successfully");
      setShowLinkDialog(false);
      setLinkToken(null);
      queryClient.invalidateQueries({ queryKey: ["plaid-accounts", householdId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to link account");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (accountId: number) =>
      api.delete(`/households/${householdId}/accounts/${accountId}`),
    onSuccess: () => {
      toast.success("Account unlinked");
      queryClient.invalidateQueries({ queryKey: ["plaid-accounts", householdId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to unlink account");
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: number) =>
      api.post(`/households/${householdId}/accounts/${accountId}/sync`),
    onSuccess: () => {
      toast.success("Account synced");
      queryClient.invalidateQueries({ queryKey: ["plaid-accounts", householdId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to sync account");
    },
  });

  function handleSimulateLink() {
    if (!linkToken) return;
    const mockPublicToken = `public-sandbox-${Date.now()}`;
    exchangeMutation.mutate({
      publicToken: mockPublicToken,
      institutionId: `ins_${sandboxInstitution.toLowerCase().replace(/\s+/g, "_")}`,
      institutionName: sandboxInstitution,
    });
  }

  const isLoading = householdLoading || (canManage && accountsLoading);

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financial Accounts</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Connect bank accounts to track balances and payments (Primary User / Trustee only)
            </p>
          </div>
          {canManage && (
            <Button
              className="gap-2"
              onClick={() => getLinkTokenMutation.mutate()}
              disabled={getLinkTokenMutation.isPending || !householdId}
            >
              <LinkIcon size={16} />
              {getLinkTokenMutation.isPending ? "Connecting..." : "Link Account"}
            </Button>
          )}
        </div>

        {/* Plaid integration notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Building size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Plaid Integration</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canManage
                    ? "Click \"Link Account\" to connect a bank account. A sandbox simulation is used in development."
                    : "Account linking is available for Primary Users and Trustees only."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !canManage ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">Access restricted</p>
              <p className="text-sm text-muted-foreground mt-1">
                Only Primary Users and Trustees can view and manage linked accounts
              </p>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No accounts linked</p>
              <p className="text-sm text-muted-foreground mt-1">
                Link a bank account to view balances and transaction history
              </p>
              <Button
                className="mt-4 gap-2"
                onClick={() => getLinkTokenMutation.mutate()}
                disabled={getLinkTokenMutation.isPending}
              >
                <LinkIcon size={16} /> Link Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{account.accountName}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.institutionName} · {account.accountType} ···{account.mask}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          ${parseFloat(String(account.availableBalance ?? account.currentBalance ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Available</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Sync"
                        onClick={() => syncMutation.mutate(account.id)}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Unlink"
                        onClick={() => unlinkMutation.mutate(account.id)}
                        disabled={unlinkMutation.isPending}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Plaid Link Dialog (sandbox simulation) */}
      <Dialog open={showLinkDialog} onOpenChange={(open) => { if (!open) { setShowLinkDialog(false); setLinkToken(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Sandbox Mode</p>
              <p>Plaid Link is running in sandbox mode. Enter a bank name below to simulate connecting an account.</p>
            </div>
            {linkToken && (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground font-mono break-all">Link token: {linkToken}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="institution">Bank / Institution Name</Label>
              <Input
                id="institution"
                value={sandboxInstitution}
                onChange={(e) => setSandboxInstitution(e.target.value)}
                placeholder="e.g. Chase, Bank of America"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLinkDialog(false); setLinkToken(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSimulateLink}
              disabled={exchangeMutation.isPending || !sandboxInstitution.trim()}
            >
              {exchangeMutation.isPending ? "Linking..." : "Simulate Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
