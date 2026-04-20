// V2 instant onboard. Two modes:
//  1. Public auto-yolo (no auth required): create access_request + user + approve, return password to caller.
//     Only allowed when admin_settings.auto_yolo_enabled = true.
//  2. Admin manual yolo (auth required, admin only): same flow but path = manual_yolo, no toggle check.
//
// In both cases the user is created as approved Builder and a temp password is returned.

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const body = await req.json();
    const { request_id, name, email, what_building, manual } = body as {
      request_id?: string; name?: string; email?: string; what_building?: string; manual?: boolean;
    };

    let callerIsAdmin = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await callerClient.auth.getUser();
      if (u?.user) {
        const { data: pRow } = await admin.from("profiles").select("is_admin").eq("id", u.user.id).maybeSingle();
        callerIsAdmin = !!pRow?.is_admin;
      }
    }

    // Determine onboard path
    let onboardPath: "yolo" | "manual_yolo" = callerIsAdmin && manual ? "manual_yolo" : "yolo";

    // For public yolo, verify admin_settings allows it
    if (onboardPath === "yolo") {
      const { data: settings } = await admin.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle();
      if (!settings?.auto_yolo_enabled) return json({ error: "auto yolo is not enabled" }, 403);
    }

    // Resolve request fields
    let req_name = name?.trim();
    let req_email = email?.trim().toLowerCase();
    let req_building = what_building?.trim();
    let reqId = request_id;

    if (request_id) {
      const { data: existing } = await admin.from("access_requests").select("*").eq("id", request_id).maybeSingle();
      if (!existing) return json({ error: "request not found" }, 404);
      req_name = existing.name; req_email = existing.email; req_building = existing.what_building;
    }

    if (!req_name || !req_email) return json({ error: "name and email required" }, 400);

    // If no request, create one
    if (!reqId) {
      const { data: newReq, error: reqErr } = await admin.from("access_requests").insert({
        name: req_name, email: req_email, what_building: req_building,
        cool_person_response: onboardPath === "yolo" ? true : null,
        onboard_path: onboardPath, status: "approved",
      }).select("id").maybeSingle();
      if (reqErr) return json({ error: reqErr.message }, 400);
      reqId = newReq?.id;
    } else {
      await admin.from("access_requests").update({ status: "approved", onboard_path: onboardPath }).eq("id", reqId);
    }

    const password = genTempPassword();

    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: req_email, password, email_confirm: true,
      user_metadata: { display_name: req_name },
    });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === req_email);
        if (!existing) return json({ error: createErr.message }, 400);
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else return json({ error: createErr.message }, 400);
    } else userId = created.user!.id;

    await admin.from("profiles").upsert({
      id: userId!, display_name: req_name, is_approved: true,
    });

    return json({ ok: true, user_id: userId, email: req_email, password, onboard_path: onboardPath });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
