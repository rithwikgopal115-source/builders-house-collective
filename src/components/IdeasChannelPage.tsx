/**
 * IdeasChannelPage.tsx
 * Mirrors All Projects tile architecture for project display.
 *
 * IMPORTANT: channel_projects has NO channel_id column — it is a global table.
 * All queries on channel_projects must NOT filter by channel_id.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PostCard, FeedPost } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { FloatingActions } from "@/components/FloatingActions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, ChevronDown } from "lucide-react";

interface Channel { id: string; slug: string; name: string; description: string | null; }
interface ChannelProject {
  id: string; slot_number: number; name: string; description: string | null;
  is_active: boolean; is_hidden: boolean; gradient_idx: number | null;
  project_type?: string | null; parent_project_id?: string | null; created_at: string;
}

const IDEA_CATS = [
  { key: 'ai-foundations',     label: 'AI Foundations' },
  { key: 'prompt-engineering', label: 'Prompt Engineering' },
  { key: 'platform-mastery',   label: 'Platform Mastery' },
  { key: 'skill-acq',          label: 'Skill Acq' },
  { key: 'integration',        label: 'Integration' },
  { key: 'automation',         label: 'Automation' },
  { key: 'random-project',     label: 'Random' },
];

const IDEA_FILTER_OPTS = [
  { key: 'all',             label: 'All' },
  { key: 'new-project',     label: 'New Project' },
  { key: 'random',          label: 'Random' },
  ...IDEA_CATS.map(c => ({ key: c.key, label: c.label })),
];

// Same gradient palette as GeneralChannelPage
const GRADIENTS_LIST: [string, string, string][] = [
  ['#0F2027','#203A43','#2C5364'],
  ['#1a1a2e','#16213e','#0f3460'],
  ['#002B5B','#1A4C8B','#2176AE'],
  ['#4B0000','#7B1A1A','#B22B2B'],
  ['#2A0A00','#6B2A00','#BF360C'],
  ['#2A1200','#7A3B00','#E67E22'],
  ['#3A1A00','#8A5A00','#C49A00'],
  ['#0A2A1A','#1A5C3A','#27AE60'],
  ['#001A05','#00400D','#1B5E20'],
  ['#0A2A20','#1A5A40','#16A085'],
  ['#001A1A','#004D4D','#00796B'],
  ['#0A2A15','#1B5E20','#388E3C'],
  ['#1A0A3A','#4A1A8A','#8E44AD'],
  ['#1A0A2A','#4A0A5A','#9B59B6'],
  ['#0A0A2A','#1A1A6A','#2980B9'],
  ['#1A0A2A','#4527A0','#7E57C2'],
  ['#1A002A','#4A006A','#AD1457'],
  ['#1A0A15','#4A0020','#880E4F'],
  ['#1A0000','#4A0010','#C62828'],
  ['#1A0F00','#4E2A00','#795548'],
  ['#050A1A','#0D1B3E','#311B92'],
  ['#050505','#111827','#1f2937'],
  ['#0a0f1e','#1a2547','#2d4a8a'],
  ['#1a0a0f','#4a1525','#8B2252'],
];

const getGrad = (idx: number | null) => {
  const g = GRADIENTS_LIST[(idx ?? 0) % GRADIENTS_LIST.length];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]}, ${g[2]})`;
};

const PillActive: React.CSSProperties = {
  background: '#E8734A', color: '#0D0D0D', border: '1px solid #E8734A',
  borderRadius: 999, padding: '5px 14px', fontSize: 12,
};
const PillIdle: React.CSSProperties = {
  background: '#1E1E1E', color: '#8A8480', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 999, padding: '5px 14px', fontSize: 12,
};

// ─── Idea Post Feed ───────────────────────────────────────────────────────────
const IdeaFeed = ({
  channelId, projectId, ideaCategory,
}: {
  channelId: string;
  projectId?: string | null;
  ideaCategory?: string | null;
}) => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('posts')
      .select('id,channel_id,user_id,title,content,type,url,image_urls,project_id,idea_category,visibility,created_at,is_pinned,is_resource,profiles!posts_user_id_fkey(id,display_name,avatar_url,is_admin)')
      .eq('channel_id', channelId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80);

    if (projectId !== undefined) {
      if (projectId === null) q = q.is('project_id', null);
      else q = q.eq('project_id', projectId);
    }
    if (ideaCategory !== undefined) {
      if (ideaCategory === null) q = q.is('idea_category', null);
      else q = q.eq('idea_category', ideaCategory);
    }
    const { data } = await q;
    setPosts((data ?? []).map((p: any) => ({ ...p, author: p.profiles })));
    setLoading(false);
  }, [channelId, projectId, ideaCategory]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`ideas:${channelId}:${String(projectId)}:${String(ideaCategory)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `channel_id=eq.${channelId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, projectId, ideaCategory, load]);

  const deletePost = async (id: string) => {
    if (!window.confirm('delete this idea?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('deleted');
    load();
  };

  if (loading) return (
    <div className="py-12 text-center text-sm font-mono" style={{ color: '#6A6460' }}>loading…</div>
  );
  if (!posts.length) return (
    <div className="py-12 text-center text-sm font-mono"
      style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: '#6A6460' }}>
      no ideas here yet.
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {posts.map(p => (
          <div key={p.id} className="relative group">
            <PostCard post={p} />
            {(p.user_id === user?.id || isAdmin) && (
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {p.user_id === user?.id && (
                  <button onClick={() => setEditingPost(p)}
                    className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10"
                    style={{ color: '#A09890' }} title="edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => deletePost(p.id)}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-500/20"
                  style={{ color: '#A09890' }} title="delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <PostComposer
        open={!!editingPost}
        onOpenChange={o => { if (!o) setEditingPost(null); }}
        editPost={editingPost}
        onCreated={() => { setEditingPost(null); load(); }}
      />
    </>
  );
};

// ─── Project Tile Grid (mirrors All Projects architecture) ────────────────────
const ProjectTileGrid = ({
  projects, onSelect,
}: {
  projects: ChannelProject[];
  onSelect: (p: ChannelProject) => void;
}) => {
  if (!projects.length) return (
    <div className="py-12 text-center text-sm font-mono"
      style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, color: '#4A4A4A' }}>
      no projects yet.
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {projects.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="relative p-4 flex flex-col justify-between text-left hover:opacity-90 transition-all active:scale-[0.99]"
          style={{ background: getGrad(p.gradient_idx), borderRadius: 12, minHeight: 110 }}
        >
          <div className="text-2xl font-black opacity-20" style={{ letterSpacing: '-0.05em' }}>
            {p.slot_number}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#F5F0EB' }}>{p.name}</p>
            {p.description && (
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(245,240,235,0.6)' }}>
                {p.description}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

// ─── Project Ideas View (inside a project, with category sub-tabs) ────────────
const ProjectIdeasView = ({
  channel, project, onBack,
}: {
  channel: Channel;
  project: ChannelProject;
  onBack: () => void;
}) => {
  const [catFilter, setCatFilter] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 hover:text-primary"
        style={{ color: '#A09890' }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {project.name}
      </button>

      {/* Idea category filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          onClick={() => setCatFilter(null)}
          className="font-mono text-xs"
          style={catFilter === null ? PillActive : PillIdle}
        >
          All
        </button>
        {IDEA_CATS.map(c => (
          <button
            key={c.key}
            onClick={() => setCatFilter(c.key)}
            className="font-mono text-xs"
            style={catFilter === c.key ? PillActive : PillIdle}
          >
            {c.label}
          </button>
        ))}
      </div>

      <IdeaFeed
        channelId={channel.id}
        projectId={project.id}
        ideaCategory={catFilter !== null ? catFilter : undefined}
      />
      <FloatingActions defaultChannelId={channel.id} defaultProjectId={project.id} />
    </div>
  );
};

// ─── Project Ideas Tab ────────────────────────────────────────────────────────
const ProjectIdeasTab = ({ channel }: { channel: Channel }) => {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<ChannelProject[]>([]);
  const [selected, setSelected] = useState<ChannelProject | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    // CRITICAL FIX: channel_projects has NO channel_id column — do not filter by it.
    // Only load top-level projects (parent_project_id IS NULL) and exclude skills.
    const q = isAdmin
      ? supabase.from('channel_projects').select('*')
          .eq('is_active', true)
          .is('parent_project_id', null)
          .order('slot_number')
      : supabase.from('channel_projects').select('*')
          .eq('is_active', true)
          .eq('is_hidden', false)
          .is('parent_project_id', null)
          .order('slot_number');

    q.then(({ data }) =>
      setProjects((data ?? []).filter((p: any) => p.project_type !== 'skill'))
    );
  }, [isAdmin]);

  if (selected) return (
    <ProjectIdeasView channel={channel} project={selected} onBack={() => setSelected(null)} />
  );

  return (
    <div>
      {/* Header: count + filter dropdown */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono uppercase tracking-wider" style={{ color: '#6A6460' }}>
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>

        <div className="relative">
          <button
            onClick={() => setFilterOpen(f => !f)}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full"
            style={{ background: '#1E1E1E', color: '#8A8480', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {IDEA_FILTER_OPTS.find(f => f.key === activeFilter)?.label ?? 'All'}
            <ChevronDown className="h-3 w-3" />
          </button>

          {filterOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-30 rounded-xl overflow-hidden shadow-xl"
              style={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', minWidth: 190 }}
            >
              {IDEA_FILTER_OPTS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setActiveFilter(opt.key); setFilterOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-white/5"
                  style={{ color: activeFilter === opt.key ? '#E8734A' : '#A09890' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProjectTileGrid projects={projects} onSelect={setSelected} />
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export const IdeasChannelPage = ({ channel }: { channel: Channel }) => {
  return (
    <div>
      <Tabs defaultValue="all">
        <TabsList
          className="mb-5"
          style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <TabsTrigger value="all">All Ideas</TabsTrigger>
          <TabsTrigger value="project-ideas">Project Ideas</TabsTrigger>
          <TabsTrigger value="new-projects">New Projects</TabsTrigger>
          <TabsTrigger value="random">Random</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <IdeaFeed channelId={channel.id} />
          <FloatingActions defaultChannelId={channel.id} />
        </TabsContent>

        <TabsContent value="project-ideas">
          <ProjectIdeasTab channel={channel} />
        </TabsContent>

        <TabsContent value="new-projects">
          <IdeaFeed channelId={channel.id} projectId={null} ideaCategory="new-project" />
          <FloatingActions defaultChannelId={channel.id} />
        </TabsContent>

        <TabsContent value="random">
          <IdeaFeed channelId={channel.id} projectId={null} ideaCategory="random" />
          <FloatingActions defaultChannelId={channel.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
