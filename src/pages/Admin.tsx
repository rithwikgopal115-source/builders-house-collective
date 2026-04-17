import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AvatarBlock } from "@/components/AvatarBlock";
import { TierBadge } from "@/components/TierBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [credentialModal, setCredentialModal] = useState<{ email: string; password: string } | null>(null);

  const loadAll = async () => {
    const [{ data: r }, { data: m }, { data: c }] = await Promise.all([
      supabase.from("access_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("is_approved", true).order("created_at", { ascending: false }),
      supabase.from("channels").select("id, slug, name").order("sort_order"),
    ]);
    setRequests(r ?? []);
    setMembers(m ?? []);
    setChannels(c ?? []);
  };

  useEffect(() => {
    document.title = "admin — builders house";
    if (isAdmin) loadAll();
  }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/home" replace />;

  const review = async (id: string, action: "approve" | "reject") => {
    const { data, error } = await supabase.functions.invoke("approve-access-request", {
      body: { request_id: id, action },
    });
    if (error) { toast.error(error.message); return; }
    if (data?.error) { toast.error(data.error); return; }
    if (action === "approve" && data?.temp_password) {
      setCredentialModal({ email: data.email, password: data.temp_password });
    } else {
      toast.success(`request ${action}d`);
    }
    loadAll();
  };

  const changeTier = async (id: string, tier: "learner" | "founder") => {
    await supabase.from("profiles").update({ tier }).eq("id", id);
    toast.success("tier updated");
    loadAll();
  };

  const removeMember = async (id: string) => {
    if (!confirm("remove this member? they'll lose access.")) return;
    await supabase.from("profiles").update({ is_approved: false }).eq("id", id);
    toast.success("removed");
    loadAll();
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <h1 className="text-2xl font-medium mb-8">admin</h1>

        <Tabs defaultValue="requests">
          <TabsList className="bg-surface hairline mb-6">
            <TabsTrigger value="requests">access requests ({requests.filter(r => r.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="members">members ({members.length})</TabsTrigger>
            <TabsTrigger value="channels">channels</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-3">
            {requests.length === 0 && <p className="text-sm text-muted-foreground font-mono">no requests</p>}
            {requests.map((r) => (
              <div key={r.id} className="bento-card">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{r.email}</span>
                    </div>
                    <p className="text-sm text-foreground/80 mb-2">{r.what_building}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <TierBadge tier={r.requested_tier} />
                      <span className="font-mono text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      <span className="font-mono text-muted-foreground">· {r.status}</span>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => review(r.id, "approve")}>approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => review(r.id, "reject")}>reject</Button>
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
                    <TierBadge tier={m.tier} />
                    {m.is_system && <span className="text-[10px] font-mono px-1.5 rounded bg-surface-elevated text-muted-foreground">system</span>}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">joined {new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                {!m.is_system && (
                  <>
                    <select
                      value={m.tier}
                      onChange={(e) => changeTier(m.id, e.target.value as any)}
                      className="bg-background hairline rounded-lg px-2 py-1.5 text-xs font-mono"
                    >
                      <option value="learner">learner</option>
                      <option value="founder">founder</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>remove</Button>
                  </>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="channels" className="space-y-3">
            {channels.map((c) => (
              <ChannelAdminRow key={c.id} channel={c} />
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={!!credentialModal} onOpenChange={(o) => !o && setCredentialModal(null)}>
          <DialogContent className="bg-surface border-0 hairline">
            <DialogHeader><DialogTitle className="font-normal">approved</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">share these credentials with the new member. they should change their password after logging in.</p>
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

const ChannelAdminRow = ({ channel }: { channel: any }) => {
  const [count, setCount] = useState<number>(0);
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("channel_id", channel.id).then(({ count }) => setCount(count ?? 0));
    supabase.from("posts").select("id, title, content, is_pinned, created_at").eq("channel_id", channel.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setRecent(data ?? []));
  }, [channel.id]);

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
            <span className="flex-1 truncate">{p.title || p.content.slice(0, 60)}</span>
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
