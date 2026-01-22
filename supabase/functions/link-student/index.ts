// supabase/functions/link-student/index.ts
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
  console.log("link-student function invoked");
  
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // 1) Validate auth header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("No auth header");
    return json(401, { error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");

  // Client scoped to the caller (to read auth user + enforce RLS reads where needed)
  const supabaseUserClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 2) Get caller identity
  const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
  if (userErr || !userData?.user) {
    console.log("User auth failed:", userErr);
    return json(401, { error: "Unauthorized" });
  }
  const parentUserId = userData.user.id;
  console.log("Parent user ID:", parentUserId);

  // 3) Parse and validate input
  const { studentEmail } = await req.json().catch(() => ({}));
  if (!studentEmail || typeof studentEmail !== "string") {
    console.log("No student email provided");
    return json(400, { error: "studentEmail required" });
  }

  const email = studentEmail.trim().toLowerCase();
  console.log("Looking up student email:", email);
  if (!email.includes("@")) return json(400, { error: "Invalid email" });

  // 4) Service-role client for privileged lookup (with auth config for admin methods)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 5) Confirm caller is a parent
  const { data: parentProfile, error: parentProfileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", parentUserId)
    .maybeSingle();

  console.log("Parent profile:", parentProfile, "Error:", parentProfileErr);
  if (parentProfileErr) return json(500, { error: "Profile lookup failed" });
  if (parentProfile?.role !== "parent") {
    console.log("User is not a parent, role:", parentProfile?.role);
    return json(403, { error: "Only parent accounts can link students" });
  }

  // 6) Look up student by email using Supabase Admin API via REST
  const adminApiUrl = `${SUPABASE_URL}/auth/v1/admin/users`;
  console.log("Calling admin API:", adminApiUrl);
  
  const authResponse = await fetch(adminApiUrl, {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
  });

  console.log("Admin API response status:", authResponse.status);
  if (!authResponse.ok) {
    const errorText = await authResponse.text();
    console.log("Admin API error:", errorText);
    return json(500, { error: "Failed to lookup users" });
  }

  const authData = await authResponse.json();
  console.log("Admin API returned", Array.isArray(authData.users) ? authData.users.length : "unknown", "users");
  
  const users = authData.users || authData;
  const matchedUser = Array.isArray(users) ? users.find((u: { email: string }) => u.email?.toLowerCase() === email) : null;

  if (!matchedUser) {
    console.log("No user found with email:", email);
    return json(404, { error: "Student account not found" });
  }
  const studentUserId = matchedUser.id;
  console.log("Found student user ID:", studentUserId);

  // 7) Verify target role=student
  console.log("Looking up student profile for user_id:", studentUserId);
  const { data: studentProfile, error: studentProfileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", studentUserId)
    .maybeSingle();

  console.log("Student profile:", studentProfile, "Error:", studentProfileErr);
  if (studentProfileErr) {
    console.log("Student profile lookup failed:", studentProfileErr);
    return json(500, { error: "Student profile lookup failed" });
  }
  if (studentProfile?.role !== "student") {
    console.log("User is not a student, role:", studentProfile?.role);
    return json(404, { error: "Student account not found" });
  }

  // 8) Prevent duplicates
  console.log("Checking for existing link...");
  const { data: existing, error: existingErr } = await admin
    .from("parent_student_links")
    .select("id,status")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .maybeSingle();

  console.log("Existing link:", existing, "Error:", existingErr);
  if (existing?.id && existing.status !== "declined") {
    console.log("Link already exists with status:", existing.status);
    return json(409, { error: "Link already exists or is pending" });
  }

  // 9) Insert pending link request
  console.log("Inserting new link request...");
  const { error: insertErr } = await admin.from("parent_student_links").insert({
    parent_user_id: parentUserId,
    student_user_id: studentUserId,
    status: "pending",
    requested_by: "parent",
  });

  if (insertErr) {
    console.log("Insert failed:", insertErr);
    return json(500, { error: "Failed to create link request" });
  }

  // 10) Get parent's name for notification
  const { data: parentFullProfile } = await admin
    .from("profiles")
    .select("full_name, first_name, last_name")
    .eq("user_id", parentUserId)
    .maybeSingle();

  const parentName = parentFullProfile?.full_name 
    || `${parentFullProfile?.first_name || ''} ${parentFullProfile?.last_name || ''}`.trim() 
    || "A parent";

  // 11) Send push notification to student
  console.log("Sending push notification to student...");
  try {
    const pushResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: studentUserId,
        title: "New Parent Link Request",
        body: `${parentName} wants to link to your account.`,
        deepLink: "/parent/requests",
        type: "link_request",
      }),
    });
    
    if (!pushResponse.ok) {
      console.log("Push notification failed:", await pushResponse.text());
    } else {
      console.log("Push notification sent successfully");
    }
  } catch (pushErr) {
    console.log("Push notification error (non-fatal):", pushErr);
  }

  console.log("Link request created successfully!");
  return json(200, { success: true, message: "Link request sent" });
});
