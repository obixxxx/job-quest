import { Progress } from "@/components/ui/progress";

interface XPBarProps {
  currentXP: number;
  level: number;
}

function getXPForLevel(level: number): number {
  return level * 100;
}

function getXPProgress(currentXP: number, level: number): number {
  const xpForCurrentLevel = getXPForLevel(level - 1);
  const xpForNextLevel = getXPForLevel(level);
  const xpInCurrentLevel = currentXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  return Math.min(100, (xpInCurrentLevel / xpNeeded) * 100);
}

export function XPBar({ currentXP, level }: XPBarProps) {
  const progress = getXPProgress(currentXP, level);
  const xpForNextLevel = getXPForLevel(level);

  return (
    <div className="space-y-2" data-testid="xp-bar">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-game-xp text-white font-mono font-bold text-sm">
            {level}
          </div>
          <span className="text-sm font-medium text-muted-foreground">Level</span>
        </div>
        <div className="text-right">
          <span className="font-mono text-sm text-game-xp font-semibold" data-testid="text-xp-current">
            {currentXP.toLocaleString()} XP
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            / {xpForNextLevel.toLocaleString()}
          </span>
        </div>
      </div>
      <Progress 
        value={progress} 
        className="h-2 bg-muted"
      />
    </div>
  );
}
