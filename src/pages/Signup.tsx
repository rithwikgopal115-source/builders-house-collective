import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const Signup = () => {
  const { user, profile, loading, profileLoading, refreshProfile } = useAuth();
  const nav = useNavigate();

  const getStoredEmail = () => {
    try { return localStorage.getItem("bh-pending-email") ?? ""; } catch { return ""; }
  };

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState(getStoredEmail);
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    const e = getStoredEmail();
    if (!e) return;
    supabase.from("access_requests").select("name, status")
      .eq("email", e.toLowerCase()).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data?.name) setName(data.name);
      });
  }, []);

  if (!loading && !profileLoading && user && profile?.is_approved) return <Navigate to="/home" replace />;

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) { toast.error("fill in all fields"); return; }
    if (password.length < 8) { toast.error("password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("passwords do not match"); return; }

    setBusy(true);
    try {
      const { data: req } = await supabase.from("access_requests").select("status")
        .eq("email", email.trim().toLowerCase()).order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (!req) { toast.error("no access request found — request access first"); return; }
      if (req.status !== "approved") { toast.error("your request has not been approved yet"); return; }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { display_name: name.trim() } },
      });

      if (error) { toast.error(error.message); return; }

      if (data.session) {
        await supabase.rpc("claim_approved_access");
        await refreshProfile();
        localStorage.removeItem("bh-pending-email");
        nav("/home");
        return;
      }

      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0D" }}>
        <div className="w-full max-w-md p-8 text-center" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
          <p className="text-2xl mb-3" style={{ color: "#E8734A" }}>&#10003;</p>
          <h2 className="text-xl font-medium mb-2" style={{ color: "#F5F0EB" }}>check your email</h2>
          <p className="text-sm mb-6" style={{ color: "#8A8480" }}>
            we sent a confirmation link to <strong style={{ color: "#F5F0EB" }}>{email}</strong>. click it then log in.
          </p>
          <Link to="/login">
            <button className="w-full py-3 text-sm font-medium" style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}>
              go to login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0D" }}>
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="text-xs font-mono uppercase tracking-wider" style={{ color: "#8A8480" }}>
            &larr; builders house
          </Link>
        </div>

        <div className="p-8" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
          <h1 className="text-2xl font-medium mb-1" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>create your account</h1>
          <p className="text-sm mb-7" style={{ color: "#8A8480" }}>you have been approved. set your password to get in.</p>

          <div className="space-y-4">
            <Field label="name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="your name"
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }} />
            </Field>

            <Field label="email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" type="email"
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }} />
            </Field>

            <Field label="password">
              <div className="relative">
                <input value={password} onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"} placeholder="min. 8 characters"
                  className="w-full px-3 py-2.5 pr-10 text-sm focus:outline-none"
                  style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8A8480" }}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="confirm password">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
                type={showPw ? "text" : "password"} placeholder="same as above"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }} />
            </Field>

            <button onClick={submit} disabled={busy}
              className="w-full py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}>
              {busy ? "creating account..." : "create account ->"}
            </button>
          </div>

          <p className="text-xs text-center mt-6" style={{ color: "#8A8480" }}>
            already have an account?{" "}
            <Link to="/login" className="underline hover:opacity-80">log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "#8A8480" }}>
      {label}
    </label>
    {children}
  </div>
);

export default Signup;
