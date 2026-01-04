import { Check, Circle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Quest {
  type: string;
  label: string;
  completed: boolean;
  xp: number;
}

interface DailyQuestCardProps {
  quests: Quest[];
  bonusXP: number;
  allCompleted: boolean;
}

const questLabels: Record<string, string> = {
  send_message: "Send a message",
  log_interaction: "Log an interaction",
  add_contact: "Add a new contact",
  follow_up: "Complete a follow-up",
  research: "Research a company",
};

export function DailyQuestCard({ quests, bonusXP, allCompleted }: DailyQuestCardProps) {
  const completedCount = quests.filter((q) => q.completed).length;

  return (
    <Card data-testid="daily-quest-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-game-xp" />
            Daily Quests
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{quests.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quests.map((quest, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 ${quest.completed ? "opacity-60" : ""}`}
          >
            {quest.completed ? (
              <div className="w-5 h-5 rounded-full bg-game-xp flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={`text-sm flex-1 ${quest.completed ? "line-through" : ""}`}>
              {questLabels[quest.type] || quest.label}
            </span>
            <span className="font-mono text-xs text-game-xp">+{quest.xp}</span>
          </div>
        ))}
        
        {allCompleted && bonusXP > 0 && (
          <div className="pt-2 mt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-game-xp">Bonus Reward!</span>
              <span className="font-mono font-bold text-game-xp">+{bonusXP} XP</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
