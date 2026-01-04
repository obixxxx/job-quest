import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

const colors = [
  "hsl(142, 76%, 36%)", // xp green
  "hsl(37, 92%, 50%)", // os gold
  "hsl(280, 65%, 60%)", // side-quest purple
  "hsl(221, 83%, 53%)", // blue
  "hsl(0, 84%, 60%)", // red
];

export function Confetti({ onComplete }: { onComplete?: () => void }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < 50; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
      });
    }
    setPieces(newPieces);

    const timer = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${piece.x}%`,
            top: -20,
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

export function useConfetti() {
  const [isShowing, setIsShowing] = useState(false);

  const showConfetti = () => setIsShowing(true);

  const ConfettiComponent = isShowing ? (
    <Confetti onComplete={() => setIsShowing(false)} />
  ) : null;

  return { showConfetti, ConfettiComponent };
}
