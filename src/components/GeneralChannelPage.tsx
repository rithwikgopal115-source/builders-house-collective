/**
 * GeneralChannelPage.tsx — Hub for the resources channel.
 *
 * IMPORTANT: channel_projects has NO channel_id column — it is a global table.
 * All queries on channel_projects must NOT filter by channel_id.
 *
 * Navigation stack:
 *   hub → info-skills → info-flow → expert
 *                     → skills    → skill-detail
 *       → project (direct click)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PostCard, FeedPost } from "@/components/PostCard";
import { FloatingActions } from "@/components/FloatingActions";
import { PostComposer } from "@/components/PostComposer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Eye, EyeOff, Trash2, Pencil, Lock,
  ExternalLink, Github, Twitter, Linkedin, Globe, Youtube,
  X, ChevronDown, ChevronUp, BookOpen, Cpu, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface Channel { id: string; slug: string; name: string; description: string | null; }
interface ChannelProject {
  id: string; slot_number: number; name: string; description: string | null;
  is_active: boolean; is_hidden: boolean; gradient_idx: number | null;
  project_type?: string | null; is_locked?: boolean | null;
  intro_video_url?: string | null; created_at: string;
}
interface Entity {
  id: string; name: string; entity_type: string; bio?: string | null;
  social_links?: Record<string, string> | null; tags?: string[] | null; created_at: string;
}
interface EntityResource {
  id: string; entity_id: string; title?: string | null;
  url: string; resource_type: string; notes?: string | null; created_at: string;
}

// ─── Constants ────────────────────────────────────────────────
const ENTITY_TYPES = ['Company','Founder','Expert','Creator','Builder','Entrepreneur','Programmer','Researcher','Engine'];
const RESOURCE_TYPES = ['YT Video','Google Doc','PDF','Template','GitHub Repo','PRD','Other'];
const RESOURCE_TYPE_MAP: Record<string,string> = {
  'YT Video':'yt_video','Google Doc':'google_doc','PDF':'pdf',
  'Template':'template','GitHub Repo':'github_repo','PRD':'prd','Other':'other',
};
const RESOURCE_TYPE_RMAP: Record<string,string> = Object.fromEntries(
  Object.entries(RESOURCE_TYPE_MAP).map(([k,v])=>[v,k])
);

const GRADIENTS: {base:[string,string,string];hover:[string,string,string];label:string}[] = [
  {base:['#0F2027','#203A43','#2C5364'],hover:['#152D38','#2D5060','#3D7480'],label:'Deep Ocean'},
  {base:['#1a1a2e','#16213e','#0f3460'],hover:['#252545','#1f2f55','#1a4880'],label:'Midnight'},
  {base:['#002B5B','#1A4C8B','#2176AE'],hover:['#003F7F','#2060A0','#2E8ABE'],label:'Cobalt'},
  {base:['#4B0000','#7B1A1A','#B22B2B'],hover:['#650000','#922020','#C83535'],label:'Crimson'},
  {base:['#2A0A00','#6B2A00','#BF360C'],hover:['#3F1500','#7F3A00','#D4430F'],label:'Rust'},
  {base:['#2A1200','#7A3B00','#E67E22'],hover:['#3F1C00','#8F4A00','#F08A30'],label:'Amber'},
  {base:['#3A1A00','#8A5A00','#C49A00'],hover:['#4F2500','#9F6A00','#D4AA10'],label:'Gold'},
  {base:['#0A2A1A','#1A5C3A','#27AE60'],hover:['#102F1F','#207050','#35C070'],label:'Emerald'},
  {base:['#001A05','#00400D','#1B5E20'],hover:['#002508','#005015','#22752A'],label:'Forest'},
  {base:['#0A2A20','#1A5A40','#16A085'],hover:['#102F25','#207050','#1AB09A'],label:'Teal'},
  {base:['#001A1A','#004D4D','#00796B'],hover:['#002525','#006060','#009080'],label:'Dark Teal'},
  {base:['#0A2A15','#1B5E20','#388E3C'],hover:['#102F1A','#22752A','#45A050'],label:'Jade'},
  {base:['#1A0A3A','#4A1A8A','#8E44AD'],hover:['#250F4F','#5A22A0','#9E54BD'],label:'Violet'},
  {base:['#1A0A2A','#4A0A5A','#9B59B6'],hover:['#250F3F','#5A1070','#AB69C6'],label:'Amethyst'},
  {base:['#0A0A2A','#1A1A6A','#2980B9'],hover:['#0F0F3F','#222280','#3590C9'],label:'Indigo'},
  {base:['#1A0A2A','#4527A0','#7E57C2'],hover:['#250F3F','#5532B0','#8E67D2'],label:'Lavender'},
  {base:['#1A002A','#4A006A','#AD1457'],hover:['#250039','#5A0080','#BD2467'],label:'Magenta'},
  {base:['#1A0A15','#4A0020','#880E4F'],hover:['#250F1F','#5A0030','#980E5F'],label:'Wine'},
  {base:['#1A0000','#4A0010','#C62828'],hover:['#250000','#5A0018','#D63838'],label:'Crimson Lake'},
  {base:['#1A0F00','#4E2A00','#795548'],hover:['#251500','#5E3A00','#896558'],label:'Bronze'},
  {base:['#050A1A','#0D1B3E','#311B92'],hover:['#0A1025','#122655','#4128A2'],label:'Nebula'},
  {base:['#050505','#111827','#1f2937'],hover:['#0a0a0a','#181f2f','#252e3f'],label:'Void'},
  {base:['#0a0f1e','#1a2547','#2d4a8a'],hover:['#101525','#222f57','#3d5a9a'],label:'Sapphire'},
  {base:['#1a0a0f','#4a1525','#8B2252'],hover:['#250f15','#5a1f35','#9B3262'],label:'Garnet'},
  {base:['#0a1a15','#154a35','#1e7a54'],hover:['#101f1a','#1f5a45','#2e8a64'],label:'Malachite'},
  {base:['#1a0f0a','#4a2510','#8B5530'],hover:['#251510','#5a3020','#9B6540'],label:'Copper'},
  {base:['#0a0f1a','#1a2540','#2a4070'],hover:['#0f1525','#222f50','#3a5080'],label:'Steel'},
  {base:['#1a0a0a','#3a1515','#6B2525'],hover:['#251010','#4a1f1f','#7B3535'],label:'Mahogany'},
  {base:['#0a1a0a','#1a3a1a','#2d5e2d'],hover:['#101f10','#224a22','#3d6e3d'],label:'Bottle Green'},
  {base:['#0f0f1a','#1a1a2e','#252545'],hover:['#151520','#22223a','#303060'],label:'Dark Matter'},
];

const gradientCss = (c:[string,string,string], deg=135) =>
  `linear-gradient(${deg}deg,${c[0]} 0%,${c[1]} 50%,${c[2]} 100%)`;

const getTextColor = (idx: number) => {
  const hex = GRADIENTS[idx]?.base[1] ?? '#0D0D0D';
  const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const toL=(c:number)=>c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);
  return (0.2126*toL(r)+0.7152*toL(g)+0.0722*toL(b))>0.179?'#0D0D0D':'#F5F0EB';
};

// ─── GradientPicker ───────────────────────────────────────────
const GradientPicker = ({value,onChange}:{value:number;onChange:(i:number)=>void}) => (
  <div>
    <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{color:'#8A8480'}}>tile colour</p>
    <div className="flex flex-wrap gap-1.5">
      {GRADIENTS.map((g,i)=>(
        <button key={i} title={g.label} onClick={()=>onChange(i)} style={{
          width:28,height:28,background:gradientCss(g.base),borderRadius:4,
          border:value===i?'2px solid #E8734A':'2px solid transparent',
          outline:value===i?'1px solid rgba(232,115,74,0.4)':'none',
        }}/>
      ))}
    </div>
  </div>
);

// ─── LockedTile ───────────────────────────────────────────────
const LockedTile = ({title}:{title:string}) => (
  <div className="relative overflow-hidden flex flex-col items-center justify-center gap-3"
    style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.06)',borderRadius:0,minHeight:130,opacity:0.65,cursor:'not-allowed'}}>
    <Lock className="h-6 w-6" style={{color:'rgba(255,255,255,0.2)'}}/>
    <div className="text-center px-4">
      <p className="text-xs font-bold" style={{color:'#F5F0EB'}}>{title}</p>
      <p className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{color:'#E8734A'}}>coming soon</p>
    </div>
  </div>
);

// ─── HubNavTile ───────────────────────────────────────────────
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

// ─── ProjectTile ──────────────────────────────────────────────
const ProjectTile = ({project,isAdmin,onClick,onEdit,onHide,onDelete,style}:{
  project:ChannelProject;isAdmin:boolean;onClick:()=>void;
  onEdit:()=>void;onHide:()=>void;onDelete:()=>void;style?:React.CSSProperties;
}) => {
  const [hov,setHov]=useState(false);
  const idx=Math.min((project.gradient_idx??project.slot_number-1),29);
  const g=GRADIENTS[idx];const tc=getTextColor(idx);
  return (
    <div className="relative overflow-hidden" style={{borderRadius:0,minHeight:130,...style}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{position:'absolute',inset:0,background:gradientCss(g.base)}}/>
      <div style={{position:'absolute',inset:0,background:gradientCss(g.hover,160),opacity:hov?1:0,transition:'opacity 0.4s',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-12,right:6,fontSize:'7rem',fontWeight:900,color:'#FFF',opacity:0.07,lineHeight:1,pointerEvents:'none',userSelect:'none',letterSpacing:'-0.05em'}}>
        {project.slot_number}
      </div>
      <button onClick={onClick} className="absolute inset-0 z-10 text-left p-4 flex flex-col justify-end">
        <div style={{display:'inline-block',border:`1px solid ${tc}`,padding:'3px 10px'}}>
          <span style={{color:tc,fontSize:13,fontWeight:700}}>{project.name}</span>
        </div>
        {project.description&&<p className="text-[11px] mt-1" style={{color:`${tc}88`}}>{project.description}</p>}
      </button>
      {isAdmin&&hov&&(
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

// ─── AddProjectTile ───────────────────────────────────────────
const AddProjectTile = ({onClick,nextSlot,style}:{onClick:()=>void;nextSlot:number;style?:React.CSSProperties}) => {
  const [hov,setHov]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className="relative overflow-hidden flex flex-col items-center justify-center gap-2"
      style={{background:hov?'rgba(232,115,74,0.08)':'rgba(255,255,255,0.02)',border:`1px dashed ${hov?'rgba(232,115,74,0.6)':'rgba(255,255,255,0.12)'}`,borderRadius:0,minHeight:130,transition:'all 0.25s',...style}}>
      <div style={{position:'absolute',bottom:-12,right:6,fontSize:'7rem',fontWeight:900,color:'#FFF',opacity:0.04,lineHeight:1,userSelect:'none',letterSpacing:'-0.05em'}}>{nextSlot}</div>
      <div className="relative z-10 h-9 w-9 rounded-full flex items-center justify-center" style={{background:hov?'#E8734A':'rgba(255,255,255,0.08)',transition:'background 0.25s'}}>
        <Plus className="h-5 w-5" style={{color:hov?'#0D0D0D':'#A09890'}}/>
      </div>
      <span className="relative z-10 text-[10px] font-mono uppercase tracking-wider" style={{color:hov?'#E8734A':'#6A6460'}}>new project</span>
    </button>
  );
};

// ─── ProjectModal ─────────────────────────────────────────────
// NOTE: NO channel_id — channel_projects is a global table with no channel_id column
const ProjectModal = ({open,onOpenChange,onSaved,existing,nextSlot,defaultType='project',parentProjectId}:{
  open:boolean;onOpenChange:(o:boolean)=>void;onSaved:()=>void;
  existing?:ChannelProject|null;nextSlot:number;defaultType?:string;parentProjectId?:string;
}) => {
  const {user}=useAuth();
  const isEdit=!!existing;
  const [name,setName]=useState('');
  const [desc,setDesc]=useState('');
  const [gradIdx,setGradIdx]=useState(0);
  const [projType,setProjType]=useState(defaultType);
  const [isLocked,setIsLocked]=useState(false);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(existing){
      setName(existing.name);setDesc(existing.description??'');
      setGradIdx(existing.gradient_idx??Math.min(existing.slot_number-1,29));
      setProjType(existing.project_type??'project');setIsLocked(!!existing.is_locked);
    } else {
      setName('');setDesc('');setGradIdx(Math.min(nextSlot-1,29));
      setProjType(defaultType);setIsLocked(false);
    }
  },[existing,open,nextSlot,defaultType]);

  const save=async()=>{
    if(!name.trim()){toast.error('give it a name');return;}
    setBusy(true);
    let error;
    if(isEdit&&existing){
      ({error}=await supabase.from('channel_projects').update({
        name:name.trim(),description:desc.trim()||null,gradient_idx:gradIdx,
        project_type:projType,is_locked:isLocked,
      }).eq('id',existing.id));
    } else {
      // No channel_id, no created_by — channel_projects is global
      ({error}=await supabase.from('channel_projects').insert({
        slot_number:nextSlot,name:name.trim(),description:desc.trim()||null,
        gradient_idx:gradIdx,project_type:projType,is_locked:isLocked,
        is_active:true,is_hidden:false,
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
            {isEdit?'edit':'new'} {projType==='skill'?'skill':'project'}{!isEdit&&` — slot ${nextSlot}`}
          </DialogTitle>
        </DialogHeader>
        <div className="relative overflow-hidden flex items-end p-4 mb-1" style={{background:gradientCss(prev.base),borderRadius:8,height:80}}>
          <div style={{position:'absolute',bottom:-8,right:4,fontSize:'4rem',fontWeight:900,color:'#fff',opacity:0.08,lineHeight:1,userSelect:'none'}}>{isEdit?existing?.slot_number:nextSlot}</div>
          <div className="relative z-10" style={{border:`1px solid ${tc}`,padding:'2px 8px'}}>
            <span className="text-sm font-bold" style={{color:tc}}>{name||'Name'}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{color:'#8A8480'}}>type</p>
            <div className="flex gap-2 flex-wrap">
              {['project','skill'].map(t=>(
                <button key={t} onClick={()=>setProjType(t)} className="font-mono text-xs px-3 py-1.5 rounded" style={{background:projType===t?'#E8734A':'#1E1E1E',color:projType===t?'#0D0D0D':'#A09890',border:`1px solid ${projType===t?'#E8734A':'rgba(255,255,255,0.08)'}`}}>{t}</button>
              ))}
              <label className="flex items-center gap-1.5 text-xs font-mono ml-2 cursor-pointer" style={{color:'#A09890'}}>
                <input type="checkbox" checked={isLocked} onChange={e=>setIsLocked(e.target.checked)}/> coming soon
              </label>
            </div>
          </div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" maxLength={60} autoFocus onKeyDown={e=>e.key==='Enter'&&save()}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Short description (optional)" rows={2} maxLength={200}
            className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
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

// ─── PostFeed ─────────────────────────────────────────────────
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
    const ch=supabase.channel(`gcpf:${channelId}:${String(projectId)}`)
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

// ─── ProjectView ──────────────────────────────────────────────
// Shows project header + sub-project tiles + post feed.
// Clicking a sub-tile drills into that sub-project's feed.
const ProjectView = ({channel,project,onBack}:{channel:Channel;project:ChannelProject;onBack:()=>void}) => {
  const {isAdmin}=useAuth();
  const idx=Math.min((project.gradient_idx??project.slot_number-1),29);
  const g=GRADIENTS[idx];const tc=getTextColor(idx);
  const [videoCollapsed,setVideoCollapsed]=useState(false);
  const [subProjects,setSubProjects]=useState<ChannelProject[]>([]);
  const [activeSub,setActiveSub]=useState<ChannelProject|null>(null);
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
  const delSub=async(p:ChannelProject)=>{if(!window.confirm(`Delete "${p.name}"?`))return;await supabase.from('channel_projects').update({is_active:false}).eq('id',p.id);loadSubs();};

  // ── Sub-project feed view ──
  if(activeSub){
    const si=Math.min((activeSub.gradient_idx??activeSub.slot_number-1),29);
    const sg=GRADIENTS[si];const stc=getTextColor(si);
    return (
      <div>
        <button onClick={()=>setActiveSub(null)} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 hover:text-primary" style={{color:'#A09890'}}>
          <ArrowLeft className="h-3.5 w-3.5"/>{project.name}
        </button>
        <div className="mb-5 p-4 relative overflow-hidden" style={{background:gradientCss(sg.base),borderRadius:0}}>
          <div style={{position:'absolute',bottom:-8,right:6,fontSize:'5rem',fontWeight:900,color:'#FFF',opacity:0.07,lineHeight:1,userSelect:'none',letterSpacing:'-0.05em'}}>{activeSub.slot_number}</div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{color:`${stc}66`}}>{project.name.toLowerCase()} · sub-project</p>
          <div style={{display:'inline-block',border:`1px solid ${stc}`,padding:'3px 10px'}}>
            <span className="text-lg font-bold" style={{color:stc}}>{activeSub.name}</span>
          </div>
          {activeSub.description&&<p className="mt-1.5 text-xs" style={{color:`${stc}99`}}>{activeSub.description}</p>}
        </div>
        <PostFeed channelId={channel.id} projectId={activeSub.id}/>
        <FloatingActions defaultChannelId={channel.id} defaultProjectId={activeSub.id}/>
      </div>
    );
  }

  // ── Main project view ──
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-4 hover:text-primary" style={{color:'#A09890'}}>
        <ArrowLeft className="h-3.5 w-3.5"/>back
      </button>

      {/* Project header */}
      <div className="mb-5 p-5 relative overflow-hidden" style={{background:gradientCss(g.base),borderRadius:0}}>
        <div style={{position:'absolute',bottom:-10,right:8,fontSize:'6rem',fontWeight:900,color:'#FFF',opacity:0.07,lineHeight:1,userSelect:'none',letterSpacing:'-0.05em'}}>{project.slot_number}</div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{color:`${tc}66`}}>{channel.name.toLowerCase()}</p>
        <div style={{display:'inline-block',border:`1px solid ${tc}`,padding:'4px 12px'}}>
          <span className="text-xl font-bold" style={{color:tc}}>{project.name}</span>
        </div>
        {project.description&&<p className="mt-2 text-sm" style={{color:`${tc}99`}}>{project.description}</p>}
      </div>

      {/* Intro video */}
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

      {/* Sub-project tiles */}
      {(subProjects.length>0||isAdmin)&&(
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{color:'rgba(255,255,255,0.25)'}}>sub-projects</p>
            {isAdmin&&(
              <button onClick={()=>setShowAddSub(true)} className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider hover:opacity-80" style={{color:'#E8734A'}}>
                <Plus className="h-3 w-3"/>add tile
              </button>
            )}
          </div>
          <style>{`.subpg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}@media(max-width:640px){.subpg{grid-template-columns:repeat(2,1fr)}}`}</style>
          <div className="subpg">
            {subProjects.map(p=>(
              p.is_locked
                ?<LockedTile key={p.id} title={p.name}/>
                :<ProjectTile key={p.id} project={p} isAdmin={isAdmin} onClick={()=>setActiveSub(p)} onEdit={()=>setEditSub(p)} onHide={()=>hideSub(p)} onDelete={()=>delSub(p)}/>
            ))}
          </div>
          {subProjects.length===0&&isAdmin&&(
            <div className="py-8 text-center text-xs font-mono" style={{color:'#4A4A4A',border:'1px dashed rgba(255,255,255,0.06)',borderRadius:4}}>
              no sub-projects yet — click add tile above
            </div>
          )}
        </div>
      )}

      {/* Posts */}
      <PostFeed channelId={channel.id} projectId={project.id}/>
      <FloatingActions defaultChannelId={channel.id} defaultProjectId={project.id}/>

      <ProjectModal open={showAddSub} onOpenChange={setShowAddSub}
        onSaved={()=>{setShowAddSub(false);loadSubs();}}
        nextSlot={nextSubSlot} defaultType="project" parentProjectId={project.id}/>
      <ProjectModal open={!!editSub} onOpenChange={o=>{if(!o)setEditSub(null);}}
        onSaved={()=>{setEditSub(null);loadSubs();}} existing={editSub} nextSlot={nextSubSlot}/>
    </div>
  );
};

