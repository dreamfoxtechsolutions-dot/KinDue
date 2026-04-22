import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useHouseholdStore } from "@/context/householdStore";
import { useCreateHousehold } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";

export default function HouseholdSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setHouseholdId } = useHouseholdStore();
  const createHousehold = useCreateHousehold();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a household name.");
      return;
    }
    try {
      const hh = await createHousehold.mutateAsync({
        data: { name: name.trim(), address: address.trim() || undefined },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHouseholdId(hh.id);
      router.replace("/(home)/(tabs)" as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create household.");
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1 },
    inner: {
      paddingTop: 24,
      paddingHorizontal: 24,
      paddingBottom: bottomPad,
    },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 32,
      lineHeight: 22,
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
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
      marginBottom: 20,
    },
    createBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 8,
    },
    createBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <View style={s.heroIcon}>
            <Feather name="home" size={32} color={colors.primary} />
          </View>
          <Text style={s.title}>Create Your Household</Text>
          <Text style={s.subtitle}>
            Give your household a name so family members and caregivers know where they belong.
          </Text>

          <Text style={s.label}>Household Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. The Smith Family"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={s.label}>Address (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="123 Main St"
            placeholderTextColor={colors.mutedForeground}
            value={address}
            onChangeText={setAddress}
          />

          <TouchableOpacity
            style={[s.createBtn, createHousehold.isPending && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={createHousehold.isPending}
            activeOpacity={0.8}
          >
            {createHousehold.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={s.createBtnText}>Create Household</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
