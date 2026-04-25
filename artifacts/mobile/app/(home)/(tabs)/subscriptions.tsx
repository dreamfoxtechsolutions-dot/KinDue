import { useQueryClient } from "@tanstack/react-query";
import React from "react";
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
  getListSubscriptionsQueryKey,
  useDeleteSubscription,
  useListSubscriptions,
  useScanGmail,
} from "@workspace/api-client-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Button({
  title,
  onPress,
  variant = "primary",
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
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
      <Text style={styles.emptyTitle}>No subscriptions yet</Text>
      <Text style={styles.emptyText}>
        Tap Scan Gmail to look for recurring charges.
      </Text>
    </View>
  );
}

export default function SubscriptionsTab() {
  const queryClient = useQueryClient();

  const subsQuery = useListSubscriptions();

  const scanMutation = useScanGmail({
    mutation: {
      onSuccess: (res) => {
        queryClient.invalidateQueries({
          queryKey: getListSubscriptionsQueryKey(),
        });
        Alert.alert(
          "Gmail scan complete",
          `${res.found} subscriptions detected (${res.newlyAdded} new).`,
        );
      },
      onError: (err) =>
        Alert.alert(
          "Scan failed",
          err instanceof Error ? err.message : "Try again later.",
        ),
    },
  });

  const deleteMutation = useDeleteSubscription({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getListSubscriptionsQueryKey(),
        }),
    },
  });

  const subs = (subsQuery.data ?? []).filter((s) => !s.dismissed);

  if (subsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const total = subs.reduce((acc, s) => acc + Number(s.amount ?? 0), 0);

  async function openCancel(
    url?: string | null,
    phone?: string | null,
    email?: string | null,
  ) {
    if (url) return Linking.openURL(url);
    if (phone) return Linking.openURL(`tel:${phone}`);
    if (email) return Linking.openURL(`mailto:${email}`);

    Alert.alert(
      "No cancel info",
      "We don't have cancel details for this subscription yet.",
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={subsQuery.isRefetching}
          onRefresh={subsQuery.refetch}
        />
      }
    >
      <Text style={styles.title}>Subscriptions</Text>
      <Text style={styles.subtitle}>
        Recurring charges detected from your inbox.
      </Text>

      <Card>
        <Text style={styles.sectionTitle}>Monthly total</Text>
        <Text style={styles.total}>{formatCurrency(total)}</Text>

        <Text style={styles.meta}>
          {subs.length} active subscription{subs.length === 1 ? "" : "s"}
        </Text>

        <Button
          title="Scan Gmail again"
          onPress={() => scanMutation.mutate()}
          loading={scanMutation.isPending}
          variant="secondary"
        />
      </Card>

      {subs.length === 0 ? (
        <EmptyState />
      ) : (
        subs.map((s) => (
          <Card key={s.id}>
            <Text style={styles.subName}>{s.name}</Text>

            <Text style={styles.subMeta}>
              {s.provider ?? ""} · {s.billingCycle}
              {s.serviceLocationLabel ? ` · ${s.serviceLocationLabel}` : ""}
            </Text>

            <View style={styles.row}>
              <Text style={styles.amount}>
                {formatCurrency(Number(s.amount ?? 0))}
              </Text>
              <Text style={styles.status}>{s.status}</Text>
            </View>

            <View style={styles.actions}>
              <Button
                title="How to cancel"
                variant="secondary"
                onPress={() =>
                  openCancel(s.cancelUrl, s.cancelPhone, s.cancelEmail)
                }
              />

              <Button
                title="Dismiss"
                variant="ghost"
                onPress={() =>
                  Alert.alert("Dismiss subscription?", `Hide ${s.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Dismiss",
                      style: "destructive",
                      onPress: () => deleteMutation.mutate({ id: s.id }),
                    },
                  ])
                }
              />
            </View>
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
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  total: {
    fontSize: 30,
    fontWeight: "700",
    marginVertical: 6,
  },

  meta: {
    color: "#666",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },

  subName: {
    fontSize: 16,
    fontWeight: "600",
  },

  subMeta: {
    color: "#666",
    marginTop: 2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  amount: {
    fontSize: 18,
    fontWeight: "700",
  },

  status: {
    color: "#666",
  },

  actions: {
    marginTop: 10,
    gap: 8,
  },

  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
  },

  buttonSecondary: {
    backgroundColor: "#444",
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
    marginTop: 4,
    textAlign: "center",
  },
});
