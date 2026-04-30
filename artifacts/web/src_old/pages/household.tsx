import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Shield, Star, Heart, User, Crown, Mail, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  primary_user: { label: "Primary User", icon: <Crown size={14} />, color: "text-amber-600 bg-amber-100" },
  trustee: { label: "Trustee", icon: <Shield size={14} />, color: "text-blue-600 bg-blue-100" },
  caregiver: { label: "Caregiver", icon: <Heart size={14} />, color: "text-rose-600 bg-rose-100" },
  other: { label: "Other", icon: <User size={14} />, color: "text-gray-600 bg-gray-100" },
};

export default function Household() {
  const api = useApiClient();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { data: household, isLoading: loadingHousehold } = useQuery({
    queryKey: ["household"],
    queryFn: () => api.get("/households/mine"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["household", "members"],
    queryFn: () => api.get("/households/mine/members"),
    enabled: !!household,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const isAdmin = household &&
    (household.myRole === "primary_user" || household.myRole === "trustee");

  const { data: pendingInvites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["household", "invites"],
    queryFn: () => api.get("/households/mine/invites"),
    enabled: !!household && isAdmin,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const createHousehold = useMutation({
    mutationFn: (data: any) => api.post("/households", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["household"] });
      setShowCreate(false);
      toast({ title: "Household created!" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const inviteMember = useMutation({
    mutationFn: (data: any) => api.post("/households/mine/members/invite", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["household", "members"] });
      qc.invalidateQueries({ queryKey: ["household", "invites"] });
      setShowInvite(false);
      toast({ title: "Invitation sent!" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const cancelInvite = useMutation({
    mutationFn: (memberId: number) => api.delete(`/households/mine/invites/${memberId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["household", "invites"] });
      toast({ title: "Invite cancelled" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  if (loadingHousehold) {
    return (
      <AppShell>
        <div className="p-6 text-muted-foreground">Loading household...</div>
      </AppShell>
    );
  }

  if (!household) {
    return (
      <AppShell>
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Household</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Users size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No household yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create a household to start managing bills together</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <UserPlus size={16} className="mr-2" /> Create Household
              </Button>
            </CardContent>
          </Card>

          <CreateHouseholdDialog
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onSubmit={(data) => createHousehold.mutate(data)}
            loading={createHousehold.isPending}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{household.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowInvite(true)} className="gap-2">
              <UserPlus size={16} /> Invite Member
            </Button>
          )}
        </div>

        {/* Role legend */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Role Permissions</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(ROLE_LABELS).map(([role, info]) => (
                <div key={role} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                    {info.icon} {info.label}
                  </span>
                  <span>{roleDescription(role)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        {loadingMembers ? (
          <div className="text-center py-8 text-muted-foreground">Loading members...</div>
        ) : (
          <div className="grid gap-3">
            {members.map((member: any) => {
              const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS["other"];
              return (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {(member.user?.name || member.user?.email || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{member.user?.name || "Unnamed"}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Mail size={11} /> {member.user?.email || member.invite_email || "No email"}
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.color}`}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pending Invites — visible to admins only */}
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pending Invites
              </h2>
              {pendingInvites.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                  {pendingInvites.length}
                </span>
              )}
            </div>

            {loadingInvites ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Loading invites...</div>
            ) : pendingInvites.length === 0 ? (
              <Card className="bg-muted/20">
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No pending invites</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {pendingInvites.map((invite: any) => {
                  const roleInfo = ROLE_LABELS[invite.role] || ROLE_LABELS["other"];
                  return (
                    <Card key={invite.id} className="border-dashed border-amber-200 bg-amber-50/40">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock size={16} className="text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{invite.email}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                Pending
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock size={11} /> Invited {formatDate(invite.invitedAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.color}`}>
                              {roleInfo.icon} {roleInfo.label}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              onClick={() => cancelInvite.mutate(invite.id)}
                              disabled={cancelInvite.isPending}
                              title="Cancel invite"
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <InviteMemberDialog
          open={showInvite}
          onClose={() => setShowInvite(false)}
          onSubmit={(data) => inviteMember.mutate(data)}
          loading={inviteMember.isPending}
        />
      )}
    </AppShell>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "unknown date";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function roleDescription(role: string) {
  const desc: Record<string, string> = {
    primary_user: "Full access, can approve bills and manage accounts",
    trustee: "Can approve bills and view financial accounts",
    caregiver: "Can view bills and record payments (receipt required)",
    other: "Can view bills only (receipt required for payments)",
  };
  return desc[role] || "";
}

function CreateHouseholdDialog({
  open, onClose, onSubmit, loading,
}: {
  open: boolean; onClose: () => void; onSubmit: (d: any) => void; loading: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Household</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name }); }} className="space-y-4">
          <div>
            <Label>Household Name *</Label>
            <Input
              placeholder="e.g., Smith Family"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteMemberDialog({
  open, onClose, onSubmit, loading,
}: {
  open: boolean; onClose: () => void; onSubmit: (d: any) => void; loading: boolean;
}) {
  const [form, setForm] = useState({ email: "", role: "caregiver" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
          <div>
            <Label>Email Address *</Label>
            <Input
              type="email"
              placeholder="member@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trustee">Trustee</SelectItem>
                <SelectItem value="caregiver">Caregiver</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send Invite"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
