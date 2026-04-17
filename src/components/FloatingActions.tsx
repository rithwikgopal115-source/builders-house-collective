import { useState } from "react";
import { Plus, Bookmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PostComposer } from "./PostComposer";
import { QuickSaveSheet } from "./QuickSaveSheet";

interface Props {
  defaultChannelId?: string;
  defaultIsResource?: boolean;
  onCreated?: () => void;
}

/** Coral floating + button (members) + admin-only quick-save bookmark button. */
export const FloatingActions = ({ defaultChannelId, defaultIsResource, onCreated }: Props) => {
  const { profile, isAdmin } = useAuth();
  const [composerOpen, setComposerOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  if (!profile?.is_approved) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-30 flex flex-col gap-3 items-end">
        {isAdmin && (
          <button
            onClick={() => setQuickOpen(true)}
            aria-label="quick save"
            className="h-11 w-11 rounded-full flex items-center justify-center hairline bg-surface hover:bg-surface-elevated transition-colors shadow-lg"
          >
            <Bookmark className="h-4 w-4 text-secondary" />
          </button>
        )}
        <button
          onClick={() => setComposerOpen(true)}
          aria-label="new post"
          className="h-14 w-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg"
          style={{ background: "#E8734A", color: "#0D0D0D" }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        defaultChannelId={defaultChannelId}
        defaultIsResource={defaultIsResource}
        onCreated={onCreated}
      />
      <QuickSaveSheet open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
};
