import { Badge } from '@/components/ui/badge';
import { Briefcase, DollarSign, Users, PhoneCall, XCircle } from 'lucide-react';

interface OutcomeBadgeProps {
  outcome: {
    type: string;
    description: string;
    revenueAmount?: number | null;
  };
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
  };

  const Icon = icons[outcome.type as keyof typeof icons] || Briefcase;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
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
