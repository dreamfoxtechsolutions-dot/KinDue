import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

// On iOS 26+ NativeTabs gives us the system liquid-glass tab bar. The system
// styles it for us — we deliberately don't override colours here.
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bills">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Bills</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="subscriptions">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>Subs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="vault">
        <Icon sf={{ default: "lock.shield", selected: "lock.shield.fill" }} />
        <Label>Vault</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon
          sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }}
        />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

type TabConfig = {
  name: string;
  title: string;
  symbol: string;
  feather: keyof typeof Feather.glyphMap;
};

const TABS: TabConfig[] = [
  { name: "index", title: "Home", symbol: "house", feather: "home" },
  { name: "bills", title: "Bills", symbol: "doc.text", feather: "file-text" },
  {
    name: "subscriptions",
    title: "Subs",
    symbol: "creditcard",
    feather: "credit-card",
  },
  { name: "vault", title: "Vault", symbol: "lock.shield", feather: "shield" },
  {
    name: "more",
    title: "More",
    symbol: "ellipsis.circle",
    feather: "more-horizontal",
  },
];

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView
                  name={t.symbol as never}
                  tintColor={color}
                  size={24}
                />
              ) : (
                <Feather name={t.feather} size={22} color={color} />
              ),
          }}
        />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
