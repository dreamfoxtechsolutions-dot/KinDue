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

type DocumentRow = {
  id: number;
  title: string;
  category: string;
  fileName: string;
  mimeType: string;
  uploadedByName?: string;
  createdAt: string;
  expiresAt?: string | null;
  redacted?: boolean;
  downloadUrl?: string;
};

type DocumentsResponse = {
  documents: DocumentRow[];
  lockedCategories?: string[];
};

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
];

const CATEGORIES = [
  "POA",
  "Insurance",
  "Medical",
  "Legal",
  "ID",
  "Other",
] as const;

async function fetchDocuments(
  token: string | null,
): Promise<DocumentsResponse> {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : "";

  const res = await fetch(`${base}/api/documents`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    if (res.status === 404) return { documents: [], lockedCategories: [] };
    throw new Error(`HTTP ${res.status}`);
  }

  const body = await res.json();
  if (Array.isArray(body)) return { documents: body, lockedCategories: [] };
  return body;
}

function groupByCategory(docs: DocumentRow[]) {
  const out: Record<string, DocumentRow[]> = {};
  for (const d of docs) {
    const key = d.category || "Other";
    (out[key] ??= []).push(d);
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
      <Text style={styles.buttonText}>{loading ? "Loading..." : title}</Text>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nothing in the vault yet</Text>
      <Text style={styles.emptyText}>
        Upload documents from the web app and they will appear here.
      </Text>
    </View>
  );
}

export default function VaultTab() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const docsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: async () => fetchDocuments(await getToken()),
    staleTime: 60_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (input: {
      file: DocumentPicker.DocumentPickerAsset;
      title: string;
      category: (typeof CATEGORIES)[number];
    }) => {
      const token = await getToken();

      if (!ALLOWED_MIME.includes(input.file.mimeType ?? "")) {
        throw new Error("Invalid file type");
      }

      const urlRes = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/household/me/documents/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: input.file.name,
            contentType: input.file.mimeType,
            size: input.file.size ?? 1,
          }),
        },
      );

      if (!urlRes.ok) throw new Error("Upload init failed");

      const { uploadURL, objectPath, uploadToken } = await urlRes.json();

      const file = new ExpoFile(input.file.uri);
      const bytes = await file.bytes();

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": input.file.mimeType ?? "application/octet-stream",
        },
        body: bytes,
      });

      if (!putRes.ok) throw new Error("Upload failed");

      const finalizeRes = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/household/me/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: input.title,
            category: input.category,
            objectPath,
            fileName: input.file.name,
            uploadToken,
          }),
        },
      );

      if (!finalizeRes.ok) throw new Error("Save failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
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

      uploadMutation.mutate({
        file,
        title: file.name.replace(/\.[^.]+$/, ""),
        category: "Other",
      });
    } catch (e) {
      setUploading(false);
      Alert.alert("Error picking file");
    }
  }

  if (docsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const data = docsQuery.data ?? { documents: [], lockedCategories: [] };
  const grouped = groupByCategory(data.documents);
  const categories = Object.keys(grouped);

  const empty =
    categories.length === 0 && (data.lockedCategories?.length ?? 0) === 0;

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

      {empty ? (
        <EmptyState />
      ) : (
        <>
          {categories.map((cat) => (
            <Card
              key={cat}
              title={cat}
              subtitle={`${grouped[cat].length} item(s)`}
            >
              {grouped[cat].map((d) => (
                <View key={d.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>
                      {d.redacted ? "Locked document" : d.title}
                    </Text>
                    <Text style={styles.docMeta}>
                      {d.uploadedByName ?? "Unknown"} ·{" "}
                      {new Date(d.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {!d.redacted && d.downloadUrl ? (
                    <Button
                      title="Open"
                      variant="ghost"
                      onPress={() =>
                        Linking.openURL(d.downloadUrl!).catch(() =>
                          Alert.alert("Cannot open file"),
                        )
                      }
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          ))}
        </>
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
