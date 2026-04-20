import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replaceAll("+", "A").replaceAll("/", "B").replaceAll("=", "").slice(0, 14);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const body = (await req.json()) as {
      name?: string; email?: string; what_building?: string;
    };
    const { name, email, what_building } = body;

    // Always yolo for public calls — no admin check needed
    const { data: settings } = await admin
      .from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle();
    if (!settings?.auto_yolo_enabled) return json({ error: "auto yolo is not enabled" }, 403);

    const req_name = name?.trim();
    const req_email = email?.trim().toLowerCase();
    const req_building = what_building?.trim() || "building something";

    if (!req_name || !req_email) return json({ error: "name and email required" }, 400);

    // Upsert access_request — handles duplicate emails gracefully
    const { data: existingReq } = await admin
      .from("access_requests").select("id").eq("email", req_email).maybeSingle();

    let reqId = existingReq?.id;

    if (!reqId) {
      const { data: newReq, error: reqErr } = await admin.from("access_requests").insert({
        name: req_name, email: req_email, what_building: req_building,
        requested_tier: "learner", cool_person_response: true,
        onboard_path: "yolo", status: "approved",
      } as any).select("id").maybeSingle();
      if (reqErr) return json({ error: reqErr.message }, 400);
      reqId = newReq?.id;
    } else {
      await admin.from("access_requests")
        .update({ status: "approved", onboard_path: "yolo" }).eq("id", reqId);
    }

    const password = genTempPassword();
    let userId: string;

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
      } else {
        return json({ error: createErr.message }, 400);
      }
    } else {
      userId = created.user!.id;
    }

    await admin.from("profiles").upsert({ id: userId!, display_name: req_name, is_approved: true });

    return json({ ok: true, user_id: userId, email: req_email, password });
  } catch (e) {
    console.error("crash:", String(e));
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
