// supabase/functions/parent-student-summary/index.ts
// Returns a summary dashboard payload for a parent's selected linked student
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

  // Client scoped to the caller
  const supabaseUserClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 2) Get caller identity
  const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  const parentUserId = userData.user.id;

  // 3) Parse and validate input
  const { studentUserId } = await req.json().catch(() => ({}));
  if (!studentUserId || typeof studentUserId !== "string") {
    return json(400, { error: "studentUserId required" });
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
    return json(403, { error: "Only parent accounts can access student summaries" });
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

  // 7) Fetch student profile
  const { data: studentProfile, error: studentProfileErr } = await admin
    .from("profiles")
    .select("user_id, full_name, first_name, last_name, graduation_year, school")
    .eq("user_id", studentUserId)
    .maybeSingle();

  if (studentProfileErr || !studentProfile) {
    return json(404, { error: "Student profile not found" });
  }

  // 8) Fetch student tasks
  const { data: tasks, error: tasksErr } = await admin
    .from("user_tasks")
    .select("id, title, due_date, status, category")
    .eq("user_id", studentUserId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (tasksErr) {
    console.error("Tasks fetch error:", tasksErr);
  }
  const allTasks = tasks || [];

  // 9) Fetch student applications
  const { data: applications, error: appsErr } = await admin
    .from("applications")
    .select("id, college_name, deadline, status, application_type")
    .eq("user_id", studentUserId)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (appsErr) {
    console.error("Applications fetch error:", appsErr);
  }
  const allApplications = applications || [];

  // 10) Fetch saved scholarships count
  const { count: savedScholarshipsCount, error: scholarshipsErr } = await admin
    .from("saved_scholarships")
    .select("id", { count: "exact", head: true })
    .eq("user_id", studentUserId);

  if (scholarshipsErr) {
    console.error("Scholarships fetch error:", scholarshipsErr);
  }

  // 11) Compute metrics
  const today = new Date().toISOString().split("T")[0];
  
  const tasksCompleted = allTasks.filter((t) => t.status === "done").length;
  const tasksPending = allTasks.filter((t) => t.status !== "done").length;
  
  const pendingTasks = allTasks.filter((t) => t.status !== "done");
  const tasksDueSoon = pendingTasks
    .filter((t) => t.due_date && t.due_date >= today)
    .slice(0, 5);
  
  const nextTaskDue = tasksDueSoon[0] || null;

  const activeApplications = allApplications.filter(
    (a) => !["accepted", "rejected"].includes(a.status)
  );
  const applicationsUpcoming = activeApplications
    .filter((a) => a.deadline && a.deadline >= today)
    .slice(0, 5);
  
  const nextApplicationDeadline = applicationsUpcoming[0] || null;

  // 12) Build response
  const response = {
    student: {
      id: studentProfile.user_id,
      first_name: studentProfile.first_name,
      last_name: studentProfile.last_name,
      full_name: studentProfile.full_name,
      graduation_year: studentProfile.graduation_year,
      school_name: studentProfile.school,
    },
    metrics: {
      tasks_total: allTasks.length,
      tasks_completed: tasksCompleted,
      tasks_pending: tasksPending,
      applications_total: allApplications.length,
      saved_scholarships_total: savedScholarshipsCount || 0,
      next_task_due: nextTaskDue
        ? { id: nextTaskDue.id, title: nextTaskDue.title, due_date: nextTaskDue.due_date }
        : null,
      next_application_deadline: nextApplicationDeadline
        ? {
            id: nextApplicationDeadline.id,
            college_name: nextApplicationDeadline.college_name,
            deadline: nextApplicationDeadline.deadline,
          }
        : null,
    },
    previews: {
      tasks_due_soon: tasksDueSoon.map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        category: t.category,
      })),
      applications_upcoming: applicationsUpcoming.map((a) => ({
        id: a.id,
        college_name: a.college_name,
        deadline: a.deadline,
        status: a.status,
      })),
    },
  };

  return json(200, response);
});
