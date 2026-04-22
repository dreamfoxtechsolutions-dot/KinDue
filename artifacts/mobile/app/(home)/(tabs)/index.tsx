import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import {
  useGetHouseholdDashboard,
  useListHouseholds,
} from "@workspace/api-client-react";
import type { TriageItem } from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  const colors = useColors();
  return (
    <View
      style={[
        statStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={[statStyles.iconWrap, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text
        style={[statStyles.value, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
      >
        {value}
      </Text>
      <Text
        style={[statStyles.label, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
      >
        {label}
      </Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    minWidth: "46%",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: { fontSize: 22, letterSpacing: -0.5 },
  label: { fontSize: 12 },
});

function priorityColor(score: number, colors: ReturnType<typeof useColors>): string {
  if (score >= 80) return colors.destructive;
  if (score >= 50) return colors.warning;
  return colors.primary;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { householdId, setHouseholdId } = useHouseholdStore();

  const {
    data: households,
    isLoading: householdsLoading,
    refetch: refetchHouseholds,
  } = useListHouseholds();

  const firstHousehold = households?.[0];
  const activeId = householdId ?? firstHousehold?.id;

  React.useEffect(() => {
    if (firstHousehold && !householdId) {
      setHouseholdId(firstHousehold.id);
    }
  }, [firstHousehold, householdId, setHouseholdId]);

  const {
    data: dashboard,
    isLoading: dashLoading,
    refetch: refetchDash,
  } = useGetHouseholdDashboard(activeId ?? 0);

  const isLoading = householdsLoading || dashLoading;
  const firstName = user?.firstName ?? "there";

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 12,
      paddingHorizontal: 20,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    greeting: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    householdName: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },

    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 12,
    },
    statsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    noHouseholdCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center",
      margin: 20,
      gap: 12,
    },
    noHouseholdTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    noHouseholdText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    setupBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    setupBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    triageCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    priorityBadge: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    priorityNum: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: "#ffffff",
    },
    triageName: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      flex: 1,
    },
    triageReason: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 1,
    },
    triageAmount: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      paddingVertical: 16,
    },
    viewAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      gap: 4,
    },
    viewAllText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    alertBanner: {
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: colors.warning + "22",
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.warning,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    alertText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.warning,
      flex: 1,
    },
  });

  if (isLoading) {
    return (
      <View style={[s.container, s.loader]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!activeId || !firstHousehold) {
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <View style={s.header}>
          <Text style={s.greeting}>Hi, {firstName}</Text>
        </View>
        <View style={s.noHouseholdCard}>
          <Feather name="home" size={40} color={colors.mutedForeground} />
          <Text style={s.noHouseholdTitle}>No Household Yet</Text>
          <Text style={s.noHouseholdText}>
            Create or join a household to start coordinating bills.
          </Text>
          <TouchableOpacity
            style={s.setupBtn}
            onPress={() => router.push("/(home)/household/setup")}
          >
            <Text style={s.setupBtnText}>Set Up Household</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const overdueCount = dashboard?.overdueCount ?? 0;
  const dueSoonCount = dashboard?.dueSoonCount ?? 0;
  const pendingApprovalCount = dashboard?.pendingApprovalCount ?? 0;
  const totalMonthlyEstimate = dashboard?.totalMonthlyEstimate ?? 0;
  const hasLowBalanceRisk = dashboard?.hasLowBalanceRisk ?? false;
  const topTriageItems = dashboard?.topTriageItems ?? [];
  const householdName = firstHousehold.name;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            refetchHouseholds();
            refetchDash();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hi, {firstName}</Text>
          <Text style={s.householdName}>{householdName}</Text>
        </View>
      </View>

      {hasLowBalanceRisk && (
        <View style={s.alertBanner}>
          <Feather name="alert-triangle" size={16} color={colors.warning} />
          <Text style={s.alertText}>A linked account may have a low balance.</Text>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Overview</Text>
        <View style={s.statsRow}>
          <StatCard
            label="Due Soon"
            value={String(dueSoonCount)}
            color={colors.warning}
            icon="clock"
          />
          <StatCard
            label="Overdue"
            value={String(overdueCount)}
            color={colors.destructive}
            icon="alert-circle"
          />
          <StatCard
            label="Pending Approval"
            value={String(pendingApprovalCount)}
            color={colors.primary}
            icon="check-circle"
          />
          <StatCard
            label="Monthly Est."
            value={formatCurrency(totalMonthlyEstimate)}
            color={colors.success}
            icon="dollar-sign"
          />
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Priority Bills</Text>
        {topTriageItems.length === 0 ? (
          <Text style={s.emptyText}>No priority bills — you're all caught up!</Text>
        ) : (
          topTriageItems.slice(0, 5).map((item: TriageItem) => {
            const pColor = priorityColor(item.priorityScore, colors);
            return (
              <TouchableOpacity
                key={item.bill.id}
                style={s.triageCard}
                onPress={() => router.push(`/(home)/bills/${item.bill.id}` as Href)}
                activeOpacity={0.75}
              >
                <View style={[s.priorityBadge, { backgroundColor: pColor }]}>
                  <Text style={s.priorityNum}>#{item.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.triageName} numberOfLines={1}>
                    {item.bill.name}
                  </Text>
                  <Text style={s.triageReason} numberOfLines={1}>
                    {item.priorityReason}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.triageAmount}>
                    {formatCurrency(item.bill.amount ?? 0)}
                  </Text>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={s.viewAllBtn}
          onPress={() => router.push("/(home)/(tabs)/bills")}
        >
          <Text style={s.viewAllText}>View all bills</Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
