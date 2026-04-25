import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  const c = useColors();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: c.foreground }]}>{title}</Text>
      {message ? (
        <Text style={[styles.msg, { color: c.mutedForeground }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  msg: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
});
