import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DOCUMENT_CATEGORIES,
  householdApi,
  type HouseholdDocument,
} from "@/lib/household-api";
import { useHouseholdMe } from "@/hooks/use-household";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CalendarClock,
  Download,
  Eye,
  FileText,
  Loader2,
  Lock,
  Search,
  Trash2,
  Upload,
  UserCog,
} from "lucide-react";

const PREVIEWABLE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
]);

function isPreviewable(d: HouseholdDocument): boolean {
  return PREVIEWABLE_MIME.has(d.contentType);
}

const DOCUMENTS_KEY = ["household", "documents"] as const;
const ACCEPT_MIME =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/*";

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function expirationStatus(
  iso: string | null,
): { label: string; tone: "ok" | "warn" | "danger" | "neutral" } {
  if (!iso) return { label: "No expiration", tone: "neutral" };
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: "danger" };
  if (days <= 7) return { label: `Expires in ${days}d`, tone: "danger" };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: "warn" };
  return { label: `Expires ${new Date(iso).toLocaleDateString()}`, tone: "ok" };
}

export function DocumentsTab() {
  const me = useHouseholdMe();
  const role = me.data?.me.role;
  const isCaregiver = role === "owner" || role === "full";
  const canUpload = isCaregiver || role === "helper";
  const members = me.data?.members ?? [];

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [expiringOnly, setExpiringOnly] = useState(false);

  const params = useMemo(
    () => ({
      q: q.trim() || undefined,
      category: category === "all" ? undefined : category,
      expiringInDays: expiringOnly ? 30 : undefined,
    }),
    [q, category, expiringOnly],
  );

  const { data, isLoading } = useQuery({
    queryKey: [...DOCUMENTS_KEY, params],
    queryFn: () => householdApi.listDocuments(params),
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdDocument | null>(null);
  const [grantsFor, setGrantsFor] = useState<HouseholdDocument | null>(null);
  const [previewing, setPreviewing] = useState<HouseholdDocument | null>(null);

  const documents = data?.documents ?? [];
  const effectiveRole = data?.role ?? role ?? "view_alerts";
  // Task #59 collapsed roles to 4 user-facing tiers. Both view_alerts and
  // legacy alerts_only members surface as "Caregiver" — they see the
  // vault listing but need per-document grants to open files.
  const isCaregiverViewer =
    effectiveRole === "view_alerts" || effectiveRole === "alerts_only";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium tracking-tight">
            Document Vault
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Power of attorney, insurance cards, IDs, and other critical paperwork —
            kept private to your caregiver circle.
          </p>
        </div>
        {canUpload && (
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2"
            data-testid="button-upload-document"
          >
            <Upload className="w-4 h-4" /> Upload document
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, file name, or notes…"
            className="pl-9"
            data-testid="input-document-search"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-48" data-testid="select-document-category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={expiringOnly ? "default" : "outline"}
          onClick={() => setExpiringOnly((v) => !v)}
          className="gap-2"
          data-testid="button-expiring-filter"
        >
          <CalendarClock className="w-4 h-4" /> Expiring soon
        </Button>
      </div>

      {isCaregiverViewer && (
        <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="py-3 text-xs text-muted-foreground flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 mt-0.5" />
            <span>
              As a Caregiver, you can see what's in the vault but the Primary
              user or a Trustee must grant per-document access before you can
              open files.
            </span>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading documents…
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
            No documents yet. Upload a power of attorney, insurance card, or
            other critical paperwork to keep it safe and shareable with your
            backup caregivers.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {documents.map((d) => {
            const exp = expirationStatus(d.expiresAt);
            const owner =
              d.belongsToUserId &&
              members.find((m) => m.userId === d.belongsToUserId);
            return (
              <Card key={d.id} data-testid={`document-card-${d.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {d.canDownload && isPreviewable(d) ? (
                        <button
                          type="button"
                          className="text-left hover:underline focus:underline focus:outline-none"
                          onClick={() => setPreviewing(d)}
                          data-testid={`document-title-${d.id}`}
                        >
                          {d.title}
                        </button>
                      ) : (
                        <span data-testid={`document-title-${d.id}`}>{d.title}</span>
                      )}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {d.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {d.notes && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {d.notes}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                    <div>File: {d.fileName || "—"}</div>
                    <div>Size: {formatBytes(d.sizeBytes)}</div>
                    <div>Uploaded by: {d.uploadedByName || "—"}</div>
                    <div>
                      Added: {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {owner && (
                    <div className="text-xs text-muted-foreground">
                      Belongs to: {owner.displayName || owner.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        exp.tone === "danger"
                          ? "destructive"
                          : exp.tone === "warn"
                            ? "default"
                            : "outline"
                      }
                      className="text-[10px] gap-1"
                    >
                      <CalendarClock className="w-3 h-3" /> {exp.label}
                    </Badge>
                    {!d.canDownload && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Lock className="w-3 h-3" /> Restricted
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={!d.canDownload || !isPreviewable(d)}
                      title={
                        !d.canDownload
                          ? "You don't have access to this file."
                          : !isPreviewable(d)
                            ? "This file type can't be previewed in the browser. Use Download."
                            : undefined
                      }
                      onClick={() => setPreviewing(d)}
                      data-testid={`button-document-preview-${d.id}`}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={!d.canDownload}
                      onClick={() => {
                        window.open(
                          householdApi.documentDownloadUrl(d.id),
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                      data-testid={`button-document-download-${d.id}`}
                    >
                      <Download className="w-3 h-3" /> Download
                    </Button>
                    {isCaregiver && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setEditing(d)}
                          data-testid={`button-document-edit-${d.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setGrantsFor(d)}
                          data-testid={`button-document-grants-${d.id}`}
                        >
                          <UserCog className="w-3 h-3" /> Sharing
                        </Button>
                        <DeleteDocumentButton id={d.id} title={d.title} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        members={members}
      />
      {editing && (
        <EditDialog
          document={editing}
          members={members}
          onClose={() => setEditing(null)}
        />
      )}
      {grantsFor && (
        <GrantsDialog document={grantsFor} onClose={() => setGrantsFor(null)} />
      )}
      {previewing && (
        <PreviewDialog
          document={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}

function PreviewDialog({
  document: doc,
  onClose,
}: {
  document: HouseholdDocument;
  onClose: () => void;
}) {
  const url = householdApi.documentPreviewUrl(doc.id);
  const isImage = doc.contentType.startsWith("image/");
  const isPdf = doc.contentType === "application/pdf";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="w-[calc(100%-2rem)] sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col"
        data-testid={`dialog-document-preview-${doc.id}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> {doc.title}
          </DialogTitle>
          <DialogDescription>
            {doc.fileName} · {formatBytes(doc.sizeBytes)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-[60vh] bg-muted/30 rounded-md overflow-auto flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={url}
              title={doc.title}
              className="w-full h-[70vh] border-0 bg-background"
              data-testid={`preview-frame-${doc.id}`}
            />
          ) : isImage ? (
            <img
              src={url}
              alt={doc.title}
              className="max-w-full max-h-[70vh] object-contain"
              data-testid={`preview-image-${doc.id}`}
            />
          ) : (
            <div className="p-6 text-sm text-muted-foreground text-center">
              This file type can't be previewed in the browser. Use Download to
              open it locally.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            className="gap-1"
            onClick={() => {
              window.open(
                householdApi.documentDownloadUrl(doc.id),
                "_blank",
                "noopener,noreferrer",
              );
            }}
            data-testid={`button-document-preview-download-${doc.id}`}
          >
            <Download className="w-3 h-3" /> Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDocumentButton({ id, title }: { id: number; title: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const m = useMutation({
    mutationFn: () => householdApi.deleteDocument(id),
    onSuccess: () => {
      toast({ title: "Document deleted", description: title });
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      setConfirming(false);
    },
    onError: (err: Error) =>
      toast({
        title: "Could not delete",
        description: err.message,
        variant: "destructive",
      }),
  });
  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
        data-testid={`button-document-delete-${id}`}
      >
        <Trash2 className="w-3 h-3" /> Delete
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="destructive"
        size="sm"
        onClick={() => m.mutate()}
        disabled={m.isPending}
        data-testid={`button-document-delete-confirm-${id}`}
      >
        {m.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: { userId: string; displayName: string; email: string }[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [belongsTo, setBelongsTo] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setTitle("");
    setCategory("Other");
    setNotes("");
    setExpiresAt("");
    setBelongsTo("");
    setError(null);
    setUploading(false);
  };

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("File is larger than 25 MB.");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async () => {
    if (!file) {
      setError("Pick a file first.");
      return;
    }
    if (!title.trim()) {
      setError("Give the document a title.");
      return;
    }
    setUploading(true);
    try {
      const presigned = await householdApi.requestDocumentUpload({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });
      const putRes = await fetch(presigned.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }
      await householdApi.createDocument({
        title: title.trim(),
        category,
        notes: notes.trim(),
        objectPath: presigned.objectPath,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        expiresAt: expiresAt || null,
        belongsToUserId: belongsTo,
        uploadToken: presigned.uploadToken,
      });
      toast({ title: "Document uploaded", description: title });
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            Files are encrypted at rest and only visible to your caregiver
            circle. PDFs, images, and Office documents up to 25 MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div
            className="border-2 border-dashed border-border rounded-md p-4 text-center cursor-pointer hover:border-primary/60 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            data-testid="dropzone-document"
          >
            <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-sm mt-2">
              {file ? (
                <>
                  <span className="font-medium">{file.name}</span>{" "}
                  <span className="text-muted-foreground">
                    ({formatBytes(file.size)})
                  </span>
                </>
              ) : (
                <>Click to choose, or drop a file here</>
              )}
            </p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPT_MIME}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              data-testid="input-document-file"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Healthcare proxy"
                data-testid="input-document-title"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-upload-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="doc-expires">Expiration</Label>
              <Input
                id="doc-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                data-testid="input-document-expires"
              />
            </div>
            <div className="col-span-2">
              <Label>Belongs to</Label>
              <Select value={belongsTo || "none"} onValueChange={(v) => setBelongsTo(v === "none" ? "" : v)}>
                <SelectTrigger data-testid="select-document-owner">
                  <SelectValue placeholder="Household-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Household-wide</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.displayName || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="doc-notes">Notes</Label>
              <Textarea
                id="doc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Where is the original? Who should be called first?"
                rows={3}
                data-testid="input-document-notes"
              />
            </div>
          </div>
          {error && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={uploading || !file}
            data-testid="button-document-upload-submit"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-2" /> Uploading…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  document,
  members,
  onClose,
}: {
  document: HouseholdDocument;
  members: { userId: string; displayName: string; email: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState(document.category);
  const [notes, setNotes] = useState(document.notes);
  const [expiresAt, setExpiresAt] = useState(
    document.expiresAt ? document.expiresAt.slice(0, 10) : "",
  );
  const [belongsTo, setBelongsTo] = useState(document.belongsToUserId);

  const m = useMutation({
    mutationFn: () =>
      householdApi.updateDocument(document.id, {
        title: title.trim(),
        category,
        notes: notes.trim(),
        expiresAt: expiresAt || null,
        belongsToUserId: belongsTo,
      }),
    onSuccess: () => {
      toast({ title: "Document updated" });
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      onClose();
    },
    onError: (err: Error) =>
      toast({
        title: "Could not update",
        description: err.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Update metadata. To replace the file itself, delete and re-upload.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-edit-document-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiration</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label>Belongs to</Label>
              <Select value={belongsTo || "none"} onValueChange={(v) => setBelongsTo(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Household-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Household-wide</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.displayName || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GrantsDialog({
  document,
  onClose,
}: {
  document: HouseholdDocument;
  onClose: () => void;
}) {
  const me = useHouseholdMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const familyMembers = (me.data?.members ?? []).filter(
    (m) => m.role === "view_alerts",
  );
  const grantsQuery = useQuery({
    queryKey: ["household", "documents", "grants", document.id],
    queryFn: () => householdApi.documentGrants(document.id),
  });
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const current = selected ?? new Set(grantsQuery.data?.userIds ?? []);

  const m = useMutation({
    mutationFn: () =>
      householdApi.setDocumentGrants(document.id, Array.from(current)),
    onSuccess: () => {
      toast({ title: "Sharing updated" });
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      onClose();
    },
    onError: (err: Error) =>
      toast({
        title: "Could not update sharing",
        description: err.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[460px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share "{document.title}"</DialogTitle>
          <DialogDescription>
            Grant read-only access to family members. Caregivers always have
            access.
          </DialogDescription>
        </DialogHeader>
        {grantsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : familyMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No family-tier members yet. Invite family from the Members tab to
            share documents with them individually.
          </p>
        ) : (
          <div className="space-y-2">
            {familyMembers.map((m) => {
              const checked = current.has(m.userId);
              return (
                <label
                  key={m.userId}
                  className="flex items-center gap-3 p-2 rounded border border-border cursor-pointer hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(current);
                      if (e.target.checked) next.add(m.userId);
                      else next.delete(m.userId);
                      setSelected(next);
                    }}
                    data-testid={`checkbox-grant-${m.userId}`}
                  />
                  <div className="text-sm">
                    <div>{m.displayName || m.email}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
