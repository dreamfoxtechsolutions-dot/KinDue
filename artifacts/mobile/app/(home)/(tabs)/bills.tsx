import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import {
  useListBills,
  useCreateBill,
  useListHouseholds,
  CreateBillBodyCategory,
} from "@workspace/api-client-react";
import type { Bill } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}

function statusColor(
  status: string,
  colors: ReturnType<typeof useColors>
): string {
  switch (status) {
    case "approved":
      return colors.primary;
    case "pending_approval":
      return colors.warning;
    case "paid":
      return colors.success;
    case "rejected":
      return colors.destructive;
    case "overdue":
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending_approval":
      return "Pending";
    case "paid":
      return "Paid";
    case "rejected":
      return "Rejected";
    case "overdue":
      return "Overdue";
    default:
      return status;
  }
}

type FilterStatus = "all" | "pending_approval" | "approved" | "paid" | "overdue";

const FILTER_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending_approval" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

function BillCard({ bill, onPress }: { bill: Bill; onPress: () => void }) {
  const colors = useColors();
  const sColor = statusColor(bill.status, colors);
  return (
    <TouchableOpacity
      style={[
        styles.billCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.billLeft}>
        <View
          style={[
            styles.billIcon,
            { backgroundColor: sColor + "22" },
          ]}
        >
          <Feather name="file-text" size={18} color={sColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.billName,
              { color: colors.foreground, fontFamily: "Inter_500Medium" },
            ]}
            numberOfLines={1}
          >
            {bill.name}
          </Text>
          <View style={styles.billMeta}>
            <View style={[styles.statusDot, { backgroundColor: sColor }]} />
            <Text
              style={[
                styles.billStatus,
                { color: sColor, fontFamily: "Inter_400Regular" },
              ]}
            >
              {statusLabel(bill.status)}
            </Text>
            {bill.dueDate && (
              <Text
                style={[
                  styles.billDue,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                · Due {bill.dueDate}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.billRight}>
        <Text
          style={[
            styles.billAmount,
            { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
          ]}
        >
          {formatCurrency(bill.amount)}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  billCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  billLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  billName: { fontSize: 15, marginBottom: 3 },
  billMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  billStatus: { fontSize: 12 },
  billDue: { fontSize: 12 },
  billRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  billAmount: { fontSize: 15 },
});

export default function BillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { householdId } = useHouseholdStore();
  const { data: households } = useListHouseholds();
  const activeId = householdId ?? households?.[0]?.id;

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createDue, setCreateDue] = useState("");
  const [createCategory, setCreateCategory] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  const {
    data: bills,
    isLoading,
    refetch,
  } = useListBills(
    activeId!,
    filter !== "all" ? { status: filter } : {},
    { query: { enabled: !!activeId } }
  );

  const createBillMutation = useCreateBill();

  const handleCreate = async () => {
    if (!createName || !createAmount) {
      Alert.alert("Required", "Please enter a name and amount.");
      return;
    }
    const amountCents = Math.round(parseFloat(createAmount) * 100);
    if (isNaN(amountCents)) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    const validCategories = Object.values(CreateBillBodyCategory);
    const cat = validCategories.includes(createCategory as any)
      ? (createCategory as any)
      : CreateBillBodyCategory.other;
    try {
      await createBillMutation.mutateAsync({
        householdId: activeId!,
        data: {
          name: createName,
          amount: amountCents,
          dueDate: createDue || undefined,
          category: cat,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false);
      setCreateName("");
      setCreateAmount("");
      setCreateDue("");
      setCreateCategory("");
      refetch();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create bill.");
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 12,
      paddingHorizontal: 20,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    filterScroll: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
    },
    filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    list: { paddingHorizontal: 16 },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 10,
    },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: insets.bottom + 24,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 20,
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    createBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 4,
    },
    createBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    cancelBtn: {
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 8,
    },
    cancelBtnText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    noHousehold: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    noHouseholdText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 12,
    },
  });

  if (!activeId) {
    return (
      <View style={[s.container, s.noHousehold]}>
        <Feather name="home" size={40} color={colors.mutedForeground} />
        <Text style={s.noHouseholdText}>Set up a household first to manage bills.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Bills</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true); }}
        >
          <Feather name="plus" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
      >
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              s.filterChip,
              {
                backgroundColor: filter === opt.value ? colors.primary : colors.muted,
                borderColor: filter === opt.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilter(opt.value)}
          >
            <Text
              style={[
                s.filterChipText,
                { color: filter === opt.value ? "#ffffff" : colors.mutedForeground },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={bills ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BillCard
              bill={item}
              onPress={() => router.push(`/(home)/bills/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[
            s.list,
            { paddingBottom: bottomPad },
            (!bills || bills.length === 0) && { flex: 1 },
          ]}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No bills found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          scrollEnabled={!!(bills && bills.length > 0)}
        />
      )}

      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>New Bill</Text>

            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Electricity"
              placeholderTextColor={colors.mutedForeground}
              value={createName}
              onChangeText={setCreateName}
            />

            <Text style={s.label}>Amount ($)</Text>
            <TextInput
              style={s.input}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={createAmount}
              onChangeText={setCreateAmount}
              keyboardType="decimal-pad"
            />

            <Text style={s.label}>Due Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              placeholder="2025-05-01"
              placeholderTextColor={colors.mutedForeground}
              value={createDue}
              onChangeText={setCreateDue}
            />

            <Text style={s.label}>Category (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Utilities"
              placeholderTextColor={colors.mutedForeground}
              value={createCategory}
              onChangeText={setCreateCategory}
            />

            <TouchableOpacity
              style={[s.createBtn, createBillMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={createBillMutation.isPending}
            >
              {createBillMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.createBtnText}>Create Bill</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
