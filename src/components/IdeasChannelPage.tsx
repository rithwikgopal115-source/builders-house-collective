/**
 * IdeasChannelPage.tsx
 * 4 tabs: All Ideas | Project Ideas (per-project with idea category sub-tabs) | New Project Ideas | Random
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PostCard, FeedPost } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { FloatingActions } from "@/components/FloatingActions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

interface Channel { id: string; slug: string; name: string; description: string | null; }
interface ChannelProject {
  id: string; slot_number: number; name: string; description: string | null;
  is_active: boolean; is_hidden: boolean; gradient_idx: number | null;
  project_type?: string | null; created_at: string;
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

const GRADIENTS_MINI: string[] = [
  'linear-gradient(135deg,#0F2027,#203A43,#2C5364)',
  'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  'linear-gradient(135deg,#002B5B,#1A4C8B,#2176AE)',
  'linear-gradient(135deg,#4B0000,#7B1A1A,#B22B2B)',
  'linear-gradient(135deg,#2A0A00,#6B2A00,#BF360C)',
  'linear-gradient(135deg,#0A2A1A,#1A5C3A,#27AE60)',
  'linear-gradient(135deg,#1A0A3A,#4A1A8A,#8E44AD)',
  'linear-gradient(135deg,#050A1A,#0D1B3E,#311B92)',
];

// ─── Idea Post Feed ───────────────────────────────────────────
const IdeaFeed = ({channelId,projectId,ideaCategory}:{channelId:string;projectId?:string|null;ideaCategory?:string|null}) => {
  const {user,isAdmin}=useAuth();
  const [posts,setPosts]=useState<FeedPost[]>([]);
  const [loading,setLoading]=useState(true);
  const [editingPost,setEditingPost]=useState<FeedPost|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    let q=supabase.from('posts')
      .select('id,channel_id,user_id,title,content,type,url,image_urls,project_id,idea_category,visibility,created_at,is_pinned,is_resource,profiles!posts_user_id_fkey(id,display_name,avatar_url,is_admin)')
      .eq('channel_id',channelId).order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(80);
    if(projectId!==undefined){
      if(projectId===null)q=q.is('project_id',null);
      else q=q.eq('project_id',projectId);
    }
    if(ideaCategory!==undefined){
      if(ideaCategory===null)q=q.is('idea_category',null);
      else q=q.eq('idea_category',ideaCategory);
    }
    const {data}=await q;
    setPosts((data??[]).map((p:any)=>({...p,author:p.profiles})));
    setLoading(false);
  },[channelId,projectId,ideaCategory]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=supabase.channel(`ideas:${channelId}:${String(projectId)}:${String(ideaCategory)}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'posts',filter:`channel_id=eq.${channelId}`},load).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[channelId,projectId,ideaCategory,load]);

  const deletePost=async(id:string)=>{
    if(!window.confirm('delete this idea?'))return;
    const {error}=await supabase.from('posts').delete().eq('id',id);
    if(error){toast.error(error.message);return;}
    toast.success('deleted');load();
  };

  if(loading) return <div className="py-12 text-center text-sm font-mono" style={{color:'#6A6460'}}>loading…</div>;
  if(!posts.length) return <div className="py-12 text-center text-sm font-mono" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,color:'#6A6460'}}>no ideas here yet.</div>;

  return (
    <>
      <div className="space-y-4">
        {posts.map(p=>(
          <div key={p.id} className="relative group">
            <PostCard post={p}/>
            {(p.user_id===user?.id||isAdmin)&&(
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {p.user_id===user?.id&&<button onClick={()=>setEditingPost(p)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10" style={{color:'#A09890'}} title="edit"><Pencil className="h-3.5 w-3.5"/></button>}
                <button onClick={()=>deletePost(p.id)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-500/20" style={{color:'#A09890'}} title="delete"><Trash2 className="h-3.5 w-3.5"/></button>
              </div>
            )}
          </div>
        ))}
      </div>
      <PostComposer open={!!editingPost} onOpenChange={o=>{if(!o)setEditingPost(null);}} editPost={editingPost} onCreated={()=>{setEditingPost(null);load();}}/>
    </>
  );
};

// ─── Project Ideas Tab (project selector → idea category tabs) ─
const ProjectIdeasTab = ({channel}:{channel:Channel}) => {
  const {isAdmin}=useAuth();
  const [projects,setProjects]=useState<ChannelProject[]>([]);
  const [selected,setSelected]=useState<ChannelProject|null>(null);

  useEffect(()=>{
    const q=isAdmin
      ?supabase.from('channel_projects').select('*').eq('channel_id',channel.id).eq('is_active',true).order('slot_number')
      :supabase.from('channel_projects').select('*').eq('channel_id',channel.id).eq('is_active',true).eq('is_hidden',false).order('slot_number');
    q.then(({data})=>setProjects(data??[]));
  },[channel.id,isAdmin]);

  if(selected) return (
    <div>
      <button onClick={()=>setSelected(null)} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 hover:text-primary" style={{color:'#A09890'}}>
        <ArrowLeft className="h-3.5 w-3.5"/>{selected.name}
      </button>
      <Tabs defaultValue="all-project">
        <TabsList className="mb-4 flex-wrap h-auto gap-1" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)'}}>
          <TabsTrigger value="all-project">All</TabsTrigger>
          {IDEA_CATS.map(c=><TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="all-project">
          <IdeaFeed channelId={channel.id} projectId={selected.id}/>
        </TabsContent>
        {IDEA_CATS.map(c=>(
          <TabsContent key={c.key} value={c.key}>
            <IdeaFeed channelId={channel.id} projectId={selected.id} ideaCategory={c.key}/>
          </TabsContent>
        ))}
      </Tabs>
      <FloatingActions defaultChannelId={channel.id} defaultProjectId={selected.id}/>
    </div>
  );

  return (
    <div>
      {projects.length===0&&<div className="py-12 text-center text-sm font-mono" style={{color:'#4A4A4A'}}>no projects yet.</div>}
      <div className="space-y-2">
        {projects.map((p,i)=>(
          <button key={p.id} onClick={()=>setSelected(p)}
            className="w-full text-left p-4 flex items-center gap-4 hover:opacity-90 transition-opacity active:scale-[0.99]"
            style={{background:GRADIENTS_MINI[i%GRADIENTS_MINI.length],borderRadius:8}}>
            <div className="flex-shrink-0 text-xl font-black opacity-30" style={{letterSpacing:'-0.05em'}}>{p.slot_number}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{color:'#F5F0EB'}}>{p.name}</p>
              {p.description&&<p className="text-xs mt-0.5 truncate" style={{color:'rgba(245,240,235,0.6)'}}>{p.description}</p>}
            </div>
            <div className="text-xs font-mono" style={{color:'rgba(245,240,235,0.4)'}}>enter →</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────
export const IdeasChannelPage = ({channel}:{channel:Channel}) => {
  return (
    <div>
      <Tabs defaultValue="all">
        <TabsList className="mb-5" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)'}}>
          <TabsTrigger value="all">All Ideas</TabsTrigger>
          <TabsTrigger value="project-ideas">Project Ideas</TabsTrigger>
          <TabsTrigger value="new-projects">New Projects</TabsTrigger>
          <TabsTrigger value="random">Random</TabsTrigger>
        </TabsList>

        {/* All ideas */}
        <TabsContent value="all">
          <IdeaFeed channelId={channel.id}/>
          <FloatingActions defaultChannelId={channel.id}/>
        </TabsContent>

        {/* Project ideas with category sub-tabs */}
        <TabsContent value="project-ideas">
          <ProjectIdeasTab channel={channel}/>
        </TabsContent>

        {/* New project ideas */}
        <TabsContent value="new-projects">
          <IdeaFeed channelId={channel.id} projectId={null} ideaCategory="new-project"/>
          <FloatingActions defaultChannelId={channel.id}/>
        </TabsContent>

        {/* Random */}
        <TabsContent value="random">
          <IdeaFeed channelId={channel.id} projectId={null} ideaCategory="random"/>
          <FloatingActions defaultChannelId={channel.id}/>
        </TabsContent>
      </Tabs>
    </div>
  );
};
