import { Check,
 useEffect, useState, useRef } from "react";
import { Check,
 AppLayout } from "@/components/AppLayout";
import { Check,
 useAuth } from "@/context/AuthContext";
import { Check,
 Navigate } from "react-router-dom";
import { Check,
 Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check,
 supabase } from "@/integrations/supabase/client";
import { Check,
 Button } from "@/components/ui/button";
import { Check,
 toast } from "sonner";
import { Check,
 AvatarBlock } from "@/components/AvatarBlock";
import { Check,
 Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check,
 Check, MessageSquare, Zap, Send } from "lucide-react";
import { Check,
 Switch } from "@/components/ui/switch";

const PillBtn = ({
  variant, onClick, children, icon: Icon,
}: { variant: "primary" | "ghost"; onClick: () => void; children: React.ReactNode; icon?: any }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1 font-mono transition-opacity hover:opacity-90"
    style={{
      background: variant === "primary" ? "#E8734A" : "#1E1E1E",
      color: variant === "primary" ? "#0D0D0D" : "#F5F0EB",
      border: variant === "primary" ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 999,
      padding: "4px 14px",
      fontSize: 12,
    }}
  >
    {Icon && <Icon className="h-3 w-3" />}
    {children}
  </button>
);

const Admin = () => {
  const { isAdmin, loading, user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "yolo">("pending");
  const [credentialModal, setCredentialModal] = useState<{ email: string; password: string } | null>(null);
  const [yoloMode, setYoloMode] = useState(false);
  const [dmRequest, setDmRequest] = useState<any>(null);

  const loadAll = async () => {
    const [{ data: r }, { data: m }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("access_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("is_approved", true).order("created_at", { ascending: false }),
      supabase.from("channels").select("id, slug, name").order("sort_order"),
      supabase.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle(),
    ]);
    setRequests(r ?? []);
    setMembers(m ?? []);
    setChannels(c ?? []);
    setYoloMode(!!s?.auto_yolo_enabled);
  };

  useEffect(() => { document.title = "admin — builders house"; if (isAdmin) loadAll(); }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/home" replace />;

  const toggleYolo = async (val: boolean) => {
    setYoloMode(val);
    const { error } = await supabase.from("admin_settings").update({ auto_yolo_enabled: val, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) { toast.error(error.message); setYoloMode(!val); return; }
    toast.success(val ? "auto yolo is live" : "back to manual review");
  };

  const yoloOnboard = async (request: any) => {
    const { data, error } = await supabase.functions.invoke("yolo-onboard", {
      body: { request_id: request.id, name: request.name, email: request.email, what_building: request.what_building, manual: true },
    });
    if (error) { toast.error(error.message); return; }
    if (data?.error) { toast.error(data.error); return; }
    if (data?.password) setCredentialModal({ email: request.email, password: data.password });
    loadAll();
  };


  const approve = async (request: any) => {
    const { error } = await supabase.from("access_requests").update({ status: "approved" }).eq("id", request.id);
    if (error) { toast.error(error.message); return; }
    toast.success("approved — they can now sign up at /signup");
    loadAll();
  };

  const reject = async (request: any) => {
    if (!confirm("reject this application?")) return;
    await supabase.from("access_requests").update({ status: "rejected" }).eq("id", request.id);
    toast.success("rejected");
    loadAll();
  };

  const removeMember = async (id: string) => {
    if (!confirm("remove this builder? they lose access.")) return;
    await supabase.from("profiles").update({ is_approved: false }).eq("id", id);
    toast.success("removed");
    loadAll();
  };

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "yolo") return r.onboard_path === "yolo" || r.onboard_path === "manual_yolo";
    return r.status === filter;
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-6">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-2xl font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>admin</h1>
          <div
            className="flex flex-col gap-1 px-4 py-3 transition-all"
            style={{
              background: "#161616",
              border: yoloMode ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              boxShadow: yoloMode ? "0 0 16px rgba(232,115,74,0.4)" : "none",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: yoloMode ? "#E8734A" : "#F5F0EB" }}>
                {yoloMode ? "auto yolo is live" : "auto yolo mode"}
              </span>
              <Switch checked={yoloMode} onCheckedChange={toggleYolo} />
            </div>
            <p className="text-[11px] font-mono" style={{ color: "#8A8480" }}>
              {yoloMode
                ? "open doors — anyone who says they're cool gets in instantly."
                : "standard flow — you review every request manually."}
            </p>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="mb-6" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <TabsTrigger value="requests">review requests ({requests.filter(r => r.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="members">members ({members.length})</TabsTrigger>
            <TabsTrigger value="channels">channels</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-0">
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {(["all", "pending", "approved", "rejected", "yolo"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="font-mono transition-colors"
                  style={{
                    background: filter === f ? "#E8734A" : "#1E1E1E",
                    color: filter === f ? "#0D0D0D" : "#8A8480",
                    border: filter === f ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    padding: "4px 12px",
                    fontSize: 11,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="text-sm font-mono" style={{ color: "#8A8480" }}>no requests in this filter</p>
            )}

            {/* Table-style rows */}
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-4 flex flex-wrap items-start gap-3 justify-between"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium" style={{ color: "#F5F0EB" }}>{r.name}</span>
                      <span className="text-xs font-mono" style={{ color: "#8A8480" }}>{r.email}</span>
                      {r.onboard_path === "yolo" && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#2A1A0E", color: "#E8734A", borderRadius: 999 }}>yolo</span>
                      )}
                    </div>
                    <p className="text-sm mb-2" style={{ color: "#F5F0EB" }}>{r.what_building}</p>
                    <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "#8A8480" }}>
                      {r.room_selected && <span>{r.room_selected}</span>}
                      <span>· {new Date(r.created_at).toLocaleDateString()}</span>
                      <span>· {r.status}</span>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    r.email === user?.email ? (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#1E1E1E", color: "#8A8480", borderRadius: 999 }}>your own request</span>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        <PillBtn variant="ghost" icon={MessageSquare} onClick={() => setDmRequest(r)}>dm first</PillBtn>
                        <PillBtn variant="ghost" icon={Check} onClick={() => approve(r)}>approve</PillBtn>
                        <PillBtn variant="primary" icon={Zap} onClick={() => yoloOnboard(r)}>yolo onboard</PillBtn>
                        <PillBtn variant="ghost" onClick={() => reject(r)}>reject</PillBtn>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-0">
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  className="px-5 py-3 flex items-center gap-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <AvatarBlock url={m.avatar_url} name={m.display_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: "#F5F0EB" }}>{m.display_name}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#2A1A0E", color: "#E8734A", borderRadius: 999 }}>builder</span>
                      {m.is_admin && <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#1E1E1E", color: "#C9B99A", borderRadius: 999 }}>admin</span>}
                    </div>
                    <span className="text-xs font-mono" style={{ color: "#8A8480" }}>joined {new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  {m.id !== user?.id && (
                    <PillBtn variant="ghost" onClick={() => removeMember(m.id)}>remove</PillBtn>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="channels" className="space-y-3">
            {channels.map((c) => <ChannelAdminRow key={c.id} channel={c} />)}
          </TabsContent>
        </Tabs>

        <DmThread request={dmRequest} onClose={() => { setDmRequest(null); loadAll(); }} onApprove={(req) => yoloOnboard(req)} onApproveSelf={(req) => approve(req)} onReject={reject} />

        <Dialog open={!!credentialModal} onOpenChange={(o) => !o && setCredentialModal(null)}>
          <DialogContent style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
            <DialogHeader><DialogTitle className="font-medium" style={{ color: "#F5F0EB" }}>approved</DialogTitle></DialogHeader>
            <p className="text-sm mb-4" style={{ color: "#8A8480" }}>share these credentials with the new builder. they should change their password.</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 break-all" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "#F5F0EB" }}>
                <span style={{ color: "#8A8480" }}>email · </span>{credentialModal?.email}
              </div>
              <div className="p-3 break-all" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "#F5F0EB" }}>
                <span style={{ color: "#8A8480" }}>password · </span>{credentialModal?.password}
              </div>
            </div>
            <Button onClick={() => { navigator.clipboard.writeText(`${credentialModal?.email} / ${credentialModal?.password}`); toast.success("copied"); }} className="mt-3">copy</Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

const DmThread = ({ request, onClose, onApprove, onApproveSelf, onReject }: any) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!request) { setMessages([]); return; }
    supabase.from("onboarding_messages").select("*").eq("request_id", request.id).order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data ?? []));
    const ch = supabase.channel(`admin-onboarding:${request.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "onboarding_messages", filter: `request_id=eq.${request.id}` },
        (p) => setMessages((m) => [...m, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [request]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!draft.trim() || !request) return;
    const { error } = await supabase.from("onboarding_messages").insert({
      request_id: request.id, sender_type: "admin", content: draft.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setDraft("");
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
        <DialogHeader>
          <DialogTitle className="font-medium flex items-center gap-2" style={{ color: "#F5F0EB" }}>
            <MessageSquare className="h-4 w-4" /> dm with {request?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="p-3 mb-3" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "#8A8480" }}>building</p>
          <p className="text-sm" style={{ color: "#F5F0EB" }}>{request?.what_building}</p>
        </div>
        <div className="max-h-[320px] overflow-y-auto space-y-3 p-1">
          {messages.length === 0 && <p className="text-xs font-mono text-center py-8" style={{ color: "#8A8480" }}>no messages yet — say hi.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {m.sender_type === "requester" && (
                  <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "#8A8480" }}>{request?.name}</div>
                )}
                <div className="px-3 py-2 text-sm" style={{
                  background: m.sender_type === "admin" ? "#E8734A" : "#1E1E1E",
                  color: m.sender_type === "admin" ? "#0D0D0D" : "#F5F0EB",
                  borderRadius: 8,
                }}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 mt-3">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="type a message…"
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }} />
          <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2 pt-3 mt-3 justify-between flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <PillBtn variant="ghost" onClick={() => { onReject(request); onClose(); }}>reject</PillBtn>
          <div className="flex gap-2">
            <PillBtn variant="ghost" icon={Zap} onClick={() => { onApprove(request); onClose(); }}>yolo onboard</PillBtn>
            <PillBtn variant="primary" icon={Check} onClick={() => { onApproveSelf(request); onClose(); }}>approve &rarr; self-signup</PillBtn>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ChannelAdminRow = ({ channel }: { channel: any }) => {
  const [count, setCount] = useState<number>(0);
  const [recent, setRecent] = useState<any[]>([]);

  const load = () => {
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("channel_id", channel.id).then(({ count }) => setCount(count ?? 0));
    supabase.from("posts").select("id, title, content, is_pinned, created_at, visibility").eq("channel_id", channel.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setRecent(data ?? []));
  };
  useEffect(load, [channel.id]);

  const togglePin = async (postId: string, current: boolean) => {
    await supabase.from("posts").update({ is_pinned: !current }).eq("id", postId);
    setRecent((arr) => arr.map((p) => p.id === postId ? { ...p, is_pinned: !current } : p));
    toast.success(current ? "unpinned" : "pinned");
  };
  const remove = async (postId: string) => {
    if (!confirm("delete this post?")) return;
    await supabase.from("posts").delete().eq("id", postId);
    setRecent((arr) => arr.filter((p) => p.id !== postId));
    toast.success("deleted");
  };

  return (
    <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>{channel.name.toLowerCase()}</h3>
        <span className="text-xs font-mono" style={{ color: "#8A8480" }}>{count} posts</span>
      </div>
      <div className="space-y-2">
        {recent.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate" style={{ color: "#F5F0EB" }}>{p.title || p.content?.slice(0, 60)}</span>
            <span className="text-[10px] font-mono uppercase" style={{ color: "#8A8480" }}>{p.visibility}</span>
            <PillBtn variant="ghost" onClick={() => togglePin(p.id, p.is_pinned)}>{p.is_pinned ? "unpin" : "pin"}</PillBtn>
            <PillBtn variant="ghost" onClick={() => remove(p.id)}>×</PillBtn>
          </div>
        ))}
        {recent.length === 0 && <p className="text-xs font-mono" style={{ color: "#8A8480" }}>no posts</p>}
      </div>
    </div>
  );
};

export default Admin;
