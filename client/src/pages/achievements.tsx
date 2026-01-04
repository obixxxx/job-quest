import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Award, Trophy, Flame, Mail, Users, Target, Zap, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import type { Badge } from "@shared/schema";

const badgeConfig: Record<string, { icon: typeof Award; color: string; description: string }> = {
  first_contact: { icon: Users, color: "text-blue-500", description: "Added your first contact" },
  first_interaction: { icon: Mail, color: "text-green-500", description: "Logged your first interaction" },
  streak_3: { icon: Flame, color: "text-orange-500", description: "Maintained a 3-day streak" },
  streak_7: { icon: Flame, color: "text-orange-600", description: "Maintained a 7-day streak" },
  streak_14: { icon: Flame, color: "text-red-500", description: "Maintained a 14-day streak" },
  intel_gatherer: { icon: Target, color: "text-purple-500", description: "Gathered intel 5 times" },
  networker: { icon: Users, color: "text-teal-500", description: "Added 10 contacts" },
  persistence: { icon: Zap, color: "text-yellow-500", description: "Followed up 10 times" },
  interview_master: { icon: Star, color: "text-game-os", description: "Scheduled 5 interviews" },
};

export default function AchievementsPage() {
  const { user } = useAuth();

  const { data: badges, isLoading } = useQuery<Badge[]>({
    queryKey: ["/api/badges"],
  });

  const allPossibleBadges = Object.entries(badgeConfig).map(([type, config]) => {
    const earned = badges?.find((b) => b.type === type);
    return {
      type,
      name: type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      ...config,
      earned: !!earned,
      earnedAt: earned?.earnedAt,
    };
  });

  const earnedCount = allPossibleBadges.filter((b) => b.earned).length;

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold">Achievements</h1>
        <p className="text-muted-foreground">Your job search milestones</p>
      </div>

      {/* Stats Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-game-os/10 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-game-os" />
              </div>
              <div>
                <p className="text-3xl font-mono font-bold">{earnedCount}</p>
                <p className="text-muted-foreground">Badges Earned</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-game-xp">{user?.totalXP || 0} XP</p>
              <p className="text-sm text-muted-foreground">Level {user?.currentLevel || 1}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Grid */}
      <div>
        <h2 className="font-semibold mb-4">All Badges</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allPossibleBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <Card
                key={badge.type}
                className={badge.earned ? "" : "opacity-50"}
                data-testid={`badge-${badge.type}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      badge.earned ? "bg-muted" : "bg-muted/50"
                    }`}>
                      <Icon className={`w-6 h-6 ${badge.earned ? badge.color : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{badge.name}</p>
                        {badge.earned && (
                          <UIBadge variant="secondary" className="text-xs">Earned</UIBadge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                      {badge.earned && badge.earnedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(badge.earnedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
