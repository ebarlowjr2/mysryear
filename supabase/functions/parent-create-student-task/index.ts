// supabase/functions/parent-create-student-task/index.ts
// Allows a parent to create a task directly for a linked student without loosening RLS
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

// Helper to get current month bucket
function getCurrentMonth(): string {
  const month = new Date().getMonth();
  if (month >= 7 && month <= 8) return "Aug-Sep";
  if (month === 9) return "Oct";
  if (month >= 10 && month <= 11) return "Nov-Dec";
  if (month >= 0 && month <= 2) return "Jan-Mar";
  if (month >= 3 && month <= 4) return "Apr-May";
  return "Summer";
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // 1) Validate auth header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");

  // Client scoped to the caller
  const supabaseUserClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 2) Get caller identity
  const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  const parentUserId = userData.user.id;

  // 3) Parse and validate input
  const body = await req.json().catch(() => ({}));
  const { studentUserId, title, due_date, notes, category } = body;

  if (!studentUserId || typeof studentUserId !== "string") {
    return json(400, { error: "studentUserId required" });
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return json(400, { error: "title required" });
  }

  // 4) Service-role client for privileged operations
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 5) Confirm caller is a parent
  const { data: parentProfile, error: parentProfileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", parentUserId)
    .maybeSingle();

  if (parentProfileErr) return json(500, { error: "Profile lookup failed" });
  if (parentProfile?.role !== "parent") {
    return json(403, { error: "Only parent accounts can assign tasks to students" });
  }

  // 6) Verify accepted link exists between parent and student
  const { data: link, error: linkErr } = await admin
    .from("parent_student_links")
    .select("id")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .eq("status", "accepted")
    .maybeSingle();

  if (linkErr) return json(500, { error: "Link verification failed" });
  if (!link) {
    return json(403, { error: "No accepted link to this student" });
  }

  // 7) Insert task for student
  const { data: task, error: insertErr } = await admin
    .from("user_tasks")
    .insert({
      user_id: studentUserId,
      title: title.trim(),
      due_date: due_date || null,
      notes: notes ? `${notes}\n\n[Assigned by Parent]` : "[Assigned by Parent]",
      category: category || "Admin/Other",
      status: "todo",
      month: getCurrentMonth(),
      pinned: false,
      assigned_by_user_id: parentUserId,
      assigned_by_role: "parent",
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("Task insert error:", insertErr);
    // If assigned_by columns don't exist, try without them
    if (insertErr.message?.includes("assigned_by")) {
      const { data: taskRetry, error: retryErr } = await admin
        .from("user_tasks")
        .insert({
          user_id: studentUserId,
          title: title.trim(),
          due_date: due_date || null,
          notes: notes ? `${notes}\n\n[Assigned by Parent]` : "[Assigned by Parent]",
          category: category || "Admin/Other",
          status: "todo",
          month: getCurrentMonth(),
          pinned: false,
        })
        .select("id")
        .single();

      if (retryErr) {
        return json(500, { error: "Failed to create task" });
      }
      return json(200, { success: true, taskId: taskRetry.id });
    }
    return json(500, { error: "Failed to create task" });
  }

  return json(200, { success: true, taskId: task.id });
});
