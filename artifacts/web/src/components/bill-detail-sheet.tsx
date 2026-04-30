import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Mail,
  CheckCircle2,
  Clock,
  Flame,
  Edit2,
  Trash2,
  Info,
  HandHeart,
  Send,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { RedactedChip, isRedacted } from "@/components/redacted-chip";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useUpdateBill,
  useDeleteBill,
  getListBillsQueryKey,
  getGetDashboardQueryKey,
  BillStatus,
  type Bill,
} from "@workspace/api-client-react";
import { useHouseholdMe } from "@/hooks/use-household";
import { householdApi, can, type HouseholdMember } from "@/lib/household-api";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

function daysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseISO(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function StatLine({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-border/60 last:border-b-0">
      <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-sm ${mono ? "font-mono tabular-nums" : ""} ${
          tone === "danger" ? "text-destructive font-semibold" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function BillDetailSheet({ bill, open, onOpenChange, onEdit, onDelete }: Props) {
  const queryClient = useQueryClient();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const household = useHouseholdMe().data;
  const { toast } = useToast();

  const canEdit = can(household, "edit_bill");
  const canDelete = can(household, "delete_bill");
  const canMarkPaid = can(household, "mark_paid");
  const canComment = can(household, "comment");
  const canClaim = can(household, "claim_bill");

  if (!bill) return null;

  const days = daysUntil(bill.dueDate);
  const isOverdue = days < 0 && bill.status !== BillStatus.paid;
  const riskDanger = bill.riskLevel === "high" || bill.riskLevel === "critical";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["bill-comments", bill.id] });
  };

  const setStatus = (status: BillStatus) => {
    updateBill.mutate(
      { id: bill.id, data: { status } },
      {
        onSuccess: () => {
          invalidate();
          onOpenChange(false);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteBill.mutate(
      { id: bill.id },
      {
        onSuccess: () => {
          invalidate();
          onOpenChange(false);
          onDelete(bill);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[460px] overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            {bill.category}
          </div>
          <SheetTitle className="font-serif text-2xl font-medium tracking-tight">
            {bill.name}
          </SheetTitle>
          <SheetDescription className="text-sm">
            Risk assessment, household notes, and quick actions for this bill.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Headline amount */}
          <div className="flex items-baseline justify-between border border-border rounded-md p-4 bg-card">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Amount Due
              </div>
              <div className="font-mono tabular-nums text-3xl font-medium mt-1">
                ${bill.amount.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Due Date
              </div>
              <div className="font-mono tabular-nums text-sm mt-1">
                {format(parseISO(bill.dueDate), "yyyy-MM-dd")}
              </div>
              <div className={`text-xs mt-0.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                {bill.status === "paid"
                  ? "Paid"
                  : days < 0
                    ? `${Math.abs(days)}d overdue`
                    : days === 0
                      ? "Due today"
                      : `In ${days}d`}
              </div>
            </div>
          </div>

          {/* Risk block */}
          <div
            className={`border rounded-md p-4 ${
              riskDanger ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {riskDanger ? (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              ) : (
                <Info className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">
                Risk · {bill.riskLevel}
              </span>
            </div>
            <ul className="space-y-1.5">
              {bill.riskReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">·</span>
                  <span className={riskDanger ? "text-foreground" : "text-muted-foreground"}>
                    {reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Facts */}
          <div className="border border-border rounded-md px-4 bg-card">
            <StatLine
              label="Status"
              value={<span className="capitalize">{bill.status}</span>}
            />
            <StatLine label="Priority" value={`${bill.priority} of 5`} mono />
            <StatLine
              label="Autopay"
              value={bill.autopay ? "Enabled" : "Off"}
            />
            <StatLine
              label="Late fee risk"
              value={`$${bill.lateFee.toFixed(2)}`}
              mono
              tone={bill.lateFee > 0 ? "danger" : "default"}
            />
            <StatLine
              label="Shutoff risk"
              value={
                bill.shutoffRisk ? (
                  <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                    <Flame className="w-3 h-3" />
                    Yes
                  </span>
                ) : (
                  "No"
                )
              }
            />
          </div>

          {/* Provenance */}
          {bill.detectedFrom === "gmail" && (
            <div className="border border-border rounded-md p-4 bg-card space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
                  Detected from email
                </span>
              </div>
              <div className="text-xs text-muted-foreground break-words">
                <span className="font-medium text-foreground">From:</span>{" "}
                {isRedacted(bill.redactedFields, "emailSender") ? (
                  <RedactedChip />
                ) : (
                  bill.emailSender || "—"
                )}
              </div>
              <div className="text-xs text-muted-foreground break-words">
                <span className="font-medium text-foreground">Subject:</span>{" "}
                {isRedacted(bill.redactedFields, "emailSubject") ? (
                  <RedactedChip />
                ) : (
                  bill.emailSubject || "—"
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {isRedacted(bill.redactedFields, "notes") ? (
            <div className="border border-border rounded-md p-4 bg-card">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">
                Notes
              </div>
              <RedactedChip />
            </div>
          ) : bill.notes ? (
            <div className="border border-border rounded-md p-4 bg-card">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">
                Notes
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{bill.notes}</p>
            </div>
          ) : null}

          {/* Household claim + comments */}
          {household && (
            <BillCollaboration
              billId={bill.id}
              canClaim={canClaim}
              canComment={canComment}
              canManage={can(household, "manage_members")}
              meUserId={household.me.userId}
              meName={household.me.displayName}
              members={household.members}
              onChanged={invalidate}
              toast={toast}
            />
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            {canMarkPaid && bill.status !== "paid" && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setStatus(BillStatus.paid)}
                  disabled={updateBill.isPending}
                  className="gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Paid
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStatus(BillStatus.scheduled)}
                  disabled={updateBill.isPending || bill.status === "scheduled"}
                  className="gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Schedule
                </Button>
              </div>
            )}
            {(canEdit || canDelete) && (
              <div className="grid grid-cols-2 gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(bill);
                    }}
                    className="gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleteBill.isPending}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BillCollaboration({
  billId,
  canClaim,
  canComment,
  canManage,
  meUserId,
  meName,
  members,
  onChanged,
  toast,
}: {
  billId: number;
  canClaim: boolean;
  canComment: boolean;
  canManage: boolean;
  meUserId: string;
  meName: string;
  members: HouseholdMember[];
  onChanged: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [draft, setDraft] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const queryClient = useQueryClient();

  const data = useQuery({
    queryKey: ["bill-comments", billId],
    queryFn: () => householdApi.billComments(billId),
  });

  const claim = useMutation({
    mutationFn: (release: boolean) => householdApi.claimBill(billId, release),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill-comments", billId] });
      onChanged();
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });

  const reassign = useMutation({
    mutationFn: (userId: string) => householdApi.reassignBill(billId, userId),
    onSuccess: () => {
      setReassignOpen(false);
      queryClient.invalidateQueries({ queryKey: ["bill-comments", billId] });
      onChanged();
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't reassign", description: e.message, variant: "destructive" }),
  });

  const post = useMutation({
    mutationFn: () => householdApi.postComment(billId, draft.trim()),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["bill-comments", billId] });
    },
    onError: (e: Error) =>
      toast({ title: "Couldn't post", description: e.message, variant: "destructive" }),
  });

  const claimedByUserId = data.data?.bill.claimedByUserId ?? "";
  const claimedByName = data.data?.bill.claimedByName ?? "";
  const claimedByMe = claimedByUserId === meUserId;
  useEffect(() => {
    if (!claimedByUserId && reassignOpen) setReassignOpen(false);
  }, [claimedByUserId, reassignOpen]);
  const assignableMembers = members.filter(
    (m) =>
      m.active &&
      m.userId !== claimedByUserId &&
      (m.role === "owner" || m.role === "full" || m.role === "view_alerts"),
  );

  return (
    <div className="border border-border rounded-md bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <HandHeart className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">
            {claimedByUserId
              ? `Claimed by ${claimedByMe ? "you" : claimedByName}`
              : "Unclaimed"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canClaim && (
            <Button
              variant="outline"
              size="sm"
              disabled={claim.isPending || (!!claimedByUserId && !claimedByMe && !canManage)}
              onClick={() => claim.mutate(claimedByMe || (canManage && !!claimedByUserId))}
            >
              {claim.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              {claimedByMe
                ? "Release"
                : claimedByUserId
                  ? canManage
                    ? "Clear claim"
                    : "Claimed"
                  : "Claim"}
            </Button>
          )}
          {canManage && claimedByUserId && !reassignOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReassignOpen(true)}
              disabled={assignableMembers.length === 0}
              title={
                assignableMembers.length === 0
                  ? "No other members available to take this bill."
                  : "Reassign to another member"
              }
            >
              Reassign
            </Button>
          )}
        </div>
      </div>
      {canManage && reassignOpen && (
        <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
          <Select
            onValueChange={(value) => reassign.mutate(value)}
            disabled={reassign.isPending || assignableMembers.length === 0}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue
                placeholder={
                  assignableMembers.length === 0
                    ? "No eligible members"
                    : "Choose a member…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {assignableMembers.map((m) => (
                <SelectItem key={m.userId} value={m.userId} className="text-xs">
                  {m.displayName || m.email} · {m.roleLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReassignOpen(false)}
            disabled={reassign.isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="px-4 py-3 space-y-3 max-h-[260px] overflow-y-auto">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
          <MessageSquare className="w-3 h-3" />
          Notes for the household
        </div>
        {data.isLoading && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
        {data.data?.comments.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No notes yet. {canComment ? "Be the first to add one." : ""}
          </p>
        )}
        {data.data?.comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {c.authorUserId === meUserId ? meName : c.authorName || c.authorEmail}
              </span>
              <span>{new Date(c.createdAt).toLocaleString()}</span>
              {c.kind !== "comment" && (
                <Badge variant="outline" className="text-[9px]">
                  {c.kind}
                </Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap text-foreground/90 mt-0.5">{c.body}</p>
          </div>
        ))}
      </div>

      {canComment && (
        <div className="px-4 py-3 border-t border-border/60 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Leave a note for the household…"
            rows={2}
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => post.mutate()}
              disabled={!draft.trim() || post.isPending}
              className="gap-1"
            >
              {post.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
