import { useEffect, useState } from "react";

const CORES = ["#ffffff", "#e5e5e5", "#a3a3a3", "#737373", "#fafafa", "#d4d4d4"];

type Peca = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  cor: string;
  size: number;
  rotate: number;
};

export function Confetti({ quantidade = 90 }: { quantidade?: number }) {
  const [pecas, setPecas] = useState<Peca[]>([]);

  // Gerado só no cliente para não divergir do HTML do servidor
  useEffect(() => {
    setPecas(
      Array.from({ length: quantidade }, (_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.4 + Math.random() * 2,
        cor: CORES[id % CORES.length],
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
      })),
    );
  }, [quantidade]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pecas.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.cor,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
