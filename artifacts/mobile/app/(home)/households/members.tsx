import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import {
  useListHouseholds,
  getListHouseholdsQueryKey,
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

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

const ROLE_LABELS: Record<string, string> = {
  primary_user: "Primary User",
  trustee: "Trustee",
  caregiver: "Caregiver",
  other: "Other",
};

function RoleBadge({ role }: { role: string }) {
  const colors = useColors();
  const roleColors: Record<string, string> = {
    primary_user: colors.primary,
    trustee: colors.success,
    caregiver: colors.warning,
    other: colors.mutedForeground,
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
        {ROLE_LABELS[role] ?? role}
      </Text>
    </View>
  );
}

const INVITE_ROLES: { value: InviteMemberBodyRole; label: string; description: string }[] = [
  { value: "trustee", label: "Trustee", description: "Can approve and manage bills" },
  { value: "caregiver", label: "Caregiver", description: "Can mark bills paid (receipt required)" },
  { value: "other", label: "Other", description: "Read-only access to bills" },
];

const UPDATE_ROLES: { value: UpdateMemberBodyRole; label: string }[] = [
  { value: "trustee", label: "Trustee" },
  { value: "caregiver", label: "Caregiver" },
  { value: "other", label: "Other" },
];

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

function InviteModal({
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
        `An invitation has been sent to ${trimmed}.`,
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
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 20,
    },
    title: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 16 },
    label: {
      fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
    },
    input: {
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
      fontFamily: "Inter_400Regular", color: colors.foreground,
      backgroundColor: colors.background, marginBottom: 16,
    },
    roleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    roleChip: {
      flex: 1, borderWidth: 1.5, borderRadius: colors.radius, paddingVertical: 10, alignItems: "center",
    },
    roleChipLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    roleDesc: {
      fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground,
      textAlign: "center", marginBottom: 16,
    },
    primaryBtn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      paddingVertical: 14, alignItems: "center", marginTop: 4,
    },
    primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
    cancelBtn: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
    cancelText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
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
              />

              <Text style={s.label}>Role</Text>
              <View style={s.roleRow}>
                {INVITE_ROLES.map((r) => {
                  const isSelected = selectedRole === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[s.roleChip, {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary + "14" : colors.background,
                      }]}
                      onPress={() => setSelectedRole(r.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.roleChipLabel, { color: isSelected ? colors.primary : colors.foreground }]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedRoleInfo && <Text style={s.roleDesc}>{selectedRoleInfo.description}</Text>}

              <TouchableOpacity
                style={[s.primaryBtn, inviteMutation.isPending && { opacity: 0.7 }]}
                onPress={handleInvite}
                disabled={inviteMutation.isPending}
                activeOpacity={0.85}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryBtnText}>Send Invite</Text>
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

function MemberActionsSheet({
  visible,
  member,
  householdId,
  canChangeRole,
  isPendingInvite,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  member: HouseholdMember | null;
  householdId: number;
  canChangeRole: boolean;
  isPendingInvite: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const updateMutation = useUpdateHouseholdMember();
  const removeMutation = useRemoveHouseholdMember();
  const inviteMutation = useInviteHouseholdMember();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UpdateMemberBodyRole>("caregiver");

  React.useEffect(() => {
    if (member) {
      const r = member.role as UpdateMemberBodyRole;
      if (r === "trustee" || r === "caregiver" || r === "other") setSelectedRole(r);
      else setSelectedRole("caregiver");
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
      Alert.alert("Role updated", `Role changed to ${roleLabel}.`);
    } catch (e: unknown) {
      Alert.alert("Could not update role", errMsg(e, "Please try again."));
    }
  };

  const handleRemove = () => {
    if (!member) return;
    Alert.alert(
      "Remove Member",
      `Remove ${memberDisplayName(member)} from the household?`,
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
            } catch (e: unknown) {
              Alert.alert("Could not remove", errMsg(e, "Please try again."));
            }
          },
        },
      ]
    );
  };

  const handleResendInvite = async () => {
    if (!member || !member.inviteEmail) return;
    const role = (member.role === "primary_user" ? "other" : member.role) as InviteMemberBodyRole;
    try {
      await inviteMutation.mutateAsync({
        householdId,
        data: { email: member.inviteEmail, role },
      });
      onSuccess();
      onClose();
      Alert.alert("Invite resent", `Sent again to ${member.inviteEmail}.`);
    } catch (e: unknown) {
      Alert.alert("Could not resend", errMsg(e, "Please try again."));
    }
  };

  const handleCancelInvite = () => {
    if (!member) return;
    Alert.alert(
      "Cancel Invite",
      `Cancel the pending invite for ${member.inviteEmail ?? memberDisplayName(member)}?`,
      [
        { text: "Keep Invite", style: "cancel" },
        {
          text: "Cancel Invite",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMutation.mutateAsync({ householdId, memberId: member.id });
              onSuccess();
              onClose();
            } catch (e: unknown) {
              Alert.alert("Could not cancel", errMsg(e, "Please try again."));
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
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 24,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginBottom: 16,
    },
    name: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground, textAlign: "center", marginBottom: 4 },
    sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", marginBottom: 20 },
    actionBtn: {
      flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    actionLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, flex: 1 },
    actionLabelDanger: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.destructive, flex: 1 },
    cancelBtn: {
      paddingVertical: 14, alignItems: "center", marginTop: 4,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    cancelText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    roleRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    roleChip: {
      flex: 1, borderWidth: 1.5, borderRadius: colors.radius, paddingVertical: 10, alignItems: "center",
    },
    roleChipLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    saveBtn: { backgroundColor: colors.primary, borderRadius: colors.radius, paddingVertical: 13, alignItems: "center", marginBottom: 4 },
    saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    backBtn: { paddingVertical: 12, alignItems: "center" },
    backText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.name}>{memberDisplayName(member)}</Text>
            <Text style={s.sub}>
              {ROLE_LABELS[member.role] ?? member.role}
              {isPendingInvite ? " · Pending invite" : ""}
            </Text>

            {showRolePicker ? (
              <>
                <View style={s.roleRow}>
                  {UPDATE_ROLES.map((r) => {
                    const isSelected = selectedRole === r.value;
                    return (
                      <TouchableOpacity
                        key={r.value}
                        style={[s.roleChip, {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + "14" : colors.background,
                        }]}
                        onPress={() => setSelectedRole(r.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.roleChipLabel, { color: isSelected ? colors.primary : colors.foreground }]}>
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
                {isPendingInvite ? (
                  <>
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={handleResendInvite}
                      disabled={inviteMutation.isPending}
                      activeOpacity={0.7}
                    >
                      <Feather name="send" size={20} color={colors.foreground} />
                      <Text style={s.actionLabel}>Resend Invite</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={handleCancelInvite} activeOpacity={0.7}>
                      <Feather name="x-circle" size={20} color={colors.destructive} />
                      <Text style={s.actionLabelDanger}>Cancel Invite</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {canChangeRole && (
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => setShowRolePicker(true)}
                        activeOpacity={0.7}
                      >
                        <Feather name="shield" size={20} color={colors.foreground} />
                        <Text style={s.actionLabel}>Change Role</Text>
                        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.actionBtn} onPress={handleRemove} activeOpacity={0.7}>
                      <Feather name="user-x" size={20} color={colors.destructive} />
                      <Text style={s.actionLabelDanger}>Remove from Household</Text>
                    </TouchableOpacity>
                  </>
                )}
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

export default function MembersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { householdId } = useHouseholdStore();

  const { data: households } = useListHouseholds({
    query: { queryKey: getListHouseholdsQueryKey() },
  });
  const activeId = householdId ?? households?.[0]?.id ?? 0;

  const { data: meData } = useGetMe();
  const {
    data: members,
    refetch,
    isLoading,
    isFetching,
  } = useListHouseholdMembers(activeId);

  const myMember = members?.find((m: HouseholdMember) => m.userId === meData?.id);
  const role = myMember?.role ?? "other";
  const canManageMembers = role === "primary_user";
  const canActOnMembers = role === "primary_user" || role === "trustee";
  const canChangeRoles = role === "primary_user";

  const [showInvite, setShowInvite] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [isPendingSelected, setIsPendingSelected] = useState(false);

  const activeMembers = (members ?? []).filter((m) => m.inviteStatus !== "pending");
  const pendingMembers = (members ?? []).filter((m) => m.inviteStatus === "pending");

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: { marginHorizontal: 16, marginTop: 16 },
    sectionLabel: {
      fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground,
      textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, paddingHorizontal: 4,
    },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius + 4,
      borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    row: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 12, paddingHorizontal: 16, gap: 12,
    },
    avatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center",
    },
    avatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.primary },
    name: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    email: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    pendingNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.warning, marginTop: 1 },
    inviteAge: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 66 },
    inviteRow: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 14, paddingHorizontal: 16, gap: 12,
    },
    inviteIcon: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.primary + "14",
      alignItems: "center", justifyContent: "center",
      borderWidth: 1.5, borderColor: colors.primary + "44", borderStyle: "dashed",
    },
    inviteText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.primary },
    empty: { paddingVertical: 24, alignItems: "center" },
    emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  });

  if (!activeId) {
    return (
      <>
        <Stack.Screen options={{ title: "Members" }} />
        <View style={[s.container, s.loader]}>
          <Text style={s.emptyText}>No active household.</Text>
        </View>
      </>
    );
  }

  if (isLoading && !members) {
    return (
      <>
        <Stack.Screen options={{ title: "Members" }} />
        <View style={[s.container, s.loader]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  const renderMember = (m: HouseholdMember, isPending: boolean, idx: number, total: number) => {
    const isSelf = m.userId === meData?.id;
    const isPrimaryUser = m.role === "primary_user";
    const canTap = canActOnMembers && !isPrimaryUser && (!isSelf || isPending);
    return (
      <React.Fragment key={m.id}>
        {idx > 0 && <View style={s.separator} />}
        <TouchableOpacity
          style={s.row}
          activeOpacity={canTap ? 0.7 : 1}
          onPress={
            canTap
              ? () => {
                  setSelectedMember(m);
                  setIsPendingSelected(isPending);
                  setShowActions(true);
                }
              : undefined
          }
        >
          <View style={s.avatar}>
            <Text style={s.avatarText}>{memberInitials(m)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{memberDisplayName(m)}</Text>
            {m.user?.firstName && memberEmail(m) ? (
              <Text style={s.email} numberOfLines={1}>{memberEmail(m)}</Text>
            ) : null}
            {isPending && (
              <>
                <Text style={s.pendingNote}>Invite pending</Text>
                <Text style={s.inviteAge}>Invited {formatRelativeTime(m.createdAt)}</Text>
              </>
            )}
          </View>
          <RoleBadge role={m.role} />
          {canTap && (
            <Feather name="more-vertical" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
        {idx === total - 1 ? null : null}
      </React.Fragment>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Members" }} />
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
          <Text style={s.sectionLabel}>Active Members ({activeMembers.length})</Text>
          <View style={s.card}>
            {activeMembers.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>No active members yet.</Text>
              </View>
            ) : (
              activeMembers.map((m, idx) => renderMember(m, false, idx, activeMembers.length))
            )}
            {canManageMembers && (
              <>
                {activeMembers.length > 0 && <View style={s.separator} />}
                <TouchableOpacity
                  style={s.inviteRow}
                  onPress={() => setShowInvite(true)}
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

        <View style={s.section}>
          <Text style={s.sectionLabel}>Pending Invites ({pendingMembers.length})</Text>
          <View style={s.card}>
            {pendingMembers.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>No pending invites.</Text>
              </View>
            ) : (
              pendingMembers.map((m, idx) => renderMember(m, true, idx, pendingMembers.length))
            )}
          </View>
        </View>
      </ScrollView>

      <InviteModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        householdId={activeId}
        onSuccess={() => void refetch()}
      />
      <MemberActionsSheet
        visible={showActions}
        member={selectedMember}
        householdId={activeId}
        canChangeRole={canChangeRoles}
        isPendingInvite={isPendingSelected}
        onClose={() => {
          setShowActions(false);
          setSelectedMember(null);
        }}
        onSuccess={() => void refetch()}
      />
    </>
  );
}
