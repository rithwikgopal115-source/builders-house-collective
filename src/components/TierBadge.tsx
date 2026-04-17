import { cn } from "@/lib/utils";

interface TierBadgeProps {
  tier: "learner" | "founder";
  className?: string;
}

export const TierBadge = ({ tier, className }: TierBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider font-mono",
        tier === "founder" ? "tier-badge-founder" : "tier-badge-learner",
        className
      )}
    >
      {tier}
    </span>
  );
};