const extractYtId=(url:string)=>{
  try{const u=new URL(url);if(u.hostname.includes('youtu.be'))return u.pathname.slice(1);return u.searchParams.get('v')??'';}catch{return '';}
};

// ─── Expert Directory ─────────────────────────────────────────
const SOCIAL_ICONS: Record<string,any>={twitter:Twitter,linkedin:Linkedin,github:Github,website:Globe,youtube:Youtube};

const AddEntityResourceModal = ({entityId,open,onOpenChange,onSaved}:{entityId:string;open:boolean;onOpenChange:(o:boolean)=>void;onSaved:()=>void}) => {
  const {user}=useAuth();
  const [title,setTitle]=useState('');const [url,setUrl]=useState('');
  const [rtype,setRtype]=useState('YT Video');const [notes,setNotes]=useState('');const [busy,setBusy]=useState(false);
  const save=async()=>{
    if(!url.trim()){toast.error('url required');return;}
    setBusy(true);
    const {error}=await supabase.from('entity_resources').insert({entity_id:entityId,title:title.trim()||null,url:url.trim(),resource_type:RESOURCE_TYPE_MAP[rtype]??'other',notes:notes.trim()||null,created_by:user?.id});
    setBusy(false);
    if(error){toast.error(error.message);return;}
    toast.success('resource added');setTitle('');setUrl('');setNotes('');setRtype('YT Video');onOpenChange(false);onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 max-w-md" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16}}>
        <DialogHeader><DialogTitle className="font-medium" style={{color:'#F5F0EB'}}>add resource</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title (optional)" className="w-full px-3 py-2.5 text-sm focus:outline-none" style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL *" className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none" style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <div className="flex flex-wrap gap-1.5">
            {RESOURCE_TYPES.map(t=>(
              <button key={t} onClick={()=>setRtype(t)} className="text-xs font-mono px-2.5 py-1 rounded-full" style={{background:rtype===t?'#E8734A':'#1E1E1E',color:rtype===t?'#0D0D0D':'#A09890',border:`1px solid ${rtype===t?'#E8734A':'rgba(255,255,255,0.08)'}`}}>{t}</button>
            ))}
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none" style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>onOpenChange(false)} style={{color:'#A09890'}}>cancel</Button>
            <Button onClick={save} disabled={busy}>{busy?'adding…':'add resource'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AddEntityModal = ({open,onOpenChange,onSaved,existing}:{open:boolean;onOpenChange:(o:boolean)=>void;onSaved:()=>void;existing?:Entity|null}) => {
  const {user}=useAuth();
  const isEdit=!!existing;
  const [name,setName]=useState('');const [etype,setEtype]=useState('Builder');const [bio,setBio]=useState('');
  const [twitter,setTwitter]=useState('');const [linkedin,setLinkedin]=useState('');
  const [github,setGithub]=useState('');const [website,setWebsite]=useState('');const [youtube,setYoutube]=useState('');
  const [tags,setTags]=useState('');const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(existing){
      setName(existing.name);setEtype(existing.entity_type);setBio(existing.bio??'');
      const sl=existing.social_links??{};
      setTwitter(sl.twitter??'');setLinkedin(sl.linkedin??'');setGithub(sl.github??'');setWebsite(sl.website??'');setYoutube(sl.youtube??'');
      setTags((existing.tags??[]).join(', '));
    } else {setName('');setEtype('Builder');setBio('');setTwitter('');setLinkedin('');setGithub('');setWebsite('');setYoutube('');setTags('');}
  },[existing,open]);

  const save=async()=>{
    if(!name.trim()){toast.error('name required');return;}
    setBusy(true);
    const payload={
      name:name.trim(),entity_type:etype,bio:bio.trim()||null,
      social_links:{twitter:twitter.trim()||undefined,linkedin:linkedin.trim()||undefined,github:github.trim()||undefined,website:website.trim()||undefined,youtube:youtube.trim()||undefined},
      tags:tags.split(',').map(t=>t.trim()).filter(Boolean),
    };
    let error;
    if(isEdit&&existing){({error}=await supabase.from('entities').update(payload).eq('id',existing.id));}
    else{({error}=await supabase.from('entities').insert({...payload,created_by:user?.id}));}
    setBusy(false);
    if(error){toast.error(error.message);return;}
    toast.success(isEdit?'updated':'entity added');onOpenChange(false);onSaved();
  };

  const Row=({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string})=>(
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono w-16 flex-shrink-0 text-right" style={{color:'#6A6460'}}>{label}</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="flex-1 px-3 py-2 text-xs font-mono focus:outline-none" style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.06)',color:'#F5F0EB',borderRadius:6}}/>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 max-w-md max-h-[90vh] overflow-y-auto" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16}}>
        <DialogHeader><DialogTitle className="font-medium" style={{color:'#F5F0EB'}}>{isEdit?'edit entity':'add entity'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name *" autoFocus className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{color:'#8A8480'}}>type</p>
            <div className="flex flex-wrap gap-1.5">
              {ENTITY_TYPES.map(t=>(
                <button key={t} onClick={()=>setEtype(t)} className="text-xs font-mono px-2.5 py-1 rounded-full" style={{background:etype===t?'#E8734A':'#1E1E1E',color:etype===t?'#0D0D0D':'#A09890',border:`1px solid ${etype===t?'#E8734A':'rgba(255,255,255,0.08)'}`}}>{t}</button>
              ))}
            </div>
          </div>
          <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Bio (optional)" rows={2} className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none" style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider" style={{color:'#8A8480'}}>social links</p>
            <Row label="twitter" value={twitter} onChange={setTwitter} placeholder="@handle or URL"/>
            <Row label="linkedin" value={linkedin} onChange={setLinkedin} placeholder="profile URL"/>
            <Row label="github" value={github} onChange={setGithub} placeholder="@username"/>
            <Row label="website" value={website} onChange={setWebsite} placeholder="https://"/>
            <Row label="youtube" value={youtube} onChange={setYoutube} placeholder="channel URL"/>
          </div>
          <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Tags (comma separated)" className="w-full px-3 py-2.5 text-sm focus:outline-none" style={{background:'#0D0D0D',border:'1px solid rgba(255,255,255,0.08)',color:'#F5F0EB',borderRadius:8}}/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>onOpenChange(false)} style={{color:'#A09890'}}>cancel</Button>
            <Button onClick={save} disabled={busy}>{busy?'saving…':(isEdit?'save changes':'add entity')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EntityCard = ({entity,resources,isAdmin,onEdit,onDelete,onAddResource,onDeleteResource}:{
  entity:Entity;resources:EntityResource[];isAdmin:boolean;
  onEdit:()=>void;onDelete:()=>void;onAddResource:()=>void;onDeleteResource:(id:string)=>void;
}) => {
  const [expanded,setExpanded]=useState(false);
  const sl=entity.social_links??{};
  return (
    <div className="overflow-hidden" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8}}>
      <div className="flex">
        <div className="flex-1 min-w-0 p-4" style={{borderRight:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-bold" style={{color:'#F5F0EB'}}>{entity.name}</p>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5" style={{background:'rgba(232,115,74,0.12)',color:'#E8734A'}}>{entity.entity_type}</span>
            </div>
            {isAdmin&&(
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={onEdit} className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10" style={{color:'#A09890'}}><Pencil className="h-3 w-3"/></button>
                <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-500/20" style={{color:'#A09890'}}><Trash2 className="h-3 w-3"/></button>
              </div>
            )}
          </div>
          {entity.bio&&<p className="text-xs mb-2 line-clamp-2" style={{color:'#8A8480'}}>{entity.bio}</p>}
          {(entity.tags??[]).length>0&&(
            <div className="flex flex-wrap gap-1 mb-2">
              {(entity.tags??[]).map(t=><span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(255,255,255,0.05)',color:'#8A8480'}}>{t}</span>)}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(sl).filter(([,v])=>v).map(([k,v])=>{const Icon=SOCIAL_ICONS[k]??Globe;return(
              <a key={k} href={String(v).startsWith('http')?String(v):`https://twitter.com/${String(v).replace('@','')}`} target="_blank" rel="noreferrer" className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10" style={{color:'#A09890'}} title={k}>
                <Icon className="h-3.5 w-3.5"/>
              </a>
            );})}
          </div>
        </div>
        <div className="w-52 flex-shrink-0 p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{color:'#6A6460'}}>resources</p>
          <div className="space-y-1.5">
            {resources.slice(0,expanded?undefined:3).map(r=>(
              <div key={r.id} className="flex items-center gap-1.5 group/res">
                <a href={r.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 flex items-center gap-1.5 hover:opacity-80">
                  <ExternalLink className="h-3 w-3 flex-shrink-0" style={{color:'#E8734A'}}/>
                  <span className="text-xs truncate" style={{color:'#F5F0EB'}}>{r.title||r.url}</span>
                  <span className="text-[9px] font-mono flex-shrink-0" style={{color:'#6A6460'}}>{RESOURCE_TYPE_RMAP[r.resource_type]??r.resource_type}</span>
                </a>
                {isAdmin&&<button onClick={()=>onDeleteResource(r.id)} className="h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover/res:opacity-100 hover:bg-red-500/20" style={{color:'#A09890'}}><X className="h-2.5 w-2.5"/></button>}
              </div>
            ))}
            {resources.length>3&&<button onClick={()=>setExpanded(e=>!e)} className="text-[10px] font-mono" style={{color:'#6A6460'}}>{expanded?'show less':'+ '+(resources.length-3)+' more'}</button>}
            {!resources.length&&<p className="text-[10px] font-mono" style={{color:'#4A4A4A'}}>no resources yet</p>}
          </div>
          {isAdmin&&<button onClick={onAddResource} className="mt-2 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 hover:opacity-80" style={{color:'#E8734A'}}><Plus className="h-3 w-3"/>add</button>}
        </div>
      </div>
    </div>
  );
};

const ExpertDirectoryView = ({onBack}:{onBack:()=>void}) => {
  const {isAdmin}=useAuth();
  const [entities,setEntities]=useState<Entity[]>([]);
  const [resources,setResources]=useState<EntityResource[]>([]);
  const [typeFilter,setTypeFilter]=useState('');
  const [rtypeFilter,setRtypeFilter]=useState('');
  const [addOpen,setAddOpen]=useState(false);
  const [editEntity,setEditEntity]=useState<Entity|null>(null);
  const [addResEntityId,setAddResEntityId]=useState<string|null>(null);

  const load=useCallback(async()=>{
    const [{data:e},{data:r}]=await Promise.all([
      supabase.from('entities').select('*').order('display_order').order('created_at'),
      supabase.from('entity_resources').select('*').order('created_at'),
    ]);
    setEntities(e??[]);setResources(r??[]);
  },[]);
  useEffect(()=>{load();},[load]);

  const deleteEntity=async(id:string)=>{
    if(!window.confirm('delete entity?'))return;
    await supabase.from('entities').delete().eq('id',id);
    toast.success('deleted');load();
  };
  const deleteResource=async(id:string)=>{
    await supabase.from('entity_resources').delete().eq('id',id);load();
  };

  const filtered=entities.filter(e=>{
    if(typeFilter&&e.entity_type!==typeFilter)return false;
    if(rtypeFilter){const er=resources.filter(r=>r.entity_id===e.id);if(!er.some(r=>RESOURCE_TYPE_RMAP[r.resource_type]===rtypeFilter))return false;}
    return true;
  });

  const Pill=({label,active,onClick}:{label:string;active:boolean;onClick:()=>void})=>(
    <button onClick={onClick} className="text-xs font-mono px-2.5 py-1 rounded-full" style={{background:active?'#E8734A':'#1E1E1E',color:active?'#0D0D0D':'#A09890',border:`1px solid ${active?'#E8734A':'rgba(255,255,255,0.08)'}`}}>{label}</button>
  );

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-5 hover:text-primary" style={{color:'#A09890'}}><ArrowLeft className="h-3.5 w-3.5"/>back</button>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{color:'#F5F0EB',letterSpacing:'-0.02em'}}>expert's judgement</h2>
        {isAdmin&&<Button onClick={()=>setAddOpen(true)} className="h-8 text-xs px-3">+ add entity</Button>}
      </div>
      <div className="space-y-2 mb-5">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-mono uppercase mr-1" style={{color:'#6A6460'}}>type</span>
          <Pill label="all" active={!typeFilter} onClick={()=>setTypeFilter('')}/>
          {ENTITY_TYPES.map(t=><Pill key={t} label={t} active={typeFilter===t} onClick={()=>setTypeFilter(typeFilter===t?'':t)}/>)}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-mono uppercase mr-1" style={{color:'#6A6460'}}>content</span>
          <Pill label="all" active={!rtypeFilter} onClick={()=>setRtypeFilter('')}/>
          {RESOURCE_TYPES.map(t=><Pill key={t} label={t} active={rtypeFilter===t} onClick={()=>setRtypeFilter(rtypeFilter===t?'':t)}/>)}
        </div>
      </div>
      {!filtered.length&&<div className="py-16 text-center text-sm font-mono" style={{color:'#4A4A4A'}}>{isAdmin?'no entities yet — add the first one above':'no entities yet.'}</div>}
      <div className="space-y-3">
        {filtered.map(e=>(
          <EntityCard key={e.id} entity={e} resources={resources.filter(r=>r.entity_id===e.id)} isAdmin={isAdmin}
            onEdit={()=>setEditEntity(e)} onDelete={()=>deleteEntity(e.id)}
            onAddResource={()=>setAddResEntityId(e.id)} onDeleteResource={deleteResource}/>
        ))}
      </div>
      <AddEntityModal open={addOpen||!!editEntity} onOpenChange={o=>{if(!o){setAddOpen(false);setEditEntity(null);}}} onSaved={load} existing={editEntity}/>
      {addResEntityId&&<AddEntityResourceModal entityId={addResEntityId} open={true} onOpenChange={o=>{if(!o)setAddResEntityId(null);}} onSaved={load}/>}
    </div>
  );
};

// ─── Skills View ──────────────────────────────────────────────
// NOTE: no channel_id filter — channel_projects is global
const SkillsView = ({channel,isAdmin,onSelectSkill,onBack}:{channel:Channel;isAdmin:boolean;onSelectSkill:(p:ChannelProject)=>void;onBack:()=>void}) => {
  const [skills,setSkills]=useState<ChannelProject[]>([]);
  const [showAdd,setShowAdd]=useState(false);
  const [editSkill,setEditSkill]=useState<ChannelProject|null>(null);

  const load=useCallback(async()=>{
    const q=isAdmin
      ?supabase.from('channel_projects').select('*').eq('is_active',true).eq('project_type','skill').order('slot_number')
      :supabase.from('channel_projects').select('*').eq('is_active',true).eq('is_hidden',false).eq('project_type','skill').order('slot_number');
    const {data}=await q;setSkills(data??[]);
  },[isAdmin]);
  useEffect(()=>{load();},[load]);

  const used=skills.map(p=>p.slot_number);
  const nextSlot=Array.from({length:60},(_,i)=>i+1).find(n=>!used.includes(n))??1;
  const hide=async(p:ChannelProject)=>{await supabase.from('channel_projects').update({is_hidden:!p.is_hidden}).eq('id',p.id);toast.success(p.is_hidden?'visible':'hidden');load();};
  const del=async(p:ChannelProject)=>{if(!window.confirm(`Delete "${p.name}"?`))return;await supabase.from('channel_projects').update({is_active:false}).eq('id',p.id);toast.success('removed');load();};

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-5 hover:text-primary" style={{color:'#A09890'}}><ArrowLeft className="h-3.5 w-3.5"/>back</button>
      <h2 className="text-lg font-bold mb-4" style={{color:'#F5F0EB',letterSpacing:'-0.02em'}}>skill acquisition</h2>
      {!skills.length&&!isAdmin&&<div className="py-12 text-center text-sm font-mono" style={{color:'#4A4A4A'}}>no skills added yet.</div>}
      <style>{`.skg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}@media(max-width:640px){.skg{grid-template-columns:repeat(2,1fr)}}`}</style>
      <div className="skg">
        {skills.map(p=>(
          p.is_locked
            ?<LockedTile key={p.id} title={p.name}/>
            :<ProjectTile key={p.id} project={p} isAdmin={isAdmin} onClick={()=>onSelectSkill(p)} onEdit={()=>setEditSkill(p)} onHide={()=>hide(p)} onDelete={()=>del(p)}/>
        ))}
        {isAdmin&&<AddProjectTile onClick={()=>setShowAdd(true)} nextSlot={nextSlot}/>}
      </div>
      <ProjectModal open={showAdd} onOpenChange={setShowAdd} onSaved={()=>{setShowAdd(false);load();}} nextSlot={nextSlot} defaultType="skill"/>
      <ProjectModal open={!!editSkill} onOpenChange={o=>{if(!o)setEditSkill(null);}} onSaved={()=>{setEditSkill(null);load();}} existing={editSkill} nextSlot={nextSlot}/>
    </div>
  );
};

// ─── Info Flow View ───────────────────────────────────────────
const InfoFlowView = ({onExpertDir,onBack}:{onExpertDir:()=>void;onBack:()=>void}) => (
  <div>
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-5 hover:text-primary" style={{color:'#A09890'}}><ArrowLeft className="h-3.5 w-3.5"/>back</button>
    <h2 className="text-lg font-bold mb-5" style={{color:'#F5F0EB',letterSpacing:'-0.02em'}}>information inflow</h2>
    <style>{`.iflg{display:grid;grid-template-columns:repeat(2,1fr);gap:3px}@media(max-width:480px){.iflg{grid-template-columns:1fr}}`}</style>
    <div className="iflg">
      <LockedTile title="Market Analysis AI Agent"/>
      <HubNavTile title="Expert's Judgement" subtitle="Curated directory of builders, founders & experts" gradIdx={7} onClick={onExpertDir} icon={BookOpen} minHeight={160}/>
    </div>
  </div>
);

// ─── Info & Skills View ───────────────────────────────────────
const InfoSkillsView = ({channel,isAdmin,onInfoFlow,onSkillsEnter,onBack,onSelectSkill}:{
  channel:Channel;isAdmin:boolean;onInfoFlow:()=>void;onSkillsEnter:()=>void;onBack:()=>void;onSelectSkill:(p:ChannelProject)=>void;
}) => (
  <div>
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-5 hover:text-primary" style={{color:'#A09890'}}><ArrowLeft className="h-3.5 w-3.5"/>back</button>
    <h2 className="text-lg font-bold mb-5" style={{color:'#F5F0EB',letterSpacing:'-0.02em'}}>information & skills</h2>
    <style>{`.isg{display:grid;grid-template-columns:repeat(2,1fr);gap:3px}@media(max-width:480px){.isg{grid-template-columns:1fr}}`}</style>
    <div className="isg">
      <HubNavTile title="Information Inflow" subtitle="Market intelligence & expert insights" gradIdx={2} onClick={onInfoFlow} icon={Layers} minHeight={200}/>
      <HubNavTile title="Skill Acquisition" subtitle="10,000 hours — AI foundations to advanced tooling" gradIdx={12} onClick={onSkillsEnter} icon={Cpu} minHeight={200}/>
    </div>
  </div>
);

// ─── All Projects View ────────────────────────────────────────
const AllProjectsView = ({channel,isAdmin,onSelectProject,onBack}:{
  channel:Channel;isAdmin:boolean;onSelectProject:(p:ChannelProject)=>void;onBack:()=>void;
}) => {
  const [projects,setProjects]=useState<ChannelProject[]>([]);
  const [showAdd,setShowAdd]=useState(false);
  const [editProject,setEditProject]=useState<ChannelProject|null>(null);

  const load=useCallback(async()=>{
    const q=isAdmin
      ?supabase.from('channel_projects').select('*').eq('is_active',true).order('slot_number')
      :supabase.from('channel_projects').select('*').eq('is_active',true).eq('is_hidden',false).order('slot_number');
    const {data}=await q;
    setProjects((data??[]).filter((p:ChannelProject)=>p.project_type!=='skill'));
  },[isAdmin]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=supabase.channel('allpv_cp_rt').on('postgres_changes',{event:'*',schema:'public',table:'channel_projects'},load).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[load]);

  const used=projects.map(p=>p.slot_number);
  const nextSlot=Array.from({length:60},(_,i)=>i+1).find(n=>!used.includes(n))??1;
  const hide=async(p:ChannelProject)=>{await supabase.from('channel_projects').update({is_hidden:!p.is_hidden}).eq('id',p.id);toast.success(p.is_hidden?'visible':'hidden');load();};
  const del=async(p:ChannelProject)=>{if(!window.confirm(`Delete "${p.name}"?`))return;await supabase.from('channel_projects').update({is_active:false}).eq('id',p.id);toast.success('removed');load();};

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider mb-5 hover:text-primary" style={{color:'#A09890'}}>
        <ArrowLeft className="h-3.5 w-3.5"/>back
      </button>
      <h2 className="text-lg font-bold mb-4" style={{color:'#F5F0EB',letterSpacing:'-0.02em'}}>projects we are working on</h2>
      <style>{`.apvg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}@media(max-width:640px){.apvg{grid-template-columns:repeat(2,1fr)}}`}</style>
      <div className="apvg">
        {projects.map(p=>(
          p.is_locked
            ?<LockedTile key={p.id} title={p.name}/>
            :<ProjectTile key={p.id} project={p} isAdmin={isAdmin} onClick={()=>onSelectProject(p)} onEdit={()=>setEditProject(p)} onHide={()=>hide(p)} onDelete={()=>del(p)}/>
        ))}
        {isAdmin&&<AddProjectTile onClick={()=>setShowAdd(true)} nextSlot={nextSlot}/>}
      </div>
      <ProjectModal open={showAdd} onOpenChange={setShowAdd} onSaved={()=>{setShowAdd(false);load();}} nextSlot={nextSlot} defaultType="project"/>
      <ProjectModal open={!!editProject} onOpenChange={o=>{if(!o)setEditProject(null);}} onSaved={()=>{setEditProject(null);load();}} existing={editProject} nextSlot={nextSlot}/>
    </div>
  );
};

// ─── Hub View ─────────────────────────────────────────────────
// Layout: [Info & Skills tile] + [All Projects tile]
// NOTE: channel_projects has NO channel_id — load all active projects
const HubView = ({isAdmin,onInfoSkills,onAllProjects}:{
  isAdmin:boolean;onInfoSkills:()=>void;onAllProjects:()=>void;
}) => {
  const [projects,setProjects]=useState<ChannelProject[]>([]);

  const load=useCallback(async()=>{
    // Load ALL active projects (no project_type='skill' ones) — no channel_id filter
    const q=isAdmin
      ?supabase.from('channel_projects').select('*').eq('is_active',true).order('slot_number')
      :supabase.from('channel_projects').select('*').eq('is_active',true).eq('is_hidden',false).order('slot_number');
    const {data}=await q;
    // Exclude skills if project_type column exists
    setProjects((data??[]).filter((p:ChannelProject)=>p.project_type!=='skill'));
  },[isAdmin]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const ch=supabase.channel('hub_cp_rt').on('postgres_changes',{event:'*',schema:'public',table:'channel_projects'},load).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[load]);

  const used=projects.map(p=>p.slot_number);
  const nextSlot=Array.from({length:60},(_,i)=>i+1).find(n=>!used.includes(n))??1;
  const hide=async(p:ChannelProject)=>{await supabase.from('channel_projects').update({is_hidden:!p.is_hidden}).eq('id',p.id);toast.success(p.is_hidden?'visible':'hidden');load();};
  const del=async(p:ChannelProject)=>{if(!window.confirm(`Delete "${p.name}"?`))return;await supabase.from('channel_projects').update({is_active:false}).eq('id',p.id);toast.success('removed');load();};

  return (
    <div className="space-y-6">
      {/* Info & Skills — single full-width navigation tile */}
      <HubNavTile
        title="Information & Skills"
        subtitle="Info inflow · Expert directory · Skill acquisition"
        gradIdx={14}
        onClick={onInfoSkills}
        icon={BookOpen}
        minHeight={160}
      />

      {/* Projects section */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{color:'rgba(255,255,255,0.2)'}}>some valuable stuff from</p>
        <h3 className="text-base font-bold mb-4" style={{color:'#F5F0EB',letterSpacing:'-0.01em'}}>projects we are working on</h3>
        <HubNavTile title="All Projects" subtitle={`${projects.length} project${projects.length!==1?'s':''} · click to explore`} gradIdx={21} onClick={onAllProjects} icon={Layers} minHeight={130}/>
      </div>
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────
export const GeneralChannelPage = ({channel}:{channel:Channel}) => {
  const {isAdmin}=useAuth();
  type View='hub'|'all-projects'|'info-skills'|'info-flow'|'expert'|'skills'|'project'|'skill-detail';
  const [history,setHistory]=useState<View[]>(['hub']);
  const [activeProject,setActiveProject]=useState<ChannelProject|null>(null);
  const view=history[history.length-1];
  const push=(v:View)=>setHistory(h=>[...h,v]);
  const pop=()=>setHistory(h=>h.length>1?h.slice(0,-1):h);

  if(view==='project'&&activeProject) return <ProjectView channel={channel} project={activeProject} onBack={pop}/>;
  if(view==='skill-detail'&&activeProject) return <ProjectView channel={channel} project={activeProject} onBack={pop}/>;
  if(view==='expert') return <ExpertDirectoryView onBack={pop}/>;
  if(view==='skills') return <SkillsView channel={channel} isAdmin={isAdmin} onSelectSkill={p=>{setActiveProject(p);push('skill-detail');}} onBack={pop}/>;
  if(view==='info-flow') return <InfoFlowView onExpertDir={()=>push('expert')} onBack={pop}/>;
  if(view==='info-skills') return <InfoSkillsView channel={channel} isAdmin={isAdmin} onInfoFlow={()=>push('info-flow')} onSkillsEnter={()=>push('skills')} onBack={pop} onSelectSkill={p=>{setActiveProject(p);push('skill-detail');}}/>;
  if(view==='all-projects') return <AllProjectsView channel={channel} isAdmin={isAdmin} onSelectProject={p=>{setActiveProject(p);push('project');}} onBack={pop}/>;

  return (
    <>
      <HubView isAdmin={isAdmin} onInfoSkills={()=>push('info-skills')} onAllProjects={()=>push('all-projects')}/>
      <FloatingActions defaultChannelId={channel.id}/>
    </>
  );
};
