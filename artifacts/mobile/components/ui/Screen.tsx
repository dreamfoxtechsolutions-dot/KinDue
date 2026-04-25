import React, { type ReactElement, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle;
  /** Skip top inset (e.g. when used inside a screen that already has a header). */
  edgeToEdge?: boolean;
};

export function Screen({
  children,
  scroll = true,
  refreshControl,
  contentStyle,
  edgeToEdge,
}: ScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const paddingTop = edgeToEdge ? 0 : insets.top + 8;
  const paddingBottom = insets.bottom + 96;

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.content,
          { paddingTop, paddingBottom },
          contentStyle,
        ]}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop, paddingBottom },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, gap: 16 },
  content: { paddingHorizontal: 20, gap: 16 },
});
