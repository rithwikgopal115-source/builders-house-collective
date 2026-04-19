import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Login = () => {
  const { user, profile, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const err = sessionStorage.getItem("auth_error");
      if (err) { toast.error(err); sessionStorage.removeItem("auth_error"); }
    } catch (_) {}
  }, []);

if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">loading…</div>;
if (!loading && user && !profile) return <div className="min-h-screen flex items-center justify-center font-mono text-sm" style={{ background: "#0D0D0D", color: "#8A8480" }}>loading…</div>;
if (user && profile?.is_approved) return <Navigate to="/home" replace />;
if (user && profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const submit = async () => {
    setBusy(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setBusy(false);
    if (error) { toast.error(error); return; }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0D0D0D" }}>
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h1 className="text-3xl font-medium mb-8" style={{ color: "#F5F0EB" }}>builders house.</h1>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: "#8A8480" }}>email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" type="email"
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#8A8480" }}>password</label>
              <Link to="/forgot-password" className="text-[10px] font-mono hover:text-primary" style={{ color: "#8A8480" }}>forgot password?</Link>
            </div>
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
          </div>
          <Button className="w-full mt-3" onClick={submit} disabled={busy}>
            {busy ? "…" : "log in →"}
          </Button>
        </div>
        <div className="mt-7 space-y-2 text-sm" style={{ color: "#8A8480" }}>
          <p>don't have access? <Link to="/" className="underline hover:text-primary">request it.</Link></p>
          <p>waiting on approval? <Link to="/waiting" className="underline hover:text-primary">check your status.</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
