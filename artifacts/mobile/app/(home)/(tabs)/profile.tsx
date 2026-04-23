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
  useInviteHouseholdMember,
  useUpdateHouseholdMember,
  useRemoveHouseholdMember,
} from "@workspace/api-client-react";
import { InviteMemberBodyRole, UpdateMemberBodyRole } from "@workspace/api-client-react";
import type { HouseholdMember } from "@workspace/api-client-react";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

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
      Alert.alert("Error", errMsg(e, "Could not update profile."));
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

const INVITE_ROLES: { value: InviteMemberBodyRole; label: string; description: string }[] = [
  { value: "trustee", label: "Trustee", description: "Can approve and manage bills" },
  { value: "caregiver", label: "Caregiver", description: "Can mark bills paid (receipt required)" },
  { value: "other", label: "Other", description: "Read-only access to bills" },
];

function InviteMemberModal({
  visible,
  onClose,
  householdId,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  householdId: number;
  onSuccess: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const inviteMutation = useInviteHouseholdMember();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<InviteMemberBodyRole>("caregiver");

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Required", "Please enter an email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    try {
      await inviteMutation.mutateAsync({
        householdId,
        data: { email: trimmed, role: selectedRole },
      });
      setEmail("");
      setSelectedRole("caregiver");
      onSuccess();
      onClose();
      Alert.alert(
        "Invite sent",
        `An invitation has been sent to ${trimmed}. They will be added as ${selectedRole} once they sign up.`
      );
    } catch (e: unknown) {
      Alert.alert("Could not send invite", errMsg(e, "Please try again."));
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
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 20,
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
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
      marginBottom: 20,
    },
    roleRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    roleChip: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: colors.radius,
      paddingVertical: 10,
      alignItems: "center",
    },
    roleChipLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    roleDesc: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 16,
      marginBottom: 4,
    },
    inviteBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    inviteBtnText: {
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

  const selectedRoleInfo = INVITE_ROLES.find((r) => r.value === selectedRole);

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
              <Text style={s.title}>Invite a Member</Text>
              <Text style={s.subtitle}>
                They'll be added to your household once they sign up.
              </Text>

              <Text style={s.label}>Email Address</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="next"
              />

              <Text style={s.label}>Role</Text>
              <View style={s.roleRow}>
                {INVITE_ROLES.map((r) => {
                  const isSelected = selectedRole === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        s.roleChip,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + "14" : colors.background,
                        },
                      ]}
                      onPress={() => setSelectedRole(r.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          s.roleChipLabel,
                          { color: isSelected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedRoleInfo && (
                <Text style={s.roleDesc}>{selectedRoleInfo.description}</Text>
              )}

              <TouchableOpacity
                style={[s.inviteBtn, inviteMutation.isPending && { opacity: 0.7 }]}
                onPress={handleInvite}
                disabled={inviteMutation.isPending}
                activeOpacity={0.85}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.inviteBtnText}>Send Invite</Text>
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

const UPDATE_ROLES: { value: UpdateMemberBodyRole; label: string; description: string }[] = [
  { value: "trustee", label: "Trustee", description: "Can approve and manage bills" },
  { value: "caregiver", label: "Caregiver", description: "Can mark bills paid (receipt required)" },
  { value: "other", label: "Other", description: "Read-only access to bills" },
];

function MemberActionsSheet({
  visible,
  member,
  householdId,
  canChangeRole,
  onClose,
  onSuccess,
  memberDisplayName,
}: {
  visible: boolean;
  member: HouseholdMember | null;
  householdId: number;
  canChangeRole: boolean;
  onClose: () => void;
  onSuccess: () => void;
  memberDisplayName: (m: HouseholdMember) => string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const updateMutation = useUpdateHouseholdMember();
  const removeMutation = useRemoveHouseholdMember();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UpdateMemberBodyRole>("caregiver");

  React.useEffect(() => {
    if (member) {
      const r = member.role as UpdateMemberBodyRole;
      if (r === "trustee" || r === "caregiver" || r === "other") {
        setSelectedRole(r);
      } else {
        setSelectedRole("caregiver");
      }
    }
    setShowRolePicker(false);
  }, [member]);

  const handleChangeRole = async () => {
    if (!member) return;
    try {
      await updateMutation.mutateAsync({
        householdId,
        memberId: member.id,
        data: { role: selectedRole, sensitiveToken: "" },
      });
      onSuccess();
      onClose();
      const roleLabel = UPDATE_ROLES.find((r) => r.value === selectedRole)?.label ?? selectedRole;
      Alert.alert("Role updated", `${memberDisplayName(member)}'s role has been changed to ${roleLabel}.`);
    } catch (e: unknown) {
      Alert.alert("Could not update role", errMsg(e, "Please try again."));
    }
  };

  const handleRemove = () => {
    if (!member) return;
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberDisplayName(member)} from the household?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMutation.mutateAsync({ householdId, memberId: member.id });
              onSuccess();
              onClose();
              Alert.alert("Member removed", `${memberDisplayName(member)} has been removed from the household.`);
            } catch (e: unknown) {
              Alert.alert("Could not remove member", errMsg(e, "Please try again."));
            }
          },
        },
      ]
    );
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
      marginBottom: 16,
    },
    memberName: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 4,
    },
    memberRole: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginBottom: 20,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      gap: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionLabel: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    actionLabelDanger: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.destructive,
    },
    cancelBtn: {
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    roleRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    roleChip: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: colors.radius,
      paddingVertical: 10,
      alignItems: "center",
    },
    roleChipLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 13,
      alignItems: "center",
      marginBottom: 4,
    },
    saveBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    backBtn: {
      paddingVertical: 13,
      alignItems: "center",
    },
    backText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 12,
    },
  });

  if (!member) return null;

  const displayName = memberDisplayName(member);
  const roleLabels: Record<string, string> = {
    primary_user: "Primary User",
    trustee: "Trustee",
    caregiver: "Caregiver",
    other: "Other",
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.memberName} numberOfLines={1}>{displayName}</Text>
            <Text style={s.memberRole}>{roleLabels[member.role] ?? member.role}</Text>

            {showRolePicker ? (
              <>
                <Text style={s.sectionTitle}>Select New Role</Text>
                <View style={s.roleRow}>
                  {UPDATE_ROLES.map((r) => {
                    const isSelected = selectedRole === r.value;
                    return (
                      <TouchableOpacity
                        key={r.value}
                        style={[
                          s.roleChip,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary + "14" : colors.background,
                          },
                        ]}
                        onPress={() => setSelectedRole(r.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            s.roleChipLabel,
                            { color: isSelected ? colors.primary : colors.foreground },
                          ]}
                        >
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[s.saveBtn, updateMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleChangeRole}
                  disabled={updateMutation.isPending}
                  activeOpacity={0.85}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.saveBtnText}>Save Role</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={s.backBtn} onPress={() => setShowRolePicker(false)}>
                  <Text style={s.backText}>Back</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {canChangeRole && (
                  <TouchableOpacity style={s.actionBtn} onPress={() => setShowRolePicker(true)} activeOpacity={0.7}>
                    <Feather name="shield" size={20} color={colors.foreground} />
                    <Text style={s.actionLabel}>Change Role</Text>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={handleRemove}
                  disabled={removeMutation.isPending}
                  activeOpacity={0.7}
                >
                  {removeMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.destructive} />
                  ) : (
                    <Feather name="user-x" size={20} color={colors.destructive} />
                  )}
                  <Text style={s.actionLabelDanger}>Remove from Household</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
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
  const { data: members, refetch: refetchMembers } = useListHouseholdMembers(activeId ?? 0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const myMember = members?.find(
    (m: HouseholdMember) => m.userId === meData?.id
  );
  const role = myMember?.role ?? "other";
  const canManageMembers = role === "primary_user";
  const canActOnMembers = role === "primary_user" || role === "trustee";
  const canChangeRoles = role === "primary_user";
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);

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
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    memberAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    memberAvatarText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    memberName: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    memberEmail: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 1,
    },
    inviteRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    inviteIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary + "14",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.primary + "44",
      borderStyle: "dashed",
    },
    inviteText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
  });

  const initials =
    user?.firstName && user?.lastName
      ? user.firstName[0] + user.lastName[0]
      : user?.firstName
      ? user.firstName[0]
      : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "U";

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  function memberInitials(m: HouseholdMember): string {
    if (m.user?.firstName) {
      const first = m.user.firstName[0];
      const last = m.user.lastName?.[0] ?? "";
      return (first + last).toUpperCase();
    }
    return ((m.user?.email ?? m.inviteEmail ?? "?")[0]).toUpperCase();
  }

  function memberDisplayName(m: HouseholdMember): string {
    const name = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(" ");
    return name || m.user?.email || m.inviteEmail || "Pending invite";
  }

  function memberEmail(m: HouseholdMember): string {
    return m.user?.email ?? m.inviteEmail ?? "";
  }

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

        {activeId && (members || canManageMembers) && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Members</Text>
            <View style={s.sectionCard}>
              {members?.map((m: HouseholdMember, idx: number) => {
                const isSelf = m.userId === meData?.id;
                const isPrimaryUser = m.role === "primary_user";
                const canTap = canActOnMembers && !isSelf && !isPrimaryUser;
                return (
                  <React.Fragment key={m.id}>
                    {idx > 0 && (
                      <View style={[s.separator, { marginLeft: 66 }]} />
                    )}
                    <TouchableOpacity
                      style={s.memberRow}
                      activeOpacity={canTap ? 0.7 : 1}
                      onPress={canTap ? () => {
                        setSelectedMember(m);
                        setShowMemberActions(true);
                      } : undefined}
                    >
                      <View style={s.memberAvatar}>
                        <Text style={s.memberAvatarText}>{memberInitials(m)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.memberName} numberOfLines={1}>
                          {memberDisplayName(m)}
                        </Text>
                        {m.user?.firstName && memberEmail(m) ? (
                          <Text style={s.memberEmail} numberOfLines={1}>
                            {memberEmail(m)}
                          </Text>
                        ) : null}
                        {m.inviteStatus === "pending" && (
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.warning, marginTop: 1 }}>
                            Invite pending
                          </Text>
                        )}
                      </View>
                      <RoleBadge role={m.role} />
                      {canTap && (
                        <Feather name="more-vertical" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}

              {canManageMembers && (
                <>
                  {members && members.length > 0 && (
                    <View style={[s.separator, { marginLeft: 66 }]} />
                  )}
                  <TouchableOpacity
                    style={s.inviteRow}
                    onPress={() => setShowInviteModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={s.inviteIcon}>
                      <Feather name="user-plus" size={16} color={colors.primary} />
                    </View>
                    <Text style={s.inviteText}>Invite a Member</Text>
                    <Feather name="chevron-right" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
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

      {activeId && (
        <InviteMemberModal
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          householdId={activeId}
          onSuccess={() => void refetchMembers()}
        />
      )}

      {activeId && (
        <MemberActionsSheet
          visible={showMemberActions}
          member={selectedMember}
          householdId={activeId}
          canChangeRole={canChangeRoles}
          onClose={() => {
            setShowMemberActions(false);
            setSelectedMember(null);
          }}
          onSuccess={() => void refetchMembers()}
          memberDisplayName={memberDisplayName}
        />
      )}
    </>
  );
}
