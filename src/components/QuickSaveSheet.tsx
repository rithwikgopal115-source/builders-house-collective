import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/** Admin-only fast-save: paste URL or text, pick channel, pick visibility, save. */
export const QuickSaveSheet = ({ open, onOpenChange }: Props) => {
  const { user, isAdmin } = useAuth();
  const [channels, setChannels] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [channelId, setChannelId] = useState("");
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"community" | "public" | "private">("community");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("channels").select("id, slug, name").order("sort_order").then(({ data }) => {
      setChannels(data ?? []);
      if (data?.length && !channelId) setChannelId(data[0].id);
    });
  }, [isAdmin]);

  if (!isAdmin) return null;

  const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());

  const save = async () => {
    if (!user || !text.trim() || !channelId) return;
    setBusy(true);
    const looksLikeUrl = isUrl(text);
    const { error } = await supabase.from("posts").insert({
      channel_id: channelId,
      user_id: user.id,
      content: looksLikeUrl ? "" : text.trim(),
      url: looksLikeUrl ? text.trim() : null,
      type: looksLikeUrl ? "link" : "text",
      visibility,
      is_resource: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("saved");
    setText("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-surface border-l hairline w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-normal flex items-center gap-2"><Bookmark className="h-4 w-4 text-primary" /> quick save</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="paste a link or write a quick note…"
            rows={4}
            autoFocus
            className="w-full bg-background hairline rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">channel</p>
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)}
              className="w-full bg-background hairline rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary">
              {channels.map((c) => <option key={c.id} value={c.id}>{c.name.toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">visibility</p>
            <div className="flex gap-2">
              {(["community", "public", "private"] as const).map((v) => (
                <button key={v} onClick={() => setVisibility(v)}
                  className={`flex-1 text-xs font-mono px-2.5 py-1.5 rounded-md hairline transition-colors ${
                    visibility === v ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-surface-elevated text-muted-foreground"
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={busy || !text.trim()} className="w-full">{busy ? "saving…" : "save"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
