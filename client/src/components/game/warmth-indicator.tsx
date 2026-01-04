import { cn } from "@/lib/utils";

type WarmthLevel = "cold" | "warm" | "hot";

interface WarmthIndicatorProps {
  level: WarmthLevel;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const warmthConfig: Record<WarmthLevel, { label: string; colorClass: string }> = {
  cold: { label: "Cold", colorClass: "bg-warmth-cold" },
  warm: { label: "Warm", colorClass: "bg-warmth-warm" },
  hot: { label: "Hot", colorClass: "bg-warmth-hot" },
};

export function WarmthIndicator({ level, showLabel = false, size = "md" }: WarmthIndicatorProps) {
  const config = warmthConfig[level];
  const dotSize = size === "sm" ? "w-2 h-2" : "w-3 h-3";

  return (
    <div className="flex items-center gap-1.5" data-testid={`warmth-indicator-${level}`}>
      <div className={cn("rounded-full", dotSize, config.colorClass)} />
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
