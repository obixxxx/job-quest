import { useQuery, useMutation } from "@tanstack/react-query";
import { Target, Check, Zap, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SelectedQuest {
  id: string;
  questType: string;
  targetCount: number;
  currentCount: number;
  xpBonus: number;
  isCompleted: boolean;
}

interface QuestProgressData {
  quests: SelectedQuest[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  bonusAwarded: boolean;
}

const QUEST_LABELS: Record<string, string> = {
  playbook_actions: "Complete playbook actions",
  outreach_5: "Send outreach messages",
  follow_ups: "Follow up with contacts",
  new_contacts: "Add new contacts",
  calls: "Schedule or complete calls",
  research: "Research target companies",
  linkedin: "LinkedIn engagement",
};

interface DailyQuestProgressProps {
  compact?: boolean;
}

export function DailyQuestProgress({ compact = false }: DailyQuestProgressProps) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<QuestProgressData>({
    queryKey: ["/api/quests/today"],
  });

  const manualCompleteMutation = useMutation({
    mutationFn: async (questId: string) => {
      return apiRequest("POST", `/api/quests/${questId}/increment`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quests/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  if (isLoading || !data || data.quests.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Target className="w-4 h-4 text-game-xp" />
        <span className="text-muted-foreground">Daily Quests</span>
        <Badge variant="secondary" className="ml-auto">
          {data.completedCount}/{data.totalCount}
        </Badge>
      </div>
    );
  }

  return (
    <Card data-testid="daily-quest-progress">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-game-xp" />
            Daily Quests
          </CardTitle>
          <Badge 
            variant={data.allCompleted ? "default" : "secondary"}
            className={data.allCompleted ? "bg-game-xp text-white" : ""}
          >
            {data.completedCount}/{data.totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.quests.map((quest) => {
          const progress = Math.min((quest.currentCount / quest.targetCount) * 100, 100);
          const isManual = quest.questType === "research" || quest.questType === "linkedin";

          return (
            <div key={quest.id} className="space-y-1.5" data-testid={`quest-progress-${quest.questType}`}>
              <div className="flex items-center gap-2">
                {quest.isCompleted ? (
                  <Check className="w-4 h-4 text-game-xp shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm flex-1 ${quest.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                  {QUEST_LABELS[quest.questType] || quest.questType}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {quest.currentCount}/{quest.targetCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-1.5 flex-1" />
                {isManual && !quest.isCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => manualCompleteMutation.mutate(quest.id)}
                    disabled={manualCompleteMutation.isPending}
                    data-testid={`button-increment-${quest.questType}`}
                  >
                    +1
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {data.allCompleted && !data.bonusAwarded && (
          <div className="pt-3 border-t text-center">
            <p className="text-sm font-medium text-game-xp flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" />
              All quests complete! Bonus XP awarded!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
