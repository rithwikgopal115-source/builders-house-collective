import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Login = () => {
  const { user, profile, signIn, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm">loading…</div>;
  if (user && profile?.is_approved) return <Navigate to="/home" replace />;
  if (user && profile && !profile.is_approved) return <Navigate to="/pending" replace />;

  const submit = async () => {
    setBusy(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setBusy(false);
    if (error) { toast.error(error); return; }
    nav("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-10 justify-center">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">b</span>
          </div>
          <span className="font-medium">builders house</span>
        </Link>
        <div className="bento-card">
          <h1 className="text-xl font-medium mb-6">members log in</h1>
          <div className="space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              type="email"
              className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button className="w-full" onClick={submit} disabled={busy}>
              {busy ? "…" : "log in"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6 font-mono text-center">
            no account? <Link to="/" className="text-foreground hover:text-primary">request access</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
