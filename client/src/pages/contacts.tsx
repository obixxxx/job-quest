import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactCard } from "@/components/contacts/contact-card";
import { ContactForm } from "@/components/contacts/contact-form";
import { InteractionForm } from "@/components/interactions/interaction-form";
import { useXPPopup } from "@/components/game/xp-popup";
import { useSideQuestBadge } from "@/components/game/side-quest-badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Contact, Interaction } from "@shared/schema";

interface ContactWithInteraction {
  contact: Contact;
  lastInteraction: Interaction | null;
}

export default function ContactsPage() {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const { showXPGain, XPPopupComponent } = useXPPopup();
  const { showBadge, BadgeComponent } = useSideQuestBadge();

  const [searchQuery, setSearchQuery] = useState("");
  const [warmthFilter, setWarmthFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { data: contactsData, isLoading } = useQuery<ContactWithInteraction[]>({
    queryKey: ["/api/contacts"],
  });

  const filteredContacts = contactsData?.filter((item) => {
    const matchesSearch =
      item.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contact.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWarmth = warmthFilter === "all" || item.contact.warmthLevel === warmthFilter;
    return matchesSearch && matchesWarmth;
  });

  const handleAddContact = async (data: any) => {
    setIsPending(true);
    try {
      await apiRequest("POST", "/api/contacts", data);
      setIsContactDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Contact added!", description: "Ready to start outreach" });
    } catch (error) {
      toast({
        title: "Failed to add contact",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleEditContact = async (data: any) => {
    if (!selectedContact) return;
    setIsPending(true);
    try {
      await apiRequest("PATCH", `/api/contacts/${selectedContact.id}`, data);
      setIsContactDialogOpen(false);
      setSelectedContact(null);
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact updated!" });
    } catch (error) {
      toast({
        title: "Failed to update contact",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    try {
      await apiRequest("DELETE", `/api/contacts/${contact.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Contact deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete contact",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleLogInteraction = (contact: Contact) => {
    setSelectedContact(contact);
    setIsInteractionDialogOpen(true);
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

      setIsInteractionDialogOpen(false);
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

      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      refreshUser();
      toast({ title: "Interaction logged!", description: `+${result.xpAwarded} XP earned` });
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

  const openEditDialog = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditMode(true);
    setIsContactDialogOpen(true);
  };

  const openAddDialog = () => {
    setSelectedContact(null);
    setIsEditMode(false);
    setIsContactDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {XPPopupComponent}
      {BadgeComponent}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Contacts</h1>
          <p className="text-muted-foreground">Manage your network</p>
        </div>
        <Button onClick={openAddDialog} data-testid="button-add-contact">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-contacts"
          />
        </div>
        <Select value={warmthFilter} onValueChange={setWarmthFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-warmth-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by warmth" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warmth Levels</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredContacts && filteredContacts.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((item) => (
            <ContactCard
              key={item.contact.id}
              contact={item.contact}
              lastInteraction={item.lastInteraction}
              nextAction={item.nextAction}
              onLogInteraction={handleLogInteraction}
              onEdit={openEditDialog}
              onDelete={handleDeleteContact}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No contacts found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || warmthFilter !== "all"
              ? "Try adjusting your filters"
              : "Add your first contact to get started"}
          </p>
          {!searchQuery && warmthFilter === "all" && (
            <Button onClick={openAddDialog} data-testid="button-add-first-contact">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Contact
            </Button>
          )}
        </div>
      )}

      {/* Contact Dialog */}
      <Dialog
        open={isContactDialogOpen}
        onOpenChange={(open) => {
          setIsContactDialogOpen(open);
          if (!open) {
            setSelectedContact(null);
            setIsEditMode(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Contact" : "Add New Contact"}</DialogTitle>
          </DialogHeader>
          <ContactForm
            contact={isEditMode ? selectedContact ?? undefined : undefined}
            onSubmit={isEditMode ? handleEditContact : handleAddContact}
            onCancel={() => setIsContactDialogOpen(false)}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

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
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
