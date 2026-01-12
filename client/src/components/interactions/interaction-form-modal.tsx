import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractionForm } from './interaction-form';
import type { Contact } from '@shared/schema';

interface InteractionFormModalProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending?: boolean;
}

export function InteractionFormModal({ contact, isOpen, onClose, onSubmit, isPending }: InteractionFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Interaction with {contact.name}</DialogTitle>
        </DialogHeader>
        <InteractionForm
          contact={contact}
          onSubmit={onSubmit}
          onCancel={onClose}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
