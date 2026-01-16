// supabase/functions/link-student/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // 1) Validate auth header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");

  // Client scoped to the caller (to read auth user + enforce RLS reads where needed)
  const supabaseUserClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 2) Get caller identity
  const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  const parentUserId = userData.user.id;

  // 3) Parse and validate input
  const { studentEmail } = await req.json().catch(() => ({}));
  if (!studentEmail || typeof studentEmail !== "string") return json(400, { error: "studentEmail required" });

  const email = studentEmail.trim().toLowerCase();
  if (!email.includes("@")) return json(400, { error: "Invalid email" });

  // 4) Service-role client for privileged lookup
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 5) Confirm caller is a parent
  const { data: parentProfile, error: parentProfileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", parentUserId)
    .maybeSingle();

  if (parentProfileErr) return json(500, { error: "Profile lookup failed" });
  if (parentProfile?.role !== "parent") return json(403, { error: "Only parent accounts can link students" });

  // 6) Look up student by email (privileged)
  const { data: userByEmail, error: userByEmailErr } = await admin.auth.admin.getUserByEmail(email);
  if (userByEmailErr || !userByEmail?.user) {
    // privacy-friendly message (avoids confirming whether email exists)
    return json(404, { error: "Student account not found" });
  }
  const studentUserId = userByEmail.user.id;

  // 7) Verify target role=student
  const { data: studentProfile, error: studentProfileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", studentUserId)
    .maybeSingle();

  if (studentProfileErr) return json(500, { error: "Student profile lookup failed" });
  if (studentProfile?.role !== "student") return json(404, { error: "Student account not found" });

  // 8) Prevent duplicates
  const { data: existing } = await admin
    .from("parent_student_links")
    .select("id,status")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .maybeSingle();

  if (existing?.id && existing.status !== "declined") {
    return json(409, { error: "Link already exists or is pending" });
  }

  // 9) Insert pending link request
  const { error: insertErr } = await admin.from("parent_student_links").insert({
    parent_user_id: parentUserId,
    student_user_id: studentUserId,
    status: "pending",
    requested_by: "parent",
  });

  if (insertErr) return json(500, { error: "Failed to create link request" });

  return json(200, { success: true, message: "Link request sent" });
});
