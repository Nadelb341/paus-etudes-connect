import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BNcZOsiXX15afLFeaV4ZS27i2cBzL5fY2XGfIR_T0QKdi3f4u9E085iD7C1OxEt0HJbbSjz8Dtpm4te6F2X6BYs";

export const requestNotificationPermission = async (): Promise<NotificationPermission | "unsupported"> => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
};

export const subscribeToPush = async (userId: string) => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
  const json = subscription.toJSON();
  await supabase.from("push_subscriptions" as any).upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys!.p256dh,
    auth_key: json.keys!.auth,
  }, { onConflict: "user_id,endpoint" });
  return subscription;
};

export const unsubscribeFromPush = async (userId: string) => {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from("push_subscriptions" as any).delete().eq("user_id", userId).eq("endpoint", endpoint);
  }
};

export const getPushSubscriptionStatus = async (): Promise<"subscribed" | "not-subscribed" | "unsupported"> => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "subscribed" : "not-subscribed";
};
