import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react";

interface Channel { id: string; slug: string; name: string; }
interface ChannelProject {
  id: string;
  slot_number: number;
  name: string;
  project_type?: string | null;
  parent_project_id?: string | null;
}

type PostType = "text" | "link" | "video" | "doc" | "pdf" | "template";

// Channels that support project tagging
const PROJECT_CHANNEL_SLUGS = ["resources", "ideas", "wins"];

// Post passed in for edit mode
export interface EditablePost {
  id: string;
  title?: string | null;
  content?: string | null;
  type?: string | null;
  url?: string | null;
  image_urls?: string[] | null;
  visibility?: string | null;
  is_resource?: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultChannelId?: string;
  defaultIsResource?: boolean;
  defaultProjectId?: string | null;
  onCreated?: () => void;
  /** Pass to open in edit mode — pre-fills all fields, submit calls UPDATE */
  editPost?: EditablePost | null;
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

// ─── Collapsible Project Tree ─────────────────────────────────────────────────
interface TreeNode {
  project: ChannelProject;
  children: TreeNode[];
}

const buildTree = (projects: ChannelProject[]): { skillRoots: TreeNode[]; projectRoots: TreeNode[] } => {
  const byId = new Map<string, TreeNode>();
  for (const p of projects) byId.set(p.id, { project: p, children: [] });

  const skillRoots: TreeNode[] = [];
  const projectRoots: TreeNode[] = [];

  for (const p of projects) {
    const node = byId.get(p.id)!;
    if (p.parent_project_id && byId.has(p.parent_project_id)) {
      byId.get(p.parent_project_id)!.children.push(node);
    } else {
      if (p.project_type === 'skill') skillRoots.push(node);
      else projectRoots.push(node);
    }
  }

  return { skillRoots, projectRoots };
};

const TreeNodeRow = ({
  node,
  depth,
  selectedId,
  onSelect,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.project.id);
  const isSelected = selectedId === node.project.id;

  return (
    <>
      <div
        className="flex items-center gap-1 w-full group"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {/* Expand / collapse button */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.project.id)}
            className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-white/10"
            style={{ color: '#6A6460' }}
          >
            {isOpen
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="flex-shrink-0 w-5" />
        )}

        {/* Folder icon */}
        <span className="flex-shrink-0" style={{ color: isSelected ? '#E8734A' : '#4A4A4A' }}>
          {hasChildren && isOpen
            ? <FolderOpen className="h-3.5 w-3.5" />
            : <Folder className="h-3.5 w-3.5" />}
        </span>

        {/* Name button */}
        <button
          onClick={() => onSelect(node.project.id)}
          className="flex-1 text-left px-2 py-1.5 rounded text-xs font-mono truncate hover:bg-white/5"
          style={{
            color: isSelected ? '#E8734A' : '#C0BBB6',
            background: isSelected ? 'rgba(232,115,74,0.08)' : 'transparent',
            fontWeight: isSelected ? 600 : 400,
          }}
        >
          <span className="opacity-40 mr-1">{node.project.slot_number}</span>
          {node.project.name}
        </button>
      </div>

