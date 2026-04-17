import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, FeedPost } from "@/components/PostCard";
import { AvatarBlock } from "@/components/AvatarBlock";
import { TierBadge } from "@/components/TierBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const Profile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [resourcesOnly, setResourcesOnly] = useState<FeedPost[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setProfile(p);
      if (p) document.title = `${p.display_name} — builders house`;

      const { data: lks } = await supabase.from("profile_links").select("*").eq("profile_id", id).order("sort_order");
      setLinks(lks ?? []);

      const { data: ps } = await supabase
        .from("posts")
        .select("id, channel_id, author_id, title, content, post_type, url, looking_for, created_at, channels!inner(slug, name), profiles!inner(display_name, avatar_url, tier)")
        .eq("author_id", id)
        .order("created_at", { ascending: false });
      const all = (ps ?? []).map((x: any) => ({ ...x, channel: x.channels, author: x.profiles }));
      setPosts(all);
      setResourcesOnly(all.filter((x) => x.channel?.slug === "resources"));
    };
    load();
  }, [id]);

  if (!profile) return <AppLayout><div className="p-10 text-muted-foreground font-mono text-sm">loading…</div></AppLayout>;

  const isMe = user?.id === profile.id;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        <header className="mb-8">
          <div className="flex items-start gap-5 mb-5">
            <AvatarBlock url={profile.avatar_url} name={profile.display_name} size={80} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-medium">{profile.display_name}</h1>
                <TierBadge tier={profile.tier} />
              </div>
              {profile.bio && <p className="text-muted-foreground text-sm mt-2">{profile.bio}</p>}
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {links.map((l) => (
                    <a
                      key={l.id}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono px-2.5 py-1 rounded-full hairline hover:bg-surface-elevated transition-colors flex items-center gap-1.5"
                    >
                      {l.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            {isMe && (
              <Link to="/profile/edit"><Button variant="ghost" size="sm">edit</Button></Link>
            )}
          </div>

          {profile.what_building && (
            <div className="bento-card">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">what i'm building</h3>
              <p className="text-sm whitespace-pre-wrap">{profile.what_building}</p>
            </div>
          )}
        </header>

        <Tabs defaultValue="all">
          <TabsList className="bg-surface hairline mb-4">
            <TabsTrigger value="all">all posts</TabsTrigger>
            <TabsTrigger value="resources">resources</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            {posts.length === 0 && <p className="text-sm text-muted-foreground font-mono">no posts yet</p>}
            {posts.map((p) => <PostCard key={p.id} post={p} showChannel />)}
          </TabsContent>
          <TabsContent value="resources" className="space-y-4">
            {resourcesOnly.length === 0 && <p className="text-sm text-muted-foreground font-mono">none</p>}
            {resourcesOnly.map((p) => <PostCard key={p.id} post={p} />)}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
