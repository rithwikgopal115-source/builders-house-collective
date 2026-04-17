import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { FileText, Link as LinkIcon, Video, FileType, Users, Globe, Lock } from "lucide-react";

interface Channel { id: string; slug: string; name: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultChannelId?: string;
  onCreated?: () => void;
}

export const PostComposer = ({ open, onOpenChange, defaultChannelId, onCreated }: Props) => {
  const { user, profile, isAdmin } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState<string>(defaultChannelId ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"text" | "link" | "video" | "doc">("text");
  const [url, setUrl] = useState("");
  const [visibility, setVisibility] = useState<"community" | "public" | "private">("community");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("channels").select("id, slug, name").order("sort_order").then(({ data }) => {
      setChannels(data ?? []);
      if (!channelId && data?.length) setChannelId(defaultChannelId ?? data[0].id);
    });
  }, [defaultChannelId]);

  const submit = async () => {
    if (!user || !profile?.is_approved) { toast.error("only approved members can post"); return; }
    if (!content.trim()) { toast.error("write something"); return; }
    if (!channelId) { toast.error("pick a channel"); return; }
    setBusy(true);

    // Members can only insert community or public; for public, save as community + create request.
    const isMemberRequestingPublic = visibility === "public" && !isAdmin;
    const insertVisibility = isMemberRequestingPublic ? "community" : visibility;

    const { data: created, error } = await supabase.from("posts").insert({
      channel_id: channelId,
      user_id: user.id,
      title: title.trim() || null,
      content: content.trim(),
      type,
      url: url.trim() || null,
      visibility: insertVisibility,
    }).select("id").maybeSingle();

    if (error) { setBusy(false); toast.error(error.message); return; }

    if (isMemberRequestingPublic && created) {
      await supabase.from("public_visibility_requests").insert({
        post_id: created.id,
        initiator_id: user.id,
        direction: "member_to_admin",
      });
      // notify any admin
      const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
      if (admins?.length) {
        await supabase.from("notifications").insert(admins.map((a) => ({
          recipient_id: a.id,
          type: "public_request",
          related_id: created.id,
          content: `${profile.display_name} wants to make a post public`,
        })));
      }
      toast.success("posted · public request sent to admin");
    } else {
      toast.success("posted");
    }

    setBusy(false);
    setTitle(""); setContent(""); setUrl(""); setType("text"); setVisibility("community");
    onOpenChange(false);
    onCreated?.();
  };

  const TYPES: { v: typeof type; i: any; l: string }[] = [
    { v: "text", i: FileText, l: "text" },
    { v: "link", i: LinkIcon, l: "link" },
    { v: "video", i: Video, l: "video" },
    { v: "doc", i: FileType, l: "doc" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-0 hairline max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-normal">new post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {TYPES.map(({ v, i: Icon, l }) => (
              <button key={v} onClick={() => setType(v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono hairline transition-colors ${
                  type === v ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-surface-elevated"
                }`}>
                <Icon className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
          </div>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title (optional)"
            className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />

          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="what's on your mind?"
            rows={5}
            className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />

          {type !== "text" && (
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://"
              className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">visibility</p>
              <div className="flex flex-wrap gap-2">
                <VisChip active={visibility === "community"} onClick={() => setVisibility("community")} icon={Users} label="community" />
                <VisChip active={visibility === "public"} onClick={() => setVisibility("public")} icon={Globe} label="public" />
                {isAdmin && <VisChip active={visibility === "private"} onClick={() => setVisibility("private")} icon={Lock} label="private" />}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">channel</p>
              <div className="flex flex-wrap gap-2">
                {channels.map((c) => (
                  <button key={c.id} onClick={() => setChannelId(c.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-md font-mono hairline transition-colors ${
                      channelId === c.id ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-surface-elevated text-muted-foreground"
                    }`}>
                    {c.name.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {visibility === "public" && !isAdmin && (
            <p className="text-[11px] text-muted-foreground font-mono">
              public posts need admin approval. saved as community until approved.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={busy} className="px-8">{busy ? "posting…" : "post it"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VisChip = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono hairline transition-colors ${
      active ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-surface-elevated text-muted-foreground"
    }`}>
    <Icon className="h-3 w-3" /> {label}
  </button>
);
