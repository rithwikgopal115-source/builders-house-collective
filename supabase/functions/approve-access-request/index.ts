// Approves an access request: creates the auth user with a temp password,
// auto-confirms email, sets profile is_approved + tier from the request,
// and returns the temp password to the admin to share with the new member.
//
// SECURITY: Caller must be authenticated AND have role='admin'.
// Uses service role key only after that check.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genTempPassword(): string {
  // 14 char base64url, plenty of entropy, easy to read
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "A")
    .replaceAll("/", "B")
    .replaceAll("=", "")
    .slice(0, 14);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "forbidden — admin only" }, 403);

    // Parse body
    const body = await req.json();
    const { request_id, action } = body as { request_id?: string; action?: string };
    if (!request_id || !["approve", "reject"].includes(action ?? "")) {
      return json({ error: "request_id and action (approve|reject) required" }, 400);
    }

    const { data: reqRow, error: reqErr } = await admin
      .from("access_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr || !reqRow) return json({ error: "request not found" }, 404);
    if (reqRow.status !== "pending") return json({ error: "already reviewed" }, 400);

    if (action === "reject") {
      await admin
        .from("access_requests")
        .update({ status: "rejected", reviewed_by: callerId, reviewed_at: new Date().toISOString() })
        .eq("id", request_id);
      return json({ ok: true, action: "rejected" });
    }

    // APPROVE
    const tempPassword = genTempPassword();

    // Create the auth user (or find existing)
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: reqRow.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: reqRow.name },
    });

    if (createErr) {
      // If already exists, fetch via list
      if (createErr.message?.toLowerCase().includes("already")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === reqRow.email.toLowerCase());
        if (!existing) return json({ error: createErr.message }, 400);
        userId = existing.id;
      } else {
        return json({ error: createErr.message }, 400);
      }
    } else {
      userId = created.user!.id;
    }

    // Upsert profile (handle_new_user trigger created the row; we update it)
    await admin
      .from("profiles")
      .update({
        display_name: reqRow.name,
        tier: reqRow.requested_tier,
        is_approved: true,
      })
      .eq("id", userId!);

    await admin
      .from("access_requests")
      .update({ status: "approved", reviewed_by: callerId, reviewed_at: new Date().toISOString() })
      .eq("id", request_id);

    return json({
      ok: true,
      action: "approved",
      user_id: userId,
      email: reqRow.email,
      temp_password: tempPassword,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
