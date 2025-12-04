import { useState, useEffect } from 'react';
import { Card } from '../cards/store';

interface PackOpeningViewProps {
  cards: Card[];
  onComplete: () => void;
}

export function PackOpeningView({ cards, onComplete }: PackOpeningViewProps) {
  const [phase, setPhase] = useState<'intro' | 'revealing' | 'complete'>('intro');
  const [revealedCount, setRevealedCount] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  // Start revealing after intro
  useEffect(() => {
    const introTimer = setTimeout(() => {
      setPhase('revealing');
    }, 1500);
    return () => clearTimeout(introTimer);
  }, []);

  // Auto-flip cards one by one
  useEffect(() => {
    if (phase !== 'revealing') return;

    const flipTimer = setInterval(() => {
      setFlippedCards(prev => {
        const next = new Set(prev);
        if (next.size < cards.length) {
          next.add(next.size);
        }
        return next;
      });
      setRevealedCount(prev => Math.min(prev + 1, cards.length));
    }, 600);

    return () => clearInterval(flipTimer);
  }, [phase, cards.length]);

  // Check if all cards revealed
  useEffect(() => {
    if (revealedCount === cards.length && phase === 'revealing') {
      setTimeout(() => setPhase('complete'), 500);
    }
  }, [revealedCount, cards.length, phase]);

  const rarityConfig = {
    common: { 
      bg: 'from-slate-600 to-slate-800', 
      border: 'border-slate-500',
      glow: '',
      label: 'Common',
      labelBg: 'bg-slate-500'
    },
    rare: { 
      bg: 'from-blue-500 to-blue-700', 
      border: 'border-blue-400',
      glow: 'shadow-blue-500/50',
      label: 'Rare',
      labelBg: 'bg-blue-500'
    },
    epic: { 
      bg: 'from-purple-500 to-purple-700', 
      border: 'border-purple-400',
      glow: 'shadow-purple-500/50',
      label: 'Epic',
      labelBg: 'bg-purple-500'
    },
    legendary: { 
      bg: 'from-amber-400 via-yellow-500 to-orange-500', 
      border: 'border-amber-400',
      glow: 'shadow-amber-500/60',
      label: 'Legendary',
      labelBg: 'bg-gradient-to-r from-amber-500 to-orange-500'
    },
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[100px] animate-float-delayed" />
        
        {/* Particles */}
        {phase !== 'intro' && Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/60 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {/* Intro Phase */}
        {phase === 'intro' && (
          <div className="text-center animate-scale-in">
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl animate-bounce-slow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl">🎁</span>
              </div>
              {/* Glow rings */}
              <div className="absolute inset-0 border-4 border-violet-400/50 rounded-3xl animate-ping" />
              <div className="absolute -inset-4 border-2 border-violet-400/30 rounded-[2rem] animate-ping animation-delay-200" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Opening Pack...</h2>
            <p className="text-white/60">{cards.length} cards incoming!</p>
          </div>
        )}

        {/* Revealing Phase */}
        {(phase === 'revealing' || phase === 'complete') && (
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                {phase === 'complete' ? '🎉 Pack Opened!' : 'Revealing Cards...'}
              </h2>
              <p className="text-white/60 mt-1">
                {revealedCount} / {cards.length} cards
              </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-3 gap-3">
              {cards.map((card, index) => {
                const isFlipped = flippedCards.has(index);
                const config = rarityConfig[card.rarity];

                return (
                  <div
                    key={card.id}
                    className="aspect-[3/4] perspective-1000"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div
                      className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
                        isFlipped ? 'rotate-y-180' : ''
                      }`}
                    >
                      {/* Card Back */}
                      <div className="absolute inset-0 backface-hidden">
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 border-2 border-violet-400/50 flex items-center justify-center">
                          <div className="text-4xl animate-pulse">❓</div>
                        </div>
                      </div>

                      {/* Card Front */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180">
                        <div className={`w-full h-full rounded-xl bg-gradient-to-br ${config.bg} border-2 ${config.border} ${card.rarity !== 'common' ? `shadow-lg ${config.glow}` : ''} overflow-hidden`}>
                          {/* Card content */}
                          <div className="p-2 h-full flex flex-col">
                            {/* Rarity label */}
                            <div className={`${config.labelBg} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full self-start mb-1`}>
                              {config.label}
                            </div>
                            
                            {/* Card image/emoji */}
                            <div className="flex-1 flex items-center justify-center bg-black/20 rounded-lg">
                              <span className="text-3xl">{card.emoji}</span>
                            </div>
                            
                            {/* Card name */}
                            <div className="mt-1 text-center">
                              <p className="text-white text-[10px] font-semibold truncate">{card.name}</p>
                              <p className="text-white/50 text-[8px]">#{card.serialNumber}</p>
                            </div>
                          </div>

                          {/* Legendary shine effect */}
                          {card.rarity === 'legendary' && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shine-slow rounded-xl" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {phase === 'complete' && (
              <div className="mt-6 animate-fade-in">
                <div className="bg-white/5 rounded-2xl p-4 mb-4">
                  <div className="flex justify-center gap-4 text-center">
                    {(['common', 'rare', 'epic', 'legendary'] as const).map(rarity => {
                      const count = cards.filter(c => c.rarity === rarity).length;
                      if (count === 0) return null;
                      return (
                        <div key={rarity}>
                          <div className={`w-8 h-8 rounded-lg ${rarityConfig[rarity].labelBg} flex items-center justify-center mx-auto mb-1`}>
                            <span className="text-white font-bold text-sm">{count}</span>
                          </div>
                          <p className="text-white/40 text-xs capitalize">{rarity}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={onComplete}
                  className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-2xl shadow-lg shadow-violet-500/30 hover:shadow-xl active:scale-[0.98] transition-all"
                >
                  Collect Cards
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

