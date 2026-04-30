import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import {
  useListHouseholds,
  getListHouseholdsQueryKey,
} from "@workspace/api-client-react";

export default function HouseholdsListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { householdId, setHouseholdId } = useHouseholdStore();

  const {
    data: households,
    isLoading,
    refetch,
    isFetching,
  } = useListHouseholds({
    query: { queryKey: getListHouseholdsQueryKey() },
  });

  const activeId = householdId ?? households?.[0]?.id ?? null;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    section: { marginHorizontal: 16, marginTop: 16 },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    name: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    activeBadge: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      backgroundColor: colors.primary + "1A",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      overflow: "hidden",
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 68,
    },
    createBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      marginTop: 16,
      marginHorizontal: 16,
    },
    createText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    empty: {
      paddingVertical: 24,
      alignItems: "center",
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/"); // or any default route
    }
  };

  if (isLoading && !households) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Households",
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => goBack()}
                style={{ paddingHorizontal: 12 }}
              >
                <Feather
                  name="arrow-left"
                  size={20}
                  color={colors.foreground}
                />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={[s.container, s.loader]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Households",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => goBack()}
              style={{ paddingHorizontal: 12 }}
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={s.container}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? insets.top : 8,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={s.section}>
          <TouchableOpacity
            onPress={() => {
              goBack();
            }}
          >
            <Text>{"<"}</Text>
          </TouchableOpacity>
          <Text style={s.sectionLabel}>Your Households</Text>
          <View style={s.card}>
            {households && households.length > 0 ? (
              households.map((h, idx) => {
                const isActive = h.id === activeId;
                return (
                  <React.Fragment key={h.id}>
                    {idx > 0 && <View style={s.separator} />}
                    <TouchableOpacity
                      style={s.row}
                      activeOpacity={0.7}
                      onPress={() => setHouseholdId(h.id)}
                    >
                      <View style={s.iconWrap}>
                        <Feather name="home" size={18} color={colors.primary} />
                      </View>
                      <Text style={s.name} numberOfLines={1}>
                        {h.name}
                      </Text>
                      {isActive ? (
                        <Text style={s.activeBadge}>Active</Text>
                      ) : (
                        <Feather
                          name="chevron-right"
                          size={16}
                          color={colors.mutedForeground}
                        />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })
            ) : (
              <View style={s.empty}>
                <Feather name="home" size={28} color={colors.mutedForeground} />
                <Text style={s.emptyText}>
                  You're not part of any households yet.
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={s.createBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/(home)/household/setup")}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={s.createText}>Create New Household</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
