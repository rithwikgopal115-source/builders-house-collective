import { cn } from "@/lib/utils";

// V2: single Builder badge + optional Admin tag. No tier hierarchy.
export const BuilderBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider font-mono",
      className
    )}
    style={{ background: "#2A1A0E", color: "#E8734A" }}
  >
    builder
  </span>
);

export const AdminTag = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider font-mono",
      className
    )}
    style={{ background: "#1A1A1A", color: "#8A8480" }}
  >
    admin
  </span>
);

// Backward-compat shim — TierBadge now just renders Builder.
export const TierBadge = ({ className }: { className?: string; tier?: any }) => (
  <BuilderBadge className={className} />
);
