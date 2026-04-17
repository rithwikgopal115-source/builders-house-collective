import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AvatarBlock } from "./AvatarBlock";
import { TierBadge } from "./TierBadge";
import { MessageCircle, Smile, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { toast } from "sonner";

export interface FeedPost {
  id: string;
  channel_id: string;
  author_id: string;
  title: string | null;
  content: string;
  post_type: "text" | "link" | "video" | "doc";
  url: string | null;
  looking_for: string | null;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
    tier: "learner" | "founder";
  } | null;
  reaction_count?: number;
  comment_count?: number;
  channel?: { slug: string; name: string } | null;
}

const EMOJIS = ["🔥", "💯", "🧠", "👀", "🙌"];

export const PostCard = ({
  post,
  showChannel = false,
  compact = false,
  readOnly = false,
}: {
  post: FeedPost;
  showChannel?: boolean;
  compact?: boolean;
  readOnly?: boolean;
}) => {
  const { user, profile } = useAuth();
  const [reactionCount, setReactionCount] = useState(post.reaction_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [reactedEmojis, setReactedEmojis] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      supabase
        .from("reactions")
        .select("emoji")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data) setReactedEmojis(new Set(data.map((r) => r.emoji)));
        });
    }
  }, [user, post.id]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, author_id, profiles!inner(display_name, avatar_url, tier)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments((s) => !s);
  };

  const react = async (emoji: string) => {
    if (!user || !profile?.is_approved) {
      toast.error("only approved members can react");
      return;
    }
    if (reactedEmojis.has(emoji)) {
      await supabase.from("reactions").delete().eq("post_id", post.id).eq("user_id", user.id).eq("emoji", emoji);
      setReactedEmojis((s) => { const n = new Set(s); n.delete(emoji); return n; });
      setReactionCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("reactions").insert({ post_id: post.id, user_id: user.id, emoji });
      setReactedEmojis((s) => new Set(s).add(emoji));
      setReactionCount((c) => c + 1);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user || !profile?.is_approved) return;
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, author_id: user.id, content: newComment.trim() });
    if (error) { toast.error(error.message); return; }
    setNewComment("");
    setCommentCount((c) => c + 1);
    loadComments();
  };

  const authorName = readOnly ? "—" : (post.author?.display_name ?? "member");
  const showAuthor = !readOnly;

  return (
    <article className="bento-card animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        {showAuthor ? (
          <Link to={`/profile/${post.author_id}`} className="flex items-center gap-3 group">
            <AvatarBlock url={post.author?.avatar_url} name={authorName} size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{authorName}</span>
                {post.author && <TierBadge tier={post.author.tier} />}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {timeAgo(post.created_at)}
                {showChannel && post.channel && <> · {post.channel.name}</>}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-surface-elevated hairline" />
            <div className="text-xs text-muted-foreground font-mono">
              {timeAgo(post.created_at)}
              {showChannel && post.channel && <> · {post.channel.name}</>}
            </div>
          </div>
        )}
        {post.looking_for && (
          <span className="ml-auto text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full tier-badge-founder">
            looking for · {post.looking_for}
          </span>
        )}
      </div>

      {post.title && <h3 className="text-lg font-medium mb-2 leading-snug">{post.title}</h3>}
      <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap ${compact ? "line-clamp-3" : ""}`}>
        {post.content}
      </p>

      {post.url && (
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-xs font-mono text-secondary hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          {new URL(post.url).hostname}
        </a>
      )}

      {!readOnly && (
        <div className="mt-5 flex items-center gap-1 flex-wrap">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => react(e)}
              className={`text-sm px-2 py-1 rounded-full hairline transition-colors ${
                reactedEmojis.has(e) ? "bg-surface-elevated" : "hover:bg-surface-elevated"
              }`}
            >
              {e}
            </button>
          ))}
          {reactionCount > 0 && (
            <span className="text-xs text-muted-foreground font-mono ml-1">{reactionCount}</span>
          )}
          <button
            onClick={toggleComments}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {commentCount}
          </button>
        </div>
      )}

      {showComments && (
        <div className="mt-5 pt-5 hairline-t space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <AvatarBlock url={c.profiles?.avatar_url} name={c.profiles?.display_name ?? "?"} size={28} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium">{c.profiles?.display_name}</span>
                  {c.profiles && <TierBadge tier={c.profiles.tier} />}
                  <span className="text-[10px] text-muted-foreground font-mono">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground/80">{c.content}</p>
              </div>
            </div>
          ))}
          {user && profile?.is_approved && (
            <div className="flex gap-2 mt-3">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="add a comment"
                className="flex-1 bg-background hairline rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button size="sm" onClick={submitComment}>send</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

function timeAgo(iso: string) {
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
