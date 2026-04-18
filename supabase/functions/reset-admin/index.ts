import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "rithwikgopal2@gmail.com";

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

    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!existing) return json({ error: "admin not found" }, 404);

    let customPassword: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.password === "string" && body.password.length >= 8) {
        customPassword = body.password;
      }
    } catch (_) { /* no body */ }

    const password = customPassword ?? genTempPassword();
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });

    // Ensure profile + role intact
    await admin.from("profiles").upsert({
      id: existing.id, display_name: "Rithwik", is_approved: true, is_admin: true,
    });
    const { data: roleRow } = await admin.from("user_roles").select("id").eq("user_id", existing.id).eq("role", "admin").maybeSingle();
    if (!roleRow) await admin.from("user_roles").insert({ user_id: existing.id, role: "admin" });

    return json({ ok: true, email: ADMIN_EMAIL, temp_password: password });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
