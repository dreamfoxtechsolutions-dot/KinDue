import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import {
  useRegisterPushToken,
  useUnregisterPushToken,
} from "@workspace/api-client-react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const { mutateAsync: registerToken } = useRegisterPushToken();
  const { mutateAsync: unregisterToken } = useUnregisterPushToken();

  useEffect(() => {
    if (!isSignedIn) {
      if (tokenRef.current) {
        const t = tokenRef.current;
        tokenRef.current = null;
        unregisterToken({ token: t }).catch(() => {
          console.warn("[push] Failed to unregister push token");
        });
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
        const platform = (["ios", "android", "web"] as const).includes(
          Platform.OS as "ios" | "android" | "web"
        )
          ? (Platform.OS as "ios" | "android" | "web")
          : "ios";
        await registerToken({ data: { token: tokenData.data, platform } });
      } catch (err) {
        console.log("[push] Could not get or register push token:", err);
      }
    })();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title ?? "KinDue";
        const body = notification.request.content.body ?? "";
        console.log(`[push] Notification received: ${title} — ${body}`);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        console.log("[push] Notification tapped, data:", data);
        const billId = data?.billId;
        if (billId !== undefined && billId !== null) {
          router.push(`/(home)/bills/${String(billId)}` as Parameters<typeof router.push>[0]);
        }
      }
    );

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isSignedIn, registerToken, unregisterToken, router]);
}
