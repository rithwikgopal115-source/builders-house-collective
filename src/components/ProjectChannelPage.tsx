/**
 * ProjectChannelPage.tsx — Used by the Wins channel.
 * Two-tile hub layout:
 *   1. Information & Skills → plain post feed
 *   2. All Projects         → project tiles with recursive subproject navigation
 *
 * IMPORTANT: channel_projects has NO channel_id column — it is a global table.
 * All queries on channel_projects must NOT filter by channel_id.
 * Top-level projects only: .is('parent_project_id', null)
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PostCard, FeedPost } from "@/components/PostCard";
import { FloatingActions } from "@/components/FloatingActions";
import { PostComposer } from "@/components/PostComposer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Eye, EyeOff, Trash2, Pencil, Layers, BookOpen, ChevronDown, ChevronUp, Lock } from "lucide-react";

interface Channel { id: string; slug: string; name: string; description: string | null; }
interface ChannelProject {
  id: string; slot_number: number; name: string; description: string | null;
  is_active: boolean; is_hidden: boolean; gradient_idx: number | null;
  project_type?: string | null; intro_video_url?: string | null; created_at: string;
}

// ── 30 Gradients ─────────────────────────────────────────────
const GRADIENTS: { base: [string,string,string]; hover: [string,string,string]; label: string }[] = [
  { base:['#0F2027','#203A43','#2C5364'], hover:['#152D38','#2D5060','#3D7480'], label:'Deep Ocean' },
  { base:['#1a1a2e','#16213e','#0f3460'], hover:['#252545','#1f2f55','#1a4880'], label:'Midnight' },
  { base:['#002B5B','#1A4C8B','#2176AE'], hover:['#003F7F','#2060A0','#2E8ABE'], label:'Cobalt' },
  { base:['#4B0000','#7B1A1A','#B22B2B'], hover:['#650000','#922020','#C83535'], label:'Crimson' },
  { base:['#2A0A00','#6B2A00','#BF360C'], hover:['#3F1500','#7F3A00','#D4430F'], label:'Rust' },
  { base:['#2A1200','#7A3B00','#E67E22'], hover:['#3F1C00','#8F4A00','#F08A30'], label:'Amber' },
  { base:['#3A1A00','#8A5A00','#C49A00'], hover:['#4F2500','#9F6A00','#D4AA10'], label:'Gold' },
  { base:['#0A2A1A','#1A5C3A','#27AE60'], hover:['#102F1F','#207050','#35C070'], label:'Emerald' },
  { base:['#001A05','#00400D','#1B5E20'], hover:['#002508','#005015','#22752A'], label:'Forest' },
  { base:['#0A2A20','#1A5A40','#16A085'], hover:['#102F25','#207050','#1AB09A'], label:'Teal' },
  { base:['#001A1A','#004D4D','#00796B'], hover:['#002525','#006060','#009080'], label:'Dark Teal' },
  { base:['#0A2A15','#1B5E20','#388E3C'], hover:['#102F1A','#22752A','#45A050'], label:'Jade' },
  { base:['#1A0A3A','#4A1A8A','#8E44AD'], hover:['#250F4F','#5A22A0','#9E54BD'], label:'Violet' },
  { base:['#1A0A2A','#4A0A5A','#9B59B6'], hover:['#250F3F','#5A1070','#AB69C6'], label:'Amethyst' },
  { base:['#0A0A2A','#1A1A6A','#2980B9'], hover:['#0F0F3F','#222280','#3590C9'], label:'Indigo' },
  { base:['#1A0A2A','#4527A0','#7E57C2'], hover:['#250F3F','#5532B0','#8E67D2'], label:'Lavender' },
  { base:['#1A002A','#4A006A','#AD1457'], hover:['#250039','#5A0080','#BD2467'], label:'Magenta' },
  { base:['#1A0A15','#4A0020','#880E4F'], hover:['#250F1F','#5A0030','#980E5F'], label:'Wine' },
  { base:['#1A0000','#4A0010','#C62828'], hover:['#250000','#5A0018','#D63838'], label:'Crimson Lake' },
  { base:['#1A0F00','#4E2A00','#795548'], hover:['#251500','#5E3A00','#896558'], label:'Bronze' },
  { base:['#050A1A','#0D1B3E','#311B92'], hover:['#0A1025','#122655','#4128A2'], label:'Nebula' },
  { base:['#050505','#111827','#1f2937'], hover:['#0a0a0a','#181f2f','#252e3f'], label:'Void' },
  { base:['#0a0f1e','#1a2547','#2d4a8a'], hover:['#101525','#222f57','#3d5a9a'], label:'Sapphire' },
  { base:['#1a0a0f','#4a1525','#8B2252'], hover:['#250f15','#5a1f35','#9B3262'], label:'Garnet' },
  { base:['#0a1a15','#154a35','#1e7a54'], hover:['#101f1a','#1f5a45','#2e8a64'], label:'Malachite' },
  { base:['#1a0f0a','#4a2510','#8B5530'], hover:['#251510','#5a3020','#9B6540'], label:'Copper' },
  { base:['#0a0f1a','#1a2540','#2a4070'], hover:['#0f1525','#222f50','#3a5080'], label:'Steel' },
  { base:['#1a0a0a','#3a1515','#6B2525'], hover:['#251010','#4a1f1f','#7B3535'], label:'Mahogany' },
  { base:['#0a1a0a','#1a3a1a','#2d5e2d'], hover:['#101f10','#224a22','#3d6e3d'], label:'Bottle Green' },
  { base:['#0f0f1a','#1a1a2e','#252545'], hover:['#151520','#22223a','#303060'], label:'Dark Matter' },
];

const gradientCss = (c:[string,string,string], deg=135) =>
  `linear-gradient(${deg}deg,${c[0]} 0%,${c[1]} 50%,${c[2]} 100%)`;

// ── Cascade delete helper ─────────────────────────────────────
const cascadeDeleteProject = async (projectId: string): Promise<void> => {
  const collectDescendants = async (id: string): Promise<string[]> => {
    const { data } = await supabase.from('channel_projects').select('id').eq('parent_project_id', id);
    const childIds = (data ?? []).map((p: any) => p.id);
    const nested = await Promise.all(childIds.map(collectDescendants));
    return [...childIds, ...nested.flat()];
  };
  const descendantIds = await collectDescendants(projectId);
  const allIds = [...descendantIds, projectId];
  for (const id of allIds) {
    await supabase.from('posts').delete().eq('project_id', id);
  }
  for (const id of allIds) {
    await supabase.from('channel_projects').update({ is_active: false }).eq('id', id);
  }
};

const getTextColor = (idx:number) => {
  const hex = GRADIENTS[idx]?.base[1] ?? '#0D0D0D';
  const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const toL=(c:number)=>c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);
  return (0.2126*toL(r)+0.7152*toL(g)+0.0722*toL(b)) > 0.179 ? '#0D0D0D' : '#F5F0EB';
};

// ── Gradient Picker ───────────────────────────────────────────
const GradientPicker = ({ value, onChange }: { value:number; onChange:(i:number)=>void }) => (
  <div>
    <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{color:'#8A8480'}}>tile colour</p>
    <div className="flex flex-wrap gap-1.5">
      {GRADIENTS.map((g,i) => (
        <button key={i} title={g.label} onClick={()=>onChange(i)}
          style={{width:28,height:28,background:gradientCss(g.base),borderRadius:4,
            border:value===i?'2px solid #E8734A':'2px solid transparent',
            outline:value===i?'1px solid rgba(232,115,74,0.4)':'none'}}/>
      ))}
    </div>
  </div>
);

// ── Locked tile ───────────────────────────────────────────────
const LockedTile = ({title}:{title:string}) => (
  <div className="relative overflow-hidden flex flex-col items-center justify-center gap-3"
    style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.06)',borderRadius:0,minHeight:130,opacity:0.65,cursor:'not-allowed'}}>
    <Lock className="h-6 w-6" style={{color:'rgba(255,255,255,0.2)'}}/>
    <p className="text-xs font-bold text-center px-4" style={{color:'#F5F0EB'}}>{title}</p>
    <p className="text-[10px] font-mono uppercase tracking-widest" style={{color:'#E8734A'}}>coming soon</p>
  </div>
);

// ── Hub Nav Tile ──────────────────────────────────────────────
const HubNavTile = ({title,subtitle,gradIdx,onClick,icon:Icon,minHeight=180}:{
  title:string;subtitle?:string;gradIdx:number;onClick:()=>void;icon?:any;minHeight?:number;
}) => {
  const [hov,setHov]=useState(false);
  const g=GRADIENTS[Math.min(gradIdx,29)];
  const tc=getTextColor(Math.min(gradIdx,29));
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className="relative overflow-hidden text-left w-full active:scale-[0.98]"
      style={{borderRadius:0,minHeight,boxShadow:hov?'0 0 40px rgba(232,115,74,0.12)':'none',transition:'box-shadow 0.35s'}}>
      <div style={{position:'absolute',inset:0,background:gradientCss(g.base)}}/>
      <div style={{position:'absolute',inset:0,background:gradientCss(g.hover,160),opacity:hov?1:0,transition:'opacity 0.4s',pointerEvents:'none'}}/>
      <div className="relative z-10 p-5 h-full flex flex-col justify-end gap-2">
        {Icon&&<Icon className="h-5 w-5 mb-1" style={{color:`${tc}99`}}/>}
        <div>
          <div style={{display:'inline-block',border:`1px solid ${tc}`,padding:'4px 14px'}}>
            <span className="text-lg font-bold" style={{color:tc,letterSpacing:'-0.02em'}}>{title}</span>
          </div>
          {subtitle&&<p className="text-[11px] mt-1.5 font-mono" style={{color:`${tc}88`}}>{subtitle}</p>}
        </div>
        {hov&&<div style={{border:`1px solid ${tc}55`,padding:'2px 8px',display:'inline-block',position:'absolute',bottom:12,right:12}}>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{color:tc}}>enter →</span>
        </div>}
      </div>
    </button>
  );
};

// ── Project Tile ──────────────────────────────────────────────
const ProjectTile = ({project,isAdmin,onClick,onEdit,onHide,onDelete,style}:{
  project:ChannelProject;isAdmin:boolean;onClick:()=>void;
  onEdit:()=>void;onHide:()=>void;onDelete:()=>void;style?:React.CSSProperties;
}) => {
  const [hov,setHov]=useState(false);
  const idx=Math.min((project.gradient_idx??project.slot_number-1),29);
  const g=GRADIENTS[idx]; const tc=getTextColor(idx);
  return (
    <div className="relative overflow-hidden" style={{borderRadius:0,minHeight:130,...style}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{position:'absolute',inset:0,background:gradientCss(g.base)}}/>
      <div style={{position:'absolute',inset:0,background:gradientCss(g.hover,160),opacity:hov?1:0,transition:'opacity 0.4s ease',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-12,right:6,fontSize:'7rem',fontWeight:900,color:'#FFF',opacity:0.07,lineHeight:1,pointerEvents:'none',userSelect:'none',letterSpacing:'-0.05em'}}>
        {project.slot_number}
      </div>
      <button onClick={onClick} className="absolute inset-0 z-10 text-left p-4 flex flex-col justify-end">
        <div style={{display:'inline-block',border:`1px solid ${tc}`,padding:'3px 10px'}}>
          <span style={{color:tc,fontSize:13,fontWeight:700,letterSpacing:'0.01em'}}>{project.name}</span>
        </div>
        {project.description && <p className="text-[11px] mt-1" style={{color:`${tc}88`}}>{project.description}</p>}
      </button>
      {isAdmin && hov && (
        <div className="absolute top-2 right-2 z-20 flex gap-1">
          <button onClick={e=>{e.stopPropagation();onEdit();}} className="h-7 w-7 flex items-center justify-center rounded" style={{background:'rgba(0,0,0,0.6)',color:'#F5F0EB'}}><Pencil className="h-3.5 w-3.5"/></button>
          <button onClick={e=>{e.stopPropagation();onHide();}} className="h-7 w-7 flex items-center justify-center rounded" style={{background:'rgba(0,0,0,0.6)',color:'#F5F0EB'}}>
            {project.is_hidden?<Eye className="h-3.5 w-3.5"/>:<EyeOff className="h-3.5 w-3.5"/>}
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} className="h-7 w-7 flex items-center justify-center rounded" style={{background:'rgba(0,0,0,0.6)',color:'#ff6b6b'}}><Trash2 className="h-3.5 w-3.5"/></button>
        </div>
      )}
      {project.is_hidden&&isAdmin&&(
        <div className="absolute top-2 left-2 z-20 text-[10px] font-mono uppercase px-2 py-0.5" style={{background:'rgba(0,0,0,0.65)',color:'#ff6b6b',border:'1px solid rgba(255,107,107,0.4)'}}>hidden</div>
      )}
    </div>
  );
};

// ── Add Tile ──────────────────────────────────────────────────
const AddProjectTile = ({onClick,nextSlot,style}:{onClick:()=>void;nextSlot:number;style?:React.CSSProperties}) => {
  const [hov,setHov]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className="relative overflow-hidden flex flex-col items-center justify-center gap-2"
      style={{background:hov?'rgba(232,115,74,0.08)':'rgba(255,255,255,0.02)',border:`1px dashed ${hov?'rgba(232,115,74,0.6)':'rgba(255,255,255,0.12)'}`,borderRadius:0,minHeight:130,transition:'all 0.25s',...style}}>
      <div className="relative z-10 h-9 w-9 rounded-full flex items-center justify-center" style={{background:hov?'#E8734A':'rgba(255,255,255,0.08)',transition:'background 0.25s'}}>
        <Plus className="h-5 w-5" style={{color:hov?'#0D0D0D':'#A09890'}}/>
      </div>
      <span className="relative z-10 text-[10px] font-mono uppercase tracking-wider" style={{color:hov?'#E8734A':'#6A6460'}}>new project</span>
    </button>
  );
};

// ── Post Feed ─────────────────────────────────────────────────
const PostFeed = ({channelId,projectId}:{channelId:string;projectId:string|null|'all'}) => {
  const {user,isAdmin}=useAuth();
  const [posts,setPosts]=useState<FeedPost[]>([]);
  const [loading,setLoading]=useState(true);
  const [editingPost,setEditingPost]=useState<FeedPost|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    let q=supabase.from('posts')
      .select('id,channel_id,user_id,title,content,type,url,image_urls,project_id,visibility,created_at,is_pinned,is_resource,profiles!posts_user_id_fkey(id,display_name,avatar_url,is_admin)')
      .eq('channel_id',channelId).order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(80);
    if(projectId==='all'){}
    else if(projectId===null)q=q.is('project_id',null);
    else q=q.eq('project_id',projectId);
    const {data}=await q;
    setPosts((data??[]).map((p:any)=>({...p,author:p.profiles})));
    setLoading(false);
  },[channelId,projectId]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=supabase.channel(`pcpf:${channelId}:${String(projectId)}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'posts',filter:`channel_id=eq.${channelId}`},load).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[channelId,projectId,load]);

  const deletePost=async(id:string)=>{
    if(!window.confirm('delete this post?'))return;
    const {error}=await supabase.from('posts').delete().eq('id',id);
    if(error){toast.error(error.message);return;}
    toast.success('deleted');load();
  };

  if(loading) return <div className="py-12 text-center text-sm font-mono" style={{color:'#6A6460'}}>loading…</div>;
  if(!posts.length) return <div className="py-16 text-center text-sm font-mono" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,color:'#6A6460'}}>nothing here yet — be the first.</div>;

  return (
    <>
      <div className="space-y-4">
        {posts.map(p=>(
          <div key={p.id} className="relative group">
            <PostCard post={p}/>
            {(p.user_id===user?.id||isAdmin)&&(
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {p.user_id===user?.id&&<button onClick={()=>setEditingPost(p)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10" style={{color:'#A09890'}}><Pencil className="h-3.5 w-3.5"/></button>}
                <button onClick={()=>deletePost(p.id)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-500/20" style={{color:'#A09890'}}><Trash2 className="h-3.5 w-3.5"/></button>
              </div>
            )}
          </div>
        ))}
      </div>
      <PostComposer open={!!editingPost} onOpenChange={o=>{if(!o)setEditingPost(null);}} editPost={editingPost} onCreated={()=>{setEditingPost(null);load();}}/>
    </>
  );
};

// ── Add/Edit Project Modal ────────────────────────────────────
const ProjectModal = ({open,onOpenChange,onSaved,existing,nextSlot,parentProjectId}:{
  open:boolean;onOpenChange:(o:boolean)=>void;onSaved:()=>void;
  existing?:ChannelProject|null;nextSlot:number;parentProjectId?:string;
}) => {
  const isEdit=!!existing;
  const [name,setName]=useState('');
  const [desc,setDesc]=useState('');
  const [gradIdx,setGradIdx]=useState(0);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(existing){setName(existing.name);setDesc(existing.description??'');setGradIdx(existing.gradient_idx??Math.min(existing.slot_number-1,29));}
    else{setName('');setDesc('');setGradIdx(Math.min(nextSlot-1,29));}
  },[existing,open,nextSlot]);

  const save=async()=>{
    if(!name.trim()){toast.error('give it a name');return;}
    setBusy(true);
    let error;
    if(isEdit&&existing){
      ({error}=await supabase.from('channel_projects').update({name:name.trim(),description:desc.trim()||null,gradient_idx:gradIdx}).eq('id',existing.id));
    } else {
      ({error}=await supabase.from('channel_projects').insert({
        slot_number:nextSlot,name:name.trim(),description:desc.trim()||null,gradient_idx:gradIdx,
        is_active:true,is_hidden:false,project_type:'project',
        ...(parentProjectId?{parent_project_id:parentProjectId}:{}),
      }));
    }
    setBusy(false);
    if(error){toast.error(error.message);return;}
    toast.success(isEdit?'updated':`"${name.trim()}" created`);
    onOpenChange(false);onSaved();
  };

  const prev=GRADIENTS[Math.min(gradIdx,29)];const tc=getTextColor(Math.min(gradIdx,29));
  return (
    <Dialog open={open} onOpenChange={o=>{if(!o){setName('');setDesc('');}onOpenChange(o);}}>
      <DialogContent className="border-0 max-w-md max-h-[90vh] overflow-y-auto" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16}}>
        <DialogHeader>
          <DialogTitle className="font-medium" style={{color:'#F5F0EB',letterSpacing:'-0.02em'}}>
            {isEdit?'edit project':`new project — slot ${nextSlot}`}
          </DialogTitle>
        </DialogHeader>
        <div className="relative overflow-hidden flex items-end p-4 mb-1" style={{background:gradientCss(prev.base),borderRadius:8,height:80}}>
          <div style={{position:'absolute',bottom:-8,right:4,fontSize:'4rem',fontWeight:900,color:'#fff',opacity:0.08,lineHeight:1,userSelect:'none'}}>{isEdit?existing?.slot_number:nextSlot}</div>
          <div className="relative z-10" style={{border:`1px solid ${tc}`,padding:'2px 8px'}}>
            <span className="text-sm font-bold" style={{color:tc}}>{name||'Project Name'}</span>
          </div>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" maxLength={60} autoFocus onKeyDown={e=>e.key==='Enter'&&save()}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Short description (optional)" rows={2} maxLength={200}
            className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none"
            style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <GradientPicker value={gradIdx} onChange={setGradIdx}/>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={()=>onOpenChange(false)} style={{color:'#A09890'}}>cancel</Button>
            <Button onClick={save} disabled={busy} className="px-6">{busy?(isEdit?'saving…':'creating…'):(isEdit?'save changes':'create')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── YT id helper ─────────────────────────────────────────────
const extractYtId=(url:string)=>{try{const u=new URL(url);return u.hostname.includes('youtu.be')?u.pathname.slice(1):u.searchParams.get('v')??'';}catch{return '';}};

// ── Project View (recursive) ──────────────────────────────────
const ProjectView = ({channel,project,onBack,onSelectSub,breadcrumb}:{
  channel:Channel;project:ChannelProject;onBack:()=>void;
  onSelectSub:(p:ChannelProject)=>void;breadcrumb?:string;
}) => {
  const {isAdmin}=useAuth();
  const idx=Math.min((project.gradient_idx??project.slot_number-1),29);
  const g=GRADIENTS[idx];const tc=getTextColor(idx);
  const [videoCollapsed,setVideoCollapsed]=useState(false);
  const [subProjects,setSubProjects]=useState<ChannelProject[]>([]);
  const [showAddSub,setShowAddSub]=useState(false);
  const [editSub,setEditSub]=useState<ChannelProject|null>(null);

  const loadSubs=useCallback(async()=>{
    const {data}=await supabase.from('channel_projects').select('*')
      .eq('parent_project_id',project.id).eq('is_active',true).order('slot_number');
    setSubProjects(data??[]);
  },[project.id]);
  useEffect(()=>{loadSubs();},[loadSubs]);

  const usedSlots=subProjects.map(p=>p.slot_number);
  const nextSubSlot=Array.from({length:60},(_,i)=>i+1).find(n=>!usedSlots.includes(n))??1;

  const hideSub=async(p:ChannelProject)=>{await supabase.from('channel_projects').update({is_hidden:!p.is_hidden}).eq('id',p.id);loadSubs();};

  const delSub=async(p:ChannelProject)=>{
    if(!window.confirm(`Delete "${p.name}"?`))return;
    if(subProjects.length<=2){
      for(const sub of subProjects){
        await supabase.from('posts').update({project_id:project.id}).eq('project_id',sub.id);
        await supabase.from('channel_projects').update({is_active:false}).eq('id',sub.id);
      }
      toast.success('sub-projects removed — posts returned to parent');
    } else {
      await supabase.from('posts').update({project_id:project.id}).eq('project_id',p.id);
      await supabase.from('channel_projects').update({is_active:false}).eq('id',p.id);
      toast.success('sub-project removed');
    }
    loadSubs();
  };

  const handleAddTile=async()=>{
    if(subProjects.length===0){
      const {count}=await supabase.from('posts').select('*',{count:'exact',head:true}).eq('project_id',project.id);
      if((count??0)>0){
        const {data:untitled,error:e1}=await supabase.from('channel_projects').insert({
          slot_number:1,name:'Untitled',is_active:true,is_hidden:false,
          parent_project_id:project.id,project_type:'project',gradient_idx:21,
        }).select().maybeSingle();
        if(e1||!untitled){toast.error('auto-categorize failed');return;}
        await supabase.from('posts').update({project_id:untitled.id}).eq('project_id',project.id);
        toast.success('existing posts moved to "Untitled"');
        await loadSubs();
      }
    }
    setShowAddSub(true);
  };

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 hover:text-primary" style={{color:'#A09890'}}>
        <ArrowLeft className="h-3.5 w-3.5"/>{breadcrumb??'back'}
      </button>
      <div className="mb-5 p-5 relative overflow-hidden" style={{background:gradientCss(g.base),borderRadius:0}}>
        <div style={{position:'absolute',bottom:-10,right:8,fontSize:'6rem',fontWeight:900,color:'#FFF',opacity:0.07,lineHeight:1,userSelect:'none',letterSpacing:'-0.05em'}}>{project.slot_number}</div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{color:`${tc}66`}}>{channel.name.toLowerCase()}</p>
        <div style={{display:'inline-block',border:`1px solid ${tc}`,padding:'4px 12px'}}>
          <span className="text-xl font-bold" style={{color:tc}}>{project.name}</span>
        </div>
        {project.description&&<p className="mt-2 text-sm" style={{color:`${tc}99`}}>{project.description}</p>}
      </div>

      {project.intro_video_url&&(
        <div className="mb-5">
          <button onClick={()=>setVideoCollapsed(v=>!v)} className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider mb-2 hover:opacity-80" style={{color:'#A09890'}}>
            {videoCollapsed?<ChevronDown className="h-3.5 w-3.5"/>:<ChevronUp className="h-3.5 w-3.5"/>}
            {videoCollapsed?'show intro video':'hide intro video'}
          </button>
          {!videoCollapsed&&(
            <div className="aspect-video overflow-hidden" style={{borderRadius:12,border:'1px solid rgba(255,255,255,0.06)'}}>
              <iframe src={`https://www.youtube.com/embed/${extractYtId(project.intro_video_url)}`} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" title={project.name}/>
            </div>
          )}
        </div>
      )}

      {(subProjects.length>0||isAdmin)&&(
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{color:'rgba(255,255,255,0.25)'}}>sub-projects</p>
            {isAdmin&&<button onClick={handleAddTile} className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider hover:opacity-80" style={{color:'#E8734A'}}><Plus className="h-3 w-3"/>add tile</button>}
          </div>
          <style>{`.pcpsg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}@media(max-width:640px){.pcpsg{grid-template-columns:repeat(2,1fr)}}`}</style>
          <div className="pcpsg">
            {subProjects.map(p=>(
              p.is_locked
                ?<LockedTile key={p.id} title={p.name}/>
                :<ProjectTile key={p.id} project={p} isAdmin={isAdmin} onClick={()=>onSelectSub(p)} onEdit={()=>setEditSub(p)} onHide={()=>hideSub(p)} onDelete={()=>delSub(p)}/>
            ))}
          </div>
          {subProjects.length===0&&isAdmin&&<div className="py-8 text-center text-xs font-mono" style={{color:'#4A4A4A',border:'1px dashed rgba(255,255,255,0.06)',borderRadius:4}}>no sub-projects yet</div>}
        </div>
      )}

      <PostFeed channelId={channel.id} projectId={project.id}/>
      <FloatingActions defaultChannelId={channel.id} defaultProjectId={project.id}/>
      <ProjectModal open={showAddSub} onOpenChange={setShowAddSub} onSaved={()=>{setShowAddSub(false);loadSubs();}} nextSlot={nextSubSlot} parentProjectId={project.id}/>
      <ProjectModal open={!!editSub} onOpenChange={o=>{if(!o)setEditSub(null);}} onSaved={()=>{setEditSub(null);loadSubs();}} existing={editSub} nextSlot={nextSubSlot}/>
    </div>
  );
};

// ── Info & Skills View (plain post feed) ──────────────────────
const InfoSkillsView = ({channel,onBack}:{channel:Channel;onBack:()=>void}) => (
  <div>
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-5 hover:text-primary" style={{color:'#A09890'}}><ArrowLeft className="h-3.5 w-3.5"/>back</button>
    <div className="mb-5 p-5 relative overflow-hidden" style={{background:'linear-gradient(135deg,#1A0F00,#4E2A00,#795548)',borderRadius:0}}>
      <div style={{display:'inline-block',border:'1px solid rgba(245,240,235,0.6)',padding:'4px 12px'}}>
        <span className="text-xl font-bold" style={{color:'#F5F0EB'}}>Information & Skills</span>
      </div>
      <p className="mt-2 text-sm" style={{color:'rgba(245,240,235,0.6)'}}>all posts from the community</p>
    </div>
    <PostFeed channelId={channel.id} projectId={null}/>
    <FloatingActions defaultChannelId={channel.id}/>
  </div>
);

// ── All Projects View ─────────────────────────────────────────
const AllProjectsView = ({channel,isAdmin,onSelectProject,onBack}:{
  channel:Channel;isAdmin:boolean;onSelectProject:(p:ChannelProject)=>void;onBack:()=>void;
}) => {
  const [projects,setProjects]=useState<ChannelProject[]>([]);
  const [showAdd,setShowAdd]=useState(false);
  const [editProject,setEditProject]=useState<ChannelProject|null>(null);

  const load=useCallback(async()=>{
    // Only top-level projects (no parent) and not skills
    const q=isAdmin
      ?supabase.from('channel_projects').select('*').eq('is_active',true).is('parent_project_id',null).order('slot_number')
      :supabase.from('channel_projects').select('*').eq('is_active',true).eq('is_hidden',false).is('parent_project_id',null).order('slot_number');
    const {data}=await q;
    setProjects((data??[]).filter((p:any)=>p.project_type!=='skill'));
  },[isAdmin]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=supabase.channel('pcp_allpv_rt').on('postgres_changes',{event:'*',schema:'public',table:'channel_projects'},load).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[load]);

  const used=projects.map(p=>p.slot_number);
  const nextSlot=Array.from({length:60},(_,i)=>i+1).find(n=>!used.includes(n))??1;
  const hide=async(p:ChannelProject)=>{await supabase.from('channel_projects').update({is_hidden:!p.is_hidden}).eq('id',p.id);toast.success(p.is_hidden?'visible':'hidden');load();};
  const del=async(p:ChannelProject)=>{if(!window.confirm(`Delete "${p.name}" and all its sub-projects and posts?`))return;await cascadeDeleteProject(p.id);toast.success('deleted — all sub-projects and posts removed');load();};

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-5 hover:text-primary" style={{color:'#A09890'}}><ArrowLeft className="h-3.5 w-3.5"/>back</button>
      <h2 className="text-lg font-bold mb-4" style={{color:'#F5F0EB',letterSpacing:'-0.02em'}}>all projects</h2>
      <style>{`.pcpapvg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}@media(max-width:640px){.pcpapvg{grid-template-columns:repeat(2,1fr)}}`}</style>
      <div className="pcpapvg">
        {projects.map(p=>(
          p.is_locked
            ?<LockedTile key={p.id} title={p.name}/>
            :<ProjectTile key={p.id} project={p} isAdmin={isAdmin} onClick={()=>onSelectProject(p)} onEdit={()=>setEditProject(p)} onHide={()=>hide(p)} onDelete={()=>del(p)}/>
        ))}
        {isAdmin&&<AddProjectTile onClick={()=>setShowAdd(true)} nextSlot={nextSlot}/>}
      </div>
      <ProjectModal open={showAdd} onOpenChange={setShowAdd} onSaved={()=>{setShowAdd(false);load();}} nextSlot={nextSlot}/>
      <ProjectModal open={!!editProject} onOpenChange={o=>{if(!o)setEditProject(null);}} onSaved={()=>{setEditProject(null);load();}} existing={editProject} nextSlot={nextSlot}/>
    </div>
  );
};

// ── Hub View (two tiles) ──────────────────────────────────────
const HubView = ({isAdmin,onInfoSkills,onAllProjects}:{isAdmin:boolean;onInfoSkills:()=>void;onAllProjects:()=>void}) => {
  const [projectCount,setProjectCount]=useState(0);
  useEffect(()=>{
    supabase.from('channel_projects').select('*',{count:'exact',head:true}).eq('is_active',true).is('parent_project_id',null).neq('project_type','skill').then(({count})=>setProjectCount(count??0));
  },[]);
  return (
    <div className="space-y-3">
      <HubNavTile title="Information & Skills" subtitle="Community wins, information & resources" gradIdx={19} onClick={onInfoSkills} icon={BookOpen} minHeight={160}/>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{color:'rgba(255,255,255,0.2)'}}>projects we are working on</p>
        <HubNavTile title="All Projects" subtitle={`${projectCount} project${projectCount!==1?'s':''} · click to explore`} gradIdx={4} onClick={onAllProjects} icon={Layers} minHeight={130}/>
      </div>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────
export const ProjectChannelPage = ({channel}:{channel:Channel}) => {
  const {isAdmin}=useAuth();
  type View='hub'|'info-skills'|'all-projects'|'project';
  const [history,setHistory]=useState<View[]>(['hub']);
  const [projectStack,setProjectStack]=useState<ChannelProject[]>([]);
  const view=history[history.length-1];
  const push=(v:View)=>setHistory(h=>[...h,v]);
  const pop=()=>setHistory(h=>h.length>1?h.slice(0,-1):h);

  const enterProject=(p:ChannelProject)=>{setProjectStack([p]);push('project');};
  const enterSubProject=(p:ChannelProject)=>{setProjectStack(s=>[...s,p]);};
  const projectBack=()=>{
    if(projectStack.length>1){setProjectStack(s=>s.slice(0,-1));}
    else{setProjectStack([]);pop();}
  };
  const currentProject=projectStack[projectStack.length-1]??null;
  const parentName=projectStack.length>1?projectStack[projectStack.length-2].name:'all projects';

  if(view==='project'&&currentProject){
    return <ProjectView channel={channel} project={currentProject} onBack={projectBack} onSelectSub={enterSubProject} breadcrumb={parentName}/>;
  }
  if(view==='info-skills') return <InfoSkillsView channel={channel} onBack={pop}/>;
  if(view==='all-projects') return <AllProjectsView channel={channel} isAdmin={isAdmin} onSelectProject={enterProject} onBack={pop}/>;

  return (
    <HubView isAdmin={isAdmin} onInfoSkills={()=>push('info-skills')} onAllProjects={()=>push('all-projects')}/>
  );
};
