import { useEffect, useState } from "react";

interface XPPopupProps {
  xp: number;
  os?: number;
  onComplete?: () => void;
}

export function XPPopup({ xp, os = 0, onComplete }: XPPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="animate-float-up flex flex-col items-center gap-1">
        {xp > 0 && (
          <span className="font-mono text-4xl font-bold text-game-xp drop-shadow-lg">
            +{xp} XP
          </span>
        )}
        {os > 0 && (
          <span className="font-mono text-2xl font-bold text-game-os drop-shadow-lg">
            +{os} OS
          </span>
        )}
      </div>
    </div>
  );
}

export function useXPPopup() {
  const [popup, setPopup] = useState<{ xp: number; os: number; key: number } | null>(null);

  const showXPGain = (xp: number, os: number = 0) => {
    setPopup({ xp, os, key: Date.now() });
  };

  const XPPopupComponent = popup ? (
    <XPPopup
      key={popup.key}
      xp={popup.xp}
      os={popup.os}
      onComplete={() => setPopup(null)}
    />
  ) : null;

  return { showXPGain, XPPopupComponent };
}
