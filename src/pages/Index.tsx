import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const [tier, setTier] = useState<"learner" | "founder">("learner");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "builders house — a private room for people who are building";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", "a private community for founders. two rooms — one for people figuring it out, one for people shipping. apply for access.");
    else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "a private community for founders. two rooms — one for people figuring it out, one for people shipping. apply for access.";
      document.head.appendChild(meta);
    }

    supabase
      .from("posts")
      .select("id, channel_id, author_id, title, content, post_type, url, looking_for, created_at, channels(slug, name)")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setPosts((data ?? []).map((p: any) => ({ ...p, channel: p.channels })));
        setLoading(false);
      });
  }, []);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !building.trim()) {
      toast.error("fill in everything");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("access_requests").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      what_building: building.trim(),
      requested_tier: tier,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* nav */}
      <nav className="hairline-b">
        <div className="container max-w-6xl flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">b</span>
            </div>
            <span className="font-medium tracking-tight">builders house</span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm">members log in</Button>
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="container max-w-4xl py-20 md:py-32 animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.05] mb-6">
          builders house.<br />
          <span className="text-muted-foreground">a private room for people who are building.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          two rooms. one for people still figuring it out. one for people already shipping. apply for access below.
        </p>
      </section>

      {/* request form */}
      <section className="container max-w-2xl pb-20">
        <div className="bento-card">
          <h2 className="text-xl font-medium mb-1">request access</h2>
          <p className="text-sm text-muted-foreground mb-6 font-mono">we read every one.</p>

          {submitted ? (
            <div className="py-12 text-center">
              <p className="text-lg font-medium mb-2">got it.</p>
              <p className="text-muted-foreground text-sm">you'll hear back.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Input value={name} onChange={setName} placeholder="name" />
              <Input value={email} onChange={setEmail} placeholder="email" type="email" />
              <textarea
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="what are you building right now?"
                rows={4}
                maxLength={2000}
                className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">which room fits you?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <RoomChoice
                    selected={tier === "learner"}
                    onClick={() => setTier("learner")}
                    label="still figuring it out"
                    sub="learner"
                  />
                  <RoomChoice
                    selected={tier === "founder"}
                    onClick={() => setTier("founder")}
                    label="shipping and making money"
                    sub="founder"
                  />
                </div>
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full">
                {submitting ? "sending…" : "request access"}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* feed preview */}
      <section className="container max-w-3xl pb-32">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
            what's happening inside
          </h2>
          <span className="text-xs font-mono text-muted-foreground">read-only preview</span>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm font-mono">loading…</p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} showChannel readOnly />
            ))}
          </div>
        )}
      </section>

      <footer className="hairline-t">
        <div className="container max-w-6xl py-8 text-xs font-mono text-muted-foreground flex items-center justify-between">
          <span>© builders house</span>
          <span>access by approval only</span>
        </div>
      </footer>
    </div>
  );
};

const Input = ({ value, onChange, placeholder, type = "text" }: any) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
  />
);

const RoomChoice = ({ selected, onClick, label, sub }: any) => (
  <button
    onClick={onClick}
    type="button"
    className={`text-left p-4 rounded-xl hairline transition-colors ${
      selected ? "bg-surface-elevated ring-1 ring-primary" : "bg-background hover:bg-surface-elevated"
    }`}
  >
    <div className="text-sm">{label}</div>
    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{sub}</div>
  </button>
);

export default Index;
