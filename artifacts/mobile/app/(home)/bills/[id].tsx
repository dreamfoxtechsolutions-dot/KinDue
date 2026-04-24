import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import {
  useGetBill,
  useApproveBill,
  useRejectBill,
  useMarkBillPaid,
  useDeleteBill,
  useListHouseholdMembers,
  useGetMe,
  useListHouseholds,
  useListReceipts,
} from "@workspace/api-client-react";
import type { HouseholdMember } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

function statusColor(
  status: string,
  colors: ReturnType<typeof useColors>
): string {
  switch (status) {
    case "approved": return colors.primary;
    case "pending_approval": return colors.warning;
    case "paid": return colors.success;
    case "rejected": return colors.destructive;
    case "overdue": return colors.destructive;
    default: return colors.mutedForeground;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function resolveDownloadUrl(storageKey: string, downloadUrl?: string | null): string {
  if (downloadUrl) return downloadUrl;
  const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";
  const path = storageKey.replace(/^\/objects\//, "");
  return `${baseUrl}/api/storage/objects/${path}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Inter_400Regular",
          color: colors.mutedForeground,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Inter_500Medium",
          color: colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function BillDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const billId = Number(id);
  const { householdId } = useHouseholdStore();
  const { data: households } = useListHouseholds();
  const activeId = householdId ?? households?.[0]?.id;

  const { data: bill, isLoading, refetch } = useGetBill(activeId ?? 0, billId);
  const { data: meData } = useGetMe();
  const { data: members } = useListHouseholdMembers(activeId ?? 0);
  const { data: receipts, isLoading: receiptsLoading } = useListReceipts(
    activeId ?? 0,
    bill?.status === "paid" ? billId : 0
  );

  const myMember = members?.find((m: HouseholdMember) => m.userId === meData?.id);
  const role = myMember?.role ?? "other";
  const canApprove = role === "primary_user" || role === "trustee";
  const canDelete = role === "primary_user";
  const canPay = role === "primary_user" || role === "trustee" || role === "caregiver";

  const approveMutation = useApproveBill();
  const rejectMutation = useRejectBill();
  const markPaidMutation = useMarkBillPaid();
  const deleteMutation = useDeleteBill();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [paidDate, setPaidDate] = useState("");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptMimeType, setReceiptMimeType] = useState<string | null>(null);
  const [receiptFileSize, setReceiptFileSize] = useState<number | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const requiresReceipt = role === "caregiver" || role === "other";

  const isBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    markPaidMutation.isPending ||
    deleteMutation.isPending ||
    uploadingReceipt;

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  const handleApprove = async () => {
    if (!activeId || !billId) return;
    try {
      await approveMutation.mutateAsync({ householdId: activeId, billId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetch();
    } catch (e: unknown) {
      Alert.alert("Error", errMsg(e, "Could not approve bill."));
    }
  };

  const handleReject = async () => {
    if (!activeId || !billId) return;
    try {
      await rejectMutation.mutateAsync({
        householdId: activeId,
        billId,
        data: { reason: rejectReason || "No reason provided" },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowRejectModal(false);
      refetch();
    } catch (e: unknown) {
      Alert.alert("Error", errMsg(e, "Could not reject bill."));
    }
  };

  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo library access to attach a receipt.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingReceipt(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";
      const name = asset.fileName ?? `receipt_${Date.now()}.jpg`;
      const contentType = asset.mimeType ?? "image/jpeg";
      const authToken = await getToken();
      const urlRes = await fetch(`${baseUrl}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ name, size: asset.fileSize ?? 0, contentType }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = (await urlRes.json()) as { uploadURL: string; objectPath: string };

      const imageBlob = await fetch(asset.uri).then((r) => r.blob());
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: imageBlob,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      setReceiptUri(asset.uri);
      setReceiptKey(objectPath);
      setReceiptFileName(name);
      setReceiptMimeType(contentType);
      setReceiptFileSize(asset.fileSize ?? 0);
    } catch (e: unknown) {
      Alert.alert("Upload failed", errMsg(e, "Could not upload receipt. Please try again."));
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!activeId || !billId) return;
    if (requiresReceipt && !receiptKey) {
      Alert.alert("Receipt required", "As a caregiver, you must attach a receipt photo before marking this bill as paid.");
      return;
    }
    try {
      await markPaidMutation.mutateAsync({
        householdId: activeId,
        billId,
        data: {
          paidDate: paidDate || undefined,
          receiptStorageKey: receiptKey ?? undefined,
          receiptFileName: receiptFileName ?? undefined,
          receiptMimeType: receiptMimeType ?? undefined,
          receiptFileSize: receiptFileSize ?? undefined,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowMarkPaidModal(false);
      setReceiptUri(null);
      setReceiptKey(null);
      setReceiptFileName(null);
      setReceiptMimeType(null);
      setReceiptFileSize(null);
      refetch();
    } catch (e: unknown) {
      Alert.alert("Error", errMsg(e, "Could not mark bill as paid."));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Bill",
      "Are you sure you want to delete this bill? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!activeId || !billId) return;
            try {
              await deleteMutation.mutateAsync({ householdId: activeId, billId });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              router.back();
            } catch (e: unknown) {
              Alert.alert("Error", errMsg(e, "Could not delete bill."));
            }
          },
        },
      ]
    );
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    heroCard: {
      margin: 16,
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      alignItems: "center",
    },
    billName: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.3,
      textAlign: "center",
      marginBottom: 8,
    },
    billAmount: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -1,
      marginBottom: 12,
    },
    statusBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statusText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    infoCard: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    actionsCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      gap: 10,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: colors.radius,
      paddingVertical: 15,
      gap: 8,
    },
    actionBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
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
      marginBottom: 16,
    },
    modalInput: {
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
      minHeight: 80,
      textAlignVertical: "top",
    },
    modalPrimaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 4,
    },
    modalDangerBtn: {
      backgroundColor: colors.destructive,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 4,
    },
    modalBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    modalCancelBtn: {
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 8,
    },
    modalCancelText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  if (isLoading) {
    return (
      <View style={[s.container, s.loader]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={[s.container, s.loader]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          Bill not found.
        </Text>
      </View>
    );
  }

  const sColor = statusColor(bill.status, colors);
  const statusLabels: Record<string, string> = {
    approved: "Approved",
    pending_approval: "Pending Approval",
    paid: "Paid",
    rejected: "Rejected",
    overdue: "Overdue",
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <View style={s.heroCard}>
          <Text style={s.billName}>{bill.name}</Text>
          <Text style={s.billAmount}>{formatCurrency(bill.amount ?? 0)}</Text>
          <View style={[s.statusBadge, { backgroundColor: sColor + "22" }]}>
            <Text style={[s.statusText, { color: sColor }]}>
              {statusLabels[bill.status] ?? bill.status}
            </Text>
          </View>
        </View>

        <View style={s.infoCard}>
          <Text style={s.sectionTitle}>Details</Text>
          {bill.dueDate && <InfoRow label="Due Date" value={bill.dueDate} />}
          {bill.category && <InfoRow label="Category" value={bill.category} />}
          {bill.notes && <InfoRow label="Notes" value={bill.notes} />}
          {bill.rejectionReason && (
            <InfoRow label="Rejection Reason" value={bill.rejectionReason} />
          )}
        </View>

        {bill.status === "paid" && (
          <View style={s.infoCard}>
            <Text style={s.sectionTitle}>Receipts</Text>
            {receiptsLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: 12 }}
              />
            ) : !receipts || receipts.length === 0 ? (
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: colors.mutedForeground,
                  paddingVertical: 12,
                }}
              >
                No receipts uploaded for this payment.
              </Text>
            ) : (
              receipts.map((receipt) => {
                const uploader = members?.find(
                  (m: HouseholdMember) => m.userId === receipt.uploadedByUserId
                );
                const uploaderName = uploader
                  ? uploader.user
                    ? [uploader.user.firstName, uploader.user.lastName]
                        .filter(Boolean)
                        .join(" ") || uploader.user.email
                    : (uploader.inviteEmail ?? "Unknown")
                  : "Unknown";
                const downloadUrl = resolveDownloadUrl(receipt.storageKey, receipt.downloadUrl);
                return (
                  <TouchableOpacity
                    key={receipt.id}
                    onPress={async () => {
                      try {
                        await Linking.openURL(downloadUrl);
                      } catch {
                        Alert.alert("Error", "Could not open the receipt. Please try again.");
                      }
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        backgroundColor: colors.primary + "18",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="file-text" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_500Medium",
                          color: colors.foreground,
                        }}
                        numberOfLines={1}
                      >
                        {receipt.fileName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_400Regular",
                          color: colors.mutedForeground,
                          marginTop: 2,
                        }}
                      >
                        {formatDate(receipt.createdAt)} · {uploaderName}
                      </Text>
                    </View>
                    <Feather name="download" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View style={s.actionsCard}>
          <Text style={s.sectionTitle}>Actions</Text>

          {canApprove && bill.status === "pending_approval" && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleApprove}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {approveMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={[s.actionBtnText, { color: "#fff" }]}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canApprove && bill.status === "pending_approval" && (
            <TouchableOpacity
              style={[
                s.actionBtn,
                {
                  backgroundColor: colors.muted,
                  borderWidth: 1,
                  borderColor: colors.destructive,
                },
              ]}
              onPress={() => setShowRejectModal(true)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Feather name="x" size={18} color={colors.destructive} />
              <Text style={[s.actionBtnText, { color: colors.destructive }]}>Reject</Text>
            </TouchableOpacity>
          )}

          {canPay && (bill.status === "due" || bill.status === "overdue" || bill.status === "approved") && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => setShowMarkPaidModal(true)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Feather name="dollar-sign" size={18} color="#fff" />
              <Text style={[s.actionBtnText, { color: "#fff" }]}>Mark Paid</Text>
            </TouchableOpacity>
          )}

          {canDelete && (
            <TouchableOpacity
              style={[
                s.actionBtn,
                {
                  backgroundColor: colors.muted,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleDelete}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator color={colors.destructive} />
              ) : (
                <>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                  <Text style={[s.actionBtnText, { color: colors.destructive }]}>
                    Delete
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowRejectModal(false)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Reject Bill</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Reason for rejection (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[s.modalDangerBtn, rejectMutation.isPending && { opacity: 0.6 }]}
              onPress={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.modalBtnText}>Confirm Rejection</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowRejectModal(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showMarkPaidModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMarkPaidModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowMarkPaidModal(false)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Mark as Paid</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Paid date YYYY-MM-DD (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={paidDate}
              onChangeText={setPaidDate}
            />
            {requiresReceipt && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.warning, marginBottom: 6 }}>
                  Receipt required for caregivers
                </Text>
                {receiptUri ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Image
                      source={{ uri: receiptUri }}
                      style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: colors.border }}
                    />
                    <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }} numberOfLines={2}>
                      {receiptFileName}
                    </Text>
                    <TouchableOpacity onPress={() => { setReceiptUri(null); setReceiptKey(null); setReceiptFileName(null); }}>
                      <Feather name="x" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.muted, borderRadius: colors.radius, padding: 12, opacity: uploadingReceipt ? 0.6 : 1 }}
                    onPress={handlePickReceipt}
                    disabled={uploadingReceipt}
                  >
                    {uploadingReceipt ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Feather name="camera" size={18} color={colors.primary} />
                    )}
                    <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.primary }}>
                      {uploadingReceipt ? "Uploading…" : "Attach Receipt Photo"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity
              style={[s.modalPrimaryBtn, isBusy && { opacity: 0.6 }]}
              onPress={handleMarkPaid}
              disabled={isBusy}
            >
              {markPaidMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.modalBtnText}>Confirm Payment</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setShowMarkPaidModal(false)}
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
