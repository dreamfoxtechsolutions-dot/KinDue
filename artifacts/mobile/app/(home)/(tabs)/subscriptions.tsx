import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getListSubscriptionsQueryKey,
  useCreateSubscription,
  useDeleteSubscription,
  useListSubscriptions,
  useScanGmail,
} from "@workspace/api-client-react";
import type { CreateSubscriptionBodyBillingCycle } from "@workspace/api-client-react";

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

const CYCLE_OPTIONS: { value: CreateSubscriptionBodyBillingCycle; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

function AddSubscriptionModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const insets = useSafeAreaInsets();
  const createMutation = useCreateSubscription();

  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<CreateSubscriptionBodyBillingCycle>("monthly");
  const [cancelUrl, setCancelUrl] = useState("");

  const reset = () => {
    setName("");
    setProvider("");
    setAmount("");
    setCycle("monthly");
    setCancelUrl("");
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Required", "Please enter a name (e.g. Netflix).");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount (e.g. 9.99).");
      return;
    }
    try {
      await createMutation.mutateAsync({
        data: {
          name: trimmedName,
          provider: provider.trim() || null,
          amount: amountNum,
          billingCycle: cycle,
          cancelUrl: cancelUrl.trim() || null,
        },
      });
      reset();
      onSuccess();
      onClose();
    } catch (e: unknown) {
      Alert.alert(
        "Could not add subscription",
        e instanceof Error ? e.message : "Please try again.",
      );
    }
  };

  const m = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: insets.bottom + 24,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: "#ddd", alignSelf: "center", marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
    label: {
      fontSize: 12, fontWeight: "500", color: "#666",
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
    },
    input: {
      borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111",
      backgroundColor: "#fff", marginBottom: 14,
    },
    cycleRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
    cycleChip: {
      borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    },
    cycleChipText: { fontSize: 13, fontWeight: "600" },
    primaryBtn: {
      backgroundColor: "#111", borderRadius: 10,
      paddingVertical: 14, alignItems: "center", marginTop: 4,
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    cancelBtn: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
    cancelText: { color: "#666", fontSize: 15 },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={m.sheet}>
              <View style={m.handle} />
              <Text style={m.title}>Add Subscription</Text>

              <Text style={m.label}>Name *</Text>
              <TextInput
                style={m.input}
                value={name}
                onChangeText={setName}
                placeholder="Netflix"
                placeholderTextColor="#999"
                autoFocus
              />

              <Text style={m.label}>Provider</Text>
              <TextInput
                style={m.input}
                value={provider}
                onChangeText={setProvider}
                placeholder="Netflix Inc."
                placeholderTextColor="#999"
              />

              <Text style={m.label}>Amount *</Text>
              <TextInput
                style={m.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="15.99"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />

              <Text style={m.label}>Billing Cycle</Text>
              <View style={m.cycleRow}>
                {CYCLE_OPTIONS.map((opt) => {
                  const isSel = cycle === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[m.cycleChip, {
                        borderColor: isSel ? "#111" : "#ddd",
                        backgroundColor: isSel ? "#1111110d" : "#fff",
                      }]}
                      onPress={() => setCycle(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[m.cycleChipText, { color: isSel ? "#111" : "#666" }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={m.label}>Cancel URL (optional)</Text>
              <TextInput
                style={m.input}
                value={cancelUrl}
                onChangeText={setCancelUrl}
                placeholder="https://..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <TouchableOpacity
                style={[m.primaryBtn, createMutation.isPending && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending}
                activeOpacity={0.85}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={m.primaryBtnText}>Add Subscription</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
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
  const [showAddModal, setShowAddModal] = useState(false);

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
    <>
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

        <View style={{ gap: 8 }}>
          <Button
            title="+ Add subscription"
            onPress={() => setShowAddModal(true)}
          />
          <Button
            title="Scan Gmail again"
            onPress={() => scanMutation.mutate()}
            loading={scanMutation.isPending}
            variant="secondary"
          />
        </View>
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

    <AddSubscriptionModal
      visible={showAddModal}
      onClose={() => setShowAddModal(false)}
      onSuccess={() =>
        queryClient.invalidateQueries({
          queryKey: getListSubscriptionsQueryKey(),
        })
      }
    />
    </>
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
