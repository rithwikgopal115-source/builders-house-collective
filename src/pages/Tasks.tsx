import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Plus, Trash2 } from "lucide-react";
import { AvatarBlock } from "@/components/AvatarBlock";

interface Task {
  id: string; user_id: string; content: string; status: string | null; created_at: string | null;
  profiles?: { display_name: string; avatar_url: string | null } | null;
}

const Tasks = () => {
  const { user, profile, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    document.title = "tasks — builders house";
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, user_id, content, status, created_at, profiles!tasks_user_id_fkey(display_name, avatar_url)")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    setTasks((data ?? []) as any);
  };

  const add = async () => {
    if (!user || !draft.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, content: draft.trim(), status: "open", visibility: "community",
    });
    if (error) { toast.error(error.message); return; }
    setDraft("");
    load();
  };

  const toggle = async (t: Task) => {
    const next = t.status === "done" ? "open" : "done";
    await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    load();
  };

  const remove = async (t: Task) => {
    await supabase.from("tasks").delete().eq("id", t.id);
    load();
  };

  if (loading) return null;
  if (profile && !profile.is_approved) return <Navigate to="/waiting" replace />;

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        <header className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight">community tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">things people are working on. visible to all builders.</p>
        </header>

        <div className="bento-card mb-6 flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="i'm shipping…"
            className="flex-1 bg-background hairline rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-2 mb-8">
          {open.length === 0 && <p className="text-sm text-muted-foreground font-mono">nothing in flight</p>}
          {open.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} mine={t.user_id === user?.id} />)}
        </div>

        {done.length > 0 && (
          <>
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">shipped</h2>
            <div className="space-y-2 opacity-70">
              {done.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} mine={t.user_id === user?.id} />)}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const TaskRow = ({ task, onToggle, onRemove, mine }: any) => (
  <div className="bento-card flex items-center gap-3 py-3">
    <button onClick={() => onToggle(task)}
      className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
        task.status === "done" ? "bg-primary text-primary-foreground" : "hairline hover:bg-surface-elevated"
      }`}>
      {task.status === "done" && <Check className="h-3 w-3" />}
    </button>
    <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.content}</span>
    <div className="flex items-center gap-2">
      <AvatarBlock url={task.profiles?.avatar_url} name={task.profiles?.display_name ?? "?"} size={22} />
      <span className="text-xs text-muted-foreground font-mono">{task.profiles?.display_name}</span>
    </div>
    {mine && (
      <button onClick={() => onRemove(task)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
    )}
  </div>
);

export default Tasks;
