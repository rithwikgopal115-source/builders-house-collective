// Update the seed-admin function to drop tier, just sets profile + admin role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "rithwikgopal2@gmail.com";
const ADMIN_NAME = "Rithwik";

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
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { count } = await admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) return json({ ok: false, message: "admin already seeded" }, 409);

    const tempPassword = genTempPassword();
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL, password: tempPassword, email_confirm: true,
      user_metadata: { display_name: ADMIN_NAME },
    });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
        if (!existing) return json({ error: createErr.message }, 400);
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password: tempPassword, email_confirm: true });
      } else return json({ error: createErr.message }, 400);
    } else userId = created.user!.id;

    await admin.from("profiles").upsert({
      id: userId!, display_name: ADMIN_NAME, is_approved: true, is_admin: true,
    });

    await admin.from("user_roles").insert({ user_id: userId, role: "admin" });

    return json({ ok: true, email: ADMIN_EMAIL, temp_password: tempPassword });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
