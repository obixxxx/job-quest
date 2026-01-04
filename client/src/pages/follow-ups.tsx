import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, isPast, isToday, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InteractionForm } from "@/components/interactions/interaction-form";
import { useXPPopup } from "@/components/game/xp-popup";
import { useSideQuestBadge } from "@/components/game/side-quest-badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Contact, Interaction } from "@shared/schema";

interface FollowUpItem {
  interaction: Interaction;
  contact: Contact;
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

export default function FollowUpsPage() {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const { showXPGain, XPPopupComponent } = useXPPopup();
  const { showBadge, BadgeComponent } = useSideQuestBadge();

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { data: followUps, isLoading } = useQuery<FollowUpItem[]>({
    queryKey: ["/api/follow-ups"],
  });

  const overdueItems = followUps?.filter(
    (item) => item.interaction.followUpDate && isPast(new Date(item.interaction.followUpDate)) && !isToday(new Date(item.interaction.followUpDate))
  ) || [];

  const todayItems = followUps?.filter(
    (item) => item.interaction.followUpDate && isToday(new Date(item.interaction.followUpDate))
  ) || [];

  const upcomingItems = followUps?.filter(
    (item) => item.interaction.followUpDate && !isPast(new Date(item.interaction.followUpDate)) && !isToday(new Date(item.interaction.followUpDate))
  ) || [];

  const handleLogFollowUp = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDialogOpen(true);
  };

  const handleInteractionSubmit = async (data: any) => {
    if (!selectedContact) return;
    setIsPending(true);
    try {
      const response = await apiRequest("POST", "/api/interactions", {
        ...data,
        contactId: selectedContact.id,
      });
      const result = await response.json();

      setIsDialogOpen(false);
      setSelectedContact(null);

      if (result.xpAwarded > 0 || result.osAwarded > 0) {
        showXPGain(result.xpAwarded, result.osAwarded);
      }

      if (data.outcome === "intel_gathered" || data.outcome === "intro_obtained") {
        showBadge(
          data.outcome === "intel_gathered" ? "Intel Gathered" : "Intro Obtained",
          "Every connection counts!"
        );
      }

      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      refreshUser();
      toast({ title: "Follow-up completed!", description: `+${result.xpAwarded} XP earned` });
    } catch (error) {
      toast({
        title: "Failed to log interaction",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const renderFollowUpItem = (item: FollowUpItem, isOverdue: boolean = false) => {
    const followUpDate = item.interaction.followUpDate
      ? new Date(item.interaction.followUpDate)
      : new Date();

    return (
      <Card key={item.interaction.id} className={isOverdue ? "border-destructive/50" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={`${getAvatarColor(item.contact.name)} text-white text-sm`}>
                {getInitials(item.contact.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.contact.name}</p>
              {item.contact.company && (
                <p className="text-sm text-muted-foreground truncate">{item.contact.company}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {format(followUpDate, "MMM d")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(followUpDate, { addSuffix: true })}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleLogFollowUp(item.contact)}
                data-testid={`button-follow-up-${item.interaction.id}`}
              >
                Complete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const hasNoFollowUps = (!followUps || followUps.length === 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {XPPopupComponent}
      {BadgeComponent}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Follow-ups</h1>
        <p className="text-muted-foreground">Keep your conversations moving forward</p>
      </div>

      {hasNoFollowUps ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-16 h-16 text-game-xp mb-4" />
          <h3 className="font-semibold text-lg mb-2">All caught up!</h3>
          <p className="text-muted-foreground">
            No pending follow-ups. Log some interactions to build your queue.
          </p>
        </div>
      ) : (
        <>
          {/* Overdue Section */}
          {overdueItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="destructive">Overdue</Badge>
                <span className="text-sm text-muted-foreground">
                  {overdueItems.length} item{overdueItems.length !== 1 ? "s" : ""} need attention
                </span>
              </div>
              <div className="space-y-3">
                {overdueItems.map((item) => renderFollowUpItem(item, true))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {todayItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">Today</h2>
              </div>
              <div className="space-y-3">
                {todayItems.map((item) => renderFollowUpItem(item))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold">Upcoming</h2>
              </div>
              <div className="space-y-3">
                {upcomingItems.map((item) => renderFollowUpItem(item))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Interaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <InteractionForm
              contact={selectedContact}
              onSubmit={handleInteractionSubmit}
              onCancel={() => setIsDialogOpen(false)}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
