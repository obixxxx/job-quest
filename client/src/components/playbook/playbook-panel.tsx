import { useState } from "react";
import { Check, Circle, SkipForward, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateModal } from "./template-modal";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return apiRequest("POST", `/api/playbook/${actionId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Action completed!", description: "+XP earned" });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return apiRequest("POST", `/api/playbook/${actionId}/skip`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "detail"] });
      toast({ title: "Action skipped" });
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
                        onClick={() => completeMutation.mutate(action.id)}
                        disabled={completeMutation.isPending}
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
    </>
  );
}
