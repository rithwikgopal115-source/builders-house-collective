import { Link } from "react-router-dom";

/* ─── Night-sky style constants (same palette as Index.tsx) ─── */

const STYLE = `
  * { cursor: none !important; }

  .pp-cursor {
    position: fixed;
    width: 10px; height: 10px;
    background: #E8734A;
    border-radius: 50%;
    pointer-events: none;
    z-index: 999999;
    transform: translate(-50%, -50%);
    box-shadow:
      0 0 8px 4px rgba(232,115,74,0.6),
      0 0 20px 8px rgba(232,115,74,0.25),
      0 0 40px 16px rgba(232,115,74,0.08);
    animation: ppCursorPulse 2.5s ease-in-out infinite;
    transition: width .1s, height .1s, box-shadow .1s;
  }
  .pp-cursor.pressed {
    width: 14px; height: 14px;
    box-shadow:
      0 0 12px 6px rgba(232,115,74,0.8),
      0 0 30px 12px rgba(232,115,74,0.4),
      0 0 60px 24px rgba(232,115,74,0.12);
  }
  @keyframes ppCursorPulse {
    0%,100% { box-shadow: 0 0 8px 4px rgba(232,115,74,0.6),0 0 20px 8px rgba(232,115,74,0.25); }
    50%      { box-shadow: 0 0 12px 7px rgba(232,115,74,0.75),0 0 28px 12px rgba(232,115,74,0.35); }
  }

  .pp-sky {
    position: fixed; inset: 0; z-index: 0;
    background: linear-gradient(to bottom,
      #040810 0%, #07101f 30%, #0d0d22 60%, #180a18 80%, #1e0a0a 100%
    );
  }
  .pp-horizon {
    position: absolute; bottom: 0; left: 0; right: 0; height: 45%;
    background: radial-gradient(ellipse 70% 50% at 50% 110%,
      rgba(232,115,74,0.18) 0%, rgba(180,60,20,0.08) 45%, transparent 100%
    );
  }

  .pp-star {
    position: absolute;
    border-radius: 50%;
    background: #fff;
  }
  .pp-star.twinkle {
    animation: ppTwinkle ease-in-out infinite alternate;
  }
  @keyframes ppTwinkle {
    0%   { opacity: 0.15; transform: scale(0.6); }
    100% { opacity: 1;    transform: scale(1.4); filter: blur(0.5px); }
  }

  .pp-wrap {
    position: relative; z-index: 10;
    min-height: 100vh;
    padding: 0 0 80px;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    color: #F0EBE3;
  }

  .pp-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 40px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .pp-logo {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #F0EBE3;
    text-decoration: none;
  }
  .pp-logo span { color: #E8734A; }
  .pp-back {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: rgba(240,235,227,0.5);
    text-decoration: none;
    transition: color .2s;
  }
  .pp-back:hover { color: #E8734A; }
  .pp-back svg { width: 14px; height: 14px; }

  .pp-content {
    max-width: 720px;
    margin: 0 auto;
    padding: 64px 40px 0;
  }

  .pp-eyebrow {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #E8734A;
    margin-bottom: 16px;
    padding: 5px 10px;
    background: rgba(232,115,74,0.1);
    border: 1px solid rgba(232,115,74,0.25);
  }

  .pp-title {
    font-size: clamp(28px, 5vw, 44px);
    font-weight: 800;
    letter-spacing: -1.5px;
    line-height: 1.1;
    margin: 0 0 12px;
    color: #F0EBE3;
  }
  .pp-subtitle {
    font-size: 15px;
    color: rgba(240,235,227,0.5);
    margin: 0 0 56px;
    line-height: 1.6;
  }
  .pp-subtitle strong {
    color: rgba(240,235,227,0.75);
    font-weight: 500;
  }

  .pp-section {
    margin-bottom: 48px;
    padding: 28px 32px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 0;
    transition: border-color .2s;
  }
  .pp-section:hover {
    border-color: rgba(232,115,74,0.2);
  }

  .pp-section-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,235,227,0.35);
    margin-bottom: 16px;
  }
  .pp-section-label::before {
    content: '';
    display: block;
    width: 3px;
    height: 14px;
    background: #E8734A;
    flex-shrink: 0;
  }

  .pp-section h2 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin: 0 0 14px;
    color: #F0EBE3;
  }
  .pp-section p {
    font-size: 14px;
    line-height: 1.75;
    color: rgba(240,235,227,0.65);
    margin: 0 0 12px;
  }
  .pp-section p:last-child { margin-bottom: 0; }
  .pp-section ul {
    margin: 8px 0 12px 0;
    padding: 0;
    list-style: none;
  }
  .pp-section ul li {
    font-size: 14px;
    line-height: 1.7;
    color: rgba(240,235,227,0.65);
    padding: 4px 0 4px 20px;
    position: relative;
  }
  .pp-section ul li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: #E8734A;
    font-size: 12px;
  }
  .pp-section strong {
    color: rgba(240,235,227,0.9);
    font-weight: 600;
  }
  .pp-section a {
    color: #E8734A;
    text-decoration: none;
    border-bottom: 1px solid rgba(232,115,74,0.3);
    transition: border-color .2s;
  }
  .pp-section a:hover {
    border-color: #E8734A;
  }

  .pp-highlight {
    background: rgba(232,115,74,0.08);
    border-left: 3px solid #E8734A;
    padding: 16px 20px;
    margin: 16px 0;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(240,235,227,0.8);
  }

  .pp-footer {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 40px 0;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .pp-footer-copy {
    font-size: 12px;
    color: rgba(240,235,227,0.25);
    line-height: 1.6;
  }
  .pp-footer-copy strong {
    color: rgba(240,235,227,0.4);
    display: block;
    margin-bottom: 2px;
  }

  @media (max-width: 600px) {
    .pp-nav { padding: 20px 20px; }
    .pp-content { padding: 40px 20px 0; }
    .pp-section { padding: 20px 20px; }
    .pp-footer { padding: 32px 20px 0; flex-direction: column; align-items: flex-start; }
  }
`;

