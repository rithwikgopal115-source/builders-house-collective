import { useEffect, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Pin, Zap, Lightbulb, Music, Briefcase, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PLACEHOLDER_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ"; // swap when ready
const VIDEO_SEEN_KEY = "bh_video_seen_v1";

interface Channel { id: string; slug: string; name: string; icon: string | null; color: string | null; is_public_visible: boolean | null; sort_order: number | null; }

// Vivid Windows Phone live-tile palette
const TILES: Record<string, { bg: string; fg: string; icon: any; glow?: boolean }> = {
  "resources": { bg: "#E8734A", fg: "#0D0D0D", icon: Pin, glow: true },
  "ai-news":   { bg: "#1D6AE5", fg: "#FFFFFF", icon: Zap },
  "ideas":     { bg: "#F5C518", fg: "#1A1500", icon: Lightbulb },
  "vibing":    { bg: "#7C3AED", fg: "#FFFFFF", icon: Music },
  "hiring":    { bg: "#16A34A", fg: "#FFFFFF", icon: Briefcase },
  "wins":      { bg: "#EA580C", fg: "#FFFFFF", icon: Trophy },
};

const Index = () => {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();

  // Show video only on the first visit per browser session (sessionStorage).
  // Spec asks for "every page load" but the user reported it kept reappearing
  // on every internal navigation, so we scope it to the session.
  const [showVideo, setShowVideo] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(VIDEO_SEEN_KEY);
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [yoloMode, setYoloMode] = useState<boolean>(false);
  const [lockedModal, setLockedModal] = useState<string | null>(null);

  useEffect(() => {
    document.title = "builders house — a private room for people who are building";
    const m = document.querySelector('meta[name="description"]');
    const desc = "private community for builders. shipping or still figuring it out — request access.";
    if (m) m.setAttribute("content", desc);
    else {
      const meta = document.createElement("meta");
      meta.name = "description"; meta.content = desc;
      document.head.appendChild(meta);
    }

    supabase.from("channels").select("*").order("sort_order").then(({ data }) => setChannels(data ?? []));
    supabase.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => setYoloMode(!!data?.auto_yolo_enabled));
  }, []);

  const dismissVideo = () => {
    sessionStorage.setItem(VIDEO_SEEN_KEY, "1");
    setShowVideo(false);
  };

  // Send approved members straight to /home — never bounce them back to landing.
  if (!loading && user && profile?.is_approved) return <Navigate to="/home" replace />;
  if (!loading && user && profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const openTile = (c: Channel) => {
    if (c.is_public_visible) nav(`/channel/${c.slug}`);
    else setLockedModal(c.name);
  };

  const get = (slug: string) => channels.find((c) => c.slug === slug);

  return (
    <div className="min-h-screen relative" style={{ background: "#0D0D0D" }}>
      {/* Top minimal nav */}
      <nav className="absolute top-0 inset-x-0 z-10 px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="font-medium text-sm tracking-tight" style={{ color: "#F5F0EB" }}>builders house</div>
        <Link to="/login" className="text-xs font-mono uppercase tracking-wider hover:text-primary transition-colors" style={{ color: "#8A8480" }}>login</Link>
      </nav>

      {/* Main layout */}
      <div className={`min-h-screen pt-20 pb-10 px-6 md:px-10 transition-all ${showVideo ? "blur-sm pointer-events-none" : ""}`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 max-w-7xl mx-auto">
          {/* Tile grid — Windows Phone live tiles, tight 8px gaps */}
          <div className="grid grid-cols-4 auto-rows-[110px] md:auto-rows-[140px] gap-2">
            {/* Resources — 2x2 coral with pulsing glow */}
            <Tile channel={get("resources")} onClick={openTile} className="col-span-2 row-span-2" />
            <Tile channel={get("ai-news")}   onClick={openTile} className="col-span-2 row-span-1" />
            <Tile channel={get("ideas")}     onClick={openTile} className="col-span-2 row-span-1" />
            <Tile channel={get("vibing")}    onClick={openTile} className="col-span-2 row-span-1" locked />
            <Tile channel={get("hiring")}    onClick={openTile} className="col-span-1 row-span-1" locked />
            <Tile channel={get("wins")}      onClick={openTile} className="col-span-1 row-span-1" locked />
          </div>

          {/* Join panel */}
          <div className="rounded-2xl p-6 md:p-7 self-start" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            {yoloMode ? <YoloPanel /> : <StandardJoinPanel />}
          </div>
        </div>
      </div>

      {/* Video overlay — first-session only */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
          <div className="w-full max-w-2xl">
            <h2 className="text-xl md:text-2xl font-medium mb-5 text-center" style={{ color: "#F5F0EB" }}>what is builders house?</h2>
            <div className="aspect-video rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <iframe src={PLACEHOLDER_VIDEO} className="w-full h-full" allowFullScreen title="builders house" />
            </div>
            <div className="mt-5 text-center">
              <button onClick={dismissVideo} className="text-sm hover:opacity-80 transition-opacity" style={{ color: "#8A8480" }}>
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
            <p className="text-sm mb-6" style={{ color: "#8A8480" }}>{lockedModal?.toLowerCase()} is for approved builders.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setLockedModal(null); window.scrollTo({ top: 0 }); }}>request access</Button>
              <Link to="/login"><Button variant="ghost">log in</Button></Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Tile = ({ channel, onClick, className = "", locked }: any) => {
  if (!channel) return <div className={`rounded-2xl ${className}`} style={{ background: "#0F0F0F" }} />;
  const cfg = TILES[channel.slug] ?? { bg: "#161616", fg: "#F5F0EB", icon: Pin };
  const Icon = cfg.icon;
  return (
    <button
      onClick={() => onClick(channel)}
      className={`group relative rounded-2xl flex items-center justify-center overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{
        background: cfg.bg,
        boxShadow: cfg.glow ? "0 0 24px rgba(232,115,74,0.5)" : undefined,
        animation: cfg.glow ? "tilePulse 3s ease-in-out infinite" : undefined,
      }}
    >
      <Icon style={{ color: cfg.fg }} className="h-10 w-10 md:h-12 md:w-12" strokeWidth={1.75} />
      {locked && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <Lock className="h-7 w-7" style={{ color: "#F5F0EB" }} strokeWidth={2} />
        </div>
      )}
      <style>{`@keyframes tilePulse { 0%,100% { box-shadow: 0 0 24px rgba(232,115,74,0.5); } 50% { box-shadow: 0 0 40px rgba(232,115,74,0.8); } }`}</style>
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
      await supabase.from("notifications").insert(admins.map((a) => ({
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

  if (step === "no") {
    return (
      <div className="py-8 text-center">
        <p className="text-lg font-medium mb-2" style={{ color: "#F5F0EB" }}>fair enough.</p>
        <p className="text-sm" style={{ color: "#8A8480" }}>maybe another time.</p>
      </div>
    );
  }

  if (step === "yes") {
    return (
      <div>
        <h2 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB" }}>cool. quick details.</h2>
        <p className="text-xs font-mono mb-5" style={{ color: "#8A8480" }}>you'll be in immediately.</p>
        <div className="space-y-3">
          <PanelInput value={name} onChange={setName} placeholder="name" />
          <PanelInput value={email} onChange={setEmail} placeholder="email" type="email" />
          <textarea value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="what are you building?"
            rows={3}
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 resize-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }} />
          <Button onClick={yolo} disabled={busy} className="w-full">{busy ? "letting you in…" : "let me in"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h2 className="text-2xl font-medium mb-6 text-center" style={{ color: "#F5F0EB" }}>are you a cool person?</h2>
      <div className="flex gap-3">
        <button onClick={() => setStep("yes")} className="flex-1 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "#E8734A", color: "#0D0D0D" }}>yes</button>
        <button onClick={() => setStep("no")} className="flex-1 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "#1E1E1E", color: "#8A8480" }}>no</button>
      </div>
    </div>
  );
};

const PanelInput = ({ value, onChange, placeholder, type = "text" }: any) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1"
    style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB" }}
  />
);

export default Index;
