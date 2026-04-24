import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, ArrowRight, ArrowDown, Lock, Star, Zap, Lightbulb, Music, Briefcase, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PLACEHOLDER_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ";

/* ── Seeded RNG ──────────────────────────────────────────────────────────── */
const rng32 = (seed: number) => {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const STARS = (() => {
  const r = rng32(42);
  return Array.from({ length: 60 }, () => ({
    x: r() * 100, y: r() * 62,
    sz: r() * 1.6 + 0.4, o: r() * 0.45 + 0.2,
    twinkle: r() > 0.9, delay: r() * 6, dur: r() * 3 + 2,
  }));
})();

/* ── Tile config — mirrors Home.tsx exactly ─────────────────────────────── */
const TILES: Record<string, { bg: string; fg: string; icon: any; label: string }> = {
  "resources": { bg: "#E8734A", fg: "#0D0D0D", icon: Star,       label: "critical info" },
  "ai-news":   { bg: "#1D6AE5", fg: "#FFFFFF", icon: Zap,         label: "ai news" },
  "ideas":     { bg: "#F5C518", fg: "#1A1500", icon: Lightbulb,   label: "ideas" },
  "vibing":    { bg: "#7C3AED", fg: "#FFFFFF", icon: Music,       label: "vibing" },
  "hiring":    { bg: "#16A34A", fg: "#FFFFFF", icon: Briefcase,   label: "hiring" },
  "wins":      { bg: "#EA580C", fg: "#FFFFFF", icon: Trophy,      label: "wins" },
};

/* ── Scroll-reveal hook ──────────────────────────────────────────────────── */
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("revealed"); obs.disconnect(); } },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
};

