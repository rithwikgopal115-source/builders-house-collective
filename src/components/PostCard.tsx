import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { AvatarBlock } from "./AvatarBlock";
import { MessageCircle, ExternalLink, Globe, Pin, Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { toast } from "sonner";

export interface FeedPost {
  id: string;
  channel_id: string;
  user_id: string;
  title: string | null;
  content: string;
  type: "text" | "link" | "video" | "doc" | string | null;
  url: string | null;
  visibility?: "community" | "public" | "private" | string | null;
  is_resource?: boolean | null;
  created_at: string;
  is_pinned?: boolean | null;
  author?: {
    id?: string;
    display_name: string;
    avatar_url: string | null;
    is_admin?: boolean | null;
  } | null;
  reaction_count?: number;
  comment_count?: number;
  channel?: { slug: string; name: string } | null;
}

const EMOJIS = ["🔥", "💯", "🧠", "👀", "🙌"];

const ytId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    }
  } catch {}
  return null;
};

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url);
const safeHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

export const PostCard = ({
  post,
  showChannel = false,
  compact = false,
  readOnly = false,
  onAdminRequestPublic,
}: {
  post: FeedPost;
  showChannel?: boolean;
  compact?: boolean;
  readOnly?: boolean;
  onAdminRequestPublic?: (post: FeedPost) => void;
}) => {
  const { user, profile, isAdmin } = useAuth();
  const [reactionCount, setReactionCount] = useState(post.reaction_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [reactedEmojis, setReactedEmojis] = useState<Set<string>>(new Set());
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("reactions")
        .select("emoji")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .then(({ data }) => { if (data) setReactedEmojis(new Set(data.map((r) => r.emoji))); });
    }
  }, [user, post.id]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, profiles!comments_user_id_fkey(display_name, avatar_url, is_admin)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  };

  const toggleComments = () => { if (!showComments) loadComments(); setShowComments((s) => !s); };

  const react = async (emoji: string) => {
    if (!user || !profile?.is_approved) { toast.error("only approved members can react"); return; }
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
      .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() });
    if (error) { toast.error(error.message); return; }
    if (post.user_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: post.user_id,
        type: "comment",
        related_id: post.id,
        content: `${profile.display_name} replied to your post`,
      });
    }
    setNewComment("");
    setCommentCount((c) => c + 1);
    loadComments();
  };

  const authorName = readOnly ? "builders house" : (post.author?.display_name ?? "member");
  const showAuthor = !readOnly;
  const yt = post.url && post.type === "video" ? ytId(post.url) : null;
  const showImage = post.url && isImage(post.url);
  const showLinkPreview = post.url && !yt && !showImage;

  return (
    <article
      className="animate-fade-in"
      style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}
    >
      {/* Top row: avatar + name + builder pill + timestamp */}
      <div className="flex items-center gap-3 mb-3">
        {showAuthor ? (
          <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 group min-w-0 flex-1">
            <AvatarBlock url={post.author?.avatar_url} name={authorName} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate" style={{ color: "#F5F0EB" }}>{authorName}</span>
                <span
                  className="text-[11px] uppercase tracking-wider"
                  style={{
                    background: "#2A1A0E",
                    color: "#E8734A",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                  }}
                >
                  builder
                </span>
                {post.author?.is_admin && (
                  <span
                    className="text-[11px] uppercase tracking-wider"
                    style={{ background: "#1E1E1E", color: "#C9B99A", padding: "2px 8px", borderRadius: 999, fontSize: 11 }}
                  >
                    admin
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono uppercase mt-0.5" style={{ color: "#8A8480" }}>
                {timeAgo(post.created_at)}
                {showChannel && post.channel && <> · {post.channel.name.toLowerCase()}</>}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xs" style={{ color: "#F5F0EB" }}>b</span>
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: "#F5F0EB" }}>builders house</div>
              <div className="text-[11px] font-mono uppercase" style={{ color: "#8A8480" }}>
                {timeAgo(post.created_at)}
                {showChannel && post.channel && <> · {post.channel.name.toLowerCase()}</>}
              </div>
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {post.is_pinned && (
            <Pin className="h-3.5 w-3.5" style={{ color: "#E8734A" }} />
          )}
          {post.visibility === "public" && (
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ background: "#1A3A2A", color: "#7AC8A0", padding: "2px 8px", borderRadius: 999 }}
            >
              public
            </span>
          )}
          {post.visibility === "private" && (
            <span
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ background: "#1E1E1E", color: "#8A8480", padding: "2px 8px", borderRadius: 999 }}
            >
              private
            </span>
          )}
        </div>
      </div>

      {post.title && (
        <h3 className="font-medium mb-2 leading-snug" style={{ color: "#F5F0EB", fontSize: 15, letterSpacing: "-0.01em" }}>
          {post.title}
        </h3>
      )}
      {post.content && (
        <p
          className={`whitespace-pre-wrap ${compact ? "line-clamp-3" : ""}`}
          style={{ color: "#8A8480", fontSize: 14, lineHeight: 1.5 }}
        >
          {post.content}
        </p>
      )}

      {/* YouTube — thumbnail with coral play overlay until clicked */}
      {yt && !playVideo && (
        <button
          onClick={() => setPlayVideo(true)}
          className="mt-4 relative w-full aspect-video overflow-hidden block group"
          style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <img
            src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`}
            alt={post.title || "video"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: "rgba(232,115,74,0.9)", borderRadius: "50%", width: 48, height: 48 }}
            >
              <Play className="h-5 w-5 ml-0.5" style={{ color: "#0D0D0D" }} fill="#0D0D0D" />
            </div>
          </div>
        </button>
      )}
      {yt && playVideo && (
        <div className="mt-4 aspect-video overflow-hidden" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
          <iframe
            src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={post.title || "video"}
          />
        </div>
      )}

      {/* Image */}
      {showImage && !yt && (
        <a href={post.url!} target="_blank" rel="noreferrer" className="block mt-4">
          <img src={post.url!} alt={post.title || "post image"} className="w-full" loading="lazy" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }} />
        </a>
      )}

      {/* Link preview card */}
      {showLinkPreview && (
        <a
          href={post.url!}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-stretch overflow-hidden transition-opacity hover:opacity-90"
          style={{ background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{ width: 80, background: "#0D0D0D" }}
          >
            <ExternalLink className="h-5 w-5" style={{ color: "#8A8480" }} />
          </div>
          <div className="flex-1 min-w-0 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider truncate" style={{ color: "#8A8480" }}>
              {safeHost(post.url!)}
            </div>
            <div className="text-sm font-medium truncate mt-0.5" style={{ color: "#F5F0EB" }}>
              {post.title || post.url}
            </div>
          </div>
        </a>
      )}

      {/* Reaction row */}
      {!readOnly && (
        <div className="mt-5 flex items-center gap-1.5 flex-wrap">
          {EMOJIS.map((e) => {
            const active = reactedEmojis.has(e);
            return (
              <button
                key={e}
                onClick={() => react(e)}
                className="text-xs transition-colors"
                style={{
                  background: "#1E1E1E",
                  border: active ? "1px solid #E8734A" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  color: active ? "#E8734A" : "#F5F0EB",
                }}
              >
                {e}
              </button>
            );
          })}
          {reactionCount > 0 && (
            <span className="text-xs font-mono ml-1" style={{ color: "#8A8480" }}>{reactionCount}</span>
          )}
          {isAdmin && post.visibility === "community" && onAdminRequestPublic && (
            <button
              onClick={() => onAdminRequestPublic(post)}
              className="ml-2 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors"
              style={{ background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 999, padding: "4px 10px", color: "#C9B99A" }}
            >
              <Globe className="h-3 w-3" /> request public
            </button>
          )}
          <button
            onClick={toggleComments}
            className="ml-auto text-xs flex items-center gap-1.5 font-mono transition-colors hover:text-foreground"
            style={{ color: "#8A8480" }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </button>
        </div>
      )}

      {showComments && (
        <div className="mt-5 pt-5 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <AvatarBlock url={c.profiles?.avatar_url} name={c.profiles?.display_name ?? "?"} size={28} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-medium" style={{ color: "#F5F0EB" }}>{c.profiles?.display_name}</span>
                  <span className="text-[10px] font-mono" style={{ color: "#8A8480" }}>{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm" style={{ color: "#F5F0EB" }}>{c.content}</p>
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
                maxLength={1000}
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8 }}
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
