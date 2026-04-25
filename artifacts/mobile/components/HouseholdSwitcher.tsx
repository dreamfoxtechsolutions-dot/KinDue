import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import {
  useListHouseholds,
  getListHouseholdsQueryKey,
} from "@workspace/api-client-react";

export function HouseholdSwitcher({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { householdId, setHouseholdId } = useHouseholdStore();
  const { data: households, isLoading } = useListHouseholds({
    query: { queryKey: getListHouseholdsQueryKey() },
  });

  const activeId = householdId ?? households?.[0]?.id ?? null;

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: insets.bottom + 16,
      maxHeight: "80%",
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },
    title: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    iconWrap: {
      width: 36,
      height: 36,
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
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 68,
    },
    createRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    createIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.primary + "55",
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    createText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    cancelBtn: {
      paddingVertical: 14,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.title}>Switch Household</Text>

            {isLoading ? (
              <View style={{ padding: 20 }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <ScrollView>
                {(households ?? []).map((h, idx) => {
                  const isActive = h.id === activeId;
                  return (
                    <React.Fragment key={h.id}>
                      {idx > 0 && <View style={s.separator} />}
                      <TouchableOpacity
                        style={s.row}
                        activeOpacity={0.7}
                        onPress={() => {
                          setHouseholdId(h.id);
                          onClose();
                        }}
                      >
                        <View style={s.iconWrap}>
                          <Feather name="home" size={18} color={colors.primary} />
                        </View>
                        <Text style={s.name} numberOfLines={1}>
                          {h.name}
                        </Text>
                        {isActive && (
                          <Feather name="check" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}

                <TouchableOpacity
                  style={s.createRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    router.push("/(home)/household/setup");
                  }}
                >
                  <View style={s.createIcon}>
                    <Feather name="plus" size={18} color={colors.primary} />
                  </View>
                  <Text style={s.createText}>Create New Household</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
