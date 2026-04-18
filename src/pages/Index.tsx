import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Pin, Zap, Lightbulb, Music, Briefcase, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PLACEHOLDER_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ";

// Hardcoded tile config — renders immediately without waiting for DB
const TILE_CONFIG: Record<string, { bg: string; fg: string; icon: any; glow?: boolean; locked?: boolean; isPublic: boolean }> = {
  "resources": { bg: "#E8734A", fg: "#0D0D0D", icon: Pin,      glow: true,  isPublic: true  },
  "ai-news":   { bg: "#1D6AE5", fg: "#FFFFFF", icon: Zap,                   isPublic: true  },
  "ideas":     { bg: "#F5C518", fg: "#1A1500", icon: Lightbulb,              isPublic: true  },
  "vibing":    { bg: "#7C3AED", fg: "#FFFFFF", icon: Music,     locked: true, isPublic: false },
  "hiring":    { bg: "#16A34A", fg: "#FFFFFF", icon: Briefcase, locked: true, isPublic: false },
  "wins":      { bg: "#EA580C", fg: "#FFFFFF", icon: Trophy,    locked: true, isPublic: false },
};

const SLUG_ORDER = ["resources", "ai-news", "ideas", "vibing", "hiring", "wins"];

interface ChannelIds { [slug: string]: string }

const Index = () => {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [showVideo, setShowVideo] = useState(() => !sessionStorage.getItem("bh-video-seen"));
  const dismissVideo = () => {
    sessionStorage.setItem("bh-video-seen", "1");
    setShowVideo(false);
  };
  const [channelIds, setChannelIds] = useState<ChannelIds>({});
  const [yoloMode, setYoloMode] = useState(false);
  const [lockedModal, setLockedModal] = useState<string | null>(null);

  useEffect(() => {
    document.title = "builders house — a private room for people who are building";

    // Load channel IDs for navigation (tiles render immediately with hardcoded colors)
    supabase.from("channels").select("id, slug").then(({ data }) => {
      if (data) {
        const ids: ChannelIds = {};
        data.forEach((c: any) => { ids[c.slug] = c.id; });
        setChannelIds(ids);
      }
    });

    supabase.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => setYoloMode(!!data?.auto_yolo_enabled));
  }, []);

  if (!loading && user && profile?.is_approved) return <Navigate to="/home" replace />;
  if (!loading && user && profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const handleTileClick = (slug: string) => {
    const cfg = TILE_CONFIG[slug];
    if (!cfg) return;
    if (cfg.locked) {
      setLockedModal(slug);
    } else {
      nav(`/channel/${slug}`);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: "#0D0D0D" }}>
      {/* Top nav */}
      <nav className="absolute top-0 inset-x-0 z-10 px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="font-medium text-sm tracking-tight" style={{ color: "#F5F0EB" }}>builders house</div>
        <Link to="/login" className="text-xs font-mono uppercase tracking-wider hover:text-primary transition-colors" style={{ color: "#8A8480" }}>login</Link>
      </nav>

      {/* Main layout */}
      <div className={`min-h-screen pt-20 pb-10 px-6 md:px-10 transition-all ${showVideo ? "blur-sm pointer-events-none" : ""}`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 max-w-7xl mx-auto">

          {/* Tile grid — renders immediately with hardcoded colors */}
          <div className="grid grid-cols-4 auto-rows-[110px] md:auto-rows-[140px] gap-2">
            <Tile slug="resources" onClick={handleTileClick} className="col-span-2 row-span-2" />
            <Tile slug="ai-news"   onClick={handleTileClick} className="col-span-2 row-span-1" />
            <Tile slug="ideas"     onClick={handleTileClick} className="col-span-2 row-span-1" />
            <Tile slug="vibing"    onClick={handleTileClick} className="col-span-2 row-span-1" />
            <Tile slug="hiring"    onClick={handleTileClick} className="col-span-1 row-span-1" />
            <Tile slug="wins"      onClick={handleTileClick} className="col-span-1 row-span-1" />
          </div>

          {/* Join panel */}
          <div className="rounded-2xl p-6 md:p-7 self-start" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            {yoloMode ? <YoloPanel /> : <StandardJoinPanel />}
          </div>
        </div>
      </div>

      {/* Video overlay — appears on every page load, no persistent dismiss */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
          <div className="w-full max-w-2xl">
            <h2 className="text-xl md:text-2xl font-medium mb-5 text-center" style={{ color: "#F5F0EB" }}>what is builders house?</h2>
            <div className="aspect-video rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <iframe src={PLACEHOLDER_VIDEO} className="w-full h-full" allowFullScreen title="builders house" />
            </div>
            <div className="mt-5 text-center">
              <button onClick={() => setShowVideo(false)} className="text-sm hover:opacity-80 transition-opacity" style={{ color: "#8A8480" }}>
                skip for now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locked tile modal */}
      <Dialog open={!!lockedModal} onOpenChange={(o) => !o && setLockedModal(null)}>
        <DialogContent className="border-0 max-w-sm" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-center py-4">
            <Lock className="h-8 w-8 mx-auto mb-3" style={{ color: "#E8734A" }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>members only</h3>
            <p className="text-sm mb-6" style={{ color: "#8A8480" }}>{lockedModal} is for approved builders.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setLockedModal(null)}>request access</Button>
              <Link to="/login"><Button variant="ghost">log in</Button></Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`@keyframes tilePulse { 0%,100% { box-shadow: 0 0 24px rgba(232,115,74,0.5); } 50% { box-shadow: 0 0 40px rgba(232,115,74,0.8); } }`}</style>
    </div>
  );
};

