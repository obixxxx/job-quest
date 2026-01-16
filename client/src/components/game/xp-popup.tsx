import { useEffect, useState } from "react";
import { Confetti } from "./confetti";

interface XPPopupProps {
  xp: number;
  os?: number;
  onComplete?: () => void;
}

export function XPPopup({ xp, os = 0, onComplete }: XPPopupProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti immediately
    setShowConfetti(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <>
      {/* Confetti effect */}
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      {/* Full-screen success overlay with gradient */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* Green gradient background overlay - Duolingo-style */}
        <div className="absolute inset-0 bg-gradient-to-b from-game-xp/20 via-game-xp/10 to-transparent animate-float-up" />

        {/* Center content with bounce animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in">
            {/* Card with glow effect */}
            <div className="relative">
              {/* Glow effect behind card */}
              <div className="absolute inset-0 bg-game-xp/30 blur-3xl rounded-full scale-150" />

              {/* Main card */}
              <div className="relative bg-gradient-to-br from-game-xp via-game-xp-light to-game-xp rounded-3xl px-12 py-8 shadow-2xl border-4 border-game-xp-light/50">
                <div className="flex flex-col items-center gap-3">
                  {xp > 0 && (
                    <div className="flex flex-col items-center">
                      <div className="text-white/90 text-xl font-semibold mb-1 tracking-wide">
                        XP GAINED!
                      </div>
                      <div className="font-mono text-7xl font-black text-white drop-shadow-2xl tracking-tight">
                        +{xp}
                      </div>
                      <div className="text-white/80 text-2xl font-bold tracking-wider mt-1">
                        XP
                      </div>
                    </div>
                  )}
                  {os > 0 && (
                    <div className="flex flex-col items-center mt-2 pt-4 border-t-2 border-white/30">
                      <div className="text-white/90 text-lg font-semibold mb-1">
                        BONUS OUTCOME STRENGTH
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-5xl font-black text-game-os drop-shadow-2xl">
                          +{os}
                        </span>
                        <span className="text-white/80 text-xl font-bold">
                          OS
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
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
