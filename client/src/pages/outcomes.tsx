import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { DollarSign, Briefcase, Users } from 'lucide-react';

export default function Outcomes() {
  const { data: outcomesData, isLoading: outcomesLoading } = useQuery({
    queryKey: ['/api/outcomes'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/outcomes');
      return res.json();
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/outcomes/analytics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/outcomes/analytics');
      return res.json();
    },
  });

  if (outcomesLoading || analyticsLoading) {
    return <div className="p-8">Loading outcomes...</div>;
  }

  const outcomes = outcomesData?.outcomes || [];

  // Calculate summary stats
  const jobOffers = outcomes.filter((o: any) => o.outcome.type === 'job_offer').length;
  const clientProjects = outcomes.filter((o: any) => o.outcome.type === 'client_project').length;
  const totalRevenue = analytics?.totalRevenue || 0;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Outcomes & Results</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Job Offers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobOffers}</div>
            <p className="text-xs text-muted-foreground">Offers received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Client Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientProjects}</div>
            <p className="text-xs text-muted-foreground">Projects landed</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Outcome Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p className="text-muted-foreground">No outcomes recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {outcomes.map((item: any) => {
                const outcome = item.outcome;
                const contact = item.contact;

                return (
                  <div key={outcome.id} className="border-l-2 border-primary pl-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getOutcomeBadgeVariant(outcome.type)}>
                            {outcome.type.replace('_', ' ')}
                          </Badge>
                          <span className="font-semibold">{contact.name}</span>
                          {contact.company && (
                            <span className="text-muted-foreground">• {contact.company}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(outcome.outcomeDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {outcome.revenueAmount && (
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            ${outcome.revenueAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {outcome.revenueType?.replace('_', ' ')}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm">{outcome.description}</p>
                    {outcome.interactionCount !== null && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {outcome.interactionCount} interactions over {outcome.durationDays} days
                        {outcome.sourceType && ` • Source: ${outcome.sourceType.replace('_', ' ')}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getOutcomeBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case 'job_offer':
      return 'default';
    case 'client_project':
      return 'default';
    case 'interview':
      return 'secondary';
    case 'introduction_made':
    case 'referral_obtained':
      return 'outline';
    case 'dead_end':
      return 'destructive';
    default:
      return 'outline';
  }
}