const Tile = ({ slug, onClick, className = "" }: { slug: string; onClick: (s: string) => void; className?: string }) => {
  const cfg = TILE_CONFIG[slug];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <button
      onClick={() => onClick(slug)}
      className={`group relative rounded-2xl flex items-center justify-center overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{
        background: cfg.bg,
        boxShadow: cfg.glow ? "0 0 24px rgba(232,115,74,0.5)" : undefined,
        animation: cfg.glow ? "tilePulse 3s ease-in-out infinite" : undefined,
      }}
    >
      <Icon style={{ color: cfg.fg }} className="h-10 w-10 md:h-12 md:w-12" strokeWidth={1.75} />
      {cfg.locked && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <Lock className="h-7 w-7" style={{ color: "#F5F0EB" }} strokeWidth={2} />
        </div>
      )}
    </button>
  );
};

const StandardJoinPanel = () => {
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
    if (error) { toast.error(error.message); return; }
    const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
    if (admins?.length) {
      await supabase.from("notifications").insert(admins.map((a: any) => ({
        recipient_id: a.id,
        type: "access_request",
        content: `new access request from ${name.trim()}`,
      })));
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>got it.</p>
        <p className="text-sm" style={{ color: "#8A8480" }}>you'll hear back soon.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB" }}>want in?</h2>
      <p className="text-xs font-mono mb-5" style={{ color: "#8A8480" }}>request access — we read every one.</p>
      <div className="space-y-3">
        <PanelInput value={name} onChange={setName} placeholder="name" />
        <PanelInput value={email} onChange={setEmail} placeholder="email" type="email" />
        <textarea value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="what are you building right now?"
          rows={4} maxLength={2000}
          className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 resize-none"
          style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
        <div className="grid grid-cols-2 gap-2">
          <StageOption active={stage === "figuring"} onClick={() => setStage("figuring")} label="still figuring it out" />
          <StageOption active={stage === "shipping"} onClick={() => setStage("shipping")} label="shipping & making money" />
        </div>
        <Button onClick={submit} disabled={busy} className="w-full">{busy ? "sending…" : "request access"}</Button>
      </div>
    </div>
  );
};

const StageOption = ({ active, onClick, label }: any) => (
  <button type="button" onClick={onClick}
    className="text-left p-2.5 rounded-lg text-xs transition-colors"
    style={{
      background: active ? "#1E1E1E" : "#0D0D0D",
      border: active ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.06)",
      color: active ? "#E8734A" : "#8A8480",
    }}>
    {label}
  </button>
);

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
      <h2 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB" }}>cool. quick details.</h2>
      <p className="text-xs font-mono mb-5" style={{ color: "#8A8480" }}>you'll be in immediately.</p>
      <div className="space-y-3">
        <PanelInput value={name} onChange={setName} placeholder="name" />
        <PanelInput value={email} onChange={setEmail} placeholder="email" type="email" />
        <textarea value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="what are you building?"
          rows={3} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 resize-none"
          style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
        <Button onClick={yolo} disabled={busy} className="w-full">{busy ? "letting you in…" : "let me in"}</Button>
      </div>
    </div>
  );

  return (
    <div className="py-6">
      <h2 className="text-2xl font-medium mb-6 text-center" style={{ color: "#F5F0EB" }}>are you a cool person?</h2>
      <div className="flex gap-3">
        <button onClick={() => setStep("yes")} className="flex-1 py-3 rounded-lg text-sm font-medium"
          style={{ background: "#E8734A", color: "#0D0D0D" }}>yes</button>
        <button onClick={() => setStep("no")} className="flex-1 py-3 rounded-lg text-sm font-medium"
          style={{ background: "#1E1E1E", color: "#8A8480" }}>no</button>
      </div>
    </div>
  );
};

const PanelInput = ({ value, onChange, placeholder, type = "text" }: any) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
    style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
);

export default Index;
