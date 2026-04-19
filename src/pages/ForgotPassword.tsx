import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: "https://builders-house-collective.vercel.app/reset-password",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0D" }}>
      <Link
        to="/login"
        className="fixed top-5 left-5 inline-flex items-center gap-1.5 text-xs font-mono transition-colors hover:text-primary"
        style={{ color: "#8A8480" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> back
      </Link>

      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <h1 className="text-xl font-medium mb-2" style={{ color: "#F5F0EB" }}>check your email</h1>
            <p className="text-sm" style={{ color: "#8A8480" }}>
              we sent a reset link to <span style={{ color: "#F5F0EB" }}>{email}</span>.
              click it to set a new password.
            </p>
            <p className="text-xs mt-4 font-mono" style={{ color: "#8A8480" }}>
              didn't get it? check spam, or{" "}
              <button onClick={() => setSent(false)} className="underline hover:text-primary">try again</button>.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB" }}>forgot password</h1>
            <p className="text-sm mb-6" style={{ color: "#8A8480" }}>enter your email and we'll send a reset link.</p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="name@company.com"
              type="email"
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none mb-3"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }}
            />
            <Button className="w-full" onClick={submit} disabled={busy}>
              {busy ? "sending…" : "send reset link"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
