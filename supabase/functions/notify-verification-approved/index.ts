// supabase/functions/notify-verification-approved/index.ts
// Edge Function to notify a user when their account verification is approved
// Called manually by admin when approving teacher/business verification requests
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type VerificationApprovedInput = {
  userId: string;
  role: "teacher" | "business";
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
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
  console.log("notify-verification-approved function invoked");

  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Validate auth header (only allow service role or authenticated admin)
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
  let input: VerificationApprovedInput;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { userId, role } = input;

  if (!userId || !role) {
    return json(400, { error: "userId and role are required" });
  }

  if (!["teacher", "business"].includes(role)) {
    return json(400, { error: "role must be 'teacher' or 'business'" });
  }

  console.log(`Sending verification approved notification to user ${userId} (${role})`);

  // Get user's profile to personalize the message
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("Failed to fetch profile:", profileErr);
  }

  const userName = profile?.first_name || "User";
  const roleLabel = role === "teacher" ? "Teacher" : "Business";

  // Notification content
  const title = "Account Verified!";
  const body = `Congratulations ${userName}! Your ${roleLabel} account has been verified. You now have access to all ${roleLabel.toLowerCase()} features.`;
  const deepLink = "/profile";
  const type = "verification_approved";

  // 1) Get user's device tokens
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

  // 2) Create in-app notification record (always, even if no push tokens)
  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    deep_link: deepLink,
  });

  if (notifErr) {
    console.error("Failed to create notification record:", notifErr);
    // Continue anyway - push is more important
  }

  // 3) Send push notification if user has device tokens
  if (pushTokens.length > 0) {
    await sendExpoPush(pushTokens, {
      title,
      body,
      data: {
        type,
        deepLink,
        role,
      },
    });
    console.log("Push notification sent successfully");
  } else {
    console.log("No device tokens found, skipping push (inbox item created)");
  }

  return json(200, { 
    success: true, 
    tokenCount: pushTokens.length,
    message: `Verification approved notification sent to ${userName}`,
  });
});
