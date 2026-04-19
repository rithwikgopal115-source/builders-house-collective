import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, ArrowRight, ArrowDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PLACEHOLDER_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ";

/* ─── Intersection observer hook for scroll-in animations ─────────────────── */
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("revealed"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
};

/* ─── Main page ───────────────────────────────────────────────────────────── */
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
        .from("access_requests").select("id, status")
        .eq("email", pendingEmail.toLowerCase()).maybeSingle();
      if (!req) return;
      setRequestStatus(req.status);
      const { count } = await supabase
        .from("onboarding_messages").select("id", { count: "exact", head: true })
        .eq("request_id", req.id).eq("sender_type", "admin");
      setUnreadCount(count ?? 0);
    };
    fetchStatus();
  }, [pendingEmail]);

  if (!loading && user && !profile) return <Navigate to="/waiting" replace />;
  if (!loading && user && profile?.is_approved) return <Navigate to="/home" replace />;
  if (!loading && user && profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const vslRef = useReveal();
  const whyRef = useReveal();
  const joinRef = useReveal();

  return (
    <div className="bh-root">

      {/* ── Canvas: orbs + grain ─────────────────────────────────────── */}
      <div className="bh-canvas" aria-hidden>
        <div className="bh-orb bh-orb-coral" />
        <div className="bh-orb bh-orb-blue" />
        <div className="bh-orb bh-orb-purple" />
        <div className="bh-grain" />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="bh-nav">
        <Link to={user ? "/home" : "/"} className="bh-wordmark">builders house.</Link>
        <nav className="bh-nav-links">
          {user ? (
            <Link to="/home" className="bh-nav-link">dashboard <ArrowRight className="bh-icon-xs" /></Link>
          ) : (
            <Link to="/login" className="bh-nav-link">login</Link>
          )}
        </nav>
      </header>

      {/* ── Returning visitor pill ───────────────────────────────────── */}
      {!user && pendingEmail && (
        <div className="bh-pill-wrap">
          <Link to="/waiting" className="bh-pill"
            style={{
              "--pill-bg": requestStatus === "approved" ? "rgba(122,200,160,0.1)" : unreadCount > 0 ? "rgba(232,115,74,0.1)" : "rgba(255,255,255,0.04)",
              "--pill-border": requestStatus === "approved" ? "rgba(122,200,160,0.3)" : unreadCount > 0 ? "rgba(232,115,74,0.3)" : "rgba(255,255,255,0.1)",
              "--pill-color": requestStatus === "approved" ? "#7AC8A0" : unreadCount > 0 ? "#E8734A" : "#8A8480",
            } as any}
          >
            <Bell className="bh-icon-xs" />
            {requestStatus === "approved"
              ? "you're approved — create your account"
              : unreadCount > 0
                ? `${unreadCount} message${unreadCount > 1 ? "s" : ""} from the team`
                : "your request is being reviewed"}
            <ArrowRight className="bh-icon-xs" />
          </Link>
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="bh-hero">
        <div className="bh-hero-inner">

          <div className="bh-badge">
            <span className="bh-badge-dot" />
            a room for builders · free to join
          </div>

          <h1 className="bh-hero-h1">
            Where builders
            <br className="bh-hero-br" />
            <span className="bh-shimmer">connect, share, and</span>
            <br className="bh-hero-br" />
            actually get things done.
          </h1>

          <p className="bh-hero-sub">
            A small online space for people who are building something —
            share what you're working on, find resources, and talk to
            others who get it.
          </p>

          <div className="bh-hero-ctas">
            <a href="#join" className="bh-cta-primary">
              join the house
              <ArrowDown className="bh-icon-sm" />
            </a>
            <a href="#watch" className="bh-cta-ghost">
              see what's inside
            </a>
          </div>

          <div className="bh-stats">
            {[
              { n: "free", l: "always" },
              { n: "zero", l: "hustle bro energy" },
              { n: "real", l: "conversations" },
            ].map((s) => (
              <div key={s.l} className="bh-stat">
                <span className="bh-stat-n">{s.n}</span>
                <span className="bh-stat-l">{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bh-scroll-cue">
          <div className="bh-scroll-line" />
        </div>
      </section>

      {/* ── VSL ─────────────────────────────────────────────────────── */}
      <section id="watch" className="bh-section">
        <div ref={vslRef} className="bh-reveal bh-vsl-wrap">
          <div className="bh-section-label">watch first</div>
          <h2 className="bh-section-h2">What is builders house?</h2>
          <div className="bh-video-frame">
            <div className="bh-video-inner">
              <iframe
                src={PLACEHOLDER_VIDEO}
                className="bh-iframe"
                allowFullScreen
                title="builders house — what is this?"
              />
            </div>
            <div className="bh-corner bh-corner-tl" />
            <div className="bh-corner bh-corner-tr" />
            <div className="bh-corner bh-corner-bl" />
            <div className="bh-corner bh-corner-br" />
          </div>
          <p className="bh-video-caption">3 minutes · worth every second</p>
        </div>
      </section>

      {/* ── Why ─────────────────────────────────────────────────────── */}
      <section className="bh-section bh-why-section">
        <div ref={whyRef} className="bh-reveal bh-why-grid">
          {[
            {
              n: "01",
              label: "no noise",
              body: "No viral takes, no \"10x your productivity\" threads. Just people sharing what they're building and what's actually working for them.",
            },
            {
              n: "02",
              label: "kept small",
              body: "It's not a big public forum. It's more like a group chat that doesn't suck — small enough that people actually know each other.",
            },
            {
              n: "03",
              label: "free to join",
              body: "You just tell us what you're working on. That's it. If you're building something, you're welcome here.",
            },
          ].map((item) => (
            <div key={item.n} className="bh-why-card">
              <div className="bh-why-n">{item.n}</div>
              <h3 className="bh-why-label">{item.label}</h3>
              <p className="bh-why-body">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider quote ────────────────────────────────────────────── */}
      <section className="bh-quote-section">
        <blockquote className="bh-quote">
          "Finally a place that doesn't feel like a LinkedIn comment section."
        </blockquote>
      </section>

      {/* ── Join ────────────────────────────────────────────────────── */}
      <section id="join" className="bh-section bh-join-section">
        <div ref={joinRef} className="bh-reveal bh-join-wrap">
          <div className="bh-section-label">the door</div>
          <h2 className="bh-section-h2">Come hang.</h2>
          <p className="bh-join-sub">Tell us what you're working on and we'll get you in. Takes 2 minutes.</p>
          <div className="bh-join-card">
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

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bh-footer">
        <span className="bh-footer-text">builders house</span>
        <span className="bh-footer-sep">·</span>
        <span className="bh-footer-text">a private room for people who are building</span>
      </footer>

      <style>{`
        .bh-root {
          min-height: 100vh;
          background: #0A0A0A;
          color: #F0EBE3;
          font-family: inherit;
          overflow-x: hidden;
          position: relative;
        }
        .bh-canvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }
        .bh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          animation: bhDrift ease-in-out infinite alternate;
        }
        .bh-orb-coral {
          width: 700px; height: 700px;
          background: radial-gradient(circle, #E8734A 0%, transparent 70%);
          opacity: 0.12;
          top: -250px; left: -200px;
          animation-duration: 24s;
        }
        .bh-orb-blue {
          width: 550px; height: 550px;
          background: radial-gradient(circle, #1D6AE5 0%, transparent 70%);
          opacity: 0.10;
          top: 35%; right: -200px;
          animation-duration: 30s;
          animation-delay: -10s;
        }
        .bh-orb-purple {
          width: 450px; height: 450px;
          background: radial-gradient(circle, #7C3AED 0%, transparent 70%);
          opacity: 0.10;
          bottom: 5%; left: 15%;
          animation-duration: 20s;
          animation-delay: -16s;
        }
        @keyframes bhDrift {
          0%   { transform: translate(0px,   0px)  scale(1);    }
          33%  { transform: translate(50px,  -40px) scale(1.06); }
          66%  { transform: translate(-30px,  60px) scale(0.96); }
          100% { transform: translate(40px,   25px) scale(1.04); }
        }
        .bh-grain {
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E");
          background-size: 220px 220px;
          opacity: 0.035;
        }
        .bh-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          background: rgba(10,10,10,0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        @media (max-width: 640px) { .bh-nav { padding: 18px 20px; } }
        .bh-wordmark {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: #F0EBE3;
          text-decoration: none;
          transition: opacity .2s;
        }
        .bh-wordmark:hover { opacity: 0.7; }
        .bh-nav-links { display: flex; align-items: center; gap: 24px; }
        .bh-nav-link {
          font-size: 12px;
          font-family: monospace;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #6B6560;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color .2s;
        }
        .bh-nav-link:hover { color: #F0EBE3; }
        .bh-pill-wrap {
          position: fixed;
          top: 72px; left: 0; right: 0;
          z-index: 50;
          display: flex;
          justify-content: center;
          padding: 0 20px;
          pointer-events: none;
        }
        .bh-pill {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 11px;
          font-family: monospace;
          text-decoration: none;
          border-radius: 99px;
          background: var(--pill-bg);
          border: 1px solid var(--pill-border);
          color: var(--pill-color);
          backdrop-filter: blur(12px);
          transition: opacity .2s;
          animation: bhFadeIn .4s ease both;
        }
        .bh-pill:hover { opacity: 0.8; }
        .bh-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 120px 40px 80px;
          text-align: center;
          z-index: 1;
        }
        @media (max-width: 640px) { .bh-hero { padding: 100px 20px 60px; } }
        .bh-hero-inner {
          max-width: 780px;
          width: 100%;
          animation: bhFadeUp .9s cubic-bezier(0.16,1,0.3,1) both;
        }
        .bh-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          font-size: 11px;
          font-family: monospace;
          letter-spacing: 0.05em;
          color: #6B6560;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          margin-bottom: 32px;
        }
        .bh-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #E8734A;
          box-shadow: 0 0 8px rgba(232,115,74,0.6);
          animation: bhPulse 2s ease-in-out infinite;
        }
        @keyframes bhPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(0.85); }
        }
        .bh-hero-h1 {
          font-size: clamp(36px, 7vw, 80px);
          font-weight: 500;
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: #F0EBE3;
          margin-bottom: 24px;
        }
        .bh-hero-br { display: block; }
        .bh-shimmer {
          background: linear-gradient(120deg, #E8734A 0%, #F5C842 40%, #E8734A 80%);
          background-size: 220% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: bhShimmer 5s linear infinite;
        }
        @keyframes bhShimmer {
          0%   { background-position: 0%   center; }
          100% { background-position: 220% center; }
        }
        .bh-hero-sub {
          font-size: clamp(15px, 2vw, 18px);
          line-height: 1.65;
          color: #6B6560;
          max-width: 520px;
          margin: 0 auto 40px;
        }
        .bh-hero-ctas {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 56px;
        }
        .bh-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          font-size: 14px;
          font-weight: 500;
          font-family: monospace;
          letter-spacing: 0.03em;
          color: #0A0A0A;
          background: #E8734A;
          border-radius: 99px;
          text-decoration: none;
          transition: transform .2s, box-shadow .2s;
        }
        .bh-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(232,115,74,0.35);
        }
        .bh-cta-primary:active { transform: translateY(0); }
        .bh-cta-ghost {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 14px 24px;
          font-size: 13px;
          font-family: monospace;
          letter-spacing: 0.03em;
          color: #6B6560;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          text-decoration: none;
          transition: color .2s, background .2s;
        }
        .bh-cta-ghost:hover { color: #F0EBE3; background: rgba(255,255,255,0.07); }
        .bh-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .bh-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 0 32px;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .bh-stat:last-child { border-right: none; }
        @media (max-width: 500px) { .bh-stat { padding: 0 16px; } }
        .bh-stat-n {
          font-size: 13px;
          font-weight: 500;
          color: #E8734A;
        }
        .bh-stat-l {
          font-size: 10px;
          font-family: monospace;
          letter-spacing: 0.05em;
          color: #4A4540;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .bh-scroll-cue {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          animation: bhBounce 2.4s ease-in-out infinite;
        }
        .bh-scroll-line {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, rgba(240,235,227,0), rgba(240,235,227,0.2));
        }
        @keyframes bhBounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(8px); }
        }
        .bh-section {
          position: relative;
          z-index: 1;
          padding: 80px 40px;
        }
        @media (max-width: 640px) { .bh-section { padding: 60px 20px; } }
        .bh-section-label {
          font-size: 10px;
          font-family: monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4A4540;
          margin-bottom: 12px;
          text-align: center;
        }
        .bh-section-h2 {
          font-size: clamp(24px, 4vw, 40px);
          font-weight: 500;
          letter-spacing: -0.03em;
          color: #F0EBE3;
          text-align: center;
          margin-bottom: 12px;
        }
        .bh-reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity .7s cubic-bezier(0.16,1,0.3,1), transform .7s cubic-bezier(0.16,1,0.3,1);
        }
        .bh-reveal.revealed { opacity: 1; transform: translateY(0); }
        .bh-vsl-wrap { max-width: 800px; margin: 0 auto; }
        .bh-video-frame {
          position: relative;
          padding: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          backdrop-filter: blur(12px);
        }
        .bh-video-inner {
          aspect-ratio: 16/9;
          overflow: hidden;
          border-radius: 12px;
          background: #111;
        }
        .bh-iframe { width: 100%; height: 100%; border: none; display: block; }
        .bh-corner {
          position: absolute;
          width: 16px; height: 16px;
          border-color: #E8734A;
          border-style: solid;
          opacity: 0.5;
        }
        .bh-corner-tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
        .bh-corner-tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
        .bh-corner-bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
        .bh-corner-br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }
        .bh-video-caption {
          text-align: center;
          font-size: 11px;
          font-family: monospace;
          color: #3A3530;
          margin-top: 14px;
          letter-spacing: 0.04em;
        }
        .bh-why-section { max-width: 1000px; margin: 0 auto; }
        .bh-why-grid {
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 700px) { .bh-why-grid { grid-template-columns: 1fr; } }
        .bh-why-card {
          padding: 28px 24px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          backdrop-filter: blur(8px);
          transition: background .2s, border-color .2s;
        }
        .bh-why-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.10); }
        .bh-why-n {
          font-size: 10px;
          font-family: monospace;
          letter-spacing: 0.1em;
          color: #E8734A;
          margin-bottom: 14px;
          opacity: 0.7;
        }
        .bh-why-label {
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: #F0EBE3;
          margin-bottom: 10px;
        }
        .bh-why-body { font-size: 13px; line-height: 1.7; color: #5A5550; }
        .bh-quote-section {
          position: relative;
          z-index: 1;
          padding: 40px 40px 20px;
          text-align: center;
        }
        .bh-quote {
          font-size: clamp(18px, 3vw, 28px);
          font-weight: 400;
          font-style: italic;
          letter-spacing: -0.02em;
          color: rgba(240,235,227,0.15);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
        }
        .bh-join-section { max-width: 560px; margin: 0 auto; }
        .bh-join-wrap { text-align: center; }
        .bh-join-sub { font-size: 14px; color: #5A5550; margin-bottom: 28px; line-height: 1.6; }
        .bh-join-card {
          text-align: left;
          padding: 32px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .bh-input {
          width: 100%;
          padding: 11px 14px;
          font-size: 14px;
          color: #F0EBE3;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          outline: none;
          transition: border-color .2s;
          box-sizing: border-box;
        }
        .bh-input::placeholder { color: #3A3530; }
        .bh-input:focus { border-color: rgba(232,115,74,0.5); }
        .bh-textarea { resize: none; }
        .bh-stage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .bh-stage-btn {
          text-align: left;
          padding: 10px 12px;
          font-size: 12px;
          color: #5A5550;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          cursor: pointer;
          transition: all .15s;
        }
        .bh-stage-btn:hover { color: #F0EBE3; border-color: rgba(255,255,255,0.14); }
        .bh-stage-btn.active { color: #E8734A; background: rgba(232,115,74,0.08); border-color: rgba(232,115,74,0.4); }
        .bh-submit {
          width: 100%;
          padding: 13px;
          font-size: 13px;
          font-weight: 500;
          font-family: monospace;
          letter-spacing: 0.04em;
          color: #0A0A0A;
          background: #E8734A;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: opacity .2s, transform .15s;
        }
        .bh-submit:hover { opacity: 0.88; transform: translateY(-1px); }
        .bh-submit:active { transform: translateY(0); }
        .bh-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .bh-form-space { display: flex; flex-direction: column; gap: 10px; }
        .bh-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 28px 40px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .bh-footer-text { font-size: 11px; font-family: monospace; color: #2A2520; letter-spacing: 0.04em; }
        .bh-footer-sep { color: #2A2520; font-size: 11px; }
        .bh-icon-xs { width: 12px; height: 12px; flex-shrink: 0; }
        .bh-icon-sm { width: 14px; height: 14px; flex-shrink: 0; }
        @keyframes bhFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bhFadeIn {
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
        nav("/waiting"); return;
      }
      toast.error(error.message); return;
    }
    const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
    if (admins?.length) {
      await supabase.from("notifications").insert(admins.map((a: any) => ({
        recipient_id: a.id, type: "access_request",
        content: `new access request from ${name.trim()}`,
      })));
    }
    try { localStorage.setItem("bh-pending-email", email.trim().toLowerCase()); } catch {}
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <p style={{ fontSize: 18, fontWeight: 500, color: "#F0EBE3", marginBottom: 8 }}>got it.</p>
      <p style={{ fontSize: 13, color: "#5A5550", marginBottom: 16 }}>you'll hear back soon.</p>
      <Link to="/waiting" style={{ fontSize: 12, fontFamily: "monospace", color: "#E8734A", textDecoration: "none" }}>
        view your request status →
      </Link>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", color: "#F0EBE3", marginBottom: 4 }}>want in?</p>
      <p style={{ fontSize: 12, fontFamily: "monospace", color: "#4A4540", marginBottom: 22 }}>we read every application.</p>
      <div className="bh-form-space">
        <input className="bh-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" />
        <input className="bh-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email address" type="email" />
        <textarea className="bh-input bh-textarea" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="what are you building right now?" rows={4} maxLength={2000} />
        <div className="bh-stage-grid">
          <button className={`bh-stage-btn${stage === "figuring" ? " active" : ""}`} onClick={() => setStage("figuring")}>still figuring it out</button>
          <button className={`bh-stage-btn${stage === "shipping" ? " active" : ""}`} onClick={() => setStage("shipping")}>shipping & making money</button>
        </div>
        <button className="bh-submit" onClick={submit} disabled={busy}>{busy ? "sending…" : "request access →"}</button>
      </div>
    </div>
  );
};

const ReturningVisitorPanel = ({ email, status, unreadCount, onClear }: {
  email: string; status: string | null; unreadCount: number; onClear: () => void;
}) => {
  const nav = useNavigate();

  if (status === "approved") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7AC8A0", flexShrink: 0, display: "inline-block" }} />
        <p style={{ fontSize: 17, fontWeight: 500, color: "#F0EBE3", letterSpacing: "-0.02em" }}>you're approved.</p>
      </div>
      <p style={{ fontSize: 13, color: "#5A5550", marginBottom: 20 }}>create your account to get in.</p>
      <button className="bh-submit" onClick={() => nav(`/signup?email=${encodeURIComponent(email)}`)}>create account →</button>
      <button onClick={onClear} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 12, fontSize: 11, fontFamily: "monospace", color: "#3A3530", background: "none", border: "none", cursor: "pointer" }}>not you?</button>
    </div>
  );

  if (status === "rejected") return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <p style={{ fontSize: 13, color: "#5A5550", marginBottom: 16 }}>your application was declined.</p>
      <button onClick={onClear} style={{ fontSize: 12, fontFamily: "monospace", color: "#E8734A", background: "none", border: "none", cursor: "pointer" }}>try with a different email</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C9B99A", flexShrink: 0, display: "inline-block" }} />
        <p style={{ fontSize: 15, fontWeight: 500, color: "#F0EBE3", letterSpacing: "-0.02em" }}>request submitted.</p>
      </div>
      <p style={{ fontSize: 11, fontFamily: "monospace", color: "#4A4540", marginBottom: 18, marginLeft: 15 }}>{email}</p>
      {unreadCount > 0 && (
        <div style={{ padding: "10px 14px", marginBottom: 16, fontSize: 12, fontFamily: "monospace", background: "rgba(232,115,74,0.08)", border: "1px solid rgba(232,115,74,0.25)", borderRadius: 8, color: "#E8734A" }}>
          {unreadCount} message{unreadCount > 1 ? "s" : ""} from the team
        </div>
      )}
      <Link to="/waiting"><Button className="w-full" variant="ghost">view your thread →</Button></Link>
      <button onClick={onClear} style={{ display: "block", width: "100%", textAlign: "center", marginTop: 12, fontSize: 11, fontFamily: "monospace", color: "#3A3530", background: "none", border: "none", cursor: "pointer" }}>not you?</button>
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
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <p style={{ fontSize: 18, fontWeight: 500, color: "#F0EBE3", marginBottom: 8 }}>fair enough.</p>
      <p style={{ fontSize: 13, color: "#5A5550" }}>maybe another time.</p>
    </div>
  );

  if (step === "yes") return (
    <div>
      <p style={{ fontSize: 18, fontWeight: 500, color: "#F0EBE3", marginBottom: 4, letterSpacing: "-0.02em" }}>cool. quick details.</p>
      <p style={{ fontSize: 12, fontFamily: "monospace", color: "#4A4540", marginBottom: 20 }}>you'll be in immediately.</p>
      <div className="bh-form-space">
        <input className="bh-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="name" />
        <input className="bh-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" type="email" />
        <textarea className="bh-input bh-textarea" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="what are you building?" rows={3} />
        <button className="bh-submit" onClick={yolo} disabled={busy}>{busy ? "letting you in…" : "let me in →"}</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "8px 0" }}>
      <p style={{ fontSize: 22, fontWeight: 500, color: "#F0EBE3", letterSpacing: "-0.03em", textAlign: "center", marginBottom: 6 }}>are you a cool person?</p>
      <p style={{ fontSize: 11, fontFamily: "monospace", color: "#4A4540", textAlign: "center", marginBottom: 24 }}>honest answer only</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="bh-submit" style={{ flex: 1 }} onClick={() => setStep("yes")}>yes</button>
        <button onClick={() => setStep("no")} style={{ flex: 1, padding: "13px", fontSize: 13, fontWeight: 500, fontFamily: "monospace", color: "#5A5550", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, cursor: "pointer" }}>no</button>
      </div>
    </div>
  );
};

export default Index;
