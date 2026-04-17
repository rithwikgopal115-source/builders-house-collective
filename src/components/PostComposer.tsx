import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  channelId: string;
  channelSlug: string;
  onCreated?: () => void;
}

export const PostComposer = ({ open, onOpenChange, channelId, channelSlug, onCreated }: Props) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "link" | "video" | "doc">("text");
  const [url, setUrl] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !profile?.is_approved) { toast.error("only approved members can post"); return; }
    if (!content.trim()) { toast.error("write something"); return; }
    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      channel_id: channelId,
      author_id: user.id,
      title: title.trim() || null,
      content: content.trim(),
      post_type: postType,
      url: url.trim() || null,
      looking_for: channelSlug === "hiring" && lookingFor.trim() ? lookingFor.trim() : null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setTitle(""); setContent(""); setUrl(""); setLookingFor(""); setPostType("text");
    onOpenChange(false);
    onCreated?.();
    toast.success("posted");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-0 hairline">
        <DialogHeader>
          <DialogTitle className="font-normal">new post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title (optional)"
            className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="what's on your mind"
            rows={5}
            className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex gap-2 text-xs font-mono">
            {(["text", "link", "video", "doc"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPostType(t)}
                className={`px-3 py-1.5 rounded-full hairline transition-colors ${
                  postType === t ? "bg-primary text-primary-foreground" : "hover:bg-surface-elevated"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {postType !== "text" && (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          )}
          {channelSlug === "hiring" && (
            <input
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="looking for: e.g. founding engineer"
              className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
          <Button onClick={submit} disabled={busy} className="w-full">post it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
