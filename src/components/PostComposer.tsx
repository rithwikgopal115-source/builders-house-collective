import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { FileText, Link as LinkIcon, Youtube, FileType, FileText as Pdf, LayoutTemplate, Users, Globe, Lock, Image as ImageIcon, X, Loader2 } from "lucide-react";

interface Channel { id: string; slug: string; name: string; }

type PostType = "text" | "link" | "video" | "doc" | "pdf" | "template";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultChannelId?: string;
  defaultIsResource?: boolean;
  onCreated?: () => void;
}

const TYPES: { v: PostType; i: any; l: string }[] = [
  { v: "text", i: FileText, l: "text" },
  { v: "link", i: LinkIcon, l: "link" },
  { v: "video", i: Youtube, l: "youtube" },
  { v: "doc", i: FileType, l: "doc" },
  { v: "pdf", i: Pdf, l: "pdf" },
  { v: "template", i: LayoutTemplate, l: "template" },
];

// Map UI types onto the DB's allowed ('text' | 'link' | 'video' | 'doc') set.
const dbType = (t: PostType) => (t === "pdf" || t === "template" ? "doc" : t);

export const PostComposer = ({ open, onOpenChange, defaultChannelId, defaultIsResource, onCreated }: Props) => {
  const { user, profile, isAdmin } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState<string>(defaultChannelId ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostType>("text");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState<"community" | "public" | "private">("community");
  const [isResource, setIsResource] = useState(!!defaultIsResource);
  const [busy, setBusy] = useState(false);
  const [ytPreview, setYtPreview] = useState<{ thumb: string; title: string } | null>(null);

  useEffect(() => {
    supabase.from("channels").select("id, slug, name").order("sort_order").then(({ data }) => {
      setChannels(data ?? []);
      if (!channelId && data?.length) setChannelId(defaultChannelId ?? data[0].id);
    });
  }, [defaultChannelId]);

  useEffect(() => { setIsResource(!!defaultIsResource); }, [defaultIsResource, open]);
  useEffect(() => { if (defaultChannelId) setChannelId(defaultChannelId); }, [defaultChannelId, open]);

  // YouTube oEmbed thumbnail + title
  useEffect(() => {
    if (type !== "video" || !url.trim()) { setYtPreview(null); return; }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url.trim())}&format=json`);
        if (!res.ok) { setYtPreview(null); return; }
        const data = await res.json();
        setYtPreview({ thumb: data.thumbnail_url, title: data.title });
      } catch {
        setYtPreview(null);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [type, url]);

  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/post-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-images").upload(path, file);
    if (error) { setUploading(false); toast.error(error.message); return; }
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const reset = () => {
    setTitle(""); setContent(""); setUrl(""); setType("text");
    setVisibility("community"); setIsResource(!!defaultIsResource);
    setImageUrl(null); setYtPreview(null);
  };

  const submit = async () => {
    if (!user || !profile?.is_approved) { toast.error("only approved members can post"); return; }
    if (!content.trim() && !title.trim() && !url.trim() && !imageUrl) { toast.error("write something"); return; }
    if (!channelId) { toast.error("pick a channel"); return; }
    setBusy(true);

    const isMemberRequestingPublic = visibility === "public" && !isAdmin;
    const insertVisibility = isMemberRequestingPublic ? "community" : visibility;

    // url field stores either the link OR the uploaded image url
    const finalUrl = url.trim() || imageUrl || null;

    const { data: created, error } = await supabase.from("posts").insert({
      channel_id: channelId,
      user_id: user.id,
      title: title.trim() || null,
      content: content.trim(),
      type: dbType(type),
      url: finalUrl,
      visibility: insertVisibility,
      is_resource: isResource,
    }).select("id").maybeSingle();

    if (error) { setBusy(false); toast.error(error.message); return; }

    if (isMemberRequestingPublic && created) {
      await supabase.from("public_visibility_requests").insert({
        post_id: created.id,
        initiator_id: user.id,
        direction: "member_to_admin",
      });
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
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="bg-surface border-0 hairline max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-normal">new post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TYPES.map(({ v, i: Icon, l }) => (
              <button key={v} onClick={() => setType(v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono hairline transition-colors ${
                  type === v ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-surface-elevated text-muted-foreground"
                }`}>
                <Icon className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
          </div>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title (optional)"
            maxLength={200}
            className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />

          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="what's on your mind?"
            rows={5} maxLength={5000}
            className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />

          {type !== "text" && (
            <div className="space-y-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://"
                className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
              {type === "video" && ytPreview && (
                <div className="rounded-lg overflow-hidden hairline">
                  <img src={ytPreview.thumb} alt={ytPreview.title} className="w-full" />
                  <div className="px-3 py-2 text-xs bg-surface-elevated">{ytPreview.title}</div>
                </div>
              )}
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">image (optional)</label>
            {imageUrl ? (
              <div className="relative inline-block">
                <img src={imageUrl} alt="" className="max-h-40 rounded-lg hairline" />
                <button onClick={() => setImageUrl(null)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono hairline hover:bg-surface-elevated">
                <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" disabled={uploading} />
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {uploading ? "uploading…" : "upload image"}
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)}
                className="w-full bg-background hairline rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary">
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name.toLowerCase()}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={isResource} onChange={(e) => setIsResource(e.target.checked)} />
            save to resources tab (curated)
          </label>

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
