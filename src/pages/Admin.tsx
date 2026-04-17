import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AvatarBlock } from "@/components/AvatarBlock";
import { BuilderBadge, AdminTag } from "@/components/TierBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Zap, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-2xl font-medium">admin</h1>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">auto yolo mode</span>
                <Switch checked={yoloMode} onCheckedChange={toggleYolo} />
                {yoloMode && (
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full animate-pulse"
                    style={{ background: "#E8734A", color: "#0D0D0D" }}>
                    auto yolo is live
                  </span>
                )}
              </div>
              <p className="text-xs font-mono mt-1" style={{ color: "#8A8480" }}>
                {yoloMode
                  ? "open doors — anyone who says they're cool gets in instantly."
                  : "standard flow — you review every request manually."}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="bg-surface hairline mb-6">
            <TabsTrigger value="requests">review requests ({requests.filter(r => r.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="members">members ({members.length})</TabsTrigger>
            <TabsTrigger value="channels">channels</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-3">
            <div className="flex gap-2 mb-4 flex-wrap">
              {(["all", "pending", "approved", "rejected", "yolo"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-full hairline transition-colors ${
                    filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-surface-elevated text-muted-foreground"
                  }`}>
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 && <p className="text-sm text-muted-foreground font-mono">no requests in this filter</p>}
            {filtered.map((r) => (
              <div key={r.id} className="bento-card">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{r.email}</span>
                      {r.onboard_path === "yolo" && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">yolo</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 mb-2">{r.what_building}</p>
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      {r.room_selected && <span>{r.room_selected}</span>}
                      <span>· {new Date(r.created_at).toLocaleDateString()}</span>
                      <span>· {r.status}</span>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => setDmRequest(r)}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> dm first
                      </Button>
                      <Button size="sm" onClick={() => yoloOnboard(r)}>
                        <Zap className="h-3.5 w-3.5 mr-1" /> yolo onboard
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => reject(r)}>reject</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="members" className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="bento-card flex items-center gap-4 py-3">
                <AvatarBlock url={m.avatar_url} name={m.display_name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{m.display_name}</span>
                    <BuilderBadge />
                    {m.is_admin && <AdminTag />}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">joined {new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                {m.id !== user?.id && (
                  <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>remove</Button>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="channels" className="space-y-3">
            {channels.map((c) => <ChannelAdminRow key={c.id} channel={c} />)}
          </TabsContent>
        </Tabs>

        {/* DM thread */}
        <DmThread request={dmRequest} onClose={() => { setDmRequest(null); loadAll(); }} onApprove={(req) => yoloOnboard(req)} onReject={reject} />

        {/* Credentials modal */}
        <Dialog open={!!credentialModal} onOpenChange={(o) => !o && setCredentialModal(null)}>
          <DialogContent className="bg-surface border-0 hairline">
            <DialogHeader><DialogTitle className="font-normal">approved</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">share these credentials with the new builder. they should change their password.</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="bento-card p-3 break-all"><span className="text-muted-foreground">email · </span>{credentialModal?.email}</div>
              <div className="bento-card p-3 break-all"><span className="text-muted-foreground">password · </span>{credentialModal?.password}</div>
            </div>
            <Button onClick={() => { navigator.clipboard.writeText(`${credentialModal?.email} / ${credentialModal?.password}`); toast.success("copied"); }} className="mt-3">copy</Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

const DmThread = ({ request, onClose, onApprove, onReject }: any) => {
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
      <DialogContent className="bg-surface border-0 hairline max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-normal flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> dm with {request?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="bento-card mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">building</p>
          <p className="text-sm">{request?.what_building}</p>
        </div>
        <div className="max-h-[320px] overflow-y-auto space-y-3 p-1">
          {messages.length === 0 && <p className="text-xs font-mono text-center text-muted-foreground py-8">no messages yet — say hi.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {m.sender_type === "requester" && (
                  <div className="text-[10px] font-mono uppercase tracking-wider mb-1 text-muted-foreground">{request?.name}</div>
                )}
                <div className="px-3 py-2 rounded-lg text-sm bg-surface-elevated">{m.content}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 mt-3">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="type a message…"
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1 bg-background hairline rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2 pt-3 hairline-t mt-3 justify-end">
          <Button variant="ghost" onClick={() => { onReject(request); onClose(); }}>reject</Button>
          <Button onClick={() => { onApprove(request); onClose(); }}>approve as builder</Button>
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
    <div className="bento-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">{channel.name.toLowerCase()}</h3>
        <span className="text-xs font-mono text-muted-foreground">{count} posts</span>
      </div>
      <div className="space-y-2">
        {recent.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{p.title || p.content?.slice(0, 60)}</span>
            <span className="text-[10px] font-mono uppercase text-muted-foreground">{p.visibility}</span>
            <Button size="sm" variant="ghost" onClick={() => togglePin(p.id, p.is_pinned)}>{p.is_pinned ? "unpin" : "pin"}</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>×</Button>
          </div>
        ))}
        {recent.length === 0 && <p className="text-xs text-muted-foreground font-mono">no posts</p>}
      </div>
    </div>
  );
};

export default Admin;
