import { Flame } from "lucide-react";

interface StreakCounterProps {
  currentStreak: number;
  bestStreak: number;
  isActive?: boolean;
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 14) return 2.0;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.25;
  return 1.0;
}

function getStreakTier(streak: number): "bronze" | "silver" | "gold" | "none" {
  if (streak >= 14) return "gold";
  if (streak >= 7) return "silver";
  if (streak >= 3) return "bronze";
  return "none";
}

const tierStyles = {
  none: "bg-muted",
  bronze: "bg-amber-700/20 border-amber-700/30",
  silver: "bg-gray-400/20 border-gray-400/30",
  gold: "bg-yellow-500/20 border-yellow-500/30",
};

export function StreakCounter({ currentStreak, bestStreak, isActive = false }: StreakCounterProps) {
  const multiplier = getStreakMultiplier(currentStreak);
  const tier = getStreakTier(currentStreak);

  return (
    <div
      className={`relative rounded-md p-4 border ${tierStyles[tier]} transition-all ${
        isActive ? "animate-streak-pulse" : ""
      }`}
      data-testid="streak-counter"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Flame 
            className={`w-8 h-8 ${currentStreak > 0 ? "text-game-streak" : "text-muted-foreground"}`}
          />
          {currentStreak > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-game-streak rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{currentStreak}</span>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold" data-testid="text-streak-current">
              {currentStreak} day{currentStreak !== 1 ? "s" : ""}
            </span>
            {multiplier > 1 && (
              <span className="px-1.5 py-0.5 text-xs font-mono font-bold rounded bg-game-xp/20 text-game-xp">
                {multiplier}x
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Best: {bestStreak} day{bestStreak !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