      {hasChildren && isOpen && node.children.map(child => (
        <TreeNodeRow
          key={child.project.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  );
};

const ProjectTree = ({
  allProjects,
  selectedId,
  onSelect,
}: {
  allProjects: ChannelProject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rootsOpen, setRootsOpen] = useState({ projects: true, skills: false });

  const { skillRoots, projectRoots } = useMemo(() => buildTree(allProjects), [allProjects]);

  const toggle = (id: string) => setExpanded(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const SectionHeader = ({
    label, open, onToggle, count,
  }: {
    label: string; open: boolean; onToggle: () => void; count: number;
  }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono uppercase tracking-wider hover:bg-white/5"
      style={{ color: '#6A6460' }}
    >
      {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      {label}
      <span className="ml-auto opacity-50">{count}</span>
    </button>
  );

  return (
    <div
      className="rounded-lg overflow-hidden overflow-y-auto"
      style={{
        background: '#0D0D0D',
        border: '1px solid rgba(255,255,255,0.06)',
        maxHeight: 220,
      }}
    >
      {/* General (no project) */}
      <button
        onClick={() => onSelect(null)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-white/5"
        style={{
          color: selectedId === null ? '#E8734A' : '#A09890',
          background: selectedId === null ? 'rgba(232,115,74,0.08)' : 'transparent',
          fontWeight: selectedId === null ? 600 : 400,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <Globe className="h-3.5 w-3.5 flex-shrink-0" />
        General (no project)
      </button>

      {/* All Projects section */}
      {projectRoots.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <SectionHeader
            label="All Projects"
            open={rootsOpen.projects}
            count={projectRoots.length}
            onToggle={() => setRootsOpen(s => ({ ...s, projects: !s.projects }))}
          />
          {rootsOpen.projects && projectRoots.map(node => (
            <TreeNodeRow
              key={node.project.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {/* Skill Acquisition section */}
      {skillRoots.length > 0 && (
        <div>
          <SectionHeader
            label="Skill Acquisition"
            open={rootsOpen.skills}
            count={skillRoots.length}
            onToggle={() => setRootsOpen(s => ({ ...s, skills: !s.skills }))}
          />
          {rootsOpen.skills && skillRoots.map(node => (
            <TreeNodeRow
              key={node.project.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {allProjects.length === 0 && (
        <div className="py-4 text-center text-xs font-mono" style={{ color: '#4A4A4A' }}>
          no projects yet — admin can add them
        </div>
      )}
    </div>
  );
};

// ─── Main PostComposer ────────────────────────────────────────────────────────
export const PostComposer = ({
  open,
  onOpenChange,
  defaultChannelId,
  defaultIsResource,
  defaultProjectId,
  onCreated,
  editPost,
}: Props) => {
  const { user, profile, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const isEditMode   = !!editPost;

  const [channels,     setChannels]     = useState<Channel[]>([]);
  const [channelId,    setChannelId]    = useState<string>(defaultChannelId ?? "");
  const [allProjects,  setAllProjects]  = useState<ChannelProject[]>([]);
  const [projectId,    setProjectId]    = useState<string | null>(defaultProjectId ?? null);
  const [title,        setTitle]        = useState("");
  const [content,      setContent]      = useState("");
  const [type,         setType]         = useState<PostType>("text");
  const [url,          setUrl]          = useState("");
  const [imageUrls,    setImageUrls]    = useState<string[]>([]);
  const [uploading,    setUploading]    = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [ideaCategory, setIdeaCategory] = useState<string | null>(null);
  const [visibility,   setVisibility]   = useState<"community" | "public" | "private">("community");
  const [isResource,   setIsResource]   = useState(!!defaultIsResource);
  const [busy,         setBusy]         = useState(false);
  const [ytPreview,    setYtPreview]    = useState<{ thumb: string; title: string } | null>(null);

  // Derived: is current channel a project channel?
  const selectedChannel = channels.find((c) => c.id === channelId);
  const isProjectChannel = selectedChannel ? PROJECT_CHANNEL_SLUGS.includes(selectedChannel.slug) : false;

  // ── Load channels ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("channels").select("id, slug, name").order("sort_order").then(({ data }) => {
      setChannels(data ?? []);
      if (!channelId && data?.length) setChannelId(defaultChannelId ?? data[0].id);
    });
  }, [defaultChannelId]);

  useEffect(() => { setIsResource(!!defaultIsResource); }, [defaultIsResource, open]);
  useEffect(() => { if (defaultChannelId) setChannelId(defaultChannelId); }, [defaultChannelId, open]);
  useEffect(() => { setProjectId(defaultProjectId ?? null); }, [defaultProjectId, open]);

  // ── Pre-fill when in edit mode ───────────────────────────────────────────────
  useEffect(() => {
    if (!editPost || !open) return;
    setTitle(editPost.title ?? "");
    setContent(editPost.content ?? "");
    setType((editPost.type as PostType) ?? "text");
    setUrl((editPost.url ?? ""));
    setImageUrls(Array.isArray(editPost.image_urls) ? editPost.image_urls : []);
    setVisibility((editPost.visibility as any) ?? "community");
    setIsResource(!!editPost.is_resource);
  }, [editPost, open]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 480) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [content, autoResize]);

  // ── Load ALL projects as a flat list (tree is built client-side) ─────────────
  useEffect(() => {
    if (!isProjectChannel) { setAllProjects([]); return; }
    supabase
      .from("channel_projects")
      .select("id, slot_number, name, project_type, parent_project_id")
      .eq("is_active", true)
      .eq("is_hidden", false)
      .order("slot_number")
      .then(({ data }) => setAllProjects(data ?? []));
  }, [isProjectChannel, channelId]);

  // ── YouTube preview ──────────────────────────────────────────────────────────
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

  // ── Multi-image upload ───────────────────────────────────────────────────────
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

      if (error) { toast.error(`Image ${i + 1} failed: ${error.message}`); continue; }

      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      results.push(data.publicUrl);
    }

    setImageUrls((prev) => [...prev, ...results]);
    setUploading(false);
    setUploadingIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isIdeasChannel = selectedChannel?.slug === "ideas";

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    setTitle(""); setContent(""); setUrl(""); setType("text");
    setVisibility("community"); setIsResource(!!defaultIsResource);
    setImageUrls([]); setYtPreview(null); setIdeaCategory(null);
    setProjectId(defaultProjectId ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit (create or update) ────────────────────────────────────────────────
  const submit = async () => {
    if (!user || !profile?.is_approved) { toast.error("only approved members can post"); return; }
    if (!content.trim() && !title.trim() && !url.trim() && !imageUrls.length) {
      toast.error("write something or add an image"); return;
    }
    setBusy(true);

    // EDIT MODE
    if (isEditMode && editPost) {
      const { error } = await supabase.from("posts").update({
        title:       title.trim() || null,
        content:     content.trim() || null,
        type:        dbType(type),
        url:         url.trim() || null,
        image_urls:  imageUrls.length ? imageUrls : [],
        visibility,
        is_resource: isResource,
      }).eq("id", editPost.id);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("post updated");
      reset(); onOpenChange(false); onCreated?.();
      return;
    }

    if (!channelId) { toast.error("pick a channel"); setBusy(false); return; }

    const isMemberRequestingPublic = visibility === "public" && !isAdmin;
    const insertVisibility = isMemberRequestingPublic ? "community" : visibility;

    const { data: created, error } = await supabase.from("posts").insert({
      channel_id:    channelId,
      user_id:       user.id,
      title:         title.trim() || null,
      content:       content.trim(),
      type:          dbType(type),
      url:           url.trim() || null,
      image_urls:    imageUrls.length ? imageUrls : [],
      project_id:    isProjectChannel ? (projectId ?? null) : null,
      idea_category: isIdeasChannel ? ideaCategory : null,
      visibility:    insertVisibility,
      is_resource:   isResource,
    }).select("id").maybeSingle();

    if (error) { setBusy(false); toast.error(error.message); return; }

    if (isMemberRequestingPublic && created) {
      await supabase.from("public_visibility_requests").insert({
        post_id: created.id, initiator_id: user.id, direction: "member_to_admin",
      });
      const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
      if (admins?.length) {
        await supabase.from("notifications").insert(admins.map((a) => ({
          recipient_id: a.id, type: "public_request", related_id: created.id,
          content: `${profile.display_name} wants to make a post public`,
        })));
      }
      toast.success("posted · public request sent to admin");
    } else {
      toast.success("posted");
    }

    if (created) {
      const channelName = selectedChannel?.name ?? "a channel";
      const { data: members } = await supabase
        .from("profiles").select("id").eq("is_approved", true).neq("id", user.id);
      if (members?.length) {
        await supabase.from("notifications").insert(
          members.map((m) => ({
            recipient_id: m.id, type: "new_post", related_id: created.id,
            content: `${profile.display_name} posted in ${channelName}`,
          }))
        );
      }
    }

    setBusy(false); reset(); onOpenChange(false); onCreated?.();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent
        className="border-0 max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="font-medium" style={{ color: "#F5F0EB", letterSpacing: "-0.02em" }}>
            {isEditMode ? "edit post" : "new post"}
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
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); autoResize(); }}
            onFocus={autoResize}
            placeholder="what's on your mind?"
            maxLength={5000}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.06)", color: "#F5F0EB", borderRadius: 8, minHeight: 120, maxHeight: 480, overflowY: "auto" }}
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

            <label className="cursor-pointer inline-flex items-center gap-2 font-mono" style={PillStyle(false)}>
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

          {/* ── Project tree (resources / ideas / wins only, not in edit mode) ── */}
          {isProjectChannel && !isEditMode && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>
                project
              </p>
              <ProjectTree
                allProjects={allProjects}
                selectedId={projectId}
                onSelect={setProjectId}
              />
              {projectId && (
                <p className="mt-1.5 text-[10px] font-mono" style={{ color: '#6A6460' }}>
                  posting into: <span style={{ color: '#E8734A' }}>
                    {allProjects.find(p => p.id === projectId)?.name ?? projectId}
                  </span>
                  {' '}·{' '}
                  <button onClick={() => setProjectId(null)} className="underline hover:text-primary" style={{ color: '#6A6460' }}>
                    clear
                  </button>
                </p>
              )}
            </div>
          )}

          {/* ── Idea category (ideas channel only) ── */}
          {isIdeasChannel && !isEditMode && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "#8A8480" }}>
                {projectId ? "idea category" : "idea type"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {projectId ? (
                  [
                    { k: null,                 l: "general" },
                    { k: "ai-foundations",     l: "AI Foundations" },
                    { k: "prompt-engineering", l: "Prompt Engineering" },
                    { k: "platform-mastery",   l: "Platform Mastery" },
                    { k: "skill-acq",          l: "Skill Acq" },
                    { k: "integration",        l: "Integration" },
                    { k: "automation",         l: "Automation" },
                    { k: "random-project",     l: "Random" },
                  ].map(({ k, l }) => (
                    <button key={String(k)} onClick={() => setIdeaCategory(k)} className="font-mono" style={PillStyle(ideaCategory === k)}>{l}</button>
                  ))
                ) : (
                  [
                    { k: null,          l: "general" },
                    { k: "new-project", l: "New Project Idea" },
                    { k: "random",      l: "Random" },
                  ].map(({ k, l }) => (
                    <button key={String(k)} onClick={() => setIdeaCategory(k)} className="font-mono" style={PillStyle(ideaCategory === k)}>{l}</button>
                  ))
                )}
              </div>
            </div>
          )}

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

          {/* ── Channel (hidden in edit mode) ── */}
          {!isEditMode && (
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
          )}

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
              {busy ? (isEditMode ? "saving…" : "posting…") : (isEditMode ? "save changes" : "post it")}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
