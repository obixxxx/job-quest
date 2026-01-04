import { formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Contact, Interaction } from "@shared/schema";

interface FollowUpItem {
  interaction: Interaction;
  contact: Contact;
}

interface FollowUpQueueProps {
  items: FollowUpItem[];
  onLogFollowUp: (contact: Contact) => void;
}

function getUrgencyStyle(date: Date): { badge: "destructive" | "secondary" | "outline"; label: string } {
  if (isPast(date) && !isToday(date)) {
    return { badge: "destructive", label: "Overdue" };
  }
  if (isToday(date)) {
    return { badge: "secondary", label: "Today" };
  }
  if (isTomorrow(date)) {
    return { badge: "outline", label: "Tomorrow" };
  }
  return { badge: "outline", label: formatDistanceToNow(date, { addSuffix: true }) };
}

export function FollowUpQueue({ items, onLogFollowUp }: FollowUpQueueProps) {
  if (items.length === 0) {
    return (
      <Card data-testid="follow-up-queue">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Follow-up Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-game-xp mb-3" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending follow-ups</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="follow-up-queue">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Follow-up Queue
          </CardTitle>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 px-4 pb-4">
            {items.map((item) => {
              const followUpDate = item.interaction.followUpDate
                ? new Date(item.interaction.followUpDate)
                : new Date();
              const urgency = getUrgencyStyle(followUpDate);

              return (
                <div
                  key={item.interaction.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate"
                  data-testid={`follow-up-item-${item.interaction.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.contact.name}</p>
                    {item.contact.company && (
                      <p className="text-xs text-muted-foreground truncate">{item.contact.company}</p>
                    )}
                  </div>
                  <Badge variant={urgency.badge} className="shrink-0">
                    {urgency.label}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLogFollowUp(item.contact)}
                    data-testid={`button-follow-up-${item.interaction.id}`}
                  >
                    Log
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
