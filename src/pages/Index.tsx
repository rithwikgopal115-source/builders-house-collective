import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Pin, Zap, Lightbulb, Music, Briefcase, Trophy, X } from "lucide-react";

const PLACEHOLDER_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ"; // swap when ready

interface Channel { id: string; slug: string; name: string; icon: string | null; color: string | null; is_public_visible: boolean | null; sort_order: number | null; }

const Index = () => {
  const nav = useNavigate();
  const [showVideo, setShowVideo] = useState(true);
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
          {/* Tile grid */}
          <div className="grid grid-cols-4 auto-rows-[110px] md:auto-rows-[140px] gap-3">
            {/* Resources — 2x2 coral with pulsing glow */}
            <Tile
              channel={get("resources")}
              onClick={openTile}
              className="col-span-2 row-span-2"
              icon={Pin}
              bg="#E8734A"
              fg="#0D0D0D"
              glow
            />
            <Tile channel={get("ai-news")} onClick={openTile} className="col-span-2 row-span-1" icon={Zap} bg="#1A3A3A" fg="#F5F0EB" />
            <Tile channel={get("ideas")} onClick={openTile} className="col-span-2 row-span-1" icon={Lightbulb} bg="#2A1F0A" fg="#C9B99A" />
            <Tile channel={get("vibing")} onClick={openTile} className="col-span-2 row-span-1" icon={Music} bg="#161616" fg="#8A8480" locked />
            <Tile channel={get("hiring")} onClick={openTile} className="col-span-1 row-span-1" icon={Briefcase} bg="#161616" fg="#8A8480" locked />
            <Tile channel={get("wins")} onClick={openTile} className="col-span-1 row-span-1" icon={Trophy} bg="#161616" fg="#8A8480" locked />
          </div>

          {/* Join panel */}
          <div className="rounded-2xl p-6 md:p-7 self-start" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            {yoloMode ? <YoloPanel /> : <StandardJoinPanel channels={channels} />}
          </div>
        </div>
      </div>

      {/* Video overlay */}
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

const Tile = ({ channel, onClick, className = "", icon: Icon, bg, fg, locked, glow }: any) => {
  if (!channel) return <div className={`rounded-2xl ${className}`} style={{ background: "#0F0F0F" }} />;
  return (
    <button
      onClick={() => onClick(channel)}
      className={`group relative rounded-2xl flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{
        background: bg,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: glow ? "0 0 24px rgba(232,115,74,0.5)" : undefined,
        animation: glow ? "tilePulse 3s ease-in-out infinite" : undefined,
      }}
    >
      <Icon style={{ color: fg }} className="h-8 w-8 md:h-10 md:w-10" strokeWidth={1.5} />
      {locked && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <Lock className="h-6 w-6" style={{ color: "#8A8480" }} strokeWidth={1.5} />
        </div>
      )}
      <style>{`@keyframes tilePulse { 0%,100% { box-shadow: 0 0 24px rgba(232,115,74,0.5); } 50% { box-shadow: 0 0 36px rgba(232,115,74,0.7); } }`}</style>
    </button>
  );
};

const StandardJoinPanel = ({ channels }: { channels: Channel[] }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const [room, setRoom] = useState("resources");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !building.trim()) { toast.error("fill in everything"); return; }
    setBusy(true);
    const { error } = await supabase.from("access_requests").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      what_building: building.trim(),
      room_selected: room,
      onboard_path: "standard",
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    // notify admins
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
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>which room fits you?</p>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((c) => (
              <button key={c.id} onClick={() => setRoom(c.slug)} type="button"
                className="text-left p-2.5 rounded-lg text-xs transition-colors"
                style={{
                  background: room === c.slug ? "#1E1E1E" : "#0D0D0D",
                  border: room === c.slug ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.06)",
                  color: room === c.slug ? "#E8734A" : "#8A8480",
                }}>
                {c.name.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full">{busy ? "sending…" : "request access"}</Button>
      </div>
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
      // sign them in directly
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
