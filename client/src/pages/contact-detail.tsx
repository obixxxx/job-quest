import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Building, Mail, Phone, Linkedin, Calendar, Zap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaybookPanel } from "@/components/playbook/playbook-panel";
import { TemplateModal } from "@/components/playbook/template-modal";
import { OutcomeFormModal } from "@/components/outcomes/outcome-form-modal";
import { OutcomeBadge } from "@/components/outcomes/outcome-badge";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import type { Outcome } from "@shared/schema";

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

interface ContactDetail {
  contact: {
    id: string;
    name: string;
    company: string | null;
    role: string | null;
    email: string | null;
    linkedinUrl: string | null;
    phoneNumber: string | null;
    warmthLevel: string;
    createdAt: string;
  };
  playbookActions: PlaybookAction[];
  interactions: Array<{
    id: string;
    type: string;
    direction: string;
    status?: string;
    outcome: string | null;
    createdAt: string;
    xpAwarded: number;
    osAwarded: number;
  }>;
  nextAction: PlaybookAction | null;
  outcomes?: Array<{
    id: string;
    type: string;
    description: string;
    outcomeDate: string;
    revenueAmount: number | null;
    revenueType: string | null;
    introducedToContactId: string | null;
    introducedToContact?: {
      id: string;
      name: string;
      company: string | null;
    };
  }>;
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);

  const { data, isLoading } = useQuery<ContactDetail>({
    queryKey: ["/api/contacts", id, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}/detail`);
      if (!res.ok) throw new Error("Failed to fetch contact");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Contact not found</p>
      </div>
    );
  }

  const { contact, playbookActions, interactions, nextAction, outcomes = [] } = data;

  const warmthColors = {
    cold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    warm: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    hot: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const lastInteraction = interactions[0];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/contacts">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-contacts">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contacts
        </Button>
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold" data-testid="text-contact-name">
                  {contact.name}
                </h1>
                {(contact.role || contact.company) && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    {contact.role && <span>{contact.role}</span>}
                    {contact.role && contact.company && <span>at</span>}
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        {contact.company}
                      </span>
                    )}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <Badge className={warmthColors[contact.warmthLevel as keyof typeof warmthColors]}>
                    {contact.warmthLevel}
                  </Badge>
                  {lastInteraction && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Last contact: {formatDistanceToNow(new Date(lastInteraction.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsOutcomeModalOpen(true)} variant="outline">
                <Trophy className="h-4 w-4 mr-2" />
                Record Outcome
              </Button>
              {contact.email && (
                <Button size="icon" variant="outline" asChild data-testid="button-email-contact">
                  <a href={`mailto:${contact.email}`} aria-label="Send email">
                    <Mail className="w-4 h-4" />
                  </a>
                </Button>
              )}
              {contact.phoneNumber && (
                <Button size="icon" variant="outline" asChild data-testid="button-call-contact">
                  <a href={`tel:${contact.phoneNumber}`} aria-label="Call contact">
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
              )}
              {contact.linkedinUrl && (
                <Button size="icon" variant="outline" asChild data-testid="button-linkedin-contact">
                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="View LinkedIn profile">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {nextAction && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Next Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{nextAction.actionLabel}</p>
              <div className="flex gap-2">
                {nextAction.template && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTemplate(nextAction.template)}
                    data-testid="button-view-next-action-template"
                  >
                    View Template
                  </Button>
                )}
                {contact.email && nextAction.template?.type === "email" && (
                  <Button asChild data-testid="button-open-gmail-next-action">
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                        contact.email
                      )}&su=${encodeURIComponent(
                        nextAction.template?.subject || ""
                      )}&body=${encodeURIComponent(nextAction.template?.body || "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Open in Gmail
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PlaybookPanel
        actions={playbookActions}
        nextAction={nextAction}
        contactId={contact.id}
        contactName={contact.name}
        contactEmail={contact.email || undefined}
        contactCompany={contact.company || undefined}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Interaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No interactions logged yet</p>
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                  data-testid={`interaction-${interaction.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium capitalize">
                        {interaction.type.replace("_", " ")} ({interaction.direction})
                      </p>
                      {interaction.status && interaction.status !== "completed" && (
                        <Badge variant={interaction.status === "scheduled" ? "default" : "outline"} className="text-xs">
                          {interaction.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(interaction.createdAt), { addSuffix: true })}
                      {interaction.outcome && ` - ${interaction.outcome.replace("_", " ")}`}
                    </p>
                  </div>
                  {(interaction.xpAwarded > 0 || interaction.osAwarded > 0) && (
                    <div className="flex gap-2">
                      {interaction.xpAwarded > 0 && (
                        <Badge variant="secondary" className="font-mono">
                          +{interaction.xpAwarded} XP
                        </Badge>
                      )}
                      {interaction.osAwarded > 0 && (
                        <Badge variant="secondary" className="font-mono">
                          +{interaction.osAwarded} OS
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outcomes Section */}
      {outcomes && outcomes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outcomes.map((outcome) => (
                <div
                  key={outcome.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                >
                  <div>
                    <OutcomeBadge outcome={outcome} />
                    <p className="text-sm text-muted-foreground mt-1">{outcome.description}</p>
                    {outcome.introducedToContact && (
                      <Link href={`/contacts/${outcome.introducedToContact.id}`}>
                        <p className="text-xs text-blue-600 hover:underline mt-1">
                          → Introduced to {outcome.introducedToContact.name}
                          {outcome.introducedToContact.company && ` (${outcome.introducedToContact.company})`}
                        </p>
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(outcome.outcomeDate), 'MMM d, yyyy')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TemplateModal
        template={selectedTemplate}
        open={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        contactName={contact.name}
        contactEmail={contact.email || undefined}
        contactCompany={contact.company || undefined}
      />

      <OutcomeFormModal
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        contactId={id!}
        contactName={contact.name}
      />
    </div>
  );
}
