import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractionForm } from './interaction-form';

interface InteractionFormModalProps {
  contactId: string;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InteractionFormModal({ contactId, contactName, isOpen, onClose }: InteractionFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Interaction with {contactName}</DialogTitle>
        </DialogHeader>
        <InteractionForm contactId={contactId} onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  );
}
