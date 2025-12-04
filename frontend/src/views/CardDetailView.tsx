import { useState } from 'react';
import { Card, useCardsStore } from '../cards/store';
import { useStore } from '../store';

interface CardDetailViewProps {
  card: Card;
  onBack: () => void;
}

export function CardDetailView({ card, onBack }: CardDetailViewProps) {
  const { sellCard, isLoading } = useCardsStore();
  const { refreshBalance } = useStore();
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellCurrency, setSellCurrency] = useState<'usdt' | 'x'>('x');
  const [error, setError] = useState<string | null>(null);

  const rarityConfig = {
    common: { 
      bg: 'from-slate-600 to-slate-800', 
      border: 'border-slate-500',
      text: 'text-slate-400',
      label: 'Common',
      labelBg: 'bg-slate-500'
    },
    rare: { 
      bg: 'from-blue-600 to-blue-800', 
      border: 'border-blue-500',
      text: 'text-blue-400',
      label: 'Rare',
      labelBg: 'bg-blue-500'
    },
    epic: { 
      bg: 'from-purple-600 to-purple-800', 
      border: 'border-purple-500',
      text: 'text-purple-400',
      label: 'Epic',
      labelBg: 'bg-purple-500'
    },
    legendary: { 
      bg: 'from-amber-500 via-yellow-500 to-orange-600', 
      border: 'border-amber-400',
      text: 'text-amber-400',
      label: 'Legendary',
      labelBg: 'bg-gradient-to-r from-amber-500 to-orange-500'
    },
  };

  const config = rarityConfig[card.rarity];

  const handleSell = async () => {
    setError(null);
    try {
      await sellCard(card.id, sellCurrency);
      await refreshBalance();
      onBack();
    } catch (e: any) {
      setError(e.message);
    }
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
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{card.name}</h1>
          <p className={`text-xs ${config.text}`}>{config.label} • {card.collectionName}</p>
        </div>
      </header>

      {/* Card Display */}
      <div className="flex-1 overflow-auto px-5 pb-5">
        {/* Card Image */}
        <div className="relative mx-auto w-56 aspect-[3/4] mb-5">
          <div className={`absolute inset-0 bg-gradient-to-br ${config.bg} rounded-2xl border-2 ${config.border} shadow-2xl overflow-hidden`}>
            {/* Background effects */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent" />
            </div>

            {/* Card content */}
            <div className="relative z-10 p-3 h-full flex flex-col">
              {/* Rarity badge */}
              <div className={`${config.labelBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full self-start`}>
                {config.label}
              </div>

              {/* Card image/emoji */}
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg my-2">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                ) : (
                  <span className="text-7xl drop-shadow-lg">{card.emoji}</span>
                )}
              </div>

              {/* Card info */}
              <div className="text-center">
                <p className="text-white text-lg font-bold mb-0.5">{card.name}</p>
                <p className="text-white/60 text-xs">#{card.serialNumber.toString().padStart(4, '0')}</p>
              </div>
            </div>

            {/* Legendary shine */}
            {card.rarity === 'legendary' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shine-slow rounded-2xl" />
            )}
          </div>
        </div>

        {/* Card Details */}
        <div className="space-y-3">
          {/* Description */}
          {card.description && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Description</p>
              <p className="text-white text-sm">{card.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Serial</p>
              <p className="text-white font-bold">#{card.serialNumber}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Minted</p>
              <p className="text-white font-bold text-sm">
                {new Date(card.mintedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Sell Value */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-violet-500/10 rounded-xl p-3 border border-white/10">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Sell Value</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-emerald-500/20 rounded-lg p-2 text-center border border-emerald-500/30">
                <span className="text-emerald-400 text-lg font-bold">${card.sellPrice.usdt}</span>
                <p className="text-emerald-400/60 text-[10px]">USDT</p>
              </div>
              <div className="flex-1 bg-violet-500/20 rounded-lg p-2 text-center border border-violet-500/30">
                <span className="text-violet-400 text-lg font-bold">{card.sellPrice.x}</span>
                <p className="text-violet-400/60 text-[10px]">$X</p>
              </div>
            </div>
          </div>

          {/* Sell Button */}
          <button
            onClick={() => setShowSellModal(true)}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/30 hover:shadow-xl active:scale-[0.98] transition-all"
          >
            💰 Sell This Card
          </button>
        </div>
      </div>

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-5 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-1">Sell Card</h3>
            <p className="text-white/60 text-sm mb-4">Choose your preferred currency</p>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 mb-4">
                <p className="text-rose-400 text-xs text-center">{error}</p>
              </div>
            )}

            {/* Currency Options */}
            <div className="space-y-2 mb-4">
              <button
                onClick={() => setSellCurrency('usdt')}
                className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                  sellCurrency === 'usdt'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">💵</span>
                  <span className="text-white font-medium text-sm">USDT</span>
                </div>
                <span className="text-emerald-400 font-bold">${card.sellPrice.usdt}</span>
              </button>
              <button
                onClick={() => setSellCurrency('x')}
                className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                  sellCurrency === 'x'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <span className="text-white font-medium text-sm">$X Token</span>
                </div>
                <span className="text-violet-400 font-bold">{card.sellPrice.x} $X</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSellModal(false)}
                className="flex-1 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                disabled={isLoading}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </span>
                ) : (
                  'Confirm Sell'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
