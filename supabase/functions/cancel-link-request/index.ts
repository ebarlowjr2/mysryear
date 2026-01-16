// supabase/functions/cancel-link-request/index.ts
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const token = authHeader.replace("Bearer ", "");
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  const parentUserId = userData.user.id;

  const { linkId } = await req.json().catch(() => ({}));
  if (!linkId || typeof linkId !== "string") return json(400, { error: "linkId required" });

  // Confirm caller is a parent
  const { data: parentProfile } = await createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    .from("profiles")
    .select("role")
    .eq("user_id", parentUserId)
    .maybeSingle();

  if (parentProfile?.role !== "parent") return json(403, { error: "Only parent accounts can cancel requests" });

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: link } = await service
    .from("parent_student_links")
    .select("id,parent_user_id,status")
    .eq("id", linkId)
    .maybeSingle();

  if (!link?.id) return json(404, { error: "Request not found" });
  if (link.parent_user_id !== parentUserId) return json(403, { error: "Not allowed" });
  if (link.status !== "pending") return json(409, { error: "Only pending requests can be canceled" });

  const { error: delErr } = await service.from("parent_student_links").delete().eq("id", linkId);
  if (delErr) return json(500, { error: "Failed to cancel request" });

  return json(200, { success: true });
});
