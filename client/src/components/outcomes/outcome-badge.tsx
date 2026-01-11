import { Badge } from '@/components/ui/badge';
import { Briefcase, DollarSign, Users, PhoneCall, XCircle, HelpCircle } from 'lucide-react';
import type { Outcome } from '@shared/schema';

interface OutcomeBadgeProps {
  outcome: Pick<Outcome, 'type' | 'description' | 'revenueAmount'>;
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const icons = {
    job_offer: Briefcase,
    client_project: DollarSign,
    interview: PhoneCall,
    introduction_made: Users,
    referral_obtained: Users,
    dead_end: XCircle,
    other: Briefcase,
  } as const;

  const outcomeType = outcome.type as keyof typeof icons;
  const Icon = icons[outcomeType];
  const isUnknownType = !Icon;

  if (isUnknownType) {
    console.warn(`Unknown outcome type encountered: "${outcome.type}". Falling back to default icon.`);
  }

  const DisplayIcon = Icon || HelpCircle;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`flex items-center gap-1 ${isUnknownType ? 'border-amber-500 text-amber-600' : ''}`}
      >
        <DisplayIcon className="h-3 w-3" />
        {outcome.type.replace('_', ' ')}
      </Badge>
      {outcome.revenueAmount && (
        <Badge variant="default" className="bg-green-600">
          ${outcome.revenueAmount.toLocaleString()}
        </Badge>
      )}
    </div>
  );
}
