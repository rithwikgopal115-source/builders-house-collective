import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PLACEHOLDER_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ";

const Index = () => {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [yoloMode, setYoloMode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(() => {
    try { return localStorage.getItem("bh-pending-email"); } catch { return null; }
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    document.title = "builders house — a private room for people who are building";
    supabase.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => setYoloMode(!!data?.auto_yolo_enabled));
  }, []);

  useEffect(() => {
    if (!pendingEmail) return;
    const fetchStatus = async () => {
      const { data: req } = await supabase
        .from("access_requests")
        .select("id, status")
        .eq("email", pendingEmail.toLowerCase())
        .maybeSingle();
      if (!req) return;
      setRequestStatus(req.status);
      const { count } = await supabase
        .from("onboarding_messages")
        .select("id", { count: "exact", head: true })
        .eq("request_id", req.id)
        .eq("sender_type", "admin");
      setUnreadCount(count ?? 0);
    };
    fetchStatus();
  }, [pendingEmail]);

  if (!loading && user && !profile) return <Navigate to="/waiting" replace />;
  if (!loading && user && profile?.is_approved) return <Navigate to="/home" replace />;
  if (!loading && user && profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "#0D0D0D", color: "#F5F0EB" }}>

      {/* ── Animated background orbs ──────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grain" />
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-[60] px-6 md:px-10 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", background: "rgba(13,13,13,0.6)" }}>
        <Link to={user ? "/home" : "/"} className="font-medium text-sm tracking-tight hover:text-primary transition-colors" style={{ color: "#F5F0EB" }}>
          builders house.
        </Link>
        {user ? (
          <Link to="/home" className="text-xs font-mono uppercase tracking-wider hover:opacity-80 transition-opacity" style={{ color: "#8A8480" }}>dashboard &rarr;</Link>
        ) : (
          <Link to="/login" className="text-xs font-mono uppercase tracking-wider hover:opacity-80 transition-opacity" style={{ color: "#8A8480" }}>login</Link>
        )}
      </nav>

      {/* ── Returning visitor notification banner ─────────────────────── */}
      {!user && pendingEmail && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-6 pointer-events-none">
          <Link
            to="/waiting"
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 text-xs font-mono transition-opacity hover:opacity-80 fade-in"
            style={{
              background: requestStatus === "approved" ? "rgba(122,200,160,0.12)" : unreadCount > 0 ? "rgba(232,115,74,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${requestStatus === "approved" ? "rgba(122,200,160,0.3)" : unreadCount > 0 ? "rgba(232,115,74,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 99,
              color: requestStatus === "approved" ? "#7AC8A0" : unreadCount > 0 ? "#E8734A" : "#8A8480",
              backdropFilter: "blur(12px)",
            }}
          >
            <Bell className="h-3 w-3 flex-shrink-0" />
            {requestStatus === "approved"
              ? "you're approved — create your account →"
              : unreadCount > 0
                ? `${unreadCount} message${unreadCount > 1 ? "s" : ""} from the team →`
                : "your request is being reviewed →"}
          </Link>
        </div>
      )}

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center pt-20">
        <div className="fade-up max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest mb-6 opacity-50">builders house</p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium leading-[1.08] mb-6" style={{ letterSpacing: "-0.04em" }}>
            where a-players connect,
            <br />
            <span className="gradient-text">communicate, and share.</span>
          </h1>
          <p className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: "#8A8480" }}>
            a small, private room for founders and builders who are actually shipping something — not just talking about it.
          </p>
          <a href="#join" className="inline-flex items-center gap-2 text-sm font-mono px-5 py-3 rounded-full transition-all hover:scale-105 active:scale-95"
            style={{ background: "#E8734A", color: "#0D0D0D" }}>
            request access &darr;
          </a>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce">
          <div className="h-8 w-px" style={{ background: "linear-gradient(to bottom, transparent, #F5F0EB)" }} />
        </div>
      </section>

      {/* ── VSL section ───────────────────────────────────────────────── */}
      <section className="relative px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-3xl mx-auto fade-up">
          <p className="text-xs font-mono uppercase tracking-widest text-center mb-3 opacity-40">watch first</p>
          <h2 className="text-xl md:text-2xl font-medium text-center mb-8" style={{ letterSpacing: "-0.03em" }}>
            what is builders house?
          </h2>
          <div className="glass-card overflow-hidden" style={{ borderRadius: 20, padding: 8 }}>
            <div className="aspect-video overflow-hidden" style={{ borderRadius: 14 }}>
              <iframe
                src={PLACEHOLDER_VIDEO}
                className="w-full h-full"
                allowFullScreen
                title="builders house — what is this?"
              />
            </div>
          </div>
          <p className="text-center text-xs font-mono mt-4 opacity-30">3 minutes · worth it</p>
        </div>
      </section>

      {/* ── Why section ───────────────────────────────────────────────── */}
      <section className="relative px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-4">
          {[
            { label: "signal only", body: "no noise, no hustle bro energy. everyone here is making something real." },
            { label: "small on purpose", body: "capped. curated. every member is handpicked. quality over growth." },
            { label: "earned, not bought", body: "you don't pay to get in. you apply. if you're building, you belong." },
          ].map((item) => (
            <div key={item.label} className="glass-card p-5 fade-up">
              <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: "#E8734A" }}>{item.label}</p>
              <p className="text-sm leading-relaxed" style={{ color: "#8A8480" }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Join section ──────────────────────────────────────────────── */}
      <section id="join" className="relative px-6 md:px-10 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-md mx-auto fade-up">
          <p className="text-xs font-mono uppercase tracking-widest text-center mb-3 opacity-40">the door</p>
          <div className="glass-card p-7 md:p-8" style={{ borderRadius: 20 }}>
            {pendingEmail && !user
              ? <ReturningVisitorPanel
                  email={pendingEmail}
                  status={requestStatus}
                  unreadCount={unreadCount}
                  onClear={() => {
                    try { localStorage.removeItem("bh-pending-email"); } catch {}
                    setPendingEmail(null);
                    setRequestStatus(null);
                    setUnreadCount(0);
                  }}
                />
              : yoloMode ? <YoloPanel /> : <StandardJoinPanel />
            }
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="relative px-6 md:px-10 py-8 text-center border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <p className="text-xs font-mono opacity-20">builders house · a private room for people who are building</p>
      </footer>

      <style>{`
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.18;
          animation: drift 18s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 600px; height: 600px;
          background: #E8734A;
          top: -200px; left: -150px;
          animation-duration: 22s;
        }
        .orb-2 {
          width: 500px; height: 500px;
          background: #1D6AE5;
          top: 30%; right: -180px;
          animation-duration: 28s;
          animation-delay: -8s;
        }
        .orb-3 {
          width: 400px; height: 400px;
          background: #7C3AED;
          bottom: 10%; left: 20%;
          animation-duration: 20s;
          animation-delay: -14s;
        }
        @keyframes drift {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(40px, -30px) scale(1.05); }
          66%  { transform: translate(-20px, 50px) scale(0.97); }
          100% { transform: translate(30px, 20px) scale(1.03); }
        }
        .grain {
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          opacity: 0.04;
          pointer-events: none;
        }
        .gradient-text {
          background: linear-gradient(135deg, #E8734A 0%, #F5C518 50%, #E8734A 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .glass-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .fade-up {
          animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        .fade-in {
          animation: fadeIn 0.4s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const StandardJoinPanel = () => {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const [stage, setStage] = useState<"figuring" | "shipping" | "">("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !building.trim()) { toast.error("fill in everything"); return; }
    setBusy(true);
    const { error } = await supabase.from("access_requests").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      what_building: building.trim(),
      room_selected: stage || null,
      onboard_path: "standard",
    } as any);
    setBusy(false);
    if (error) {
      if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("duplicate")) {
        try { localStorage.setItem("bh-pending-email", email.trim().toLowerCase()); } catch {}
        nav("/waiting");
        return;
      }
      toast.error(error.message);
      return;
    }
    const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
    if (admins?.length) {
      await supabase.from("notifications").insert(admins.map((a: any) => ({
        recipient_id: a.id,
        type: "access_request",
        content: `new access request from ${name.trim()}`,
      })));
    }
    try { localStorage.setItem("bh-pending-email", email.trim().toLowerCase()); } catch {}
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <p className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>got it.</p>
        <p className="text-sm mb-4" style={{ color: "#8A8480" }}>you'll hear back soon.</p>
        <Link to="/waiting" className="text-xs font-mono hover:opacity-80 transition-opacity" style={{ color: "#E8734A" }}>
          view your request status &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB", letterSpacing: "-0.03em" }}>want in?</h2>
      <p className="text-xs font-mono mb-6" style={{ color: "#8A8480" }}>we read every application.</p>
      <div className="space-y-3">
        <PanelInput value={name} onChange={setName} placeholder="name" />
        <PanelInput value={email} onChange={setEmail} placeholder="email" type="email" />
        <textarea
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="what are you building right now?"
          rows={4}
          maxLength={2000}
          className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 resize-none"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }}
        />
        <div className="grid grid-cols-2 gap-2">
          <StageOption active={stage === "figuring"} onClick={() => setStage("figuring")} label="still figuring it out" />
          <StageOption active={stage === "shipping"} onClick={() => setStage("shipping")} label="shipping & making money" />
        </div>
        <Button
          onClick={submit}
          disabled={busy}
          className="w-full"
          style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10, fontFamily: "monospace", letterSpacing: "0.04em" }}
        >
          {busy ? "sending…" : "request access"}
        </Button>
      </div>
    </div>
  );
};

const ReturningVisitorPanel = ({ email, status, unreadCount, onClear }: {
  email: string; status: string | null; unreadCount: number; onClear: () => void;
}) => {
  const nav = useNavigate();

  if (status === "approved") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#7AC8A0" }} />
          <h2 className="text-lg font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.03em" }}>you're approved.</h2>
        </div>
        <p className="text-sm mb-6" style={{ color: "#8A8480" }}>create your account to get in.</p>
        <Button
          onClick={() => nav(`/signup?email=${encodeURIComponent(email)}`)}
          className="w-full"
          style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}
        >
          create account &rarr;
        </Button>
        <button onClick={onClear} className="text-xs font-mono mt-3 block w-full text-center" style={{ color: "#4A4A4A" }}>
          not you?
        </button>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="py-6 text-center">
        <p className="text-sm mb-4" style={{ color: "#8A8480" }}>your application was declined.</p>
        <button onClick={onClear} className="text-xs font-mono" style={{ color: "#E8734A" }}>
          try with a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#C9B99A" }} />
        <h2 className="text-base font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.03em" }}>request submitted.</h2>
      </div>
      <p className="text-xs font-mono mb-5 ml-4" style={{ color: "#8A8480" }}>{email}</p>
      {unreadCount > 0 && (
        <div className="px-3 py-2 mb-4 text-xs font-mono" style={{
          background: "rgba(232,115,74,0.1)", border: "1px solid rgba(232,115,74,0.3)", borderRadius: 8, color: "#E8734A",
        }}>
          {unreadCount} message{unreadCount > 1 ? "s" : ""} from the team
        </div>
      )}
      <Link to="/waiting">
        <Button className="w-full" variant="ghost">view your thread &rarr;</Button>
      </Link>
      <button onClick={onClear} className="text-xs font-mono mt-3 block w-full text-center" style={{ color: "#4A4A4A" }}>
        not you?
      </button>
    </div>
  );
};

const YoloPanel = () => {
  const nav = useNavigate();
  const [step, setStep] = useState<"ask" | "yes" | "no">("ask");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const [busy, setBusy] = useState(false);

  const yolo = async () => {
    if (!name.trim() || !email.trim() || !building.trim()) { toast.error("name, email, what you're building"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("yolo-onboard", {
      body: { name: name.trim(), email: email.trim().toLowerCase(), what_building: building.trim() },
    });
    setBusy(false);
    if (error || data?.error) { toast.error(error?.message ?? data?.error ?? "failed"); return; }
    if (data?.password) {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: data.password });
      if (signErr) { toast.error(signErr.message); return; }
      toast.success("you're in.");
      nav("/home");
    }
  };

  if (step === "no") return (
    <div className="py-8 text-center">
      <p className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>fair enough.</p>
      <p className="text-sm" style={{ color: "#8A8480" }}>maybe another time.</p>
    </div>
  );

  if (step === "yes") return (
    <div>
      <h2 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB", letterSpacing: "-0.03em" }}>cool. quick details.</h2>
      <p className="text-xs font-mono mb-5" style={{ color: "#8A8480" }}>you'll be in immediately.</p>
      <div className="space-y-3">
        <PanelInput value={name} onChange={setName} placeholder="name" />
        <PanelInput value={email} onChange={setEmail} placeholder="email" type="email" />
        <textarea
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="what are you building?"
          rows={3}
          className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 resize-none"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }}
        />
        <Button
          onClick={yolo}
          disabled={busy}
          className="w-full"
          style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}
        >
          {busy ? "letting you in…" : "let me in"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="py-6">
      <h2 className="text-2xl font-medium mb-2 text-center" style={{ color: "#F5F0EB", letterSpacing: "-0.03em" }}>are you a cool person?</h2>
      <p className="text-xs font-mono text-center mb-6" style={{ color: "#8A8480" }}>honest answer only</p>
      <div className="flex gap-3">
        <button
          onClick={() => setStep("yes")}
          className="flex-1 py-3 text-sm font-medium transition-transform hover:scale-[1.02] active:scale-95"
          style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}
        >
          yes
        </button>
        <button
          onClick={() => setStep("no")}
          className="flex-1 py-3 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.05)", color: "#8A8480", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}
        >
          no
        </button>
      </div>
    </div>
  );
};

const StageOption = ({ active, onClick, label }: any) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left p-2.5 text-xs transition-all hover:opacity-90"
    style={{
      background: active ? "rgba(232,115,74,0.1)" : "rgba(0,0,0,0.35)",
      border: active ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.08)",
      color: active ? "#E8734A" : "#8A8480",
      borderRadius: 8,
    }}
  >
    {label}
  </button>
);

const PanelInput = ({ value, onChange, placeholder, type = "text" }: any) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
    style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }}
  />
);

export default Index;
