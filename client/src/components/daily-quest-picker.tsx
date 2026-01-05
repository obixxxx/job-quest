import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Target, Check, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const QUEST_OPTIONS = [
  {
    id: "playbook_actions",
    label: "Complete 3 playbook actions",
    targetCount: 3,
    xpBonus: 50,
    trackingType: "playbook_complete",
  },
  {
    id: "outreach_5",
    label: "Send 5 outreach messages",
    targetCount: 5,
    xpBonus: 75,
    trackingType: "interaction_email_outbound",
  },
  {
    id: "follow_ups",
    label: "Follow up with 3 contacts",
    targetCount: 3,
    xpBonus: 50,
    trackingType: "interaction_follow_up",
  },
  {
    id: "new_contacts",
    label: "Add 2 new contacts",
    targetCount: 2,
    xpBonus: 30,
    trackingType: "contact_created",
  },
  {
    id: "calls",
    label: "Schedule or complete 1 call",
    targetCount: 1,
    xpBonus: 40,
    trackingType: "interaction_call",
  },
  {
    id: "research",
    label: "Research 3 target companies",
    targetCount: 3,
    xpBonus: 35,
    trackingType: "manual",
  },
  {
    id: "linkedin",
    label: "Engage on LinkedIn (5 interactions)",
    targetCount: 5,
    xpBonus: 25,
    trackingType: "manual",
  },
];

interface DailyQuestPickerProps {
  open: boolean;
  onClose: () => void;
}

export function DailyQuestPicker({ open, onClose }: DailyQuestPickerProps) {
  const [selectedQuests, setSelectedQuests] = useState<string[]>([]);
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async (questIds: string[]) => {
      const quests = questIds.map((id) => ({ questType: id }));
      return apiRequest("POST", "/api/quests/select", { quests });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quests/today"] });
      toast({
        title: "Daily quests set!",
        description: "Good luck on your job search today!",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Failed to set quests",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const toggleQuest = (questId: string) => {
    setSelectedQuests((prev) => {
      if (prev.includes(questId)) {
        return prev.filter((id) => id !== questId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, questId];
    });
  };

  const canSubmit = selectedQuests.length >= 3 && selectedQuests.length <= 5;
  const totalXP = selectedQuests.reduce((sum, id) => {
    const quest = QUEST_OPTIONS.find((q) => q.id === id);
    return sum + (quest?.xpBonus || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-6 h-6 text-game-xp" />
            Pick Your Daily Quests
          </DialogTitle>
          <DialogDescription>
            Select 3-5 goals for today. Complete them all for bonus XP!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {QUEST_OPTIONS.map((quest) => {
            const isSelected = selectedQuests.includes(quest.id);
            return (
              <Card
                key={quest.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover-elevate"
                }`}
                onClick={() => toggleQuest(quest.id)}
                data-testid={`quest-option-${quest.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/50"
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{quest.label}</p>
                      {quest.trackingType === "manual" && (
                        <p className="text-xs text-muted-foreground">
                          Mark complete manually
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      <Zap className="w-3 h-3 mr-1" />
                      +{quest.xpBonus} XP
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Selected: </span>
            <span className={`font-semibold ${selectedQuests.length >= 3 ? "text-game-xp" : ""}`}>
              {selectedQuests.length}/5
            </span>
            {selectedQuests.length > 0 && (
              <span className="ml-3 text-muted-foreground">
                Total: <span className="font-mono text-game-xp">+{totalXP} XP</span>
              </span>
            )}
          </div>
          <Button
            onClick={() => submitMutation.mutate(selectedQuests)}
            disabled={!canSubmit || submitMutation.isPending}
            data-testid="button-start-day"
          >
            {submitMutation.isPending ? "Saving..." : "Start My Day"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
