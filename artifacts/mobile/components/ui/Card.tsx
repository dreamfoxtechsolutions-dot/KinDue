import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

type CardProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  onPress?: () => void;
  accent?: "default" | "warning" | "danger" | "success";
  style?: ViewStyle;
};

export function Card({ title, subtitle, children, onPress, accent = "default", style }: CardProps) {
  const c = useColors();
  const stripeColor =
    accent === "warning"
      ? c.accent
      : accent === "danger"
        ? c.destructive
        : accent === "success"
          ? c.primary
          : "transparent";

  const inner = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderRadius: colors.radius,
        },
        style,
      ]}
    >
      {accent !== "default" ? (
        <View
          style={[
            styles.stripe,
            {
              backgroundColor: stripeColor,
              borderTopLeftRadius: colors.radius,
              borderBottomLeftRadius: colors.radius,
            },
          ]}
        />
      ) : null}
      <View style={{ flex: 1, gap: 6 }}>
        {title ? (
          <Text style={[styles.title, { color: c.cardForeground }]}>{title}</Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
    gap: 12,
  },
  stripe: {
    width: 4,
    marginLeft: -16,
    marginVertical: -16,
    marginRight: 12,
  },
  title: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
