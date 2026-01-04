import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { FollowUpQueue } from "@/components/dashboard/follow-up-queue";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { OSRing } from "@/components/game/os-ring";
import { StreakCounter } from "@/components/game/streak-counter";
import { DailyQuestCard } from "@/components/game/daily-quest-card";
import { InteractionForm } from "@/components/interactions/interaction-form";
import { ContactForm } from "@/components/contacts/contact-form";
import { useXPPopup } from "@/components/game/xp-popup";
import { useConfetti } from "@/components/game/confetti";
import { useSideQuestBadge } from "@/components/game/side-quest-badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Contact, Interaction } from "@shared/schema";

interface DashboardData {
  nextAction: { contact: Contact; lastInteraction: Interaction | null } | null;
  followUps: { interaction: Interaction; contact: Contact }[];
  stats: {
    interviewsScheduled: number;
    activeConversations: number;
    totalContacts: number;
    responseRate: number;
  };
  dailyQuests: {
    quests: { type: string; label: string; completed: boolean; xp: number }[];
    bonusXP: number;
    allCompleted: boolean;
  };
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { showXPGain, XPPopupComponent } = useXPPopup();
  const { showConfetti, ConfettiComponent } = useConfetti();
  const { showBadge, BadgeComponent } = useSideQuestBadge();

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isLoggingInteraction, setIsLoggingInteraction] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const handleLogInteraction = (contact: Contact) => {
    setSelectedContact(contact);
    setIsInteractionDialogOpen(true);
  };

  const handleInteractionSubmit = async (data: any) => {
    if (!selectedContact) return;

    setIsLoggingInteraction(true);
    try {
      const response = await apiRequest("POST", "/api/interactions", {
        ...data,
        contactId: selectedContact.id,
      });

      const result = await response.json();

      setIsInteractionDialogOpen(false);
      setSelectedContact(null);

      // Show rewards
      if (result.xpAwarded > 0 || result.osAwarded > 0) {
        showXPGain(result.xpAwarded, result.osAwarded);
      }

      // Check for special outcomes
      if (data.outcome === "intel_gathered" || data.outcome === "intro_obtained") {
        showBadge(
          data.outcome === "intel_gathered" ? "Intel Gathered" : "Intro Obtained",
          "Every connection counts!"
        );
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      refreshUser();

      toast({ title: "Interaction logged!", description: `+${result.xpAwarded} XP earned` });
    } catch (error) {
      toast({
        title: "Failed to log interaction",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoggingInteraction(false);
    }
  };

  const handleAddContact = async (data: any) => {
    setIsAddingContact(true);
    try {
      await apiRequest("POST", "/api/contacts", data);
      setIsContactDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact added!", description: "Ready to start outreach" });
    } catch (error) {
      toast({
        title: "Failed to add contact",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAddingContact(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {XPPopupComponent}
      {ConfettiComponent}
      {BadgeComponent}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Your job search command center</p>
        </div>
        <Button onClick={() => setIsContactDialogOpen(true)} data-testid="button-add-contact">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats Grid */}
      {dashboardData?.stats && (
        <StatsGrid
          interviewsScheduled={dashboardData.stats.interviewsScheduled}
          activeConversations={dashboardData.stats.activeConversations}
          totalContacts={dashboardData.stats.totalContacts}
          responseRate={dashboardData.stats.responseRate}
        />
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Next Action + Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Action Card */}
          {dashboardData?.nextAction ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-game-xp" />
                <h2 className="font-semibold">Next Action</h2>
              </div>
              <NextActionCard
                contact={dashboardData.nextAction.contact}
                lastInteraction={dashboardData.nextAction.lastInteraction}
                isOverdue={false}
                onTakeAction={handleLogInteraction}
              />
            </div>
          ) : (
            <div className="bg-muted/50 rounded-md p-8 text-center">
              <h3 className="font-semibold mb-2">No pending actions</h3>
              <p className="text-muted-foreground mb-4">Add a contact to start your outreach</p>
              <Button onClick={() => setIsContactDialogOpen(true)} data-testid="button-add-first-contact">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Contact
              </Button>
            </div>
          )}

          {/* Follow-up Queue */}
          <FollowUpQueue
            items={dashboardData?.followUps || []}
            onLogFollowUp={handleLogInteraction}
          />
        </div>

        {/* Right Column - Game Stats */}
        <div className="space-y-6">
          {/* OS Ring */}
          <div className="flex justify-center">
            <OSRing totalOS={user?.totalOS || 0} targetOS={100} />
          </div>

          {/* Streak Counter */}
          <StreakCounter
            currentStreak={user?.currentStreak || 0}
            bestStreak={user?.bestStreak || 0}
          />

          {/* Daily Quests */}
          {dashboardData?.dailyQuests && (
            <DailyQuestCard
              quests={dashboardData.dailyQuests.quests}
              bonusXP={dashboardData.dailyQuests.bonusXP}
              allCompleted={dashboardData.dailyQuests.allCompleted}
            />
          )}
        </div>
      </div>

      {/* Interaction Dialog */}
      <Dialog open={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <InteractionForm
              contact={selectedContact}
              onSubmit={handleInteractionSubmit}
              onCancel={() => setIsInteractionDialogOpen(false)}
              isPending={isLoggingInteraction}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            onSubmit={handleAddContact}
            onCancel={() => setIsContactDialogOpen(false)}
            isPending={isAddingContact}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
