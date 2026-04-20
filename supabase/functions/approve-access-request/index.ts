// Approves an access request: creates the auth user, sets is_approved=true,
// and returns the temp password to the admin. V2: no tier.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "A").replaceAll("/", "B").replaceAll("=", "")
    .slice(0, 14);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const callerId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: profileRow } = await admin.from("profiles").select("is_admin").eq("id", callerId).maybeSingle();
    if (!profileRow?.is_admin) return json({ error: "forbidden — admin only" }, 403);

    const body = await req.json();
    const { request_id, action } = body as { request_id?: string; action?: string };
    if (!request_id || !["approve", "reject"].includes(action ?? "")) {
      return json({ error: "request_id and action (approve|reject) required" }, 400);
    }

    const { data: reqRow, error: reqErr } = await admin.from("access_requests").select("*").eq("id", request_id).maybeSingle();
    if (reqErr || !reqRow) return json({ error: "request not found" }, 404);
    if (reqRow.status !== "pending") return json({ error: "already reviewed" }, 400);

    if (action === "reject") {
      await admin.from("access_requests").update({ status: "rejected" }).eq("id", request_id);
      return json({ ok: true, action: "rejected" });
    }

    const tempPassword = genTempPassword();
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: reqRow.email, password: tempPassword, email_confirm: true,
      user_metadata: { display_name: reqRow.name },
    });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === reqRow.email.toLowerCase());
        if (!existing) return json({ error: createErr.message }, 400);
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password: tempPassword, email_confirm: true });
      } else return json({ error: createErr.message }, 400);
    } else userId = created.user!.id;

    await admin.from("profiles").upsert({
      id: userId!, display_name: reqRow.name, is_approved: true,
    });

    await admin.from("access_requests").update({ status: "approved", onboard_path: reqRow.onboard_path ?? "standard" }).eq("id", request_id);

    return json({ ok: true, action: "approved", user_id: userId, email: reqRow.email, temp_password: tempPassword });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
