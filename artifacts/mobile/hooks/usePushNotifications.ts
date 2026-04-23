import { useEffect, useRef } from "react";
import { Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@clerk/expo";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerPushToken(token: string, getToken: () => Promise<string | null>) {
  const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";
  const authToken = await getToken();
  if (!authToken) return;
  try {
    await fetch(`${baseUrl}/api/me/push-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    console.warn("[push] Failed to register push token");
  }
}

async function unregisterPushToken(token: string, getToken: () => Promise<string | null>) {
  const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";
  const authToken = await getToken();
  if (!authToken) return;
  try {
    await fetch(`${baseUrl}/api/me/push-tokens/${encodeURIComponent(token)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch {
    console.warn("[push] Failed to unregister push token");
  }
}

async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "KinDue Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4f46e5",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      bypassDnd: false,
    });
  }
}

export function usePushNotifications() {
  const { isSignedIn, getToken } = useAuth();
  const tokenRef = useRef<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      if (tokenRef.current && getToken) {
        const t = tokenRef.current;
        tokenRef.current = null;
        unregisterPushToken(t, getToken).catch(() => {});
      }
      return;
    }

    let mounted = true;

    (async () => {
      await setupAndroidChannel();

      if (Platform.OS === "web") return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[push] Permission not granted for notifications");
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.log("[push] No EAS project ID — skipping push token fetch (dev mode)");
        return;
      }

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!mounted) return;
        tokenRef.current = tokenData.data;
        await registerPushToken(tokenData.data, getToken);
      } catch (err) {
        console.log("[push] Could not get push token:", err);
      }
    })();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[push] Notification received:", notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        console.log("[push] Notification tapped, data:", data);
      }
    );

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isSignedIn, getToken]);
}
