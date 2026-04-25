import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getListHouseholdsQueryKey,
  useListHouseholds,
} from "@workspace/api-client-react";

import { useHouseholdStore } from "@/context/householdStore";

type DocumentType = "statement" | "receipt" | "other";

type DocumentRow = {
  id: number;
  householdId: number;
  billId: number | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  type: DocumentType;
  uploadedByUserId: number | null;
  createdAt: string;
};

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
];

const TYPE_LABELS: Record<DocumentType, string> = {
  statement: "Statements",
  receipt: "Receipts",
  other: "Other",
};

function baseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

function buildDownloadUrl(storageKey: string): string {
  // storageKey is stored as "/objects/<id>"; the auth-protected
  // download route lives at "/api/storage/objects/<id>".
  const path = storageKey.startsWith("/objects/")
    ? storageKey.replace("/objects/", "/api/storage/objects/")
    : `/api/storage/objects/${storageKey.replace(/^\/+/, "")}`;
  return `${baseUrl()}${path}`;
}

function groupByType(docs: DocumentRow[]) {
  const out: Record<DocumentType, DocumentRow[]> = {
    statement: [],
    receipt: [],
    other: [],
  };
  for (const d of docs) {
    (out[d.type] ?? out.other).push(d);
  }
  return out;
}

function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function Button({
  title,
  onPress,
  variant = "primary",
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "ghost" && styles.buttonGhost,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[styles.buttonText, variant === "ghost" && styles.buttonTextGhost]}
      >
        {loading ? "Loading..." : title}
      </Text>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nothing in the vault yet</Text>
      <Text style={styles.emptyText}>
        Upload a household document to keep it stored securely.
      </Text>
    </View>
  );
}

export default function VaultTab() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { householdId } = useHouseholdStore();
  const { data: households } = useListHouseholds({
    query: {
      queryKey: getListHouseholdsQueryKey(),
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });
  const activeId = householdId ?? households?.[0]?.id;

  const docsQuery = useQuery({
    queryKey: ["documents", activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<DocumentRow[]> => {
      const token = await getToken();
      const res = await fetch(
        `${baseUrl()}/api/households/${activeId}/documents`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (input: {
      file: DocumentPicker.DocumentPickerAsset;
      type: DocumentType;
    }) => {
      if (!activeId) throw new Error("No household selected");

      const token = await getToken();
      const file = input.file;

      if (!ALLOWED_MIME.includes(file.mimeType ?? "")) {
        throw new Error("Unsupported file type");
      }

      const urlRes = await fetch(`${baseUrl()}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size ?? 0,
          contentType: file.mimeType ?? "application/octet-stream",
        }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = (await urlRes.json()) as {
        uploadURL: string;
        objectPath: string;
      };

      const expoFile = new ExpoFile(file.uri);
      const bytes = await expoFile.bytes();

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": file.mimeType ?? "application/octet-stream",
        },
        body: bytes,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      const finalizeRes = await fetch(
        `${baseUrl()}/api/households/${activeId}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.mimeType ?? "application/octet-stream",
            fileSize: file.size ?? 0,
            storageKey: objectPath,
            type: input.type,
          }),
        },
      );
      if (!finalizeRes.ok) throw new Error("Save failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", activeId] });
      Alert.alert("Uploaded");
    },
    onError: (e) =>
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Try again",
      ),
    onSettled: () => setUploading(false),
  });

  async function pickFile() {
    if (!activeId) {
      Alert.alert("No household", "You need a household before uploading.");
      return;
    }
    setUploading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME,
        copyToCacheDirectory: true,
      });
      if (res.canceled) {
        setUploading(false);
        return;
      }
      const file = res.assets[0];
      if (!file) {
        setUploading(false);
        return;
      }
      uploadMutation.mutate({ file, type: "other" });
    } catch {
      setUploading(false);
      Alert.alert("Error picking file");
    }
  }

  if (!activeId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No household yet</Text>
        <Text style={styles.emptyText}>
          Create or join a household to use the vault.
        </Text>
      </View>
    );
  }

  if (docsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const docs = docsQuery.data ?? [];
  const grouped = groupByType(docs);
  const orderedTypes: DocumentType[] = ["statement", "receipt", "other"];
  const visibleTypes = orderedTypes.filter((t) => grouped[t].length > 0);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={docsQuery.isRefetching}
          onRefresh={docsQuery.refetch}
        />
      }
    >
      <Text style={styles.title}>Vault</Text>
      <Text style={styles.subtitle}>Household documents stored securely</Text>

      <Button title="Upload document" onPress={pickFile} loading={uploading} />

      {visibleTypes.length === 0 ? (
        <EmptyState />
      ) : (
        visibleTypes.map((t) => (
          <Card
            key={t}
            title={TYPE_LABELS[t]}
            subtitle={`${grouped[t].length} item${grouped[t].length === 1 ? "" : "s"}`}
          >
            {grouped[t].map((d) => (
              <View key={d.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle} numberOfLines={1}>
                    {d.fileName}
                  </Text>
                  <Text style={styles.docMeta}>
                    {new Date(d.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Button
                  title="Open"
                  variant="ghost"
                  onPress={() =>
                    Linking.openURL(buildDownloadUrl(d.storageKey)).catch(() =>
                      Alert.alert("Cannot open file"),
                    )
                  }
                />
              </View>
            ))}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#fff",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  cardSub: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },

  docTitle: {
    fontWeight: "600",
  },

  docMeta: {
    fontSize: 12,
    color: "#666",
  },

  button: {
    backgroundColor: "#111",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ddd",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  buttonTextGhost: {
    color: "#111",
  },

  empty: {
    marginTop: 40,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 6,
  },
});
