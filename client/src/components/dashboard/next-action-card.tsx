import { formatDistanceToNow } from "date-fns";
import { Clock, AlertCircle, MessageSquare, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WarmthIndicator } from "@/components/game/warmth-indicator";
import type { Contact, Interaction } from "@shared/schema";

interface NextActionCardProps {
  contact: Contact;
  lastInteraction?: Interaction | null;
  isOverdue?: boolean;
  onTakeAction: (contact: Contact) => void;
  onSkip?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getActionText(contact: Contact, lastInteraction?: Interaction | null): string {
  if (!lastInteraction) {
    return "Send initial outreach";
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(lastInteraction.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (lastInteraction.outcome === "no_response" && daysSince > 3) {
    return "Follow up - no response yet";
  }

  if (lastInteraction.outcome === "response_received") {
    return "Continue the conversation";
  }

  if (lastInteraction.outcome === "intro_obtained") {
    return "Reach out to the intro";
  }

  if (daysSince > 7) {
    return `Check in - it's been ${daysSince} days`;
  }

  return "Send a follow-up message";
}

export function NextActionCard({
  contact,
  lastInteraction,
  isOverdue = false,
  onTakeAction,
  onSkip,
}: NextActionCardProps) {
  const actionText = getActionText(contact, lastInteraction);

  return (
    <Card 
      className={`relative overflow-visible ${isOverdue ? "border-destructive/50" : ""}`}
      data-testid="next-action-card"
    >
      {isOverdue && (
        <div className="absolute -top-3 left-4">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Overdue
          </Badge>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="w-16 h-16">
              <AvatarFallback className={`${getAvatarColor(contact.name)} text-white text-xl`}>
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold truncate" data-testid="text-next-action-contact">
                  {contact.name}
                </h2>
                <WarmthIndicator level={contact.warmthLevel as "cold" | "warm" | "hot"} />
              </div>
              
              {(contact.role || contact.company) && (
                <p className="text-muted-foreground">
                  {contact.role}
                  {contact.role && contact.company && " at "}
                  {contact.company}
                </p>
              )}
              
              {lastInteraction && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Last contact: {formatDistanceToNow(new Date(lastInteraction.createdAt), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-stretch md:items-end gap-3">
            <p className="text-lg font-medium text-center md:text-right" data-testid="text-suggested-action">
              {actionText}
            </p>
            
            <div className="flex items-center gap-2">
              {onSkip && (
                <Button variant="ghost" size="sm" onClick={onSkip} data-testid="button-skip-action">
                  Skip for now
                </Button>
              )}
              <Button size="lg" onClick={() => onTakeAction(contact)} data-testid="button-take-action">
                <MessageSquare className="w-4 h-4 mr-2" />
                Log Interaction
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
