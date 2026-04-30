import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  FileText,
  Upload,
  Search,
  Download,
  Trash2,
  Image,
  File,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Documents() {
  const api = useApiClient();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents"),
  });

  const filtered = docs.filter((d: any) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Receipts, statements, and household documents
            </p>
          </div>
          <Button className="gap-2" disabled>
            <Upload size={16} /> Upload
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Info card about upload */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Upload size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Document Management</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload receipts, bills, and statements. Receipts attached to payments are required for Caregiver and Other roles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen size={40} className="mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No documents yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your first document to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((doc: any) => {
              const isImage = doc.content_type?.startsWith("image/");
              return (
                <Card key={doc.id} className="group hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {isImage ? (
                          <Image size={18} className="text-muted-foreground" />
                        ) : (
                          <File size={18} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {doc.size ? formatFileSize(doc.size) : ""} · {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <a href={doc.url} target="_blank" rel="noreferrer" download>
                          <Download size={15} />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
