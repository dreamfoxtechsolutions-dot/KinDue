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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Linking,
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
import type { HouseholdMember } from "@workspace/api-client-react";

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
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
  value?: string;
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
      {value ? (
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
          {value}
        </Text>
      ) : !danger ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null}
    </TouchableOpacity>
  );
}

function EditProfileModal({
  visible,
  onClose,
  currentFirst,
  currentLast,
}: {
  visible: boolean;
  onClose: () => void;
  currentFirst: string;
  currentLast: string;
}) {
  const colors = useColors();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(currentFirst);
  const [lastName, setLastName] = useState(currentLast);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Required", "First name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await user?.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not update profile.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: insets.bottom + 24,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 20,
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.background,
      marginBottom: 16,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    saveBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    cancelBtn: {
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.sheet}>
              <View style={s.handle} />
              <Text style={s.title}>Edit Profile</Text>

              <Text style={s.label}>First Name</Text>
              <TextInput
                style={s.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                returnKeyType="next"
              />

              <Text style={s.label}>Last Name</Text>
              <TextInput
                style={s.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name (optional)"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
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
  const { data: members } = useListHouseholdMembers(activeId ?? 0);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const myMember = members?.find(
    (m: HouseholdMember) => m.userId === meData?.id
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

  const handleNotifications = async () => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      await Linking.openSettings();
    } else {
      Alert.alert(
        "Notifications",
        "Manage notification preferences in your device settings.",
        [{ text: "OK" }]
      );
    }
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy & Security",
      "KinDue keeps your financial data encrypted and only shares bill information with members of your household.\n\nYour Clerk account manages authentication and you can change your password or connected accounts from the Clerk dashboard.",
      [{ text: "OK" }]
    );
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

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return (
    <>
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
              {fullName || (user?.emailAddresses?.[0]?.emailAddress ?? "")}
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
              onPress={() => setShowEditProfile(true)}
            />
            <View style={s.separator} />
            <SettingsRow
              icon="bell"
              label="Notifications"
              onPress={handleNotifications}
            />
            <View style={s.separator} />
            <SettingsRow
              icon="shield"
              label="Privacy & Security"
              onPress={handlePrivacy}
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

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentFirst={user?.firstName ?? ""}
        currentLast={user?.lastName ?? ""}
      />
    </>
  );
}
