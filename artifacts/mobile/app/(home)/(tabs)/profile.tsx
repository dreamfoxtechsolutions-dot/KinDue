import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import {
  useListHouseholds,
  useListHouseholdMembers,
  useGetMe,
} from "@workspace/api-client-react";

function RoleBadge({ role }: { role: string }) {
  const colors = useColors();
  const roleColors: Record<string, string> = {
    primary_user: colors.primary,
    trustee: colors.success,
    caregiver: colors.warning,
    other: colors.mutedForeground,
  };
  const roleLabels: Record<string, string> = {
    primary_user: "Primary User",
    trustee: "Trustee",
    caregiver: "Caregiver",
    other: "Other",
  };
  const color = roleColors[role] ?? colors.mutedForeground;
  return (
    <View
      style={{
        backgroundColor: color + "22",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
      }}
    >
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color }}>
        {roleLabels[role] ?? role}
      </Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Feather
        name={icon}
        size={20}
        color={danger ? colors.destructive : colors.foreground}
      />
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: danger ? colors.destructive : colors.foreground,
        }}
      >
        {label}
      </Text>
      {!danger && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { householdId } = useHouseholdStore();
  const { data: households } = useListHouseholds();
  const activeId = householdId ?? households?.[0]?.id;
  const { data: meData } = useGetMe();
  const { data: members } = useListHouseholdMembers(activeId!, {
    query: { enabled: !!activeId },
  });

  const myMember = members?.find(
    (m: any) => m.userId === meData?.id
  );
  const role = myMember?.role ?? "other";

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad + 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    title: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    profileCard: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 20,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: "#ffffff",
    },
    profileName: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    profileEmail: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 50,
    },
    householdRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    householdIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    householdName: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      flex: 1,
    },
  });

  const initials =
    user?.firstName && user?.lastName
      ? user.firstName[0] + user.lastName[0]
      : user?.firstName
      ? user.firstName[0]
      : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "U";

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: bottomPad }}
    >
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>

      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>
            {user?.firstName ?? ""} {user?.lastName ?? ""}
          </Text>
          <Text style={s.profileEmail}>
            {user?.emailAddresses?.[0]?.emailAddress ?? ""}
          </Text>
          {activeId && (
            <View style={{ marginTop: 6 }}>
              <RoleBadge role={role} />
            </View>
          )}
        </View>
      </View>

      {activeId && households?.[0] && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Household</Text>
          <View style={s.sectionCard}>
            <View style={s.householdRow}>
              <View style={s.householdIcon}>
                <Feather name="home" size={18} color={colors.primary} />
              </View>
              <Text style={s.householdName}>{households[0].name}</Text>
              <RoleBadge role={role} />
            </View>
          </View>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.sectionCard}>
          <SettingsRow
            icon="user"
            label="Edit Profile"
            onPress={() => {}}
          />
          <View style={s.separator} />
          <SettingsRow
            icon="bell"
            label="Notifications"
            onPress={() => {}}
          />
          <View style={s.separator} />
          <SettingsRow
            icon="shield"
            label="Privacy & Security"
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionLabel}>Danger Zone</Text>
        <View style={s.sectionCard}>
          <SettingsRow
            icon="log-out"
            label="Sign Out"
            onPress={handleSignOut}
            danger
          />
        </View>
      </View>
    </ScrollView>
  );
}
