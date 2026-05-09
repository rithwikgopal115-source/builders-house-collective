import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AvatarBlock } from "@/components/AvatarBlock";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Zap, Send, ChevronDown, ChevronUp, Youtube, Globe, Lock, Eye, EyeOff, Shield, ShieldOff, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// ─── Shared pill button ───────────────────────────────────────────────────────
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
    {Icon && <Icon className="h-3 w-3 mr-0.5" />}
    {children}
  </button>
);

const ToggleRow = ({
  label, sublabel, checked, onChange,
}: { label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
    <div>
      <p className="text-sm" style={{ color: "#F5F0EB" }}>{label}</p>
      {sublabel && <p className="text-[11px] font-mono mt-0.5" style={{ color: "#6A6460" }}>{sublabel}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

// ─── Main Admin ───────────────────────────────────────────────────────────────
const Admin = () => {
  const { isAdmin, loading, user } = useAuth();
  const [requests, setRequests]   = useState<any[]>([]);
  const [members, setMembers]     = useState<any[]>([]);
  const [channels, setChannels]   = useState<any[]>([]);
  const [projects, setProjects]   = useState<any[]>([]);
  const [filter, setFilter]       = useState<"all" | "pending" | "approved" | "rejected" | "yolo">("pending");
  const [credentialModal, setCredentialModal] = useState<{ email: string; password: string } | null>(null);
  const [yoloMode, setYoloMode]           = useState(false);
  const [dmRequest, setDmRequest]         = useState<any>(null);
  const [permissionsMember, setPermissionsMember] = useState<any>(null);

  const loadAll = async () => {
    const [{ data: r }, { data: m }, { data: c }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("access_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("is_approved", true).order("created_at", { ascending: false }),
      supabase.from("channels").select("id, slug, name, is_public_visible, intro_video_url, sort_order").order("sort_order"),
      supabase.from("admin_settings").select("auto_yolo_enabled").eq("id", 1).maybeSingle(),
      supabase.from("channel_projects")
        .select("*")
        .eq("is_active", true)
        .is("parent_project_id", null)
        .order("slot_number"),
    ]);
    setRequests(r ?? []);
    setMembers(m ?? []);
    setChannels(c ?? []);
    setYoloMode(!!s?.auto_yolo_enabled);
    setProjects(p ?? []);
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

  const toggleAdmin = async (id: string, current: boolean) => {
    if (!confirm(`${current ? "remove" : "grant"} admin access for this member?`)) return;
    await supabase.from("profiles").update({ is_admin: !current }).eq("id", id);
    toast.success(current ? "admin access removed" : "admin access granted");
    loadAll();
  };

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "yolo") return r.onboard_path === "yolo" || r.onboard_path === "manual_yolo";
    return r.status === filter;
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 pb-32">
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
            <p className="text-[11px] font-mono" style={{ color: "#A09890" }}>
              {yoloMode
                ? "open doors — anyone who says they're cool gets in instantly."
                : "standard flow — you review every request manually."}
            </p>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="mb-6" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <TabsTrigger value="requests">
              requests ({requests.filter(r => r.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="members">members ({members.length})</TabsTrigger>
            <TabsTrigger value="channels">channels</TabsTrigger>
            <TabsTrigger value="projects">projects</TabsTrigger>
          </TabsList>

          {/* ── Requests ── */}
          <TabsContent value="requests" className="space-y-0">
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {(["all", "pending", "approved", "rejected", "yolo"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="font-mono transition-colors"
                  style={{
                    background: filter === f ? "#E8734A" : "#1E1E1E",
                    color: filter === f ? "#0D0D0D" : "#A09890",
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
              <p className="text-sm font-mono" style={{ color: "#A09890" }}>no requests in this filter</p>
            )}

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
                      <span className="text-xs font-mono" style={{ color: "#A09890" }}>{r.email}</span>
                      {r.onboard_path === "yolo" && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#2A1A0E", color: "#E8734A", borderRadius: 999 }}>yolo</span>
                      )}
                    </div>
                    <p className="text-sm mb-2" style={{ color: "#F5F0EB" }}>{r.what_building}</p>
                    <div className="flex items-center gap-2 text-xs font-mono" style={{ color: "#A09890" }}>
                      {r.room_selected && <span>{r.room_selected}</span>}
                      <span>· {new Date(r.created_at).toLocaleDateString()}</span>
                      <span>· {r.status}</span>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    r.email === user?.email ? (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#1E1E1E", color: "#A09890", borderRadius: 999 }}>your own request</span>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        <PillBtn variant="ghost" icon={MessageSquare} onClick={() => setDmRequest(r)}>dm first</PillBtn>
                        <PillBtn variant="primary" icon={Zap} onClick={() => yoloOnboard(r)}>yolo onboard</PillBtn>
                        <PillBtn variant="ghost" onClick={() => reject(r)}>reject</PillBtn>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Members ── */}
          <TabsContent value="members" className="space-y-0">
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  className="px-5 py-3 flex items-center gap-4 flex-wrap"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <AvatarBlock url={m.avatar_url} name={m.display_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate" style={{ color: "#F5F0EB" }}>{m.display_name}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#2A1A0E", color: "#E8734A", borderRadius: 999 }}>builder</span>
                      {m.is_admin && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ background: "#1E1E1E", color: "#C9B99A", borderRadius: 999 }}>admin</span>
                      )}
                    </div>
                    <span className="text-xs font-mono" style={{ color: "#A09890" }}>
                      joined {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {m.id !== user?.id && (
                      <>
                        <button
                          onClick={() => setPermissionsMember(m)}
                          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full transition-colors hover:bg-white/5"
                          style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#6A6460" }}
                          title="manage per-project permissions"
                        >
                          <Settings2 className="h-3 w-3" /> permissions
                        </button>
                        <button
                          onClick={() => toggleAdmin(m.id, m.is_admin)}
                          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full transition-colors hover:bg-white/5"
                          style={{
                            border: m.is_admin ? "1px solid rgba(201,185,154,0.3)" : "1px solid rgba(255,255,255,0.08)",
                            color: m.is_admin ? "#C9B99A" : "#6A6460",
                          }}
                          title={m.is_admin ? "remove admin" : "make admin"}
                        >
                          {m.is_admin ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {m.is_admin ? "demote" : "make admin"}
                        </button>
                        <PillBtn variant="ghost" onClick={() => removeMember(m.id)}>remove</PillBtn>
                      </>
                    )}
                    {m.id === user?.id && (
                      <span className="text-[10px] font-mono" style={{ color: "#4A4A4A" }}>you</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Channels ── */}
          <TabsContent value="channels" className="space-y-3">
            <p className="text-xs font-mono mb-4" style={{ color: "#6A6460" }}>
              control what visitors (not logged in) can see, and set per-channel intro videos.
            </p>
            {channels.map((c) => (
              <ChannelAdminRow key={c.id} channel={c} onUpdate={loadAll} />
            ))}
          </TabsContent>

          {/* ── Projects ── */}
          <TabsContent value="projects" className="space-y-3">
            <p className="text-xs font-mono mb-4" style={{ color: "#6A6460" }}>
              control member posting, sub-project creation, editing, and deletion per project folder.
            </p>
            {projects.length === 0 && (
              <p className="text-sm font-mono" style={{ color: "#A09890" }}>no projects yet.</p>
            )}
            {projects.map((p) => (
              <ProjectAdminRow key={p.id} project={p} onUpdate={loadAll} />
            ))}
          </TabsContent>
        </Tabs>

        <MemberPermissionsDialog
          member={permissionsMember}
          projects={projects}
          onClose={() => setPermissionsMember(null)}
        />

        <DmThread
          request={dmRequest}
          onClose={() => { setDmRequest(null); loadAll(); }}
          onApprove={(req) => yoloOnboard(req)}
          onReject={reject}
        />

        <Dialog open={!!credentialModal} onOpenChange={(o) => !o && setCredentialModal(null)}>
          <DialogContent style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
            <DialogHeader>
              <DialogTitle className="font-medium" style={{ color: "#F5F0EB" }}>approved</DialogTitle>
            </DialogHeader>
            <p className="text-sm mb-4" style={{ color: "#A09890" }}>
              share these credentials with the new builder. they should change their password.
            </p>
            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 break-all" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "#F5F0EB" }}>
                <span style={{ color: "#A09890" }}>email · </span>{credentialModal?.email}
              </div>
              <div className="p-3 break-all" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "#F5F0EB" }}>
                <span style={{ color: "#A09890" }}>password · </span>{credentialModal?.password}
              </div>
            </div>
            <Button
              onClick={() => { navigator.clipboard.writeText(`${credentialModal?.email} / ${credentialModal?.password}`); toast.success("copied"); }}
              className="mt-3"
            >
              copy
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

// ─── Channel Admin Row ────────────────────────────────────────────────────────
const ChannelAdminRow = ({ channel, onUpdate }: { channel: any; onUpdate: () => void }) => {
  const [count, setCount]       = useState(0);
  const [recent, setRecent]     = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(!!channel.is_public_visible);
  const [introUrl, setIntroUrl] = useState(channel.intro_video_url ?? "");
  const [open, setOpen]         = useState(false);

  const load = () => {
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("channel_id", channel.id)
      .then(({ count }) => setCount(count ?? 0));
    supabase.from("posts").select("id, title, content, is_pinned, created_at, visibility")
      .eq("channel_id", channel.id).order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => setRecent(data ?? []));
  };
  useEffect(load, [channel.id]);

  const togglePublic = async (val: boolean) => {
    setIsPublic(val);
    const { error } = await supabase.from("channels").update({ is_public_visible: val }).eq("id", channel.id);
    if (error) { toast.error(error.message); setIsPublic(!val); return; }
    toast.success(val ? `${channel.name} is now visible to visitors` : `${channel.name} is members only`);
  };

  const saveIntroUrl = async () => {
    const { error } = await supabase.from("channels").update({ intro_video_url: introUrl.trim() || null }).eq("id", channel.id);
    if (error) { toast.error(error.message); return; }
    toast.success("intro video saved");
  };

  const togglePin = async (postId: string, current: boolean) => {
    await supabase.from("posts").update({ is_pinned: !current }).eq("id", postId);
    setRecent((arr) => arr.map((p) => p.id === postId ? { ...p, is_pinned: !current } : p));
    toast.success(current ? "unpinned" : "pinned");
  };

  const removePost = async (postId: string) => {
    if (!confirm("delete this post?")) return;
    await supabase.from("posts").delete().eq("id", postId);
    setRecent((arr) => arr.filter((p) => p.id !== postId));
    toast.success("deleted");
  };

  return (
    <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronUp className="h-4 w-4" style={{ color: "#6A6460" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#6A6460" }} />}
          <h3 className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
            {channel.name.toLowerCase()}
          </h3>
          <span className="text-xs font-mono" style={{ color: "#6A6460" }}>{count} posts</span>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isPublic
            ? <Globe className="h-3.5 w-3.5" style={{ color: "#1B9A6A" }} />
            : <Lock className="h-3.5 w-3.5" style={{ color: "#6A6460" }} />}
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: isPublic ? "#1B9A6A" : "#6A6460" }}>
            {isPublic ? "public" : "members only"}
          </span>
          <Switch checked={isPublic} onCheckedChange={togglePublic} />
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Intro video */}
          <div className="pt-4">
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "#8A8480" }}>
              <Youtube className="h-3 w-3" /> intro video url
            </p>
            <div className="flex gap-2">
              <input
                value={introUrl}
                onChange={e => setIntroUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                className="flex-1 px-3 py-2 text-xs font-mono focus:outline-none"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
              />
              <button
                onClick={saveIntroUrl}
                className="px-4 py-2 text-xs font-mono rounded-lg hover:opacity-90"
                style={{ background: "#E8734A", color: "#0D0D0D" }}
              >
                save
              </button>
            </div>
            {introUrl && (
              <p className="text-[10px] font-mono mt-1" style={{ color: "#6A6460" }}>
                ✓ intro video set — shows collapsed above posts on this channel + home dashboard
              </p>
            )}
          </div>

          {/* Recent posts */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>recent posts</p>
            <div className="space-y-2">
              {recent.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate" style={{ color: "#F5F0EB" }}>
                    {p.title || p.content?.slice(0, 60)}
                  </span>
                  <span className="text-[10px] font-mono uppercase" style={{ color: "#A09890" }}>{p.visibility}</span>
                  <PillBtn variant="ghost" onClick={() => togglePin(p.id, p.is_pinned)}>
                    {p.is_pinned ? "unpin" : "pin"}
                  </PillBtn>
                  <PillBtn variant="ghost" onClick={() => removePost(p.id)}>×</PillBtn>
                </div>
              ))}
              {recent.length === 0 && (
                <p className="text-xs font-mono" style={{ color: "#4A4A4A" }}>no posts</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Project Admin Row ────────────────────────────────────────────────────────
const ProjectAdminRow = ({ project, onUpdate }: { project: any; onUpdate: () => void }) => {
  const [open, setOpen]           = useState(false);
  const [canPost, setCanPost]     = useState(project.can_members_post ?? true);
  const [canSub, setCanSub]       = useState(project.can_members_create_sub ?? false);
  const [canEdit, setCanEdit]     = useState(project.can_members_edit ?? false);
  const [canDelete, setCanDelete] = useState(project.can_members_delete ?? false);
  const [introUrl, setIntroUrl]   = useState(project.intro_video_url ?? "");
  const [isHidden, setIsHidden]   = useState(!!project.is_hidden);
  const [subCount, setSubCount]   = useState(0);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    supabase.from("channel_projects").select("*", { count: "exact", head: true }).eq("parent_project_id", project.id).eq("is_active", true)
      .then(({ count }) => setSubCount(count ?? 0));
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("project_id", project.id)
      .then(({ count }) => setPostCount(count ?? 0));
  }, [project.id]);

  const toggle = async (field: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    const { error } = await supabase.from("channel_projects").update({ [field]: val }).eq("id", project.id);
    if (error) { toast.error(error.message); setter(!val); return; }
    toast.success("updated");
  };

  const saveIntroUrl = async () => {
    const { error } = await supabase.from("channel_projects").update({ intro_video_url: introUrl.trim() || null }).eq("id", project.id);
    if (error) { toast.error(error.message); return; }
    toast.success("intro video saved");
  };

  const projectTypeBadge = project.project_type === "skill" ? "skill" : "project";

  return (
    <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronUp className="h-4 w-4" style={{ color: "#6A6460" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#6A6460" }} />}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono opacity-40" style={{ color: "#F5F0EB" }}>#{project.slot_number}</span>
              <h3 className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>{project.name}</h3>
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
                style={{ background: "#1E1E1E", color: project.project_type === "skill" ? "#7C3AED" : "#E8734A", borderRadius: 999, border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {projectTypeBadge}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-mono" style={{ color: "#6A6460" }}>{postCount} posts</span>
              <span className="text-[10px] font-mono" style={{ color: "#6A6460" }}>{subCount} sub-folders</span>
              {!canPost && <span className="text-[10px] font-mono" style={{ color: "#EA580C" }}>posting locked</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isHidden
            ? <EyeOff className="h-3.5 w-3.5" style={{ color: "#6A6460" }} />
            : <Eye className="h-3.5 w-3.5" style={{ color: "#1B9A6A" }} />}
          <Switch
            checked={!isHidden}
            onCheckedChange={v => toggle("is_hidden", !v, (val) => setIsHidden(!val))}
          />
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mt-4 mb-1" style={{ color: "#8A8480" }}>member permissions</p>

          <ToggleRow
            label="members can post"
            sublabel="non-admins can create posts inside this folder"
            checked={canPost}
            onChange={v => toggle("can_members_post", v, setCanPost)}
          />
          <ToggleRow
            label="members can create sub-folders"
            sublabel="non-admins can add new sub-project tiles inside this folder"
            checked={canSub}
            onChange={v => toggle("can_members_create_sub", v, setCanSub)}
          />
          <ToggleRow
            label="members can edit their posts"
            sublabel="non-admins can edit posts they authored inside this folder"
            checked={canEdit}
            onChange={v => toggle("can_members_edit", v, setCanEdit)}
          />
          <ToggleRow
            label="members can delete their posts"
            sublabel="non-admins can delete posts they authored inside this folder"
            checked={canDelete}
            onChange={v => toggle("can_members_delete", v, setCanDelete)}
          />

          <p className="text-[10px] font-mono uppercase tracking-wider mt-5 mb-2" style={{ color: "#8A8480" }}>
            <Youtube className="h-3 w-3 inline mr-1" />intro video url
          </p>
          <div className="flex gap-2">
            <input
              value={introUrl}
              onChange={e => setIntroUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="flex-1 px-3 py-2 text-xs font-mono focus:outline-none"
              style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
            />
            <button
              onClick={saveIntroUrl}
              className="px-4 py-2 text-xs font-mono rounded-lg hover:opacity-90"
              style={{ background: "#E8734A", color: "#0D0D0D" }}
            >
              save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Member Permissions Dialog ────────────────────────────────────────────────
// Per-member per-project override. If no row exists → project defaults apply.
// Creating any toggle creates a row; "reset" deletes the row → back to defaults.
const MemberPermissionsDialog = ({
  member, projects, onClose,
}: { member: any; projects: any[]; onClose: () => void }) => {
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    supabase
      .from("member_project_permissions")
      .select("*")
      .eq("member_id", member.id)
      .then(({ data }) => {
        const map: Record<string, any> = {};
        (data ?? []).forEach((r: any) => { map[r.project_id] = r; });
        setOverrides(map);
        setLoading(false);
      });
  }, [member?.id]);

  const upsert = async (projectId: string, field: string, val: boolean) => {
    const existing = overrides[projectId];
    if (existing?.id) {
      await supabase
        .from("member_project_permissions")
        .update({ [field]: val })
        .eq("id", existing.id);
      setOverrides(prev => ({ ...prev, [projectId]: { ...existing, [field]: val } }));
    } else {
      const defaults = projects.find(p => p.id === projectId) ?? {};
      const row = {
        member_id:      member.id,
        project_id:     projectId,
        can_post:       defaults.can_members_post        ?? true,
        can_edit:       defaults.can_members_edit        ?? false,
        can_delete:     defaults.can_members_delete      ?? false,
        can_create_sub: defaults.can_members_create_sub  ?? false,
        [field]:        val,
      };
      const { data } = await supabase
        .from("member_project_permissions")
        .insert(row)
        .select()
        .maybeSingle();
      setOverrides(prev => ({ ...prev, [projectId]: data ?? { ...row } }));
    }
    toast.success("saved");
  };

  const reset = async (projectId: string) => {
    const existing = overrides[projectId];
    if (!existing?.id) return;
    await supabase.from("member_project_permissions").delete().eq("id", existing.id);
    setOverrides(prev => { const n = { ...prev }; delete n[projectId]; return n; });
    toast.success("reset to project defaults");
  };

  if (!member) return null;

  return (
    <Dialog open={!!member} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-lg"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="font-medium flex items-center gap-2" style={{ color: "#F5F0EB" }}>
            <Settings2 className="h-4 w-4" style={{ color: "#E8734A" }} />
            project permissions · {member.display_name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-[11px] font-mono mb-4" style={{ color: "#6A6460" }}>
          overrides take priority over project defaults. toggle any permission to create an override.
          hit reset to go back to project defaults.
        </p>

        {loading ? (
          <div className="py-8 text-center text-sm font-mono" style={{ color: "#6A6460" }}>loading…</div>
        ) : (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {projects.length === 0 && (
              <p className="text-sm font-mono text-center py-8" style={{ color: "#6A6460" }}>no projects yet.</p>
            )}
            {projects.map(p => {
              const ov = overrides[p.id];
              const has = !!ov?.id;

              // effective values: override if exists, else project default
              const val = (field: string, def: boolean | null) =>
                has ? (ov[field] ?? def ?? false) : (def ?? false);

              return (
                <div
                  key={p.id}
                  style={{
                    background: has ? "rgba(232,115,74,0.05)" : "#0D0D0D",
                    border: has ? "1px solid rgba(232,115,74,0.2)" : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "#F5F0EB" }}>{p.name}</span>
                      {has && (
                        <span
                          className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
                          style={{ background: "rgba(232,115,74,0.15)", color: "#E8734A", borderRadius: 999 }}
                        >
                          override active
                        </span>
                      )}
                    </div>
                    {has && (
                      <button
                        onClick={() => reset(p.id)}
                        className="text-[10px] font-mono uppercase tracking-wider hover:opacity-80 transition-opacity"
                        style={{ color: "#6A6460" }}
                      >
                        reset →
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4">
                    {[
                      { field: "can_post",       label: "can post",           def: p.can_members_post        ?? true  },
                      { field: "can_edit",       label: "can edit own posts", def: p.can_members_edit        ?? false },
                      { field: "can_delete",     label: "can delete own",     def: p.can_members_delete      ?? false },
                      { field: "can_create_sub", label: "can add sub-folder", def: p.can_members_create_sub  ?? false },
                    ].map(({ field, label, def }) => (
                      <div
                        key={field}
                        className="flex items-center justify-between py-1.5"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      >
                        <span className="text-xs" style={{ color: "#A09890" }}>{label}</span>
                        <Switch
                          checked={val(field, def)}
                          onCheckedChange={v => upsert(p.id, field, v)}
                        />
                      </div>
                    ))}
                  </div>

                  {!has && (
                    <p className="text-[10px] font-mono mt-2" style={{ color: "#4A4A4A" }}>
                      using project defaults — toggle to override for this member
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── DM Thread ────────────────────────────────────────────────────────────────
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
      <DialogContent className="max-w-2xl" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
        <DialogHeader>
          <DialogTitle className="font-medium flex items-center gap-2" style={{ color: "#F5F0EB" }}>
            <MessageSquare className="h-4 w-4" /> dm with {request?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="p-3 mb-3" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "#A09890" }}>building</p>
          <p className="text-sm" style={{ color: "#F5F0EB" }}>{request?.what_building}</p>
        </div>
        <div className="max-h-[320px] overflow-y-auto space-y-3 p-1">
          {messages.length === 0 && (
            <p className="text-xs font-mono text-center py-8" style={{ color: "#A09890" }}>no messages yet — say hi.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                {m.sender_type === "requester" && (
                  <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "#A09890" }}>{request?.name}</div>
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
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="type a message…"
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />
          <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2 pt-3 mt-3 justify-end" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <PillBtn variant="ghost" onClick={() => { onReject(request); onClose(); }}>reject</PillBtn>
          <PillBtn variant="primary" onClick={() => { onApprove(request); onClose(); }}>approve as builder</PillBtn>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Admin;
