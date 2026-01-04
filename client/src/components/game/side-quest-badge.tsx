import { useEffect, useState } from "react";
import { Award } from "lucide-react";

interface SideQuestBadgeProps {
  title: string;
  description?: string;
  onComplete?: () => void;
}

export function SideQuestBadge({ title, description, onComplete }: SideQuestBadgeProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-game-side-quest/10 border border-game-side-quest/30 rounded-md p-4 flex items-center gap-3 shadow-lg max-w-xs">
        <div className="w-12 h-12 rounded-full bg-game-side-quest/20 flex items-center justify-center animate-bounce-in">
          <Award className="w-6 h-6 text-game-side-quest" />
        </div>
        <div>
          <p className="text-xs font-semibold text-game-side-quest uppercase tracking-wide">
            Side Quest Complete!
          </p>
          <p className="font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function useSideQuestBadge() {
  const [badge, setBadge] = useState<{ title: string; description?: string; key: number } | null>(null);

  const showBadge = (title: string, description?: string) => {
    setBadge({ title, description, key: Date.now() });
  };

  const BadgeComponent = badge ? (
    <SideQuestBadge
      key={badge.key}
      title={badge.title}
      description={badge.description}
      onComplete={() => setBadge(null)}
    />
  ) : null;

  return { showBadge, BadgeComponent };
}