/* ─── Seeded star RNG (same as Index.tsx) ─── */
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
  const r = rng32(99); // different seed from Index
  return Array.from({ length: 140 }, () => ({
    x: r() * 100, y: r() * 80,
    sz: r() * 1.6 + 0.4, o: r() * 0.5 + 0.2,
    twinkle: r() > 0.68, delay: r() * 6, dur: r() * 3 + 2,
  }));
})();

import { useState, useEffect } from "react";

export default function PrivacyPolicy() {
  const [cursor, setCursor] = useState({ x: -200, y: -200 });
  const [cursorClick, setCursorClick] = useState(false);

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

  return (
    <>
      <style>{STYLE}</style>

      {/* Cursor */}
      <div
        className={`pp-cursor${cursorClick ? " pressed" : ""}`}
        style={{ left: cursor.x, top: cursor.y }}
      />

      {/* Sky background */}
      <div className="pp-sky">
        {STARS.map((s, i) => (
          <div
            key={i}
            className={`pp-star${s.twinkle ? " twinkle" : ""}`}
            style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: s.sz, height: s.sz,
              opacity: s.o,
              animationDuration: s.twinkle ? `${s.dur}s` : undefined,
              animationDelay: s.twinkle ? `${s.delay}s` : undefined,
            }}
          />
        ))}
        <div className="pp-horizon" />
      </div>

      <div className="pp-wrap">
        {/* Nav */}
        <nav className="pp-nav">
          <Link to="/" className="pp-logo">builders <span>house</span>.</Link>
          <Link to="/" className="pp-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            back to home
          </Link>
        </nav>

        {/* Content */}
        <div className="pp-content">
          <div className="pp-eyebrow">Legal</div>
          <h1 className="pp-title">Privacy Policy</h1>
          <p className="pp-subtitle">
            Last updated: <strong>April 2026.</strong> Plain language, no legalese. We respect your data and we'll tell you exactly what happens to it.
          </p>

          {/* 1 — What we collect */}
          <div className="pp-section">
            <div className="pp-section-label">01 — Data Collection</div>
            <h2>What we collect</h2>
            <p>When you apply to join Builders House, we collect:</p>
            <ul>
              <li>Your <strong>name</strong> (first + last)</li>
              <li>Your <strong>email address</strong></li>
              <li>What you're <strong>currently building</strong> (free-form text)</li>
              <li>Optionally, your <strong>LinkedIn or X (Twitter) profile URL</strong></li>
            </ul>
            <p>Once you're inside the platform, we also store your activity — messages you post, channels you join, and profile information you choose to add.</p>
          </div>

          {/* 2 — Email policy */}
          <div className="pp-section">
            <div className="pp-section-label">02 — Email Policy</div>
            <h2>Your email is yours. Full stop.</h2>
            <div className="pp-highlight">
              We will <strong>never sell, rent, trade, or share your email address</strong> with any third party, advertiser, or data broker. Ever.
            </div>
            <p>We use your email address for one purpose: operating your Builders House account. This means:</p>
            <ul>
              <li>Sending you an invite link when your application is approved</li>
              <li>Notifying you about important account-level events (e.g. password resets)</li>
              <li>Occasional community updates — you can opt out of these at any time</li>
            </ul>
            <p>No newsletters you didn't ask for. No promotional emails from partners. No cold outreach disguised as a platform notification.</p>
          </div>

          {/* 3 — How data is stored */}
          <div className="pp-section">
            <div className="pp-section-label">03 — Data Storage</div>
            <h2>Where your data lives</h2>
            <p>
              All data is stored in <strong>Supabase</strong>, a PostgreSQL-based cloud database with row-level security (RLS) enabled. RLS means that database access is enforced at the row level — you can only read your own data, and other users cannot access yours unless you've explicitly shared it within the platform.
            </p>
            <p>Supabase stores data on servers managed by AWS. Their full security and compliance documentation is available at <a href="https://supabase.com/security" target="_blank" rel="noopener noreferrer">supabase.com/security</a>.</p>
            <p>We do not store passwords in plain text. Authentication is handled via Supabase Auth, which uses industry-standard hashing and JWT-based session tokens.</p>
          </div>

          {/* 4 — No ads */}
          <div className="pp-section">
            <div className="pp-section-label">04 — Advertising</div>
            <h2>No ads. No tracking pixels.</h2>
            <p>
              Builders House does not run any advertising. There are no ad networks, no retargeting pixels, no third-party tracking scripts embedded on this site.
            </p>
            <p>We don't use your data to build ad profiles, and we don't partner with companies that do. The platform is funded by its community — not by selling your attention.</p>
          </div>

          {/* 5 — Cookies */}
          <div className="pp-section">
            <div className="pp-section-label">05 — Cookies & Local Storage</div>
            <h2>What we store in your browser</h2>
            <p>We use minimal browser storage:</p>
            <ul>
              <li><strong>Auth session token</strong> — stored by Supabase in localStorage to keep you logged in</li>
              <li><strong>pendingEmail</strong> — temporarily stored while you're completing sign-up, cleared after</li>
              <li><strong>bh-video-seen</strong> — remembers if you've watched the intro video so we don't show it again</li>
            </ul>
            <p>No cross-site tracking cookies. No persistent advertising identifiers.</p>
          </div>

          {/* 6 — Your rights */}
          <div className="pp-section">
            <div className="pp-section-label">06 — Your Rights</div>
            <h2>You control your data</h2>
            <p>At any time, you can:</p>
            <ul>
              <li><strong>Request a copy</strong> of all data we hold on you</li>
              <li><strong>Correct</strong> any inaccurate information in your profile</li>
              <li><strong>Request deletion</strong> of your account and all associated data</li>
              <li><strong>Opt out</strong> of non-essential communications</li>
            </ul>
            <p>
              To exercise any of these rights, email us at{" "}
              <a href="mailto:rithwikgopalsabu@gmail.com">rithwikgopalsabu@gmail.com</a>{" "}
              with the subject line <strong>"Data Request"</strong>. We'll respond within 7 days.
            </p>
            <p>Account deletion requests are processed within 30 days and are permanent — we don't keep backups of deleted accounts.</p>
          </div>

          {/* 7 — Third parties */}
          <div className="pp-section">
            <div className="pp-section-label">07 — Third Parties</div>
            <h2>Who else touches your data</h2>
            <p>We use a small number of third-party services to run the platform:</p>
            <ul>
              <li><strong>Supabase</strong> — database, authentication, and storage</li>
              <li><strong>Vercel</strong> — hosting and edge delivery</li>
            </ul>
            <p>These services are infrastructure providers, not data partners. They process your data solely to provide the services we've contracted them for, and are bound by their own privacy policies and data processing agreements.</p>
            <p>We do not use Google Analytics, Mixpanel, Segment, Intercom, or any behavioral analytics tools on this site.</p>
          </div>

          {/* 8 — Security */}
          <div className="pp-section">
            <div className="pp-section-label">08 — Security</div>
            <h2>How we protect your data</h2>
            <ul>
              <li>All data in transit is encrypted via <strong>HTTPS/TLS</strong></li>
              <li>Database access requires <strong>authenticated Supabase sessions</strong></li>
              <li>Row-level security policies prevent any user from reading another user's private data</li>
              <li>Admin actions are gated behind a role check at the database level</li>
              <li>We don't log passwords, auth tokens, or sensitive fields in application logs</li>
            </ul>
            <p>If you discover a security vulnerability, please disclose it responsibly by emailing <a href="mailto:rithwikgopalsabu@gmail.com">rithwikgopalsabu@gmail.com</a>.</p>
          </div>

          {/* 9 — Changes */}
          <div className="pp-section">
            <div className="pp-section-label">09 — Policy Changes</div>
            <h2>If this policy changes</h2>
            <p>
              If we make material changes to this policy, we'll notify active members via the platform before the changes take effect. We'll also update the "Last updated" date at the top of this page.
            </p>
            <p>Continued use of Builders House after a policy update constitutes acceptance of the new terms.</p>
          </div>

        </div>

        {/* Footer */}
        <footer className="pp-footer">
          <div className="pp-footer-copy">
            <strong>Gopal Enterprises</strong>
            © 2026 Rigorawmedia. All rights reserved.
          </div>
          <Link to="/" className="pp-back" style={{ fontSize: "12px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            back to builders house
          </Link>
        </footer>
      </div>
    </>
  );
}
