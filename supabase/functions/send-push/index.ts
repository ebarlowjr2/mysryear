// supabase/functions/send-push/index.ts
// Reusable Edge Function for sending push notifications
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type PushNotificationInput = {
  userId: string;
  title: string;
  body: string;
  deepLink?: string;
  type: string;
  data?: Record<string, unknown>;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Send push notification to a user's devices via Expo Push API
 */
async function sendExpoPush(tokens: string[], message: Omit<ExpoPushMessage, "to">): Promise<void> {
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    ...message,
    sound: "default",
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("Expo Push API error:", await response.text());
    } else {
      const result = await response.json();
      console.log("Expo Push API response:", JSON.stringify(result));
    }
  } catch (error) {
    console.error("Failed to send push notification:", error);
  }
}

serve(async (req) => {
  console.log("send-push function invoked");

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Validate auth header (only allow service role or authenticated users)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized" });
  }

  // Service-role client for database operations
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Parse input
  let input: PushNotificationInput;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { userId, title, body, deepLink, type, data } = input;

  if (!userId || !title || !body || !type) {
    return json(400, { error: "userId, title, body, and type are required" });
  }

  console.log(`Sending notification to user ${userId}: ${title}`);

  // 1) Check user's notification preferences
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("notify_link_requests, notify_deadlines, notify_parent_updates")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("Failed to fetch profile:", profileErr);
    return json(500, { error: "Failed to fetch user preferences" });
  }

  // Check if user has opted out of this notification type
  if (profile) {
    if (type.includes("link") && profile.notify_link_requests === false) {
      console.log("User has disabled link request notifications");
      return json(200, { success: true, skipped: true, reason: "User opted out" });
    }
    if (type.includes("deadline") && profile.notify_deadlines === false) {
      console.log("User has disabled deadline notifications");
      return json(200, { success: true, skipped: true, reason: "User opted out" });
    }
    if (type.includes("parent") && profile.notify_parent_updates === false) {
      console.log("User has disabled parent update notifications");
      return json(200, { success: true, skipped: true, reason: "User opted out" });
    }
  }

  // 2) Get user's device tokens
  const { data: tokens, error: tokensErr } = await admin
    .from("device_tokens")
    .select("expo_push_token")
    .eq("user_id", userId);

  if (tokensErr) {
    console.error("Failed to fetch device tokens:", tokensErr);
    return json(500, { error: "Failed to fetch device tokens" });
  }

  const pushTokens = tokens?.map((t) => t.expo_push_token) || [];
  console.log(`Found ${pushTokens.length} device tokens for user`);

  // 3) Create in-app notification record
  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    deep_link: deepLink || null,
  });

  if (notifErr) {
    console.error("Failed to create notification record:", notifErr);
    // Continue anyway - push is more important
  }

  // 4) Send push notification if user has device tokens
  if (pushTokens.length > 0) {
    await sendExpoPush(pushTokens, {
      title,
      body,
      data: {
        type,
        deepLink: deepLink || "/",
        ...data,
      },
    });
    console.log("Push notification sent successfully");
  } else {
    console.log("No device tokens found, skipping push");
  }

  return json(200, { success: true, tokenCount: pushTokens.length });
});
