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

const CHANNEL_EMOJI: Record<string, string> = {
  "resources": "⭐", "ai-news": "⚡", "ideas": "💡",
  "vibing": "🎵", "hiring": "💼", "wins": "🏆",
};

const dbType = (t: PostType) => (t === "pdf" || t === "template" ? "doc" : t);

// Solid coral when active, dark + hairline when not
const PillStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#E8734A" : "#1E1E1E",
  color: active ? "#0D0D0D" : "#8A8480",
  border: active ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.08)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  transition: "all .15s",
});

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
    try {
  
      const isMemberRequestingPublic = visibility === "public" && !isAdmin;
      const insertVisibility = isMemberRequestingPublic ? "community" : visibility;
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
  
      if (error) { toast.error(error.message); return; }
  
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
  
      reset();
      onOpenChange(false);
    onCreated?.();
    } catch (e: any) {
      toast.error(e?.message ?? "something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent
        className="border-0 max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>new post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type pills — solid coral when active */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(({ v, i: Icon, l }) => (
                <button
                  key={v}
                  onClick={() => setType(v)}
                  className="flex items-center gap-1.5 font-mono"
                  style={PillStyle(type === v)}
                >
                  <Icon className="h-3.5 w-3.5" /> {l}
                </button>
              ))}
            </div>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title (optional)"
            maxLength={200}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="what's on your mind?"
            rows={5}
            maxLength={5000}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />

          {type !== "text" && (
            <div className="space-y-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
              />
              {type === "video" && ytPreview && (
                <div className="overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
                  <img src={ytPreview.thumb} alt={ytPreview.title} className="w-full" />
                  <div className="px-3 py-2 text-xs" style={{ background: "#1E1E1E", color: "#F5F0EB" }}>{ytPreview.title}</div>
                </div>
              )}
            </div>
          )}

          {/* Image upload */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>image (optional)</p>
            {imageUrl ? (
              <div className="relative inline-block">
                <img src={imageUrl} alt="" className="max-h-40" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }} />
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(13,13,13,0.85)" }}
                >
                  <X className="h-3 w-3" style={{ color: "#F5F0EB" }} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer inline-flex items-center gap-2 font-mono" style={PillStyle(false)}>
                <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" disabled={uploading} />
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {uploading ? "uploading…" : "upload image"}
              </label>
            )}
          </div>

          {/* Visibility pills */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>visibility</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setVisibility("community")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "community")}>
                <Users className="h-3 w-3" /> community
              </button>
              <button onClick={() => setVisibility("public")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "public")}>
                <Globe className="h-3 w-3" /> public
              </button>
              {isAdmin && (
                <button onClick={() => setVisibility("private")} className="flex items-center gap-1.5 font-mono" style={PillStyle(visibility === "private")}>
                  <Lock className="h-3 w-3" /> private
                </button>
              )}
            </div>
          </div>

          {/* Channel pills */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>channel</p>
            <div className="flex flex-wrap gap-1.5">
              {channels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChannelId(c.id)}
                  className="flex items-center gap-1.5 font-mono"
                  style={PillStyle(channelId === c.id)}
                >
                  <span>{CHANNEL_EMOJI[c.slug] ?? "•"}</span> {c.name.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: "#8A8480" }}>
            <input type="checkbox" checked={isResource} onChange={(e) => setIsResource(e.target.checked)} />
            save to resources tab (curated)
          </label>

          {visibility === "public" && !isAdmin && (
            <p className="text-[11px] font-mono" style={{ color: "#8A8480" }}>
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
