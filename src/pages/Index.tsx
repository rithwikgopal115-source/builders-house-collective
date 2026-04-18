import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Star, Zap, Lightbulb, Music, Briefcase, Trophy, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const TILE_CONFIG: Record<string, { bg: string; fg: string; icon: any; label: string; glow?: boolean; locked?: boolean }> = {
  "resources": { bg: "#E8734A", fg: "#0D0D0D", icon: Star,      label: "critical info", glow: true },
  "ai-news":   { bg: "#1D6AE5", fg: "#FFFFFF", icon: Zap,        label: "ai news" },
  "ideas":     { bg: "#F5C518", fg: "#1A1500", icon: Lightbulb,  label: "ideas" },
  "vibing":    { bg: "#7C3AED", fg: "#FFFFFF", icon: Music,       label: "vibing",  locked: true },
  "hiring":    { bg: "#16A34A", fg: "#FFFFFF", icon: Briefcase,   label: "hiring",  locked: true },
  "wins":      { bg: "#EA580C", fg: "#FFFFFF", icon: Trophy,      label: "wins",    locked: true },
};

const Index = () => {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [yoloMode, setYoloMode] = useState(false);
  const [lockedModal, setLockedModal] = useState<string | null>(null);

  useEffect(() => {
    document.title = "builders house — a private room for people who are building";
    supabase.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => setYoloMode(!!data?.auto_yolo_enabled));
  }, []);

  if (!loading && user && profile?.is_approved) return <Navigate to="/home" replace />;
  if (!loading && user && profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const handleTileClick = (slug: string) => {
    const cfg = TILE_CONFIG[slug];
    if (!cfg) return;
    if (cfg.locked) setLockedModal(slug);
    else nav(`/channel/${slug}`);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
          <span className="font-medium text-sm tracking-tight" style={{ color: "#F5F0EB" }}>
            builders house.
          </span>
          <Link
            to="/login"
            className="text-xs font-mono uppercase tracking-wider transition-opacity hover:opacity-70"
            style={{ color: "#8A8480" }}
          >
            log in
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

          {/* Left: headline + tiles */}
          <div>
            <div className="mb-8">
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#E8734A" }}>
                invite-only community
              </p>
              <h1
                className="text-4xl md:text-5xl font-medium leading-tight mb-4"
                style={{ color: "#F5F0EB", letterSpacing: "-0.03em" }}
              >
                a private room for<br />people who are building.
              </h1>
              <p className="text-base" style={{ color: "#8A8480", maxWidth: 440 }}>
                share resources, trade ideas, find co-founders, celebrate wins.
                no noise — just builders.
              </p>
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-4 auto-rows-[100px] md:auto-rows-[130px] gap-[2px]">
              <Tile slug="resources" onClick={handleTileClick} className="col-span-2 row-span-2" big />
              <Tile slug="ai-news"  onClick={handleTileClick} className="col-span-2 row-span-1" />
              <Tile slug="ideas"    onClick={handleTileClick} className="col-span-2 row-span-1" />
              <Tile slug="vibing"   onClick={handleTileClick} className="col-span-2 row-span-1" />
              <Tile slug="hiring"   onClick={handleTileClick} className="col-span-1 row-span-1" />
              <Tile slug="wins"     onClick={handleTileClick} className="col-span-1 row-span-1" />
            </div>
          </div>

          {/* Right: join panel */}
          <div
            className="lg:sticky lg:top-10 p-7 md:p-8"
            style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20 }}
          >
            {yoloMode ? <YoloPanel /> : <RequestAccessPanel />}
          </div>
        </div>
      </div>

      {/* Locked channel modal */}
      <Dialog open={!!lockedModal} onOpenChange={(o) => { if (!o) setLockedModal(null); }}>
        <DialogContent
          className="border-0 max-w-sm"
          style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="text-center py-4">
            <Lock className="h-8 w-8 mx-auto mb-3" style={{ color: "#E8734A" }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>members only</h3>
            <p className="text-sm mb-6" style={{ color: "#8A8480" }}>
              {lockedModal} is for approved builders only.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setLockedModal(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ background: "#E8734A", color: "#0D0D0D" }}
              >
                request access
              </button>
              <Link to="/login">
                <button
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ background: "#1E1E1E", color: "#8A8480" }}
                >
                  log in
                </button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes tilePulse {
          0%, 100% { box-shadow: 0 0 24px rgba(232,115,74,0.45); }
          50%       { box-shadow: 0 0 40px rgba(232,115,74,0.75); }
        }
      `}</style>
    </div>
  );
};

/* ─── Tile ───────────────────────────────────────────────────────── */
const Tile = ({
  slug, onClick, className = "", big,
}: { slug: string; onClick: (s: string) => void; className?: string; big?: boolean }) => {
  const cfg = TILE_CONFIG[slug];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <button
      onClick={() => onClick(slug)}
      className={`group relative flex flex-col items-start justify-between p-3 md:p-4 overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.99] ${className}`}
      style={{
        background: cfg.bg,
        boxShadow: cfg.glow ? "0 0 24px rgba(232,115,74,0.45)" : undefined,
        animation: cfg.glow ? "tilePulse 3s ease-in-out infinite" : undefined,
        borderRadius: 0,
      }}
    >
      <Icon
        style={{ color: cfg.fg }}
        className={big ? "h-8 w-8 md:h-10 md:w-10" : "h-6 w-6 md:h-7 md:w-7"}
        strokeWidth={2}
      />
      <span
        className={`font-medium tracking-tight ${big ? "text-base md:text-lg" : "text-xs md:text-sm"}`}
        style={{ color: cfg.fg, letterSpacing: "-0.02em" }}
      >
        {cfg.label}
      </span>
      {cfg.locked && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <Lock className="h-5 w-5" style={{ color: "#F5F0EB" }} strokeWidth={2} />
        </div>
      )}
    </button>
  );
};

/* ─── Request Access Panel ───────────────────────────────────────── */
const RequestAccessPanel = () => {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [building, setBuilding] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy]         = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !building.trim()) {
      toast.error("fill in all three fields");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("access_requests").insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        what_building: building.trim(),
        requested_tier: "learner",
      } as any);
      if (error) { toast.error(error.message); return; }

      // Notify admins
      const { data: admins } = await supabase
        .from("profiles").select("id").eq("is_admin", true);
      if (admins?.length) {
        await supabase.from("notifications").insert(
          admins.map((a: any) => ({
            recipient_id: a.id,
            type: "access_request",
            content: `new request from ${name.trim()} — ${email.trim().toLowerCase()}`,
          }))
        );
      }
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-10 text-center">
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(232,115,74,0.12)" }}
        >
          <ArrowRight className="h-5 w-5" style={{ color: "#E8734A" }} />
        </div>
        <p className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>you're on the list.</p>
        <p className="text-sm" style={{ color: "#8A8480" }}>we review every request personally. sit tight.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-2xl font-medium mb-1.5"
          style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}
        >
          request access
        </h2>
        <p className="text-sm" style={{ color: "#8A8480" }}>
          curated. invite-only. we read every request.
        </p>
      </div>

      <div className="space-y-3">
        <FieldInput
          value={name}
          onChange={setName}
          placeholder="your name"
          label="name"
        />
        <FieldInput
          value={email}
          onChange={setEmail}
          placeholder="your@email.com"
          type="email"
          label="email"
        />
        <div>
          <label
            className="block text-[10px] font-mono uppercase tracking-wider mb-1.5"
            style={{ color: "#8A8480" }}
          >
            what are you building?
          </label>
          <textarea
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="describe what you're working on right now…"
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none"
            style={{
              background: "#0D0D0D",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F5F0EB",
              borderRadius: 10,
            }}
          />
        </div>
        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}
        >
          {busy ? "sending…" : "request access →"}
        </button>
      </div>

      <p className="text-xs text-center mt-5" style={{ color: "#8A8480" }}>
        already a member?{" "}
        <Link to="/login" className="underline hover:opacity-80">
          log in
        </Link>
      </p>
    </div>
  );
};

/* ─── Yolo Panel (instant access mode) ──────────────────────────── */
const YoloPanel = () => {
  const nav = useNavigate();
  const [step, setStep]         = useState<"ask" | "form" | "no">("ask");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [building, setBuilding] = useState("");
  const [busy, setBusy]         = useState(false);

  const yolo = async () => {
    if (!name.trim() || !email.trim() || !building.trim()) {
      toast.error("fill in all three fields");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("yolo-onboard", {
        body: { name: name.trim(), email: email.trim().toLowerCase(), what_building: building.trim() },
      });
      if (error || data?.error) { toast.error(error?.message ?? data?.error ?? "something went wrong"); return; }
      if (data?.password) {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: data.password,
        });
        if (signErr) { toast.error(signErr.message); return; }
        toast.success("you're in.");
        nav("/home");
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === "no") return (
    <div className="py-10 text-center">
      <p className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>fair enough.</p>
      <p className="text-sm" style={{ color: "#8A8480" }}>maybe another time.</p>
    </div>
  );

  if (step === "form") return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-medium mb-1.5" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
          let's go.
        </h2>
        <p className="text-sm" style={{ color: "#8A8480" }}>you're in the moment you submit.</p>
      </div>
      <div className="space-y-3">
        <FieldInput value={name} onChange={setName} placeholder="your name" label="name" />
        <FieldInput value={email} onChange={setEmail} placeholder="your@email.com" type="email" label="email" />
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "#8A8480" }}>
            what are you building?
          </label>
          <textarea
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="what's the thing you're working on?"
            rows={3}
            className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }}
          />
        </div>
        <button
          onClick={yolo}
          disabled={busy}
          className="w-full py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}
        >
          {busy ? "letting you in…" : "let me in →"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="py-6">
      <h2 className="text-2xl font-medium mb-2 text-center" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
        are you a builder?
      </h2>
      <p className="text-sm text-center mb-8" style={{ color: "#8A8480" }}>
        honest answer only.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setStep("form")}
          className="flex-1 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "#E8734A", color: "#0D0D0D", borderRadius: 10 }}
        >
          yes
        </button>
        <button
          onClick={() => setStep("no")}
          className="flex-1 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "#1E1E1E", color: "#8A8480", borderRadius: 10 }}
        >
          no
        </button>
      </div>
    </div>
  );
};

/* ─── Shared input ───────────────────────────────────────────────── */
const FieldInput = ({ value, onChange, placeholder, type = "text", label }: any) => (
  <div>
    <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "#8A8480" }}>
      {label}
    </label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="w-full px-3 py-2.5 text-sm focus:outline-none"
      style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0EB", borderRadius: 10 }}
    />
  </div>
);

export default Index;
