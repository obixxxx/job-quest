import { Mail, MessageSquare, MoreHorizontal, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import type { Contact, Interaction } from "@shared/schema";

interface ContactCardProps {
  contact: Contact;
  lastInteraction?: Interaction | null;
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

export function ContactCard({
  contact,
  lastInteraction,
  onLogInteraction,
  onEdit,
  onDelete,
}: ContactCardProps) {
  const suggestedAction = getSuggestedAction(contact, lastInteraction);

  return (
    <Card className="hover-elevate" data-testid={`contact-card-${contact.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className={`${getAvatarColor(contact.name)} text-white text-sm`}>
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate" data-testid={`text-contact-name-${contact.id}`}>
                {contact.name}
              </h3>
              <WarmthIndicator level={contact.warmthLevel as "cold" | "warm" | "hot"} size="sm" />
            </div>
            
            {(contact.role || contact.company) && (
              <p className="text-sm text-muted-foreground truncate">
                {contact.role}
                {contact.role && contact.company && " at "}
                {contact.company}
              </p>
            )}
            
            {lastInteraction && (
              <p className="text-xs text-muted-foreground mt-1">
                Last contact: {formatDistanceToNow(new Date(lastInteraction.createdAt), { addSuffix: true })}
              </p>
            )}
            
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-contact-menu-${contact.id}`}>
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
        
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {suggestedAction}
          </p>
          <Button 
            size="sm" 
            onClick={() => onLogInteraction(contact)}
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
