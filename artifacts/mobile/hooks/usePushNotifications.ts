import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import {
  useRegisterPushToken,
  useUnregisterPushToken,
} from "@workspace/api-client-react";

export type PushStatus =
  | "idle"
  | "web_unsupported"
  | "permission_denied"
  | "no_project_id"
  | "expo_go_unsupported"
  | "registering"
  | "registered"
  | "error";

export type PushDiagnostics = {
  status: PushStatus;
  reason: string | null;
  token: string | null;
};

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

let coldStartHandled = false;

const isExpoGo = Constants.appOwnership === "expo";

export function usePushNotifications(): PushDiagnostics {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const [diagnostics, setDiagnostics] = useState<PushDiagnostics>({
    status: "idle",
    reason: null,
    token: null,
  });

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

      if (Platform.OS === "web") {
        const reason = "Push notifications are not supported on web.";
        console.warn(`[push] ${reason}`);
        if (mounted) setDiagnostics({ status: "web_unsupported", reason, token: null });
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        const reason = "Notification permission was denied. Enable it in your device settings.";
        console.warn(`[push] ${reason}`);
        if (mounted) setDiagnostics({ status: "permission_denied", reason, token: null });
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        const reason =
          "No EAS project ID configured (missing eas.json / app.json extra.eas.projectId). Push tokens cannot be issued in this build.";
        console.warn(`[push] ${reason}`);
        if (mounted) setDiagnostics({ status: "no_project_id", reason, token: null });
        return;
      }

      if (isExpoGo) {
        const reason =
          "Expo Go (SDK 53+) no longer supports remote push notifications. Use a development build to test push.";
        console.warn(`[push] ${reason}`);
        if (mounted) setDiagnostics({ status: "expo_go_unsupported", reason, token: null });
        return;
      }

      if (mounted) setDiagnostics((d) => ({ ...d, status: "registering", reason: null }));

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
        if (mounted) {
          setDiagnostics({ status: "registered", reason: null, token: tokenData.data });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn("[push] Could not get or register push token:", reason);
        if (mounted) setDiagnostics({ status: "error", reason, token: null });
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

    if (!coldStartHandled) {
      coldStartHandled = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          Notifications.clearLastNotificationResponseAsync().catch(() => {
            console.warn("[push] Failed to clear last notification response");
          });
          if (!mounted || !response) return;
          const data = response.notification.request.content.data as Record<string, unknown>;
          console.log("[push] Cold-start notification tapped, data:", data);
          const billId = data?.billId;
          if (billId !== undefined && billId !== null) {
            router.push(`/(home)/bills/${String(billId)}` as Parameters<typeof router.push>[0]);
          }
        })
        .catch(() => {
          console.warn("[push] Failed to read last notification response");
        });
    }

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isSignedIn, registerToken, unregisterToken, router]);

  return diagnostics;
}
