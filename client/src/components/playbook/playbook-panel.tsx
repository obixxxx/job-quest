import { useState } from "react";
import { Check, Circle, SkipForward, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateModal } from "./template-modal";
import { InteractionForm } from "../interactions/interaction-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useXPPopup } from "../game/xp-popup";
import { useSideQuestBadge } from "../game/side-quest-badge";

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
}

interface PlaybookAction {
  id: string;
  actionType: string;
  actionLabel: string;
  actionOrder: number;
  status: string;
  dueDate: string | null;
  template: Template | null;
}

interface PlaybookPanelProps {
  actions: PlaybookAction[];
  nextAction: PlaybookAction | null;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  contactCompany?: string;
}

export function PlaybookPanel({
  actions,
  nextAction,
  contactId,
  contactName,
  contactEmail,
  contactCompany,
}: PlaybookPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [actionToComplete, setActionToComplete] = useState<PlaybookAction | null>(null);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { showXPGain, XPPopupComponent } = useXPPopup();
  const { showBadge, BadgeComponent } = useSideQuestBadge();

  const handleCompleteAction = (action: PlaybookAction) => {
    setActionToComplete(action);
    setIsInteractionDialogOpen(true);
  };

  const handleInteractionSubmit = async (data: any) => {
    if (!actionToComplete) return;
    setIsSubmitting(true);

    try {
      // First, create the interaction
      const interactionResponse = await apiRequest("POST", "/api/interactions", {
        ...data,
        contactId,
      });
      const interactionResult = await interactionResponse.json();

      // Then, complete the playbook action with the interaction ID
      await apiRequest("POST", `/api/playbook/${actionToComplete.id}/complete`, {
        interactionId: interactionResult.id,
      });

      setIsInteractionDialogOpen(false);
      setActionToComplete(null);

      // Show XP gain popup
      if (interactionResult.xpAwarded > 0 || interactionResult.osAwarded > 0) {
        showXPGain(interactionResult.xpAwarded, interactionResult.osAwarded);
      }

      // Show badges for special outcomes
      if (data.outcome === "intel_gathered" || data.outcome === "intro_obtained") {
        showBadge(
          data.outcome === "intel_gathered" ? "Intel Gathered" : "Intro Obtained",
          "Every connection counts!"
        );
      }

      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });

      toast({
        title: "Action completed!",
        description: `+${interactionResult.xpAwarded} XP earned`,
      });
    } catch (error) {
      toast({
        title: "Failed to complete action",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return apiRequest("POST", `/api/playbook/${actionId}/skip`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "detail"] });
      toast({ title: "Action skipped" });
    },
  });

  const revertMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return apiRequest("POST", `/api/playbook/${actionId}/revert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Action reverted to pending" });
    },
  });

  const getStatusIcon = (action: PlaybookAction) => {
    if (action.status === "completed") {
      return <Check className="w-5 h-5 text-game-xp" />;
    }
    if (action.status === "skipped") {
      return <SkipForward className="w-5 h-5 text-muted-foreground" />;
    }
    if (nextAction?.id === action.id) {
      return <Circle className="w-5 h-5 text-primary fill-primary" />;
    }
    return <Circle className="w-5 h-5 text-muted-foreground" />;
  };

  const isOverdue = (action: PlaybookAction) => {
    if (!action.dueDate || action.status !== "pending") return false;
    const today = new Date().toISOString().split("T")[0];
    return action.dueDate < today;
  };

  return (
    <>
      {XPPopupComponent}
      {BadgeComponent}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Playbook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {actions.map((action) => (
            <div
              key={action.id}
              className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                nextAction?.id === action.id
                  ? "bg-primary/10 border border-primary/20"
                  : action.status === "completed"
                  ? "bg-muted/50"
                  : ""
              }`}
              data-testid={`playbook-action-${action.id}`}
            >
              <div className="flex-shrink-0">{getStatusIcon(action)}</div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    action.status === "completed" || action.status === "skipped"
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {action.actionLabel}
                </p>
                {isOverdue(action) && (
                  <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <Clock className="w-3 h-3" />
                    Overdue
                  </div>
                )}
              </div>

              {action.status === "pending" && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {action.template && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedTemplate(action.template)}
                      data-testid={`button-view-template-${action.id}`}
                    >
                      View Template
                    </Button>
                  )}
                  {nextAction?.id === action.id && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleCompleteAction(action)}
                        data-testid={`button-complete-action-${action.id}`}
                      >
                        Mark Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => skipMutation.mutate(action.id)}
                        disabled={skipMutation.isPending}
                        data-testid={`button-skip-action-${action.id}`}
                      >
                        Skip
                      </Button>
                    </>
                  )}
                </div>
              )}

              {(action.status === "completed" || action.status === "skipped") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revertMutation.mutate(action.id)}
                  disabled={revertMutation.isPending}
                  data-testid={`button-undo-action-${action.id}`}
                >
                  Undo
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <TemplateModal
        template={selectedTemplate}
        open={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        contactName={contactName}
        contactEmail={contactEmail}
        contactCompany={contactCompany}
      />

      <Dialog open={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Interaction for Action</DialogTitle>
          </DialogHeader>
          {actionToComplete && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Action: <span className="font-medium">{actionToComplete.actionLabel}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Contact: <span className="font-medium">{contactName}</span>
              </p>
            </div>
          )}
          <InteractionForm
            contact={{ id: contactId, name: contactName, email: contactEmail, company: contactCompany }}
            onSubmit={handleInteractionSubmit}
            onCancel={() => setIsInteractionDialogOpen(false)}
            isPending={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
