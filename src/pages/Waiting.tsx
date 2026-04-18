// Onboarding waiting room. The requester sees the status of their access
// request and can DM with the admin in real time.
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";

interface Msg { id: string; sender_type: string; content: string; created_at: string | null; }

const BackLink = () => (
  <Link
    to="/"
    className="fixed top-5 left-5 md:top-6 md:left-6 z-30 inline-flex items-center gap-1.5 text-xs font-mono transition-colors hover:text-primary"
    style={{ color: "#8A8480" }}
  >
    <ArrowLeft className="h-3.5 w-3.5" />
    back
  </Link>
);

const Waiting = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [statusEmail, setStatusEmail] = useState<string | null>(null);
  const [request, setRequest] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "waiting room — builders house";
  }, []);

  useEffect(() => {
    if (user?.email) setStatusEmail(user.email);
  }, [user]);

  const lookup = async (e: string) => {
    setChecking(true);
    const { data } = await supabase.from("access_requests").select("*").eq("email", e.toLowerCase()).order("created_at", { ascending: false }).maybeSingle();
    setChecking(false);
    if (!data) { toast.error("no request found for that email"); return; }
    setRequest(data);
    const { data: msgs } = await supabase.from("onboarding_messages").select("*").eq("request_id", data.id).order("created_at", { ascending: true });
    setMessages(msgs ?? []);
  };

  useEffect(() => {
    if (statusEmail) lookup(statusEmail);
  }, [statusEmail]);

  useEffect(() => {
    if (!request) return;
    const ch = supabase.channel(`onboarding:${request.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "onboarding_messages", filter: `request_id=eq.${request.id}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [request]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!draft.trim() || !request) return;
    const { error } = await supabase.from("onboarding_messages").insert({
      request_id: request.id, sender_type: "requester", content: draft.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setDraft("");
    const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
    if (admins?.length) {
      await supabase.from("notifications").insert(admins.map((a) => ({
        recipient_id: a.id, type: "onboarding_message",
        related_id: request.id, content: `${request.name} replied in waiting room`,
      })));
    }
  };

  if (loading) return null;
  if (user && profile?.is_approved) return <Navigate to="/home" replace />;

  if (!statusEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "#0D0D0D" }}>
        <BackLink />
        <div className="w-full max-w-md p-8" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
          <h1 className="text-xl font-medium mb-1" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>waiting room</h1>
          <p className="text-sm mb-6" style={{ color: "#8A8480" }}>enter the email you applied with.</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" type="email"
            onKeyDown={(e) => e.key === "Enter" && setStatusEmail(email.trim())}
            className="w-full px-3 py-2.5 text-sm mb-3"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }} />
          <Button onClick={() => setStatusEmail(email.trim())} className="w-full">check status</Button>
        </div>
      </div>
    );
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono text-sm relative" style={{ background: "#0D0D0D" }}>
      <BackLink />
      loading…
    </div>
  );

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "#0D0D0D" }}>
        <BackLink />
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: "#8A8480" }}>no application found.</p>
          <Button variant="ghost" onClick={() => { setStatusEmail(null); setEmail(""); }}>try another email</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: "#0D0D0D" }}>
      <BackLink />
      <div className="w-full max-w-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
        <div className="p-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: request.status === "approved" ? "#7AC8A0" : request.status === "rejected" ? "#E87474" : "#C9B99A" }} />
            <h1 className="text-lg font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
              {request.status === "approved" ? "you're in. log in to continue." :
               request.status === "rejected" ? "your application was declined." :
               "your request is being reviewed."}
            </h1>
          </div>
          <p className="text-sm mt-1 ml-4" style={{ color: "#8A8480" }}>
            {request.status === "pending" ? "admin will reach out before making a decision." : ""}
          </p>
        </div>

        <div className="p-6 max-h-[400px] overflow-y-auto space-y-4" style={{ background: "#0D0D0D" }}>
          {messages.length === 0 && <p className="text-xs font-mono text-center" style={{ color: "#8A8480" }}>no messages yet</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === "requester" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {m.sender_type !== "requester" && (
                  <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "#E8734A" }}>admin</div>
                )}
                <div className="px-3 py-2 text-sm"
                  style={{
                    background: m.sender_type === "requester" ? "#1E1E1E" : "#1A1A1A",
                    color: "#F5F0EB",
                    borderRadius: 8,
                  }}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {request.status === "pending" && (
          <div className="p-4 flex gap-2" style={{ background: "#161616", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="say something…"
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }} />
            <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
          </div>
        )}

        <div className="p-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={user ? signOut : () => { setStatusEmail(null); setEmail(""); }}
            className="text-xs font-mono" style={{ color: "#8A8480" }}>
            {user ? "sign out" : "use a different email"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Waiting;
