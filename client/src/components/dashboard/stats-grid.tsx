import { Calendar, Users, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsGridProps {
  interviewsScheduled: number;
  activeConversations: number;
  totalContacts: number;
  responseRate: number;
}

export function StatsGrid({
  interviewsScheduled,
  activeConversations,
  totalContacts,
  responseRate,
}: StatsGridProps) {
  const stats = [
    {
      label: "Interviews Scheduled",
      value: interviewsScheduled,
      icon: Calendar,
      color: "text-game-os",
    },
    {
      label: "Active Conversations",
      value: activeConversations,
      icon: MessageSquare,
      color: "text-game-xp",
    },
    {
      label: "Total Contacts",
      value: totalContacts,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Response Rate",
      value: `${responseRate}%`,
      icon: TrendingUp,
      color: "text-game-xp",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md bg-muted ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
