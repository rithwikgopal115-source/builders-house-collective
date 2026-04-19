// /signup — approved candidates create their password and join.
// Pre-fills email from URL ?email= or localStorage.
// Verifies the email has an approved access_request before allowing signup.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Signup = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [email, setEmail] = useState(() => {
    const fromParam = params.get("email");
    if (fromParam) return decodeURIComponent(fromParam);
    try { return localStorage.getItem("bh-pending-email") ?? ""; } catch { return ""; }
  });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [approvalError, setApprovalError] = useState("");

  useEffect(() => {
    document.title = "create your account — builders house";
  }, []);

  useEffect(() => {
    if (!loading && user && profile?.is_approved) nav("/home", { replace: true });
  }, [loading, user, profile, nav]);

  useEffect(() => {
    if (!email) return;
    supabase
      .from("access_requests")
      .select("name, status")
      .eq("email", email.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.status !== "approved") {
          setApprovalError("this email hasn't been approved yet. check back after the admin reviews your request.");
          return;
        }
        if (data.name) setName(data.name);
      });
  }, [email]);

  const submit = async () => {
    if (!email.trim() || !name.trim() || !password) {
      toast.error("fill in all fields");
      return;
    }
    if (password !== confirm) {
      toast.error("passwords don't match");
      return;
    }
    if (password.length < 8) {
      toast.error("password must be at least 8 characters");
      return;
    }

    setBusy(true);
    setVerifying(true);

    const { data: req } = await supabase
      .from("access_requests")
      .select("status")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (!req || req.status !== "approved") {
      toast.error("this email isn't approved yet");
      setBusy(false);
      setVerifying(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: name.trim() },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
        toast.error("this email is already registered — go to login instead");
        setBusy(false);
        setVerifying(false);
        return;
      }
      // Email rate limit — treat as success, email may still arrive
      const msg = error.message.toLowerCase();
      if (msg.includes("rate") || msg.includes("limit") || msg.includes("over_email")) {
        setDone(true);
        setBusy(false);
        setVerifying(false);
        return;
      }
      toast.error(error.message);
      setBusy(false);
      setVerifying(false);
      return;
    }

    if (data.session) {
      try { await supabase.rpc("claim_approved_access"); } catch {}
      if (refreshProfile) await refreshProfile();
      try { localStorage.removeItem("bh-pending-email"); } catch {}
      toast.success("welcome to builders house.");
      nav("/home", { replace: true });
      return;
    }

    setDone(true);
    setBusy(false);
    setVerifying(false);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0D" }}>
        <div className="w-full max-w-md p-8 text-center" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
          <CheckCircle2 className="h-10 w-10 mx-auto mb-4" style={{ color: "#7AC8A0" }} />
          <h1 className="text-xl font-medium mb-2" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>check your email.</h1>
          <p className="text-sm mb-6" style={{ color: "#8A8480" }}>
            we sent a confirmation link to <span style={{ color: "#F5F0EB" }}>{email}</span>.
            click it to activate your account, then log in.
          </p>
          <Link to="/login">
            <Button className="w-full">go to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "#0D0D0D" }}>
      <Link
        to="/waiting"
        className="fixed top-5 left-5 md:top-6 md:left-6 z-30 inline-flex items-center gap-1.5 text-xs font-mono transition-colors hover:text-primary"
        style={{ color: "#8A8480" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back
      </Link>

      <div className="w-full max-w-md p-8" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
        <h1 className="text-2xl font-medium mb-1" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>create your account.</h1>
        <p className="text-xs font-mono mb-6" style={{ color: "#8A8480" }}>you're approved. set your password to get in.</p>

        {approvalError && (
          <div className="mb-4 px-4 py-3 text-sm" style={{ background: "rgba(232,116,116,0.1)", border: "1px solid rgba(232,116,116,0.3)", borderRadius: 8, color: "#E87474" }}>
            {approvalError}
          </div>
        )}

        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            type="email"
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="display name"
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password (min 8 chars)"
              type={showPw ? "text" : "password"}
              className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 pr-10"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: "#F5F0EB" }}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="confirm password"
              type={showConfirm ? "text" : "password"}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 pr-10"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: "#F5F0EB" }}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={submit}
            disabled={busy || !!approvalError}
            className="w-full"
            style={{ background: "#E8734A", color: "#0D0D0D" }}
          >
            {verifying ? "verifying…" : busy ? "creating account…" : "create account"}
          </Button>
        </div>

        <p className="text-xs text-center mt-4" style={{ color: "#8A8480" }}>
          already have an account?{" "}
          <Link to="/login" className="hover:opacity-80 transition-opacity" style={{ color: "#E8734A" }}>log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
