import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Link as LinkIcon, Plus, TrendingUp, Building } from "lucide-react";

export default function Accounts() {
  const api = useApiClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["plaid-accounts"],
    queryFn: () => api.get("/plaid/accounts"),
  });

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
          <Button className="gap-2" disabled>
            <LinkIcon size={16} /> Link Account
          </Button>
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
                  Plaid account linking is available for Primary Users and Trustees. To enable, connect your Plaid credentials in Settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No accounts linked</p>
              <p className="text-sm text-muted-foreground mt-1">
                Link a bank account to view balances and transaction history
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account: any) => (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.institution_name} · {account.account_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        ${parseFloat(account.balance_available ?? account.balance_current ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
