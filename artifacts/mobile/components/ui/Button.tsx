import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: Props) {
  const c = useColors();
  const palette = (() => {
    switch (variant) {
      case "secondary":
        return { bg: c.secondary, fg: c.secondaryForeground, border: c.border };
      case "ghost":
        return { bg: "transparent", fg: c.primary, border: "transparent" };
      case "danger":
        return { bg: c.destructive, fg: c.destructiveForeground, border: c.destructive };
      default:
        return { bg: c.primary, fg: c.primaryForeground, border: c.primary };
    }
  })();

  const isDisabled = !!(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: colors.radius,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <Text style={[styles.label, { color: palette.fg }]}>{children}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1 },
  row: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  label: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
