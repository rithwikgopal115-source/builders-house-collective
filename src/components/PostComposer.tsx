import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  FileText,
  Link as LinkIcon,
  Youtube,
  FileType,
  LayoutTemplate,
  Users,
  Globe,
  Lock,
  Image as ImageIcon,
  X,
  Loader2,
  Plus,
} from "lucide-react";

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
  { v: "text",     i: FileText,       l: "text" },
  { v: "link",     i: LinkIcon,       l: "link" },
  { v: "video",    i: Youtube,        l: "youtube" },
  { v: "doc",      i: FileType,       l: "doc" },
  { v: "pdf",      i: FileType,       l: "pdf" },
  { v: "template", i: LayoutTemplate, l: "template" },
];

const CHANNEL_EMOJI: Record<string, string> = {
  "resources": "⭐", "ai-news": "⚡", "ideas": "💡",
  "vibing": "🎵", "hiring": "💼", "wins": "🏆",
};

const dbType = (t: PostType) => (t === "pdf" || t === "template" ? "doc" : t);

const PillStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#E8734A" : "#1E1E1E",
  color:      active ? "#0D0D0D" : "#8A8480",
  border:     active ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.08)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  transition: "all .15s",
});

export const PostComposer = ({
  open,
  onOpenChange,
  defaultChannelId,
  defaultIsResource,
  onCreated,
}: Props) => {
  const { user, profile, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channels,    setChannels]    = useState<Channel[]>([]);
  const [channelId,   setChannelId]   = useState<string>(defaultChannelId ?? "");
  const [title,       setTitle]       = useState("");
  const [content,     setContent]     = useState("");
  const [type,        setType]        = useState<PostType>("text");
  const [url,         setUrl]         = useState("");
  const [imageUrls,   setImageUrls]   = useState<string[]>([]);   // ← multiple images
  const [uploading,   setUploading]   = useState(false);
  const [uploadingIdx,setUploadingIdx]= useState<number | null>(null);
  const [visibility,  setVisibility]  = useState<"community" | "public" | "private">("community");
  const [isResource,  setIsResource]  = useState(!!defaultIsResource);
  const [busy,        setBusy]        = useState(false);
  const [ytPreview,   setYtPreview]   = useState<{ thumb: string; title: string } | null>(null);

  // ── Load channels ──────────────────────────────────────────
  useEffect(() => {
    supabase.from("channels").select("id, slug, name").order("sort_order").then(({ data }) => {
      setChannels(data ?? []);
      if (!channelId && data?.length) setChannelId(defaultChannelId ?? data[0].id);
    });
  }, [defaultChannelId]);

  useEffect(() => { setIsResource(!!defaultIsResource); }, [defaultIsResource, open]);
  useEffect(() => { if (defaultChannelId) setChannelId(defaultChannelId); }, [defaultChannelId, open]);

  // ── YouTube preview ────────────────────────────────────────
  useEffect(() => {
    if (type !== "video" || !url.trim()) { setYtPreview(null); return; }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url.trim())}&format=json`);
        if (!res.ok) { setYtPreview(null); return; }
        const data = await res.json();
        setYtPreview({ thumb: data.thumbnail_url, title: data.title });
      } catch { setYtPreview(null); }
    }, 400);
    return () => clearTimeout(handle);
  }, [type, url]);

  // ── Multi-image upload ─────────────────────────────────────
  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;

    setUploading(true);
    const results: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadingIdx(i);
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/post-${Date.now()}-${i}.${ext}`;

      const { error } = await supabase.storage
        .from("post-images")
        .upload(path, file, { upsert: false });

      if (error) {
        toast.error(`Image ${i + 1} failed: ${error.message}`);
        continue;
      }

      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      results.push(data.publicUrl);
    }

    setImageUrls((prev) => [...prev, ...results]);
    setUploading(false);
    setUploadingIdx(null);

    // Reset file input so the same files can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Reset ──────────────────────────────────────────────────
  const reset = () => {
    setTitle(""); setContent(""); setUrl(""); setType("text");
    setVisibility("community"); setIsResource(!!defaultIsResource);
    setImageUrls([]); setYtPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ─────────────────────────────────────────────────
  const submit = async () => {
    if (!user || !profile?.is_approved) { toast.error("only approved members can post"); return; }
    if (!content.trim() && !title.trim() && !url.trim() && !imageUrls.length) {
      toast.error("write something or add an image"); return;
    }
    if (!channelId) { toast.error("pick a channel"); return; }
    setBusy(true);

    const isMemberRequestingPublic = visibility === "public" && !isAdmin;
    const insertVisibility = isMemberRequestingPublic ? "community" : visibility;

    const { data: created, error } = await supabase.from("posts").insert({
      channel_id:  channelId,
      user_id:     user.id,
      title:       title.trim() || null,
      content:     content.trim(),
      type:        dbType(type),
      url:         url.trim() || null,          // only for links/videos/docs
      image_urls:  imageUrls.length ? imageUrls : [],
      visibility:  insertVisibility,
      is_resource: isResource,
    }).select("id").maybeSingle();

    if (error) { setBusy(false); toast.error(error.message); return; }

    if (isMemberRequestingPublic && created) {
      await supabase.from("public_visibility_requests").insert({
        post_id: created.id, initiator_id: user.id, direction: "member_to_admin",
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

  // ── Render ─────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent
        className="border-0 max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
            new post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* ── Type pills ── */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(({ v, i: Icon, l }) => (
                <button key={v} onClick={() => setType(v)} className="flex items-center gap-1.5 font-mono" style={PillStyle(type === v)}>
                  <Icon className="h-3.5 w-3.5" /> {l}
                </button>
              ))}
            </div>
          </div>

          {/* ── Title ── */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title (optional)"
            maxLength={200}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />

          {/* ── Body ── */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="what's on your mind?"
            rows={5}
            maxLength={5000}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
          />

          {/* ── URL (for non-text types) ── */}
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

          {/* ── Image upload (multiple) ── */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>
              images (optional · multiple allowed)
            </p>

            {/* Uploaded thumbnails */}
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imageUrls.map((src, idx) => (
                  <div key={idx} className="relative inline-block">
                    <img
                      src={src}
                      alt={`upload ${idx + 1}`}
                      className="h-24 w-24 object-cover"
                      style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(13,13,13,0.85)" }}
                      title="remove"
                    >
                      <X className="h-3 w-3" style={{ color: "#F5F0EB" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add image button */}
            <label
              className="cursor-pointer inline-flex items-center gap-2 font-mono"
              style={PillStyle(false)}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onImageUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  uploading {uploadingIdx !== null ? `image ${uploadingIdx + 1}` : ""}…
                </>
              ) : (
                <>
                  {imageUrls.length > 0 ? <Plus className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {imageUrls.length > 0 ? "add more images" : "upload images"}
                </>
              )}
            </label>
          </div>

          {/* ── Visibility ── */}
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

          {/* ── Channel ── */}
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

          {/* ── Resource toggle ── */}
          <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: "#8A8480" }}>
            <input type="checkbox" checked={isResource} onChange={(e) => setIsResource(e.target.checked)} />
            save to resources tab (curated)
          </label>

          {visibility === "public" && !isAdmin && (
            <p className="text-[11px] font-mono" style={{ color: "#8A8480" }}>
              public posts need admin approval · saved as community until approved.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={submit} disabled={busy || uploading} className="px-8">
              {busy ? "posting…" : "post it"}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
