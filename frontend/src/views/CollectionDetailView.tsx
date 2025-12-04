import { useCardsStore, Card, Collection, Rarity } from '../cards/store';

interface CollectionDetailViewProps {
  collection: Collection;
  onBack: () => void;
  onCardClick: (card: Card) => void;
}

export function CollectionDetailView({ collection, onBack, onCardClick }: CollectionDetailViewProps) {
  const { myCards } = useCardsStore();
  
  const collectionCards = myCards.filter(c => c.collectionId === collection.id);
  const progress = collection.totalCards > 0 
    ? Math.round((collectionCards.length / collection.totalCards) * 100) 
    : 0;

  // Group by rarity
  const byRarity = {
    legendary: collectionCards.filter(c => c.rarity === 'legendary'),
    epic: collectionCards.filter(c => c.rarity === 'epic'),
    rare: collectionCards.filter(c => c.rarity === 'rare'),
    common: collectionCards.filter(c => c.rarity === 'common'),
  };

  const rarityColors = {
    common: 'from-slate-500/30 to-slate-600/10 border-slate-500/30',
    rare: 'from-blue-500/30 to-blue-600/10 border-blue-500/30',
    epic: 'from-purple-500/30 to-purple-600/10 border-purple-500/30',
    legendary: 'from-amber-500/30 to-amber-600/10 border-amber-500/30 shadow-lg shadow-amber-500/20',
  };

  const rarityBadges = {
    common: 'bg-slate-500',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-gradient-to-r from-amber-500 to-orange-500',
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Hero Header */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/30 via-purple-600/20 to-transparent" />
        
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-5 left-5 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Collection info */}
        <div className="relative z-10 px-6 pt-16 pb-6">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-2xl">
            {collection.imageUrl ? (
              <img src={collection.imageUrl} alt={collection.name} className="w-full h-full object-cover rounded-3xl" />
            ) : (
              <span className="text-5xl">{collection.icon}</span>
            )}
          </div>

          {/* Name & Description */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">{collection.name}</h1>
          <p className="text-white/60 text-center text-sm max-w-xs mx-auto">{collection.description}</p>

          {/* Progress */}
          <div className="mt-6 max-w-xs mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">Collection Progress</span>
              <span className="text-white font-medium">{collectionCards.length}/{collection.totalCards}</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-white/40 text-xs mt-2">{progress}% Complete</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-4 gap-2">
          {(['legendary', 'epic', 'rare', 'common'] as const).map(rarity => (
            <div key={rarity} className={`rounded-xl p-3 text-center ${rarityBadges[rarity]} bg-opacity-20`}>
              <p className="text-white font-bold text-lg">{byRarity[rarity].length}</p>
              <p className="text-white/60 text-[10px] uppercase">{rarity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {collectionCards.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">{collection.icon}</span>
            </div>
            <p className="text-white/40 mb-1">No cards yet</p>
            <p className="text-white/20 text-sm">Open packs to collect cards from this collection!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {collectionCards.map((card) => (
              <div
                key={card.id}
                className={`rounded-2xl bg-gradient-to-br ${rarityColors[card.rarity]} border p-[2px] transition-all hover:scale-[1.02] relative overflow-hidden group`}
              >
                <div className="w-full rounded-2xl bg-[#0D0D0D] overflow-hidden">
                  {/* Card image area */}
                  <button
                    onClick={() => onCardClick(card)}
                    className="w-full aspect-square relative overflow-hidden"
                  >
                    {/* Background glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[card.rarity]} opacity-20`} />
                    
                    {/* Rarity badge */}
                    <div className={`absolute top-2 left-2 ${rarityBadges[card.rarity]} text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-10 shadow-lg`}>
                      {card.rarity === 'legendary' ? '👑' : card.rarity === 'epic' ? '💜' : card.rarity === 'rare' ? '💎' : '⚪'} {card.rarity.toUpperCase()}
                    </div>
                    
                    {/* Serial number */}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white/70 text-[9px] font-mono px-1.5 py-0.5 rounded z-10">
                      #{card.serialNumber.toString().padStart(4, '0')}
                    </div>
                    
                    {/* Card image */}
                    <div className="w-full h-full flex items-center justify-center p-4">
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt={card.name} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                      ) : (
                        <span className="text-5xl drop-shadow-lg">{card.emoji}</span>
                      )}
                    </div>

                    {/* Legendary shine */}
                    {card.rarity === 'legendary' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    )}
                  </button>
                  
                  {/* Card info footer */}
                  <div className="p-3 border-t border-white/5">
                    {/* Name */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{card.name}</p>
                        <p className="text-white/40 text-[10px]">Serial #{card.serialNumber}</p>
                      </div>
                      {/* Value */}
                      <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
                        <p className="text-emerald-400 text-xs font-bold">${card.sellPrice.usdt}</p>
                      </div>
                    </div>
                    
                    {/* Quick actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onCardClick(card)}
                        className="flex-1 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 text-violet-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 border border-violet-500/20"
                      >
                        <span>✨</span> View Card
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

