import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AvatarBlock } from "@/components/AvatarBlock";
import { Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LinkRow { id?: string; label: string; url: string; }

const ProfileEdit = () => {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [whatBuilding, setWhatBuilding] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "edit profile — builders house";
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setWhatBuilding(profile.what_building ?? "");
      setAvatarUrl(profile.avatar_url);
    }
    if (user) {
      supabase.from("profile_links").select("*").eq("profile_id", user.id).order("sort_order").then(({ data }) => {
        setLinks((data ?? []).map((l) => ({ id: l.id, label: l.label, url: l.url })));
      });
    }
  }, [user, profile]);

  const onAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    toast.success("avatar uploaded");
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || "member",
      bio: bio.trim() || null,
      what_building: whatBuilding.trim() || null,
      avatar_url: avatarUrl,
    }).eq("id", user.id);
    if (error) { toast.error(error.message); setBusy(false); return; }

    // sync links: delete all then re-insert (simple)
    await supabase.from("profile_links").delete().eq("profile_id", user.id);
    const valid = links.filter((l) => l.label.trim() && l.url.trim());
    if (valid.length) {
      await supabase.from("profile_links").insert(valid.map((l, i) => ({
        profile_id: user.id, label: l.label.trim(), url: l.url.trim(), sort_order: i,
      })));
    }

    await refreshProfile();
    setBusy(false);
    toast.success("saved");
    nav(`/profile/${user.id}`);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <h1 className="text-2xl font-medium mb-8">edit profile</h1>

        <div className="bento-card space-y-5">
          <div className="flex items-center gap-4">
            <AvatarBlock url={avatarUrl} name={displayName || "?"} size={64} />
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" />
              <span className="text-xs font-mono px-3 py-2 rounded-lg hairline hover:bg-surface-elevated">upload avatar</span>
            </label>
          </div>

          <Field label="display name">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCx} />
          </Field>
          <Field label="bio">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className={`${inputCx} resize-none`} />
          </Field>
          <Field label="what i'm building">
            <textarea value={whatBuilding} onChange={(e) => setWhatBuilding(e.target.value)} rows={4} className={`${inputCx} resize-none`} />
          </Field>

          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">links</p>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="label"
                    value={l.label}
                    onChange={(e) => setLinks((arr) => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    className={`${inputCx} w-32`}
                  />
                  <input
                    placeholder="https://"
                    value={l.url}
                    onChange={(e) => setLinks((arr) => arr.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                    className={`${inputCx} flex-1 font-mono text-xs`}
                  />
                  <button onClick={() => setLinks((arr) => arr.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setLinks((arr) => [...arr, { label: "", url: "" }])} className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" /> add link
              </button>
            </div>
          </div>

          <Button onClick={save} disabled={busy} className="w-full">{busy ? "saving…" : "save"}</Button>
        </div>
      </div>
    </AppLayout>
  );
};

const inputCx = "bg-background hairline rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">{label}</label>
    {children}
  </div>
);

export default ProfileEdit;
