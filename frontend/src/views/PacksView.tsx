import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useCardsStore, Pack, Card } from '../cards/store';
import { formatNum } from '../utils/format';

interface PacksViewProps {
  onBack: () => void;
  onOpenPack: (pack: Pack, cards: Card[]) => void;
}

export function PacksView({ onBack, onOpenPack }: PacksViewProps) {
  const { balanceUsdt, balanceX, refreshBalance } = useStore();
  const { packs, openPack, canOpenFreePack, getTimeUntilFreePack, isLoading, openedCards, loadPacks } = useCardsStore();
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [payWith, setPayWith] = useState<'usdt' | 'x'>('x');
  const [error, setError] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Load packs on mount
  useEffect(() => {
    loadPacks();
  }, []);

  // Update countdown timers
  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, number> = {};
      packs.forEach(p => {
        if (!p.price && (p.cooldown || p.cooldownSeconds)) {
          newCountdowns[p.id] = getTimeUntilFreePack(p.id);
        }
      });
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const timer = setInterval(updateCountdowns, 1000);
    return () => clearInterval(timer);
  }, [packs]);

  // Handle opened cards
  useEffect(() => {
    if (openedCards.length > 0 && selectedPack) {
      onOpenPack(selectedPack, openedCards);
      setSelectedPack(null);
    }
  }, [openedCards]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOpenPack = async (pack: Pack) => {
    setError(null);
    setSelectedPack(pack);

    // Check if it's a free pack
    const isFree = !pack.price;

    // Check balance for paid packs
    if (!isFree && pack.price) {
      const price = payWith === 'usdt' ? pack.price.usdt : pack.price.x;
      const balance = payWith === 'usdt' ? parseFloat(balanceUsdt) : parseFloat(balanceX);
      
      if (balance < price) {
        setError(`Insufficient ${payWith.toUpperCase()} balance`);
        setSelectedPack(null);
        return;
      }
    }

    try {
      await openPack(pack.id, payWith);
      // Refresh wallet balance after purchase
      await refreshBalance();
    } catch (e: any) {
      setError(e.message);
      setSelectedPack(null);
    }
  };

  const canAfford = (pack: Pack) => {
    const isFree = !pack.price;
    if (isFree) return canOpenFreePack(pack.id);
    
    if (!pack.price) return false;
    const price = payWith === 'usdt' ? pack.price.usdt : pack.price.x;
    const balance = payWith === 'usdt' ? parseFloat(balanceUsdt) : parseFloat(balanceX);
    return balance >= price;
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <header className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Open Packs</h1>
          <p className="text-white/40 text-xs">Collect rare cards</p>
        </div>
      </header>

      {/* Currency Toggle */}
      <div className="px-5 pb-3">
        <div className="bg-white/5 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setPayWith('x')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              payWith === 'x'
                ? 'bg-violet-500 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <span>🪙</span>
            <span>{formatNum(balanceX)} $X</span>
          </button>
          <button
            onClick={() => setPayWith('usdt')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              payWith === 'usdt'
                ? 'bg-emerald-500 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <span>💵</span>
            <span>${formatNum(balanceUsdt)}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 pb-3">
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5">
            <p className="text-rose-400 text-xs text-center">{error}</p>
          </div>
        </div>
      )}

      {/* Packs List */}
      <div className="flex-1 overflow-auto px-5 pb-5 space-y-3">
        {packs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <span className="text-4xl mb-3">📦</span>
            <p className="text-white/40">No packs available</p>
            <p className="text-white/20 text-sm">Check back later!</p>
          </div>
        ) : (
          packs.map((pack) => {
            const isFree = !pack.price;
            const canOpen = isFree ? canOpenFreePack(pack.id) : canAfford(pack);
            const price = isFree || !pack.price ? 0 : (payWith === 'usdt' ? pack.price.usdt : pack.price.x);
            const countdown = countdowns[pack.id] || 0;

            return (
              <div
                key={pack.id}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${pack.gradient} p-[1px]`}
              >
                <div className="relative bg-black/70 backdrop-blur-xl rounded-2xl p-4">
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shine rounded-2xl" />

                  <div className="relative z-10">
                    <div className="flex items-start gap-3">
                      {/* Pack Icon */}
                      <div className={`w-14 h-14 bg-gradient-to-br ${pack.gradient} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <span className="text-2xl">{pack.icon}</span>
                      </div>

                      {/* Pack Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold">{pack.name}</h3>
                        <p className="text-white/60 text-xs mt-0.5 line-clamp-2">{pack.description}</p>
                        
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-white/40 text-[10px]">
                            {pack.cardsCount} cards
                          </span>
                          {pack.guaranteedRarity && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              pack.guaranteedRarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' :
                              pack.guaranteedRarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              1 {pack.guaranteedRarity}+
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Open Button */}
                    <button
                      onClick={() => handleOpenPack(pack)}
                      disabled={!canOpen || isLoading}
                      className={`w-full mt-3 py-3 rounded-xl font-semibold text-sm transition-all ${
                        canOpen && !isLoading
                          ? `bg-gradient-to-r ${pack.gradient} text-white shadow-lg hover:shadow-xl active:scale-[0.98]`
                          : 'bg-white/10 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      {isLoading && selectedPack?.id === pack.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Opening...
                        </span>
                      ) : isFree ? (
                        canOpenFreePack(pack.id) ? (
                          '🎁 Open Free Pack'
                        ) : (
                          `⏱️ ${formatTime(countdown)}`
                        )
                      ) : (
                        `Open for ${price} ${payWith === 'usdt' ? 'USDT' : '$X'}`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
