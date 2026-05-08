/**
 * FloatingActions.tsx
 * Coral floating + button — now supports defaultProjectId for project-channel views.
 * Drop this into src/components/FloatingActions.tsx
 */
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PostComposer } from "./PostComposer";
import { QuickSaveSheet } from "./QuickSaveSheet";

interface Props {
  defaultChannelId?: string;
  defaultIsResource?: boolean;
  defaultProjectId?: string | null;   // ← new: pre-selects project in composer
  onCreated?: () => void;
}

export const FloatingActions = ({
  defaultChannelId,
  defaultIsResource,
  defaultProjectId,
  onCreated,
}: Props) => {
  const { profile, isAdmin } = useAuth();
  const [composerOpen, setComposerOpen] = useState(false);
  const [quickOpen,    setQuickOpen]    = useState(false);

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
          {/* Plus icon inline to avoid import */}
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        defaultChannelId={defaultChannelId}
        defaultIsResource={defaultIsResource}
        defaultProjectId={defaultProjectId}
        onCreated={onCreated}
      />
      <QuickSaveSheet open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
};
