import { useState } from 'react';
import { useCardsStore, Card, Rarity } from '../cards/store';

interface CollectionViewProps {
  onBack: () => void;
  onCardClick: (card: Card) => void;
}

type FilterRarity = 'all' | Rarity;
type SortBy = 'newest' | 'rarity' | 'name';

export function CollectionView({ onBack, onCardClick }: CollectionViewProps) {
  const { myCards, collections } = useCardsStore();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // Filter and sort cards
  let filteredCards = [...myCards];
  
  if (selectedCollection) {
    filteredCards = filteredCards.filter(c => c.collectionId === selectedCollection);
  }
  
  if (filterRarity !== 'all') {
    filteredCards = filteredCards.filter(c => c.rarity === filterRarity);
  }

  // Sort
  filteredCards.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime();
    }
    if (sortBy === 'rarity') {
      const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    }
    return a.name.localeCompare(b.name);
  });

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
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">My Collection</h1>
          <p className="text-white/40 text-sm">{filteredCards.length} cards</p>
        </div>
      </header>

      {/* Collection Filter */}
      <div className="px-6 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCollection(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              !selectedCollection
                ? 'bg-violet-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {collections.map(col => (
            <button
              key={col.id}
              onClick={() => setSelectedCollection(col.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCollection === col.id
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              <span>{col.icon}</span>
              <span>{col.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rarity Filter & Sort */}
      <div className="px-6 pb-4 flex gap-2">
        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value as FilterRarity)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white appearance-none cursor-pointer"
        >
          <option value="all">All Rarities</option>
          <option value="legendary">👑 Legendary</option>
          <option value="epic">💜 Epic</option>
          <option value="rare">💙 Rare</option>
          <option value="common">⚪ Common</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white appearance-none cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="rarity">By Rarity</option>
          <option value="name">By Name</option>
        </select>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {filteredCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🃏</span>
            </div>
            <p className="text-white/40 mb-1">No cards found</p>
            <p className="text-white/20 text-sm">
              {myCards.length === 0 
                ? 'Open packs to collect cards!' 
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredCards.map((card) => (
              <button
                key={card.id}
                onClick={() => onCardClick(card)}
                className={`aspect-[3/4] rounded-xl bg-gradient-to-br ${rarityColors[card.rarity]} border p-2 transition-all active:scale-95 hover:scale-105 relative overflow-hidden group`}
              >
                {/* Card content */}
                <div className="w-full h-full rounded-lg bg-black/30 flex flex-col">
                  {/* Rarity badge */}
                  <div className={`${rarityBadges[card.rarity]} text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full self-start m-1`}>
                    {card.rarity.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Card image */}
                  <div className="flex-1 flex items-center justify-center">
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-3xl">{card.emoji}</span>
                    )}
                  </div>
                  
                  {/* Card name */}
                  <p className="text-white text-[9px] font-medium text-center px-1 pb-1 truncate">
                    {card.name}
                  </p>
                </div>

                {/* Legendary shine */}
                {card.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-xl" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

