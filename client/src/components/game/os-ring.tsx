interface OSRingProps {
  totalOS: number;
  targetOS?: number;
}

export function OSRing({ totalOS, targetOS = 100 }: OSRingProps) {
  const progress = Math.min(100, (totalOS / targetOS) * 100);
  const strokeDasharray = 2 * Math.PI * 45;
  const strokeDashoffset = strokeDasharray * (1 - progress / 100);

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="os-ring">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-game-os transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold text-game-os" data-testid="text-os-value">
          {totalOS}
        </span>
        <span className="text-xs text-muted-foreground font-medium">OS Points</span>
      </div>
    </div>
  );
}
