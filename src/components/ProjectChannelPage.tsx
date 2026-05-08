/**
 * ProjectChannelPage.tsx
 * Renders the tile-grid architecture for Resources, Ideas, and Wins channels.
 * Drop this into src/components/ProjectChannelPage.tsx
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PostCard, FeedPost } from "@/components/PostCard";
import { FloatingActions } from "@/components/FloatingActions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Eye, EyeOff, Trash2, FolderOpen } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Channel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface ChannelProject {
  id: string;
  slot_number: number;
  name: string;
  description: string | null;
  is_active: boolean;
  is_hidden: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// 30 Slot Gradients  (base + hover pairs)
// Each entry: [stop1, stop2, stop3]
// ─────────────────────────────────────────────────────────────
const GRADIENTS: { base: [string, string, string]; hover: [string, string, string] }[] = [
  { base: ['#0F2027','#203A43','#2C5364'], hover: ['#152D38','#2D5060','#3D7480'] }, // 1  Deep Ocean
  { base: ['#1a1a2e','#16213e','#0f3460'], hover: ['#252545','#1f2f55','#1a4880'] }, // 2  Midnight
  { base: ['#002B5B','#1A4C8B','#2176AE'], hover: ['#003F7F','#2060A0','#2E8ABE'] }, // 3  Cobalt
  { base: ['#4B0000','#7B1A1A','#B22B2B'], hover: ['#650000','#922020','#C83535'] }, // 4  Crimson
  { base: ['#2A0A00','#6B2A00','#BF360C'], hover: ['#3F1500','#7F3A00','#D4430F'] }, // 5  Rust
  { base: ['#2A1200','#7A3B00','#E67E22'], hover: ['#3F1C00','#8F4A00','#F08A30'] }, // 6  Amber
  { base: ['#3A1A00','#8A5A00','#C49A00'], hover: ['#4F2500','#9F6A00','#D4AA10'] }, // 7  Gold
  { base: ['#0A2A1A','#1A5C3A','#27AE60'], hover: ['#102F1F','#207050','#35C070'] }, // 8  Emerald
  { base: ['#001A05','#00400D','#1B5E20'], hover: ['#002508','#005015','#22752A'] }, // 9  Forest
  { base: ['#0A2A20','#1A5A40','#16A085'], hover: ['#102F25','#207050','#1AB09A'] }, // 10 Teal
  { base: ['#001A1A','#004D4D','#00796B'], hover: ['#002525','#006060','#009080'] }, // 11 Dark Teal
  { base: ['#0A2A15','#1B5E20','#388E3C'], hover: ['#102F1A','#22752A','#45A050'] }, // 12 Jade
  { base: ['#1A0A3A','#4A1A8A','#8E44AD'], hover: ['#250F4F','#5A22A0','#9E54BD'] }, // 13 Violet
  { base: ['#1A0A2A','#4A0A5A','#9B59B6'], hover: ['#250F3F','#5A1070','#AB69C6'] }, // 14 Amethyst
  { base: ['#0A0A2A','#1A1A6A','#2980B9'], hover: ['#0F0F3F','#222280','#3590C9'] }, // 15 Indigo
  { base: ['#1A0A2A','#4527A0','#7E57C2'], hover: ['#250F3F','#5532B0','#8E67D2'] }, // 16 Lavender
  { base: ['#1A002A','#4A006A','#AD1457'], hover: ['#250039','#5A0080','#BD2467'] }, // 17 Magenta
  { base: ['#1A0A15','#4A0020','#880E4F'], hover: ['#250F1F','#5A0030','#980E5F'] }, // 18 Wine
  { base: ['#1A0000','#4A0010','#C62828'], hover: ['#250000','#5A0018','#D63838'] }, // 19 Crimson Lake
  { base: ['#1A0F00','#4E2A00','#795548'], hover: ['#251500','#5E3A00','#896558'] }, // 20 Bronze
  { base: ['#050A1A','#0D1B3E','#311B92'], hover: ['#0A1025','#122655','#4128A2'] }, // 21 Nebula
  { base: ['#050505','#111827','#1f2937'], hover: ['#0a0a0a','#181f2f','#252e3f'] }, // 22 Void
  { base: ['#0a0f1e','#1a2547','#2d4a8a'], hover: ['#101525','#222f57','#3d5a9a'] }, // 23 Sapphire
  { base: ['#1a0a0f','#4a1525','#8B2252'], hover: ['#250f15','#5a1f35','#9B3262'] }, // 24 Garnet
  { base: ['#0a1a15','#154a35','#1e7a54'], hover: ['#101f1a','#1f5a45','#2e8a64'] }, // 25 Malachite
  { base: ['#1a0f0a','#4a2510','#8B5530'], hover: ['#251510','#5a3020','#9B6540'] }, // 26 Copper
  { base: ['#0a0f1a','#1a2540','#2a4070'], hover: ['#0f1525','#222f50','#3a5080'] }, // 27 Steel
  { base: ['#1a0a0a','#3a1515','#6B2525'], hover: ['#251010','#4a1f1f','#7B3535'] }, // 28 Mahogany
  { base: ['#0a1a0a','#1a3a1a','#2d5e2d'], hover: ['#101f10','#224a22','#3d6e3d'] }, // 29 Bottle Green
  { base: ['#0f0f1a','#1a1a2e','#252545'], hover: ['#151520','#22223a','#303060'] }, // 30 Dark Matter
];

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
const toLinear = (c: number) =>
  c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const getLuminance = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

// Returns white or dark based on gradient's middle stop
const getTileTextColor = (slotIdx: number): string => {
  const mid = GRADIENTS[slotIdx]?.base[1] ?? '#0D0D0D';
  return getLuminance(mid) > 0.179 ? '#0D0D0D' : '#F5F0EB';
};

const gradientCss = (colors: [string, string, string], deg = 135) =>
  `linear-gradient(${deg}deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;

// ─────────────────────────────────────────────────────────────
// Shared post loader helper
// ─────────────────────────────────────────────────────────────
const loadPosts = async (
  channelId: string,
  projectId: string | null | 'all',
): Promise<FeedPost[]> => {
  let q = supabase
    .from('posts')
    .select(
      'id, channel_id, user_id, title, content, type, url, image_urls, project_id, visibility, created_at, is_pinned, is_resource, profiles!posts_user_id_fkey(id, display_name, avatar_url, is_admin)'
    )
    .eq('channel_id', channelId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(80);

  if (projectId === 'all') {
    // all posts in channel — no project filter
  } else if (projectId === null) {
    q = q.is('project_id', null);
  } else {
    q = q.eq('project_id', projectId);
  }

  const { data } = await q;
  return (data ?? []).map((p: any) => ({ ...p, author: p.profiles }));
};

// ─────────────────────────────────────────────────────────────
// General Tile (hero — always black)
// ─────────────────────────────────────────────────────────────
const GeneralTile = ({
  onClick,
  style,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden text-left transition-transform active:scale-[0.98]"
      style={{
        background: '#000000',
        borderRadius: 0,
        minHeight: 180,
        boxShadow: hovered ? '0 0 40px rgba(232,115,74,0.15)' : 'none',
        transition: 'box-shadow 0.35s ease',
        ...style,
      }}
    >
      {/* Subtle hover vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% 70%, rgba(232,115,74,0.08) 0%, transparent 70%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.35s ease',
          pointerEvents: 'none',
        }}
      />
      <div className="relative z-10 p-5 h-full flex flex-col justify-between">
        <div />
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            all channels
          </p>
          <div
            style={{
              display: 'inline-block',
              border: '1px solid rgba(255,255,255,0.5)',
              padding: '4px 12px',
            }}
          >
            <span className="text-xl font-bold" style={{ color: '#F5F0EB', letterSpacing: '-0.02em' }}>
              General
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// Project Tile
// ─────────────────────────────────────────────────────────────
const ProjectTile = ({
  project,
  isAdmin,
  onClick,
  onHide,
  onDelete,
  style,
}: {
  project: ChannelProject;
  isAdmin: boolean;
  onClick: () => void;
  onHide: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}) => {
  const [hovered, setHovered] = useState(false);
  const [adminHover, setAdminHover] = useState(false);
  const idx = Math.min(project.slot_number - 1, 29);
  const g = GRADIENTS[idx];
  const textColor = getTileTextColor(idx);

  return (
    <div
      className="relative overflow-hidden"
      style={{ borderRadius: 0, minHeight: 130, ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setAdminHover(false); }}
    >
      {/* Base gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: gradientCss(g.base),
        }}
      />
      {/* Hover gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: gradientCss(g.hover, 160),
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Number watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: -12,
          right: 6,
          fontSize: '7rem',
          fontWeight: 900,
          color: '#FFFFFF',
          opacity: 0.07,
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.05em',
          fontFamily: 'sans-serif',
        }}
      >
        {project.slot_number}
      </div>

      {/* Clickable area */}
      <button
        onClick={onClick}
        className="absolute inset-0 z-10 text-left p-4 flex flex-col justify-end"
      >
        <div
          style={{
            display: 'inline-block',
            border: `1px solid ${textColor}`,
            padding: '3px 10px',
          }}
        >
          <span
            style={{
              color: textColor,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}
          >
            {project.name}
          </span>
        </div>
      </button>

      {/* Admin controls (appear on hover) */}
      {isAdmin && hovered && (
        <div
          className="absolute top-2 right-2 z-20 flex gap-1"
          onMouseEnter={() => setAdminHover(true)}
          onMouseLeave={() => setAdminHover(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onHide(); }}
            className="h-7 w-7 flex items-center justify-center rounded"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#F5F0EB' }}
            title={project.is_hidden ? 'unhide project' : 'hide project'}
          >
            {project.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-7 w-7 flex items-center justify-center rounded"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#ff6b6b' }}
            title="delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hidden badge */}
      {project.is_hidden && isAdmin && (
        <div
          className="absolute top-2 left-2 z-20 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
          style={{ background: 'rgba(0,0,0,0.65)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.4)' }}
        >
          hidden
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Add Project Tile (admin only — next empty slot)
// ─────────────────────────────────────────────────────────────
const AddProjectTile = ({
  onClick,
  nextSlot,
  style,
}: {
  onClick: () => void;
  nextSlot: number;
  style?: React.CSSProperties;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden flex flex-col items-center justify-center gap-2 transition-all"
      style={{
        background: hovered ? 'rgba(232,115,74,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px dashed ${hovered ? 'rgba(232,115,74,0.6)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 0,
        minHeight: 130,
        transition: 'all 0.25s ease',
        ...style,
      }}
    >
      {/* Slot number watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: -12,
          right: 6,
          fontSize: '7rem',
          fontWeight: 900,
          color: '#FFFFFF',
          opacity: 0.04,
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.05em',
        }}
      >
        {nextSlot}
      </div>
      <div
        className="relative z-10 h-9 w-9 rounded-full flex items-center justify-center"
        style={{ background: hovered ? '#E8734A' : 'rgba(255,255,255,0.08)', transition: 'background 0.25s' }}
      >
        <Plus className="h-5 w-5" style={{ color: hovered ? '#0D0D0D' : '#A09890' }} />
      </div>
      <span
        className="relative z-10 text-[10px] font-mono uppercase tracking-wider"
        style={{ color: hovered ? '#E8734A' : '#6A6460' }}
      >
        new project
      </span>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// Tile Grid View
// ─────────────────────────────────────────────────────────────
const TileGridView = ({
  channel,
  projects,
  isAdmin,
  onSelectGeneral,
  onSelectProject,
  onAddProject,
  onRefresh,
}: {
  channel: Channel;
  projects: ChannelProject[];
  isAdmin: boolean;
  onSelectGeneral: () => void;
  onSelectProject: (p: ChannelProject) => void;
  onAddProject: () => void;
  onRefresh: () => void;
}) => {
  const activeProjects = projects.filter((p) => p.is_active && (isAdmin || !p.is_hidden));
  const usedSlots = projects.map((p) => p.slot_number);
  const nextSlot = Array.from({ length: 30 }, (_, i) => i + 1).find((n) => !usedSlots.includes(n)) ?? 0;
  const canAddMore = isAdmin && nextSlot > 0;

  const handleHide = async (project: ChannelProject) => {
    const { error } = await supabase
      .from('channel_projects')
      .update({ is_hidden: !project.is_hidden })
      .eq('id', project.id);
    if (error) { toast.error(error.message); return; }
    toast.success(project.is_hidden ? 'project visible again' : 'project hidden');
    onRefresh();
  };

  const handleDelete = async (project: ChannelProject) => {
    if (!window.confirm(`Delete "${project.name}"? Posts tagged to it will remain but become untagged.`)) return;
    const { error } = await supabase
      .from('channel_projects')
      .update({ is_active: false })
      .eq('id', project.id);
    if (error) { toast.error(error.message); return; }
    toast.success('project removed');
    onRefresh();
  };

  return (
    <>
      <style>{`
        .project-tile-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 3px;
        }
        .general-tile-area {
          grid-column: span 2;
          grid-row: span 2;
        }
        @media (max-width: 640px) {
          .project-tile-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="project-tile-grid">
        {/* General — hero tile */}
        <GeneralTile
          onClick={onSelectGeneral}
          style={{ gridColumn: 'span 2', gridRow: 'span 2', minHeight: 260 }}
        />

        {/* Active project tiles */}
        {activeProjects.map((project) => (
          <ProjectTile
            key={project.id}
            project={project}
            isAdmin={isAdmin}
            onClick={() => onSelectProject(project)}
            onHide={() => handleHide(project)}
            onDelete={() => handleDelete(project)}
          />
        ))}

        {/* Add Project tile (admin only) */}
        {canAddMore && (
          <AddProjectTile onClick={onAddProject} nextSlot={nextSlot} />
        )}
      </div>

      {activeProjects.length === 0 && !isAdmin && (
        <div
          className="mt-3 flex items-center justify-center py-12 text-sm font-mono"
          style={{ color: '#6A6460', border: '1px solid rgba(255,255,255,0.04)', borderTop: 'none' }}
        >
          no projects yet
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Post Feed (reusable inside General/Project views)
// ─────────────────────────────────────────────────────────────
const PostFeed = ({
  channelId,
  projectId,
  defaultProjectId,
  channelName,
}: {
  channelId: string;
  projectId: string | null | 'all';
  defaultProjectId?: string | null;
  channelName: string;
}) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadPosts(channelId, projectId);
    setPosts(data);
    setLoading(false);
  }, [channelId, projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`feed:${channelId}:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `channel_id=eq.${channelId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, projectId, load]);

  if (loading) return <div className="py-12 text-center text-sm font-mono" style={{ color: '#6A6460' }}>loading…</div>;

  if (posts.length === 0) {
    return (
      <div
        className="py-16 text-center text-sm font-mono"
        style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, color: '#6A6460' }}
      >
        nothing here yet — be the first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// General View (All Posts + General Chat tabs)
// ─────────────────────────────────────────────────────────────
const GeneralView = ({
  channel,
  onBack,
}: {
  channel: Channel;
  onBack: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'general'>('all');

  return (
    <div>
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 transition-colors hover:text-primary"
        style={{ color: '#A09890' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {channel.name.toLowerCase()}
      </button>

      {/* Header */}
      <div className="mb-5 p-5" style={{ background: '#000000', borderRadius: 0 }}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {channel.name.toLowerCase()}
        </p>
        <div style={{ display: 'inline-block', border: '1px solid rgba(255,255,255,0.5)', padding: '4px 12px' }}>
          <span className="text-xl font-bold" style={{ color: '#F5F0EB' }}>General</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-4" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
          <TabsTrigger value="all">All Posts</TabsTrigger>
          <TabsTrigger value="general">General Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <PostFeed
            channelId={channel.id}
            projectId="all"
            channelName={channel.name}
          />
        </TabsContent>

        <TabsContent value="general">
          <PostFeed
            channelId={channel.id}
            projectId={null}
            channelName={channel.name}
          />
        </TabsContent>
      </Tabs>

      <FloatingActions
        defaultChannelId={channel.id}
        onCreated={() => { /* feed auto-refreshes via realtime */ }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Project View (single project feed)
// ─────────────────────────────────────────────────────────────
const ProjectView = ({
  channel,
  project,
  onBack,
}: {
  channel: Channel;
  project: ChannelProject;
  onBack: () => void;
}) => {
  const idx = Math.min(project.slot_number - 1, 29);
  const g = GRADIENTS[idx];
  const textColor = getTileTextColor(idx);

  return (
    <div>
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 transition-colors hover:text-primary"
        style={{ color: '#A09890' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {channel.name.toLowerCase()}
      </button>

      {/* Header tile (mini version of the project tile) */}
      <div
        className="mb-5 p-5 relative overflow-hidden"
        style={{ background: gradientCss(g.base), borderRadius: 0 }}
      >
        {/* Number watermark in header */}
        <div style={{ position: 'absolute', bottom: -10, right: 8, fontSize: '6rem', fontWeight: 900, color: '#FFFFFF', opacity: 0.07, lineHeight: 1, pointerEvents: 'none', userSelect: 'none', letterSpacing: '-0.05em' }}>
          {project.slot_number}
        </div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: `${textColor}66` }}>
          {channel.name.toLowerCase()}
        </p>
        <div style={{ display: 'inline-block', border: `1px solid ${textColor}`, padding: '4px 12px' }}>
          <span className="text-xl font-bold" style={{ color: textColor }}>
            {project.name}
          </span>
        </div>
        {project.description && (
          <p className="mt-2 text-sm" style={{ color: `${textColor}99` }}>{project.description}</p>
        )}
      </div>

      <PostFeed
        channelId={channel.id}
        projectId={project.id}
        defaultProjectId={project.id}
        channelName={channel.name}
      />

      <FloatingActions
        defaultChannelId={channel.id}
        defaultProjectId={project.id}
        onCreated={() => { /* feed auto-refreshes via realtime */ }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Add Project Modal
// ─────────────────────────────────────────────────────────────
const AddProjectModal = ({
  open,
  onOpenChange,
  onCreated,
  nextSlot,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
  nextSlot: number;
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const idx = Math.min(nextSlot - 1, 29);
  const g = GRADIENTS[idx] ?? GRADIENTS[0];

  const create = async () => {
    if (!name.trim()) { toast.error('give the project a name'); return; }
    setBusy(true);
    const { error } = await supabase.from('channel_projects').insert({
      slot_number: nextSlot,
      name: name.trim(),
      description: description.trim() || null,
      is_active: true,
      is_hidden: false,
      created_by: user?.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`"${name.trim()}" project created`);
    setName(''); setDescription('');
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setName(''); setDescription(''); } onOpenChange(o); }}>
      <DialogContent
        className="border-0 max-w-md"
        style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}
      >
        <DialogHeader>
          <DialogTitle className="font-medium" style={{ color: '#F5F0EB', letterSpacing: '-0.02em' }}>
            new project — slot {nextSlot}
          </DialogTitle>
        </DialogHeader>

        {/* Mini tile preview */}
        <div
          className="relative overflow-hidden flex items-end p-4 mb-2"
          style={{ background: gradientCss(g.base), borderRadius: 8, height: 80 }}
        >
          <div style={{ position: 'absolute', bottom: -8, right: 4, fontSize: '4rem', fontWeight: 900, color: '#fff', opacity: 0.08, lineHeight: 1, letterSpacing: '-0.05em', userSelect: 'none' }}>
            {nextSlot}
          </div>
          <div className="relative z-10" style={{ border: '1px solid #F5F0EB', padding: '2px 8px' }}>
            <span className="text-sm font-bold" style={{ color: '#F5F0EB' }}>
              {name || 'Project Name'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name (e.g. Builders House)"
            maxLength={60}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && create()}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0EB', borderRadius: 8 }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            maxLength={200}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0EB', borderRadius: 8 }}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} style={{ color: '#A09890' }}>cancel</Button>
            <Button onClick={create} disabled={busy} className="px-6">{busy ? 'creating…' : 'create project'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Export — ProjectChannelPage
// ─────────────────────────────────────────────────────────────
export const ProjectChannelPage = ({ channel }: { channel: Channel }) => {
  const { isAdmin } = useAuth();
  const [view, setView] = useState<'grid' | 'general' | 'project'>('grid');
  const [selectedProject, setSelectedProject] = useState<ChannelProject | null>(null);
  const [projects, setProjects] = useState<ChannelProject[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const usedSlots = projects.map((p) => p.slot_number);
  const nextSlot = Array.from({ length: 30 }, (_, i) => i + 1).find((n) => !usedSlots.includes(n)) ?? 0;

  const loadProjects = useCallback(async () => {
    const query = isAdmin
      ? supabase.from('channel_projects').select('*').eq('is_active', true).order('slot_number')
      : supabase.from('channel_projects').select('*').eq('is_active', true).eq('is_hidden', false).order('slot_number');
    const { data } = await query;
    setProjects(data ?? []);
  }, [isAdmin]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Realtime: tile grid updates when admin adds/hides/deletes
  useEffect(() => {
    const ch = supabase
      .channel('channel_projects_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_projects' }, loadProjects)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadProjects]);

  if (view === 'general') {
    return <GeneralView channel={channel} onBack={() => setView('grid')} />;
  }

  if (view === 'project' && selectedProject) {
    return (
      <ProjectView
        channel={channel}
        project={selectedProject}
        onBack={() => { setView('grid'); setSelectedProject(null); }}
      />
    );
  }

  return (
    <>
      <TileGridView
        channel={channel}
        projects={projects}
        isAdmin={isAdmin}
        onSelectGeneral={() => setView('general')}
        onSelectProject={(p) => { setSelectedProject(p); setView('project'); }}
        onAddProject={() => setShowAddModal(true)}
        onRefresh={loadProjects}
      />
      <AddProjectModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onCreated={loadProjects}
        nextSlot={nextSlot}
      />
    </>
  );
};
