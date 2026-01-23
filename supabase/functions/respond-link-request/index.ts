// supabase/functions/respond-link-request/index.ts
// Edge Function for students to accept/decline parent link requests
// Sends push notification to parent on response
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  console.log("respond-link-request function invoked");
  
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // 1) Validate auth header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("No auth header");
    return json(401, { error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");

  // Client scoped to the caller
  const supabaseUserClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 2) Get caller identity
  const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
  if (userErr || !userData?.user) {
    console.log("User auth failed:", userErr);
    return json(401, { error: "Unauthorized" });
  }
  const studentUserId = userData.user.id;
  console.log("Student user ID:", studentUserId);

  // 3) Parse and validate input
  const { linkId, action } = await req.json().catch(() => ({}));
  if (!linkId || typeof linkId !== "string") {
    console.log("No linkId provided");
    return json(400, { error: "linkId required" });
  }
  if (!action || !["accept", "decline"].includes(action)) {
    console.log("Invalid action:", action);
    return json(400, { error: "action must be 'accept' or 'decline'" });
  }

  console.log(`Processing ${action} for link ${linkId}`);

  // 4) Service-role client for privileged operations
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 5) Verify the link exists and belongs to this student
  const { data: link, error: linkErr } = await admin
    .from("parent_student_links")
    .select("id, parent_user_id, student_user_id, status")
    .eq("id", linkId)
    .maybeSingle();

  if (linkErr) {
    console.log("Link lookup failed:", linkErr);
    return json(500, { error: "Failed to lookup link request" });
  }

  if (!link) {
    console.log("Link not found:", linkId);
    return json(404, { error: "Link request not found" });
  }

  if (link.student_user_id !== studentUserId) {
    console.log("Link does not belong to this student");
    return json(403, { error: "Not authorized to respond to this request" });
  }

  if (link.status !== "pending") {
    console.log("Link is not pending, status:", link.status);
    return json(400, { error: "Link request is not pending" });
  }

  // 6) Update the link status
  const newStatus = action === "accept" ? "accepted" : "declined";
  const { error: updateErr } = await admin
    .from("parent_student_links")
    .update({ 
      status: newStatus,
      responded_at: new Date().toISOString(),
    })
    .eq("id", linkId);

  if (updateErr) {
    console.log("Failed to update link:", updateErr);
    return json(500, { error: "Failed to update link request" });
  }

  console.log(`Link ${linkId} updated to ${newStatus}`);

  // 7) Get student's name for notification
  const { data: studentProfile } = await admin
    .from("profiles")
    .select("full_name, first_name, last_name")
    .eq("user_id", studentUserId)
    .maybeSingle();

  const studentName = studentProfile?.full_name 
    || `${studentProfile?.first_name || ''} ${studentProfile?.last_name || ''}`.trim() 
    || "A student";

  // 8) Send push notification to parent
  console.log("Sending push notification to parent...");
  try {
    const notificationPayload = action === "accept" 
      ? {
          userId: link.parent_user_id,
          title: "Link Request Accepted",
          body: `${studentName} accepted your link request.`,
          deepLink: "/profile/linked-students",
          type: "link_accepted",
        }
      : {
          userId: link.parent_user_id,
          title: "Link Request Declined",
          body: `${studentName} declined your link request.`,
          deepLink: "/(tabs)",
          type: "link_declined",
        };

    const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });
    
    if (!pushResponse.ok) {
      console.log("Push notification failed:", await pushResponse.text());
    } else {
      console.log("Push notification sent successfully");
    }
  } catch (pushErr) {
    console.log("Push notification error (non-fatal):", pushErr);
  }

  console.log("Link response processed successfully!");
  return json(200, { 
    success: true, 
    message: `Link request ${action}ed`,
    status: newStatus,
  });
});
