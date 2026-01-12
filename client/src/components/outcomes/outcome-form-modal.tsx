import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertOutcome } from '@shared/schema';

interface OutcomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
}

export function OutcomeFormModal({ isOpen, onClose, contactId, contactName }: OutcomeFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [type, setType] = useState('interview');
  const [description, setDescription] = useState('');
  const [outcomeDate, setOutcomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [revenueAmount, setRevenueAmount] = useState('');
  const [revenueType, setRevenueType] = useState('one_time');
  const [sourceType, setSourceType] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: InsertOutcome) =>
      apiRequest('POST', '/api/outcomes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/outcomes/analytics'] });
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/detail`] });
      toast({ title: 'Outcome recorded successfully' });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({ title: 'Failed to record outcome', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setType('interview');
    setDescription('');
    setOutcomeDate(new Date().toISOString().split('T')[0]);
    setRevenueAmount('');
    setRevenueType('one_time');
    setSourceType('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({ title: 'Description is required', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      contactId,
      contactName, // For referral notes
      type,
      description: description.trim(),
      outcomeDate,
      revenueAmount: revenueAmount ? parseInt(revenueAmount) : null,
      revenueType: revenueAmount ? revenueType : null,
      sourceType: sourceType || null,
    });
  };

  const showRevenueFields = type === 'job_offer' || type === 'client_project';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Outcome</DialogTitle>
          <DialogDescription>
            Log a major milestone with {contactName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Outcome Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="job_offer">Job Offer</SelectItem>
                <SelectItem value="client_project">Client Project</SelectItem>
                <SelectItem value="introduction_made">Introduction Made</SelectItem>
                <SelectItem value="referral_obtained">Referral Obtained</SelectItem>
                <SelectItem value="dead_end">Dead End</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>How You Met (optional)</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue placeholder="How did you meet?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing_friend">Existing Friend/Family</SelectItem>
                <SelectItem value="former_colleague">Former Colleague</SelectItem>
                <SelectItem value="referral">Referral/Introduction</SelectItem>
                <SelectItem value="mutual_connection">Mutual Connection</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="event">Event/Conference</SelectItem>
                <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Phone screen for Senior Engineer role"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={outcomeDate}
              onChange={(e) => setOutcomeDate(e.target.value)}
            />
          </div>

          {showRevenueFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="revenue">Revenue Amount (optional)</Label>
                <Input
                  id="revenue"
                  type="number"
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              {revenueAmount && (
                <div className="space-y-2">
                  <Label>Revenue Type</Label>
                  <Select value={revenueType} onValueChange={setRevenueType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">Salary (annual)</SelectItem>
                      <SelectItem value="one_time">One-time project</SelectItem>
                      <SelectItem value="monthly_recurring">Monthly recurring</SelectItem>
                      <SelectItem value="yearly_recurring">Yearly recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Record Outcome'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
