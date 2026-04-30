import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Onboarding() {
  const api = useApiClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState("");

  const createHousehold = useMutation({
    mutationFn: (data: any) => api.post("/households", data),
    onSuccess: () => {
      setStep(3);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Kindue</h1>
          <p className="text-muted-foreground text-sm mt-1">Caregiver-safe household bill coordination</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Step 1: Intro */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">How Kindue Works</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Kindue helps households manage bills with role-based access control.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: <Shield size={18} className="text-amber-500" />,
                    title: "4-Role System",
                    desc: "Primary User, Trustee, Caregiver, and Other with different permissions",
                  },
                  {
                    icon: <FileText size={18} className="text-blue-500" />,
                    title: "Bill Approval Workflow",
                    desc: "Bills require approval from Primary User or Trustee before payment",
                  },
                  {
                    icon: <CheckCircle size={18} className="text-green-500" />,
                    title: "Receipt Enforcement",
                    desc: "Caregivers and Others must upload receipts for all payments",
                  },
                  {
                    icon: <Users size={18} className="text-purple-500" />,
                    title: "Full Audit Trail",
                    desc: "Every action is logged for complete transparency",
                  },
                ].map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Create household */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create Your Household</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be the Primary User with full access.
                </p>
              </div>
              <div>
                <Label>Household Name *</Label>
                <Input
                  placeholder="e.g., Smith Family"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!householdName.trim() || createHousehold.isPending}
                  onClick={() => createHousehold.mutate({ name: householdName.trim() })}
                >
                  {createHousehold.isPending ? "Creating..." : "Create Household"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">You're all set!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  "{householdName}" has been created. Start adding bills and inviting members.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate("/")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
