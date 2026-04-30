import { useState } from "react";
import { format, parseISO } from "date-fns";
import { 
  useGetPaymentPlan, 
  getGetPaymentPlanQueryKey 
} from "@workspace/api-client-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PaymentPlanner() {
  const [cashInput, setCashInput] = useState<string>("");
  const [cashAvailable, setCashAvailable] = useState<number | null>(null);

  const { data: plan, isLoading, isError } = useGetPaymentPlan(
    { cashAvailable: cashAvailable || 0 },
    { 
      query: { 
        enabled: cashAvailable !== null,
        queryKey: getGetPaymentPlanQueryKey({ cashAvailable: cashAvailable || 0 })
      } 
    }
  );

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cashInput);
    if (!isNaN(val) && val >= 0) {
      setCashAvailable(val);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Payment Co-Pilot
          </CardTitle>
          <CardDescription>
            Enter how much cash you have available to spend on bills right now, and we'll tell you how to prioritize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-muted-foreground sm:text-sm">$</span>
              </div>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 h-11"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 px-8">
              Plan Payments
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="p-8 text-center text-muted-foreground animate-pulse">
          Calculating best payment strategy...
        </div>
      )}

      {plan && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-6">
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-primary-foreground/80 mb-2">Total Recommended</div>
                <div className="text-4xl font-bold">${plan.totalRecommended.toFixed(2)}</div>
                <div className="mt-4 pt-4 border-t border-primary-foreground/20 text-sm flex justify-between">
                  <span className="text-primary-foreground/80">Remaining Cash</span>
                  <span className="font-semibold">${plan.remainingCash.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Why follow this plan?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>
                  This co-pilot prioritizes avoiding service shutoffs, minimizing late fees, and keeping your household running.
                </p>
                <p>
                  If you cannot cover all "Pay Now" items, contact the lowest priority providers immediately to request an extension.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Recommended Action Plan</CardTitle>
                <CardDescription>Based on ${plan.cashAvailable.toFixed(2)} available cash</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {plan.items.map((item, i) => (
                    <div 
                      key={item.bill.id} 
                      className={`p-4 md:p-6 flex flex-col md:flex-row gap-4 justify-between transition-colors ${
                        item.payNow ? 'bg-primary/5 hover:bg-primary/10' : 'opacity-70 grayscale-[50%] hover:opacity-100 hover:grayscale-0'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                          item.payNow ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.rank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{item.bill.name}</h4>
                            {item.payNow ? (
                              <Badge className="bg-foreground text-background hover:bg-foreground gap-1">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                Pay Now
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground gap-1">
                                <ChevronRight className="h-3 w-3" aria-hidden="true" />
                                Defer
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                            Due {format(parseISO(item.bill.dueDate), "MMM d")} • {item.bill.category}
                          </p>
                          <div className="mt-3 flex items-start gap-2 bg-card rounded-md border p-3">
                            <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm">{item.recommendation}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-start min-w-[120px]">
                        <div className="font-mono text-2xl font-medium tabular-nums text-foreground">${item.bill.amount.toFixed(2)}</div>
                        {(item.bill.shutoffRisk || item.bill.lateFee > 0) && (
                          <div className="flex flex-col items-end gap-1 mt-2">
                            {item.bill.shutoffRisk && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] h-5 px-1.5 gap-1"
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                Shutoff Risk
                              </Badge>
                            )}
                            {item.bill.lateFee > 0 && (
                              <span className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                ${item.bill.lateFee} fee
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {plan.items.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No unpaid bills to prioritize.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
