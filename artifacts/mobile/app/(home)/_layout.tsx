import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export default function HomeLayout() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="bills/[id]"
        options={{
          headerShown: true,
          headerTitle: "Bill Details",
          headerBackTitle: "Back",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="household/setup"
        options={{
          headerShown: true,
          headerTitle: "Setup Household",
          headerBackTitle: "Back",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
