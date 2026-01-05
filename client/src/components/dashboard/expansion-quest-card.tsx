import { useState } from "react";
import { Search, Mail, Users, FileText, Target, Shuffle, ExternalLink, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExpansionQuest {
  id: string;
  icon: typeof Search;
  title: string;
  description: string;
  actionLabel: string | null;
  actionType: "add_contact" | "external" | "tips" | null;
  externalUrl?: string;
}

const EXPANSION_QUESTS: ExpansionQuest[] = [
  {
    id: "research",
    icon: Search,
    title: "Research target companies",
    description: "Find 3 companies you admire and identify decision-makers",
    actionLabel: "Add Contact",
    actionType: "add_contact",
  },
  {
    id: "letter",
    icon: Mail,
    title: "Send a physical letter",
    description: "Write and mail a personal letter to a hiring manager (FedEx, signature required)",
    actionLabel: "View Tips",
    actionType: "tips",
  },
  {
    id: "network",
    icon: Users,
    title: "Mine your network",
    description: "Review LinkedIn connections for warm intro opportunities",
    actionLabel: "Open LinkedIn",
    actionType: "external",
    externalUrl: "https://www.linkedin.com/mynetwork/",
  },
  {
    id: "materials",
    icon: FileText,
    title: "Improve your materials",
    description: "Update your resume, LinkedIn headline, or portfolio",
    actionLabel: null,
    actionType: null,
  },
  {
    id: "record",
    icon: Target,
    title: "Set a new daily record",
    description: "Challenge yourself to send more outreach than yesterday",
    actionLabel: "Add Contact",
    actionType: "add_contact",
  },
];

interface ExpansionQuestCardProps {
  onAddContact: () => void;
}

export function ExpansionQuestCard({ onAddContact }: ExpansionQuestCardProps) {
  const [currentIndex, setCurrentIndex] = useState(() => 
    Math.floor(Math.random() * EXPANSION_QUESTS.length)
  );
  const [showTips, setShowTips] = useState(false);

  const quest = EXPANSION_QUESTS[currentIndex];
  const Icon = quest.icon;

  const handleShuffle = () => {
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * EXPANSION_QUESTS.length);
    } while (newIndex === currentIndex && EXPANSION_QUESTS.length > 1);
    setCurrentIndex(newIndex);
    setShowTips(false);
  };

  const handleAction = () => {
    if (quest.actionType === "add_contact") {
      onAddContact();
    } else if (quest.actionType === "external" && quest.externalUrl) {
      window.open(quest.externalUrl, "_blank", "noopener,noreferrer");
    } else if (quest.actionType === "tips") {
      setShowTips(!showTips);
    }
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30" data-testid="expansion-quest-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-game-xp" />
            Expansion Quest
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleShuffle}
            data-testid="button-shuffle-quest"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          No pending actions - time to expand your network!
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-md bg-muted/50">
          <div className="p-3 rounded-md bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">{quest.title}</h3>
            <p className="text-sm text-muted-foreground">{quest.description}</p>
          </div>
        </div>

        {showTips && quest.actionType === "tips" && (
          <div className="p-4 rounded-md bg-accent/50 text-sm space-y-2">
            <p className="font-medium">Physical Letter Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use quality paper and a handwritten envelope</li>
              <li>Keep it to one page, personal and specific</li>
              <li>Mention something unique about the company</li>
              <li>Include your contact info prominently</li>
              <li>FedEx with signature required gets attention</li>
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2">
          {quest.actionLabel && (
            <Button 
              onClick={handleAction}
              className="flex-1"
              data-testid="button-expansion-action"
            >
              {quest.actionType === "add_contact" && <Plus className="w-4 h-4 mr-2" />}
              {quest.actionType === "external" && <ExternalLink className="w-4 h-4 mr-2" />}
              {quest.actionLabel}
            </Button>
          )}
          {!quest.actionLabel && (
            <p className="text-sm text-muted-foreground italic flex-1">
              Take time to polish your professional presence
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
