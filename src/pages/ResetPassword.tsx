import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 8) { toast.error("password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("passwords don't match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    setTimeout(() => nav("/login"), 2000);
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0D0D" }}>
      <p className="text-sm font-mono" style={{ color: "#8A8480" }}>
        waiting for reset link… if nothing happens,{" "}
        <button onClick={() => nav("/forgot-password")} className="underline hover:text-primary">request a new one</button>.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0D" }}>
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-xl font-medium mb-2" style={{ color: "#F5F0EB" }}>password updated</h1>
            <p className="text-sm" style={{ color: "#8A8480" }}>redirecting to login…</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB" }}>set new password</h1>
            <p className="text-sm mb-6" style={{ color: "#8A8480" }}>choose something you'll remember.</p>
            <div className="space-y-3">
              <input value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="new password" type="password"
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="confirm password" type="password"
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
              <Button className="w-full mt-1" onClick={submit} disabled={busy}>
                {busy ? "updating…" : "update password"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
