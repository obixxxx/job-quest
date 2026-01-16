import { Mail, MessageSquare, MoreHorizontal, Phone, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WarmthIndicator } from "@/components/game/warmth-indicator";
import type { Contact, Interaction, PlaybookAction } from "@shared/schema";

interface ContactCardProps {
  contact: Contact;
  lastInteraction?: Interaction | null;
  nextAction?: PlaybookAction | null;
  introducedBy?: { id: string; name: string; company: string | null } | null;
  onLogInteraction: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
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

function formatSource(source: string | null): string {
  if (!source) return "";

  const sourceMap: Record<string, string> = {
    existing_friend: "Friend/Family",
    former_colleague: "Former Colleague",
    referral: "Referral",
    mutual_connection: "Mutual Connection",
    linkedin: "LinkedIn",
    event: "Event",
    cold_outreach: "Cold Outreach",
    other: "Other",
  };

  return sourceMap[source] || source;
}

export function ContactCard({
  contact,
  lastInteraction,
  nextAction,
  introducedBy,
  onLogInteraction,
  onEdit,
  onDelete,
}: ContactCardProps) {
  const suggestedAction = nextAction?.actionLabel || getSuggestedAction(contact, lastInteraction);

  return (
    <Card className="hover-elevate group" data-testid={`contact-card-${contact.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className={`${getAvatarColor(contact.name)} text-white text-sm`}>
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>

          <Link href={`/contacts/${contact.id}`} className="flex-1 min-w-0 cursor-pointer">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate group-hover:text-primary transition-colors" data-testid={`text-contact-name-${contact.id}`}>
                {contact.name}
              </h3>
              <WarmthIndicator level={contact.warmthLevel as "cold" | "warm" | "hot"} size="sm" />
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
            </div>

            {(contact.role || contact.company) && (
              <p className="text-sm text-muted-foreground truncate">
                {contact.role}
                {contact.role && contact.company && " at "}
                {contact.company}
              </p>
            )}

            <div className="flex items-center gap-3 mt-1">
              {introducedBy && (
                <p className="text-xs text-muted-foreground">
                  via {introducedBy.name}
                </p>
              )}
              {lastInteraction && (
                <p className="text-xs text-muted-foreground">
                  Last contact: {formatDistanceToNow(new Date(lastInteraction.createdAt), { addSuffix: true })}
                </p>
              )}
            </div>

            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Contact menu"
                data-testid={`button-contact-menu-${contact.id}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(contact)}>
                Edit contact
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(contact)}
                className="text-destructive"
              >
                Delete contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal flex-1 min-w-0">
            <Clock className="w-3 h-3 mr-1 shrink-0" />
            <span className="truncate">{suggestedAction}</span>
          </Badge>
          <Button
            size="sm"
            className="shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLogInteraction(contact);
            }}
            data-testid={`button-log-interaction-${contact.id}`}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Log
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getSuggestedAction(contact: Contact, lastInteraction?: Interaction | null): string {
  if (!lastInteraction) {
    return "Send initial outreach";
  }
  
  const daysSinceContact = Math.floor(
    (Date.now() - new Date(lastInteraction.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceContact > 7) {
    return "Follow up - it's been a week";
  }
  
  if (lastInteraction.outcome === "no_response") {
    return "Try a different channel";
  }
  
  if (lastInteraction.outcome === "response_received") {
    return "Continue the conversation";
  }
  
  return "Check in";
}
