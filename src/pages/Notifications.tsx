import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Globe, Zap, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Notif {
  id: string;
  type: string;
  content: string | null;
  related_id: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

const ICONS: Record<string, any> = {
  comment: MessageSquare,
  public_request: Globe,
  public_request_response: Globe,
  access_request: Zap,
  onboarding_message: MessageSquare,
};

const Notifications = () => {
  const { user, profile, loading } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    document.title = "notifications — builders house";
    if (!user) return;
    load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80);
    setItems((data ?? []) as Notif[]);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);
    load();
  };

  const respondToPublic = async (n: Notif, approve: boolean) => {
    if (!n.related_id) return;
    // related_id is the post id. Find the pending request for that post.
    const { data: req } = await supabase
      .from("public_visibility_requests")
      .select("id, post_id, initiator_id")
      .eq("post_id", n.related_id)
      .eq("status", "pending")
      .maybeSingle();
    if (!req) { toast.error("request no longer pending"); return; }

    await supabase.from("public_visibility_requests").update({ status: approve ? "approved" : "declined" }).eq("id", req.id);
    if (approve) {
      await supabase.from("posts").update({ visibility: "public" }).eq("id", req.post_id);
    }
    // Notify the initiator of the response
    await supabase.from("notifications").insert({
      recipient_id: req.initiator_id,
      type: "public_request_response",
      related_id: req.post_id,
      content: approve ? "your public request was approved" : "your public request was declined",
    });
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    toast.success(approve ? "now public" : "declined");
    load();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-medium tracking-tight">notifications</h1>
          </div>
          <button onClick={markAllRead} className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary">
            mark all read
          </button>
        </header>

        <div className="space-y-2">
          {items.length === 0 && (
            <div className="bento-card text-center py-12 text-sm text-muted-foreground font-mono">
              nothing yet.
            </div>
          )}
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const isPublicRequest = n.type === "public_request" && n.related_id;
            return (
              <div key={n.id} className="bento-card flex items-start gap-3 relative">
                {!n.is_read && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-primary" />
                )}
                <div className="h-9 w-9 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.content}</p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                    {timeAgo(n.created_at)}
                  </p>
                  {isPublicRequest && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => respondToPublic(n, true)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => respondToPublic(n, false)}>
                        <X className="h-3.5 w-3.5 mr-1" /> decline
                      </Button>
                      {n.related_id && (
                        <Link to="/home" className="text-xs font-mono text-muted-foreground self-center hover:text-foreground">view post</Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default Notifications;
