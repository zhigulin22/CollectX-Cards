import type { Card } from '../types';

interface Props {
  card: Card;
}

export function CardTile({ card }: Props) {
  return (
    <div
      className="aspect-[3/4] rounded-3xl bg-gradient-to-b from-white/[0.06] to-black
                 border border-white/10 flex items-center justify-center relative overflow-hidden"
    >
      <span className="text-5xl">{card.emoji}</span>
      <span
        className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full
                   bg-black/50 text-white/70"
      >
        {card.rarity.toUpperCase()}
      </span>
    </div>
  );
}