/* ═══════════════════════════════════════════════════════════════════════════ */
const Index = () => {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [yoloMode, setYoloMode]         = useState(false);
  const [cursor, setCursor]             = useState({ x: -200, y: -200 });
  const [cursorClick, setCursorClick]   = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(() => {
    try { return localStorage.getItem("bh-pending-email"); } catch { return null; }
  });
  const [unreadCount, setUnreadCount]     = useState(0);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [channels, setChannels]           = useState<any[]>([]);
  const [pubPreviews, setPubPreviews]     = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data: chs } = await supabase
        .from("channels")
        .select("id, slug, name, is_public_visible")
        .order("sort_order");
      if (!chs) return;
      setChannels(chs);
      const pubIds = chs.filter((c: any) => c.is_public_visible).map((c: any) => c.id);
      if (!pubIds.length) return;
      const { data: posts } = await supabase
        .from("posts")
        .select("id, channel_id, title, content")
        .in("channel_id", pubIds)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(30);
      const prev: Record<string, any> = {};
      (posts ?? []).forEach((p: any) => { if (!prev[p.channel_id]) prev[p.channel_id] = p; });
      setPubPreviews(prev);
    })();
  }, []);

  useEffect(() => {
    document.title = "builders house — a private room for people who are building";
    supabase.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle()
      .then(({ data }) => setYoloMode(!!data?.auto_yolo_enabled));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    const onDown = () => setCursorClick(true);
    const onUp   = () => setCursorClick(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  useEffect(() => {
    if (!pendingEmail) return;
    (async () => {
      const { data: req } = await supabase.from("access_requests").select("id,status")
        .eq("email", pendingEmail.toLowerCase()).maybeSingle();
      if (!req) return;
      setRequestStatus(req.status);
      const { count } = await supabase.from("onboarding_messages")
        .select("id", { count: "exact", head: true })
        .eq("request_id", req.id).eq("sender_type", "admin");
      setUnreadCount(count ?? 0);
    })();
  }, [pendingEmail]);

  const chRef   = useReveal();
  const heroRef = useReveal();
  const vslRef  = useReveal();
  const whyRef  = useReveal();
  const joinRef = useReveal();
  const ftRef   = useReveal();
  
  if (!loading && user && !profile)                         return <Navigate to="/waiting" replace />;
  if (!loading && user && profile?.is_approved)             return <Navigate to="/home"    replace />;
  if (!loading && user && profile && !profile.is_approved)  return <Navigate to="/waiting" replace />;

  return (
    <div className="bh-root">

      {/* ── Glowing cursor ─────────────────────────────────────────── */}
      <div className={`bh-cursor${cursorClick ? " pressed" : ""}`}
        style={{ left: cursor.x, top: cursor.y }} />

      {/* ── Landscape background ───────────────────────────────────── */}
      <div className="bh-sky" aria-hidden="true">
        {STARS.map((s, i) => (
          <span key={i} className={`bh-star${s.twinkle ? " twinkle" : ""}`} style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.sz * 2, height: s.sz * 2, opacity: s.o,
            animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`,
          }} />
        ))}
        <svg className="bh-mtn" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d="M0,520 L0,300 L80,240 L160,270 L260,180 L360,210 L460,140 L540,165 L640,100 L720,130 L820,80 L900,110 L1000,155 L1080,120 L1160,160 L1260,105 L1340,145 L1440,120 L1440,520 Z" fill="rgba(20,35,55,0.75)" />
          <path d="M640,100 L680,115 L720,130 L760,118 L820,80 L850,95 L900,110 L860,82 L820,78 L780,92 L720,128 L680,113 Z" fill="rgba(160,190,220,0.18)" />
          <path d="M460,140 L490,155 L540,165 L580,148 L640,100 L610,112 L540,163 L490,153 Z" fill="rgba(160,190,220,0.14)" />
          <path d="M0,520 L0,370 L100,330 L200,345 L320,290 L420,315 L520,270 L620,295 L720,255 L820,280 L920,250 L1020,275 L1120,240 L1220,265 L1340,235 L1440,255 L1440,520 Z" fill="rgba(10,28,15,0.82)" />
          <path d="M0,520 L0,420 L60,405 L120,415 L200,395 L300,410 L380,388 L460,402 L560,382 L660,395 L760,378 L860,392 L960,374 L1060,388 L1160,370 L1260,385 L1380,368 L1440,375 L1440,520 Z" fill="rgba(5,14,7,0.92)" />
          <line x1="1100" y1="240" x2="1105" y2="310" stroke="rgba(200,220,255,0.22)" strokeWidth="2.5" />
          <ellipse cx="720" cy="490" rx="380" ry="28" fill="rgba(20,80,90,0.28)" />
          <ellipse cx="720" cy="490" rx="280" ry="18" fill="rgba(27,138,138,0.15)" />
        </svg>
        <div className="bh-horizon" />
        <div className="bh-lake-glow" />
      </div>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <header className="bh-nav">
        <Link to={user ? "/home" : "/"} className="bh-logo">builders house.</Link>
        <div className="bh-nav-r">
          {user
            ? <Link to="/home"  className="bh-nav-link">dashboard <ArrowRight className="ico-xs" /></Link>
            : <Link to="/login" className="bh-tile-btn">login</Link>
          }
        </div>
      </header>

      {/* ── Return-visitor banner ──────────────────────────────────── */}
      {!user && pendingEmail && (
        <div className="bh-banner-wrap">
          <Link to="/waiting" className="bh-banner" style={{
            "--bc":  requestStatus === "approved" ? "rgba(27,154,106,0.15)" : unreadCount > 0 ? "rgba(232,115,74,0.15)" : "rgba(255,255,255,0.06)",
            "--bor": requestStatus === "approved" ? "rgba(27,154,106,0.4)"  : unreadCount > 0 ? "rgba(232,115,74,0.4)"  : "rgba(255,255,255,0.1)",
            "--bcc": requestStatus === "approved" ? "#1B9A6A"               : unreadCount > 0 ? "#E8734A"               : "#8A8480",
          } as any}>
            <Bell className="ico-xs" />
            {requestStatus === "approved" ? "you're approved — create your account"
              : unreadCount > 0 ? `${unreadCount} message${unreadCount > 1 ? "s" : ""} from the team`
              : "your request is being reviewed"}
            <ArrowRight className="ico-xs" />
          </Link>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── CHANNELS GRID — TOP OF PAGE ──────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bh-ch-section">
        <div ref={chRef} className="bh-reveal bh-ch-outer">

          <div className="bh-ch-label">
            <span className="bh-dot-sm" />
            what's inside
          </div>

          {/* ── Top two-column block ── */}
          <div className="bh-ch-top">
            {(() => {
              const ch = channels.find((c: any) => c.slug === "resources");
              return <LandingTile ch={ch} cfg={TILES["resources"]} size="big" preview={ch ? pubPreviews[ch.id] : null} />;
            })()}
            <div className="bh-ch-right">
              {["ai-news", "ideas"].map((slug) => {
                const ch = channels.find((c: any) => c.slug === slug);
                return <LandingTile key={slug} ch={ch} cfg={TILES[slug]} size="sm" preview={ch ? pubPreviews[ch.id] : null} />;
              })}
            </div>
          </div>

          {/* ── Bottom row — three equal tiles ── */}
          <div className="bh-ch-bottom">
            {["vibing", "hiring", "wins"].map((slug) => {
              const ch = channels.find((c: any) => c.slug === slug);
              return <LandingTile key={slug} ch={ch} cfg={TILES[slug]} size="bot" preview={ch ? pubPreviews[ch.id] : null} />;
            })}
          </div>

          <p className="bh-ch-hint">
            <Lock style={{ width: 10, height: 10, display: "inline-block", marginRight: 5, verticalAlign: "middle", opacity: 0.4 }} />
            locked channels unlock when you join
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── HERO ─────────────────────────────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bh-hero">
        <div ref={heroRef} className="bh-reveal bh-hero-inner">

          <div className="bh-badge">
            <span className="bh-dot" />
            a room for builders · free to join
          </div>

          <h1 className="bh-h1">
            Where builders<br />
            <span className="bh-shimmer">connect, share,</span><br />
            and ship things.
          </h1>

          <p className="bh-sub">
            A small space for people actually building —
            share work, find resources, talk to others who get it.
          </p>

          {/* WP-tile CTA block */}
          <div className="bh-tile-grid">
            <a href="#join" className="bh-tile bh-tile-coral bh-tile-wide">
              <span className="bh-tl">join the house</span>
              <ArrowDown className="ico-sm" />
            </a>
            <a href="#watch" className="bh-tile bh-tile-blue">
              <span className="bh-tl">watch</span>
              <span className="bh-tsub">3 min</span>
            </a>
            <a href="#why" className="bh-tile bh-tile-teal">
              <span className="bh-tl">why?</span>
            </a>
            <a href="#join" className="bh-tile bh-tile-dark">
              <span className="bh-tl">apply</span>
              <span className="bh-tsub">free</span>
            </a>
          </div>

          <div className="bh-stats">
            {[
              { n: "free",  l: "always"        },
              { n: "real",  l: "conversations" },
              { n: "small", l: "on purpose"    },
            ].map((s) => (
              <div key={s.l} className="bh-stat">
                <span className="bh-stat-n">{s.n}</span>
                <span className="bh-stat-l">{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bh-scroll-cue"><div className="bh-scroll-line" /></div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── VSL ──────────────────────────────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="watch" className="bh-sec">
        <div ref={vslRef} className="bh-reveal bh-vsl">
          <div className="bh-eyebrow">watch first</div>
          <h2 className="bh-sh2">What is builders house?</h2>
          <div className="bh-video-wrap glass">
            <div className="bh-corner bh-c-tl" /><div className="bh-corner bh-c-tr" />
            <div className="bh-corner bh-c-bl" /><div className="bh-corner bh-c-br" />
            <div className="bh-video-box">
              <iframe src={PLACEHOLDER_VIDEO} className="bh-iframe" allowFullScreen title="builders house intro" />
            </div>
          </div>
          <p className="bh-cap">3 minutes · worth every second</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── WHY ──────────────────────────────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="why" className="bh-sec">
        <div ref={whyRef} className="bh-reveal bh-why-wrap">
          <div className="bh-eyebrow bh-tc">the deal</div>
          <h2 className="bh-sh2 bh-tc" style={{ marginBottom: 28 }}>Why this exists.</h2>
          <div className="bh-why-mosaic">
            <div className="glass bh-why-big" style={{ borderTop: "3px solid #E8734A" }}>
              <div className="bh-why-num" style={{ color: "#E8734A" }}>01</div>
              <h3 className="bh-why-h">no noise</h3>
              <p className="bh-why-p">No viral takes, no "10x your productivity" threads. Just builders sharing what's actually working for them.</p>
              <span className="bh-why-em">🔕</span>
            </div>
            <div className="bh-why-stack">
              <div className="glass bh-why-sm" style={{ borderTop: "3px solid #1B9A6A" }}>
                <div className="bh-why-num" style={{ color: "#1B9A6A" }}>02</div>
                <h3 className="bh-why-h">kept small</h3>
                <p className="bh-why-p">More like a group chat that doesn't suck than a public forum.</p>
                <span className="bh-why-em" style={{ fontSize: 22 }}>🏠</span>
              </div>
              <div className="glass bh-why-sm" style={{ borderTop: "3px solid #1D6AE5" }}>
                <div className="bh-why-num" style={{ color: "#1D6AE5" }}>03</div>
                <h3 className="bh-why-h">free to join</h3>
                <p className="bh-why-p">Tell us what you're building. That's the only filter.</p>
                <span className="bh-why-em" style={{ fontSize: 22 }}>🚪</span>
              </div>
            </div>
            <div className="bh-why-accent" style={{ background: "linear-gradient(135deg,#0d4a4a 0%,#1B9A6A 100%)", color: "#d0f0e8" }}>
              <span style={{ fontSize: 30 }}>🏔️</span>
              <p style={{ fontSize: 13, fontWeight: 600, marginTop: 10, letterSpacing: "-0.01em" }}>built in the wild.</p>
              <p style={{ fontSize: 10, fontFamily: "monospace", marginTop: 5, opacity: 0.55, lineHeight: 1.4 }}>shipped by people who wake up and actually build.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quote break */}
      <div className="bh-quote-strip">
        <p className="bh-quote">"Finally a place that doesn't feel like a LinkedIn comment section."</p>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── JOIN ─────────────────────────────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="join" className="bh-sec">
        <div ref={joinRef} className="bh-reveal bh-join-outer">
          <div className="bh-eyebrow bh-tc">the door</div>
          <h2 className="bh-sh2 bh-tc">Come hang.</h2>
          <p className="bh-join-sub">Tell us what you're working on. Takes 2 minutes.</p>
          <div className="glass bh-join-card">
            {pendingEmail && !user
              ? <ReturningVisitorPanel
                  email={pendingEmail} status={requestStatus} unreadCount={unreadCount}
                  onClear={() => {
                    try { localStorage.removeItem("bh-pending-email"); } catch {}
                    setPendingEmail(null); setRequestStatus(null); setUnreadCount(0);
                  }}
                />
              : yoloMode ? <YoloPanel /> : <StandardJoinPanel />
            }
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── FOOTER ───────────────────────────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <footer ref={ftRef} className="bh-reveal bh-footer">
        <div className="bh-footer-top">
          <span className="bh-logo">builders house.</span>
          <div className="bh-footer-links">
            <Link to="/privacy-policy" className="bh-flink">privacy policy</Link>
          </div>
        </div>
        <div className="bh-footer-rule" />
        <div className="bh-footer-copy">
          <p className="bh-fcorp">Gopal Enterprises</p>
          <p>© 2026 Rigorawmedia. All rights reserved. This website, its content, systems, and resources are the intellectual property of Rigorawmedia. Unauthorized use, reproduction, or distribution is not permitted. By accessing this site, you agree to our copyright policies and usage terms. We reserve the right to update or modify these policies at any time without prior notice.</p>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── STYLES ───────────────────────────────────────────────────  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <style>{`

        *, *::before, *::after { cursor: none !important; box-sizing: border-box; }

        .bh-root {
          min-height: 100vh; background: #020408;
          color: #F0EBE3; font-family: inherit;
          overflow-x: hidden; position: relative;
        }

        /* ── Cursor ── */
        .bh-cursor {
          position: fixed; width: 10px; height: 10px; background: #E8734A;
          border-radius: 50%; pointer-events: none; z-index: 999999;
          transform: translate(-50%,-50%); transition: width .12s, height .12s;
          box-shadow: 0 0 8px 4px rgba(232,115,74,0.6), 0 0 20px 8px rgba(232,115,74,0.25), 0 0 40px 16px rgba(232,115,74,0.08);
          animation: bhCursorPulse 2.5s ease-in-out infinite;
        }
        .bh-cursor.pressed { width: 6px; height: 6px; box-shadow: 0 0 14px 7px rgba(232,115,74,0.9); }
        @keyframes bhCursorPulse {
          0%,100% { box-shadow: 0 0 8px 4px rgba(232,115,74,0.6), 0 0 20px 8px rgba(232,115,74,0.2); }
          50%      { box-shadow: 0 0 14px 7px rgba(232,115,74,0.8), 0 0 30px 14px rgba(232,115,74,0.3); }
        }

        /* ── Sky ── */
        .bh-sky {
          position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
          background: linear-gradient(to bottom,
            #020408 0%, #040d1c 12%, #061525 28%, #071a1a 50%, #081a0a 68%, #100c06 85%, #080404 100%
          );
        }
        .bh-star { position: absolute; border-radius: 50%; background: #fff; pointer-events: none; }
        .bh-star.twinkle { animation: bhTwinkle ease-in-out infinite alternate; }
        @keyframes bhTwinkle { 0%{opacity:0.15;transform:scale(0.6)} 100%{opacity:1;transform:scale(1.4);filter:blur(0.4px)} }
        .bh-mtn { position: absolute; bottom: 0; left: 0; right: 0; width: 100%; height: 55%; pointer-events: none; }
        .bh-horizon { position: absolute; bottom: 0; left: 0; right: 0; height: 40%; background: radial-gradient(ellipse 80% 55% at 50% 115%, rgba(232,115,74,0.20) 0%, rgba(180,60,20,0.09) 40%, transparent 100%); }
        .bh-lake-glow { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60%; height: 20%; background: radial-gradient(ellipse 100% 100% at 50% 100%, rgba(27,138,138,0.22) 0%, rgba(13,74,74,0.10) 50%, transparent 100%); }
        .bh-emoji { position: absolute; pointer-events: none; user-select: none; animation: bhFloat ease-in-out infinite alternate; filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5)); }
        .bh-emoji:nth-child(3n)   { animation-duration: 8s;  }
        .bh-emoji:nth-child(3n+1) { animation-duration: 11s; }
        .bh-emoji:nth-child(3n+2) { animation-duration: 14s; }
        @keyframes bhFloat { 0%{transform:translateY(0) rotate(0deg)} 100%{transform:translateY(-12px) rotate(3deg)} }
        .bh-orb { position: absolute; border-radius: 50%; filter: blur(120px); animation: bhDrift ease-in-out infinite alternate; pointer-events: none; }
        .bh-orb-a { width: 650px; height: 650px; background: radial-gradient(#E8734A, transparent 70%); opacity: 0.07; top: -180px; left: -160px; animation-duration: 28s; }
        .bh-orb-b { width: 480px; height: 480px; background: radial-gradient(#1D6AE5, transparent 70%); opacity: 0.08; top: 30%; right: -140px; animation-duration: 36s; animation-delay: -13s; }
        .bh-orb-c { width: 500px; height: 500px; background: radial-gradient(#1B9A6A, transparent 70%); opacity: 0.09; bottom: 5%; left: 15%; animation-duration: 22s; animation-delay: -8s; }
        .bh-orb-d { width: 360px; height: 360px; background: radial-gradient(#2d5a1a, transparent 70%); opacity: 0.10; bottom: 8%; right: 10%; animation-duration: 19s; animation-delay: -21s; }
        @keyframes bhDrift { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-22px) scale(1.05)} 100%{transform:translate(-18px,40px) scale(0.97)} }
        .bh-grain { position: absolute; inset: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"); background-size: 200px 200px; opacity: 0.035; }

        /* ── Glass ── */
        .glass { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }

        /* ── Nav ── */
        .bh-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 60; display: flex; align-items: center; justify-content: space-between; padding: 18px 36px; background: rgba(2,4,8,0.72); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.05); }
        @media (max-width:640px) { .bh-nav { padding: 16px 18px; } }
        .bh-logo { font-size: 14px; font-weight: 500; letter-spacing: -0.02em; color: #F0EBE3; text-decoration: none; }
        .bh-logo:hover { opacity: 0.7; }
        .bh-nav-r { display: flex; align-items: center; gap: 12px; }
        .bh-nav-link { font-size: 11px; font-family: monospace; letter-spacing: 0.06em; text-transform: uppercase; color: #5A5550; text-decoration: none; display: flex; align-items: center; gap: 4px; transition: color .2s; }
        .bh-nav-link:hover { color: #F0EBE3; }
        .bh-tile-btn { font-size: 11px; font-family: monospace; letter-spacing: 0.06em; text-transform: uppercase; color: #0A0A0A; background: #E8734A; padding: 8px 18px; text-decoration: none; transition: opacity .15s; }
        .bh-tile-btn:hover { opacity: 0.85; }

        /* ── Banner ── */
        .bh-banner-wrap { position: fixed; top: 66px; inset-x: 0; z-index: 50; display: flex; justify-content: center; pointer-events: none; }
        .bh-banner { pointer-events: auto; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 11px; font-family: monospace; text-decoration: none; background: var(--bc); border: 1px solid var(--bor); color: var(--bcc); backdrop-filter: blur(12px); animation: bhFadeIn .4s ease both; transition: opacity .2s; }
        .bh-banner:hover { opacity: 0.8; }

        /* ══════════════════════════════════════════════════ */
        /* ── CHANNELS — TOP SECTION ── */
        /* ══════════════════════════════════════════════════ */
        .bh-ch-section {
          position: relative; z-index: 1;
          padding: 92px 36px 0;
          display: flex; justify-content: center;
        }
        @media (max-width:640px) { .bh-ch-section { padding: 84px 18px 0; } }

        .bh-ch-outer {
          width: 100%; max-width: 620px;
        }

        .bh-ch-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 10px; font-family: monospace; letter-spacing: 0.12em;
          text-transform: uppercase; color: #5A5550;
          margin-bottom: 12px;
        }
        .bh-dot-sm {
          width: 5px; height: 5px; border-radius: 50%; background: #E8734A;
          box-shadow: 0 0 6px rgba(232,115,74,0.8);
          animation: bhPulse 2s ease-in-out infinite; flex-shrink: 0;
        }

        /* Top block: big tile + right column */
        .bh-ch-top {
          display: grid;
          grid-template-columns: 1.85fr 1fr;
          gap: 4px;
          margin-bottom: 4px;
        }

        /* Right column: two stacked */
        .bh-ch-right {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Bottom row: three equal */
        .bh-ch-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4px;
        }

        /* Base channel tile */
        .bh-ct {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: filter .15s, transform .12s;
        }
        .bh-ct:hover { filter: brightness(1.08); transform: scale(0.987); }

        /* Big tile */
        .bh-ct-big {
          height: 300px;
          padding: 18px;
        }
        @media (max-width:480px) { .bh-ct-big { height: 200px; } }

        /* Small stacked tiles */
        .bh-ct-sm {
          flex: 1;
          min-height: 0;
          padding: 14px;
        }

        /* Bottom row tiles */
        .bh-ct-bot {
          height: 130px;
          padding: 14px;
        }
        @media (max-width:480px) { .bh-ct-bot { height: 100px; } }

        .bh-ct-icon {
          width: 22px; height: 22px;
          color: rgba(255,255,255,0.7);
          flex-shrink: 0;
        }

        .bh-ct-lock {
          position: absolute;
          bottom: 36px; right: 14px;
          width: 18px; height: 18px;
          color: rgba(255,255,255,0.35);
        }

        .bh-ct-foot {
          display: flex; flex-direction: column; gap: 2px;
        }
        .bh-ct-name {
          font-size: 12px;
          font-family: monospace;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(255,255,255,0.85);
          line-height: 1.2;
        }
        .bh-ct-preview {
          font-size: 10px;
          font-family: monospace;
          opacity: 0.6;
          line-height: 1.4;
          margin-top: 3px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .bh-ch-hint {
          font-size: 10px; font-family: monospace; letter-spacing: 0.05em;
          color: #2A2520; margin-top: 10px; text-align: center;
        }

        /* ══════════════════════════════════════════════════ */
        /* ── HERO ── */
        /* ══════════════════════════════════════════════════ */
        .bh-hero {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 64px 36px 80px; text-align: center;
        }
        @media (max-width:640px) { .bh-hero { padding: 48px 18px 64px; } }
        .bh-hero-inner { max-width: 760px; width: 100%; }

        .bh-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; font-size: 11px; font-family: monospace; letter-spacing: 0.05em; color: #5A5550; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 28px; }
        .bh-dot { width: 6px; height: 6px; border-radius: 50%; background: #E8734A; flex-shrink: 0; box-shadow: 0 0 8px rgba(232,115,74,0.8); animation: bhPulse 2s ease-in-out infinite; }
        @keyframes bhPulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)} }

        .bh-h1 { font-size: clamp(34px,7.5vw,82px); font-weight: 500; line-height: 1.05; letter-spacing: -0.04em; color: #F0EBE3; margin-bottom: 18px; }
        .bh-shimmer { background: linear-gradient(120deg, #E8734A 0%, #F5C842 30%, #1B9A6A 60%, #1D6AE5 80%, #E8734A 100%); background-size: 280% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: bhShimmer 7s linear infinite; }
        @keyframes bhShimmer { 0%{background-position:0% center}100%{background-position:280% center} }
        .bh-sub { font-size: clamp(14px,2vw,17px); line-height: 1.65; color: #4A4540; max-width: 460px; margin: 0 auto 32px; }

        /* WP tiles */
        .bh-tile-grid { display: inline-grid; grid-template-columns: 190px 96px 96px 96px; grid-template-rows: 96px; gap: 3px; margin-bottom: 40px; }
        @media (max-width:560px) { .bh-tile-grid { grid-template-columns: 130px 68px 68px; grid-template-rows: 80px 80px; } .bh-tile-wide { grid-column: 1 / -1; } }
        .bh-tile { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; padding: 11px 13px; text-decoration: none; transition: opacity .15s, transform .1s; overflow: hidden; }
        .bh-tile:hover { opacity: 0.86; transform: scale(0.97); }
        .bh-tile:active { transform: scale(0.93); }
        .bh-tile-coral  { background: #E8734A; color: #0A0A0A; }
        .bh-tile-blue   { background: rgba(29,106,229,0.88); color: #fff; }
        .bh-tile-teal   { background: rgba(27,154,106,0.85); color: #fff; }
        .bh-tile-dark   { background: rgba(255,255,255,0.07); color: #F0EBE3; border: 1px solid rgba(255,255,255,0.1); }
        .bh-tl   { font-size: 11px; font-family: monospace; font-weight: 600; letter-spacing: 0.04em; line-height: 1.2; }
        .bh-tsub { font-size: 9px;  font-family: monospace; opacity: 0.65; margin-top: 3px; letter-spacing: 0.03em; }

        /* Stats */
        .bh-stats { display: flex; align-items: center; justify-content: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
        .bh-stat  { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 26px; border-right: 1px solid rgba(255,255,255,0.06); }
        .bh-stat:last-child { border-right: none; }
        @media (max-width:480px) { .bh-stat { padding: 0 14px; } }
        .bh-stat-n { font-size: 13px; font-weight: 500; color: #E8734A; }
        .bh-stat-l { font-size: 9px; font-family: monospace; letter-spacing: 0.06em; color: #3A3530; text-transform: uppercase; white-space: nowrap; }

        .bh-scroll-cue { display: none; }

        /* ── Sections ── */
        .bh-sec { position: relative; z-index: 1; padding: 80px 36px; }
        @media (max-width:640px) { .bh-sec { padding: 60px 18px; } }
        .bh-eyebrow { font-size: 10px; font-family: monospace; letter-spacing: 0.13em; text-transform: uppercase; color: #3A3530; margin-bottom: 10px; }
        .bh-sh2 { font-size: clamp(22px,4vw,40px); font-weight: 500; letter-spacing: -0.03em; color: #F0EBE3; margin-bottom: 10px; }
        .bh-tc { text-align: center; }

        /* Reveal */
        .bh-reveal { opacity: 0; transform: translateY(24px); transition: opacity .75s cubic-bezier(0.16,1,0.3,1), transform .75s cubic-bezier(0.16,1,0.3,1); }
        .bh-reveal.revealed { opacity: 1; transform: translateY(0); }
        .bh-fade-up { animation: bhFadeUp .9s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes bhFadeUp { from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)} }
        @keyframes bhFadeIn { from{opacity:0}to{opacity:1} }

        /* ── VSL ── */
        .bh-vsl { max-width: 800px; margin: 0 auto; }
        .bh-video-wrap { position: relative; padding: 8px; }
        .bh-video-box  { aspect-ratio: 16/9; overflow: hidden; background: #060c0c; }
        .bh-iframe { width: 100%; height: 100%; border: none; display: block; }
        .bh-corner { position: absolute; width: 14px; height: 14px; border-color: #E8734A; border-style: solid; opacity: 0.55; }
        .bh-c-tl { top:-1px;  left:-1px;  border-width: 2px 0 0 2px; }
        .bh-c-tr { top:-1px;  right:-1px; border-width: 2px 2px 0 0; }
        .bh-c-bl { bottom:-1px; left:-1px;  border-width: 0 0 2px 2px; }
        .bh-c-br { bottom:-1px; right:-1px; border-width: 0 2px 2px 0; }
        .bh-cap { font-size: 10px; font-family: monospace; color: #2A2520; margin-top: 10px; letter-spacing: 0.05em; text-align: center; }

        /* ── Why mosaic ── */
        .bh-why-wrap   { max-width: 860px; margin: 0 auto; }
        .bh-why-mosaic { display: grid; grid-template-columns: 1fr 1fr 155px; gap: 3px; }
        @media (max-width:700px) { .bh-why-mosaic { grid-template-columns: 1fr; } }
        .bh-why-big    { padding: 30px 26px; position: relative; overflow: hidden; }
        .bh-why-stack  { display: flex; flex-direction: column; gap: 3px; }
        .bh-why-sm     { padding: 22px 18px; position: relative; overflow: hidden; }
        .bh-why-accent { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; }
        .bh-why-num    { font-size: 9px; font-family: monospace; letter-spacing: 0.12em; margin-bottom: 10px; opacity: 0.7; }
        .bh-why-h      { font-size: 15px; font-weight: 500; letter-spacing: -0.02em; color: #F0EBE3; margin-bottom: 8px; }
        .bh-why-p      { font-size: 12px; line-height: 1.65; color: #4A4540; }
        .bh-why-em     { position: absolute; bottom: 12px; right: 14px; font-size: 28px; opacity: 0.14; pointer-events: none; }

        /* ── Quote ── */
        .bh-quote-strip { position: relative; z-index: 1; padding: 24px 36px; text-align: center; }
        .bh-quote { font-size: clamp(14px,2.3vw,21px); font-style: italic; letter-spacing: -0.02em; color: rgba(240,235,227,0.10); max-width: 520px; margin: 0 auto; line-height: 1.5; }

        /* ── Join ── */
        .bh-join-outer { max-width: 500px; margin: 0 auto; text-align: center; }
        .bh-join-sub   { font-size: 13px; color: #4A4540; margin-bottom: 20px; }
        .bh-join-card  { text-align: left; padding: 26px; }

        /* ── Form ── */
        .bh-input { width: 100%; padding: 10px 13px; font-size: 13px; color: #F0EBE3; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.08); outline: none; transition: border-color .2s; }
        .bh-input::placeholder { color: #2A2520; }
        .bh-input:focus { border-color: rgba(232,115,74,0.5); }
        .bh-ta { resize: none; }
        .bh-form-col { display: flex; flex-direction: column; gap: 8px; }
        .bh-stage-row { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
        .bh-stage-btn { text-align: left; padding: 9px 11px; font-size: 11px; font-family: monospace; color: #4A4540; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.07); transition: all .15s; }
        .bh-stage-btn:hover { color: #F0EBE3; border-color: rgba(255,255,255,0.12); }
        .bh-stage-btn.active { color: #E8734A; background: rgba(232,115,74,0.08); border-color: rgba(232,115,74,0.35); }
        .bh-sub-btn { width: 100%; padding: 12px; font-size: 12px; font-weight: 600; font-family: monospace; letter-spacing: 0.05em; color: #0A0A0A; background: #E8734A; border: none; transition: opacity .15s, transform .1s; }
        .bh-sub-btn:hover  { opacity: 0.88; transform: translateY(-1px); }
        .bh-sub-btn:active { transform: scale(0.98); }
        .bh-sub-btn:disabled { opacity: 0.35; transform: none; }

        /* ── Footer ── */
        .bh-footer { position: relative; z-index: 1; padding: 36px 36px 28px; border-top: 1px solid rgba(255,255,255,0.05); }
        @media (max-width:640px) { .bh-footer { padding: 28px 18px; } }
        .bh-footer-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .bh-footer-links { display: flex; gap: 20px; }
        .bh-flink { font-size: 10px; font-family: monospace; letter-spacing: 0.05em; color: #3A3530; text-decoration: none; transition: color .2s; }
        .bh-flink:hover { color: #E8734A; }
        .bh-footer-rule { height: 1px; background: rgba(255,255,255,0.04); margin-bottom: 20px; }
        .bh-footer-copy { font-size: 9.5px; font-family: monospace; color: #252520; line-height: 1.75; letter-spacing: 0.03em; max-width: 720px; }
        .bh-fcorp { color: #3A3530 !important; margin-bottom: 6px; font-size: 11px !important; letter-spacing: 0.07em; text-transform: uppercase; }

        .ico-xs { width: 12px; height: 12px; flex-shrink: 0; }
        .ico-sm { width: 14px; height: 14px; flex-shrink: 0; }

      `}</style>
    </div>
  );
};

/* ── LandingTile — real channel tile, mirrors BentoTile from Home.tsx ───── */
const LandingTile = ({ ch, cfg, size, preview }: { ch: any; cfg: any; size: "big" | "sm" | "bot"; preview?: any }) => {
  if (!cfg) return null;
  const Icon = cfg.icon;
  const isPublic = !!ch?.is_public_visible;
  const cls = `bh-ct bh-ct-${size}`;

  const inner = (
    <>
      <Icon className="bh-ct-icon" strokeWidth={1.5} style={{ color: cfg.fg }} />
      {!isPublic && <Lock className="bh-ct-lock" strokeWidth={1.5} />}
      <div className="bh-ct-foot">
        <span className="bh-ct-name" style={{ color: cfg.fg }}>{cfg.label}</span>
        {isPublic && preview && (
          <p className="bh-ct-preview" style={{ color: cfg.fg }}>
            {(preview.title || preview.content || "").slice(0, 60)}
          </p>
        )}
      </div>
    </>
  );

  if (isPublic && ch?.slug) {
    return (
      <Link to={`/channel/${ch.slug}`} className={cls} style={{ background: cfg.bg, textDecoration: "none" }}>
        {inner}
      </Link>
    );
  }
  return (
    <a href="#join" className={cls} style={{ background: cfg.bg, textDecoration: "none", opacity: 0.82 }}>
      {inner}
    </a>
  );
};

/* ── StandardJoinPanel ──────────────────────────────────────────────────── */
const StandardJoinPanel = () => {
  const nav = useNavigate();
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [building, setBuilding]   = useState("");
  const [stage, setStage]         = useState<"figuring"|"shipping"|"">("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy]           = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !building.trim()) { toast.error("fill in everything"); return; }
    setBusy(true);
    const { error } = await supabase.from("access_requests").insert({
      name: name.trim(), email: email.trim().toLowerCase(),
      what_building: building.trim(), room_selected: stage || null, onboard_path: "standard",
    } as any);
    setBusy(false);
    if (error) {
      if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("duplicate")) {
        try { localStorage.setItem("bh-pending-email", email.trim().toLowerCase()); } catch {}
        nav("/waiting"); return;
      }
      toast.error(error.message); return;
    }
    const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
    if (admins?.length) {
      await supabase.from("notifications").insert(admins.map((a: any) => ({
        recipient_id: a.id, type: "access_request", content: `new access request from ${name.trim()}`,
      })));
    }
    try { localStorage.setItem("bh-pending-email", email.trim().toLowerCase()); } catch {}
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <p style={{ fontSize: 18, fontWeight: 500, color: "#F0EBE3", marginBottom: 8 }}>got it.</p>
      <p style={{ fontSize: 12, color: "#5A5550", marginBottom: 14 }}>you'll hear back soon.</p>
      <Link to="/waiting" style={{ fontSize: 11, fontFamily: "monospace", color: "#E8734A", textDecoration: "none" }}>
        view your request status →
      </Link>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em", color: "#F0EBE3", marginBottom: 4 }}>want in?</p>
      <p style={{ fontSize: 11, fontFamily: "monospace", color: "#4A4540", marginBottom: 18 }}>we read every application.</p>
      <div className="bh-form-col">
        <input className="bh-input" value={name}     onChange={(e) => setName(e.target.value)}     placeholder="your name" />
        <input className="bh-input" value={email}    onChange={(e) => setEmail(e.target.value)}    placeholder="email address" type="email" />
        <textarea className="bh-input bh-ta" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="what are you building right now?" rows={4} maxLength={2000} />
        <div className="bh-stage-row">
          <button className={`bh-stage-btn${stage === "figuring" ? " active" : ""}`} onClick={() => setStage("figuring")}>still figuring it out</button>
          <button className={`bh-stage-btn${stage === "shipping" ? " active" : ""}`} onClick={() => setStage("shipping")}>shipping & making money</button>
        </div>
        <button className="bh-sub-btn" onClick={submit} disabled={busy}>{busy ? "sending…" : "request access →"}</button>
      </div>
    </div>
  );
};

/* ── ReturningVisitorPanel ──────────────────────────────────────────────── */
const ReturningVisitorPanel = ({ email, status, unreadCount, onClear }: {
  email: string; status: string | null; unreadCount: number; onClear: () => void;
}) => {
  const nav = useNavigate();

  if (status === "approved") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1B9A6A", display: "inline-block", flexShrink: 0 }} />
        <p style={{ fontSize: 16, fontWeight: 500, color: "#F0EBE3", letterSpacing: "-0.02em" }}>you're approved.</p>
      </div>
      <p style={{ fontSize: 12, color: "#5A5550", marginBottom: 18 }}>create your account to get in.</p>
      <button className="bh-sub-btn" onClick={() => nav(`/signup?email=${encodeURIComponent(email)}`)}>create account →</button>
      <button onClick={onClear} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 10, fontSize: 10, fontFamily: "monospace", color: "#3A3530", background: "none", border: "none" }}>not you?</button>
    </div>
  );

  if (status === "rejected") return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <p style={{ fontSize: 12, color: "#5A5550", marginBottom: 14 }}>your application was declined.</p>
      <button onClick={onClear} style={{ fontSize: 11, fontFamily: "monospace", color: "#E8734A", background: "none", border: "none" }}>try with a different email</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9B99A", display: "inline-block", flexShrink: 0 }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: "#F0EBE3", letterSpacing: "-0.02em" }}>request submitted.</p>
      </div>
      <p style={{ fontSize: 10, fontFamily: "monospace", color: "#4A4540", marginBottom: 16, marginLeft: 15 }}>{email}</p>
      {unreadCount > 0 && (
        <div style={{ padding: "9px 12px", marginBottom: 14, fontSize: 11, fontFamily: "monospace", background: "rgba(232,115,74,0.08)", border: "1px solid rgba(232,115,74,0.25)", color: "#E8734A" }}>
          {unreadCount} message{unreadCount > 1 ? "s" : ""} from the team
        </div>
      )}
      <Link to="/waiting"><Button className="w-full" variant="ghost">view your thread →</Button></Link>
      <button onClick={onClear} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 10, fontSize: 10, fontFamily: "monospace", color: "#3A3530", background: "none", border: "none" }}>not you?</button>
    </div>
  );
};

/* ── YoloPanel ──────────────────────────────────────────────────────────── */
const YoloPanel = () => {
  const [step, setStep]         = useState<"ask"|"yes"|"no"|"check_email">("ask");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [building, setBuilding] = useState("");
  const [busy, setBusy]         = useState(false);

const yolo = async () => {
  if (!name.trim() || !email.trim() || !building.trim()) {
    toast.error("name, email, what you're building");
    return;
  }
  setBusy(true);

  // Insert approved access request directly
  const { error: reqErr } = await supabase.from("access_requests").upsert({
  name: name.trim(),
  email: email.trim().toLowerCase(),
  what_building: building.trim(),
  cool_person_response: true,
  onboard_path: "auto_yolo",
  status: "approved",
} as any, { onConflict: "email" });

  if (reqErr) {
    toast.error(reqErr.message);
    setBusy(false);
    return;
  }

  // Send magic link — Supabase creates user + fires handle_new_user trigger
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
      data: { display_name: name.trim() },
    },
  });

  setBusy(false);
  if (otpErr) { toast.error(otpErr.message); return; }
  setStep("check_email");
};

  if (step === "no") return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <p style={{ fontSize: 17, fontWeight: 500, color: "#F0EBE3", marginBottom: 8 }}>fair enough.</p>
      <p style={{ fontSize: 12, color: "#5A5550" }}>maybe another time.</p>
    </div>
  );

  if (step === "check_email") return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <p style={{ fontSize: 17, fontWeight: 500, color: "#F0EBE3", marginBottom: 8, letterSpacing: "-0.02em" }}>check your email.</p>
      <p style={{ fontSize: 12, color: "#5A5550", marginBottom: 6 }}>we sent a link to <span style={{ color: "#A09890" }}>{email}</span></p>
      <p style={{ fontSize: 11, fontFamily: "monospace", color: "#3A3530" }}>click it to get in. check spam if you don't see it.</p>
    </div>
  );

  if (step === "yes") return (
    <div>
      <p style={{ fontSize: 17, fontWeight: 500, color: "#F0EBE3", marginBottom: 4, letterSpacing: "-0.02em" }}>cool. quick details.</p>
      <p style={{ fontSize: 11, fontFamily: "monospace", color: "#4A4540", marginBottom: 18 }}>verify your email to get in.</p>
      <div className="bh-form-col">
        <input className="bh-input" value={name}     onChange={(e) => setName(e.target.value)}     placeholder="name" />
        <input className="bh-input" value={email}    onChange={(e) => setEmail(e.target.value)}    placeholder="email" type="email" />
        <textarea className="bh-input bh-ta" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="what are you building?" rows={3} />
        <button className="bh-sub-btn" onClick={yolo} disabled={busy}>{busy ? "sending link…" : "let me in →"}</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "6px 0" }}>
      <p style={{ fontSize: 20, fontWeight: 500, color: "#F0EBE3", letterSpacing: "-0.03em", textAlign: "center", marginBottom: 4 }}>are you a cool person?</p>
      <p style={{ fontSize: 10, fontFamily: "monospace", color: "#4A4540", textAlign: "center", marginBottom: 22 }}>honest answer only</p>
      <div style={{ display: "flex", gap: 3 }}>
        <button className="bh-sub-btn" style={{ flex: 1 }} onClick={() => setStep("yes")}>yes</button>
        <button onClick={() => setStep("no")} style={{ flex: 1, padding: "12px", fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "#5A5550", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", transition: "opacity .15s" }}>no</button>
      </div>
    </div>
  );
};

export default Index;
