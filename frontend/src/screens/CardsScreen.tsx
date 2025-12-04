import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { formatNum } from '../utils/format';
import { PacksView } from '../views/PacksView';
import { CardDetailView } from '../views/CardDetailView';
import { PackOpeningView } from '../views/PackOpeningView';
import { CollectionDetailView } from '../views/CollectionDetailView';
import { useCardsStore, Card, Pack, Rarity, Collection } from '../cards/store';

type View = 'main' | 'packs' | 'card-detail' | 'pack-opening' | 'collection-detail';
type SortBy = 'newest' | 'rarity' | 'value' | 'name' | 'serial';

export function CardsScreen() {
  const { balanceUsdt, balanceX, refreshBalance } = useStore();
  const { 
    myCards, collections, packs,
    selectedCard, openedCards, isLoading,
    loadCollections, loadPacks, loadInventory,
    setSelectedCard, clearOpenedCards 
  } = useCardsStore();
  
  const [view, setView] = useState<View>('main');
  const [openingPack, setOpeningPack] = useState<Pack | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  // Filters
  const [filterCollection, setFilterCollection] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // Load data on mount
  useEffect(() => {
    loadCollections();
    loadPacks();
    loadInventory();
  }, []);

  const totalCards = myCards.length;
  const uniqueCards = new Set(myCards.map(c => c.templateId)).size;
  const legendaryCount = myCards.filter(c => c.rarity === 'legendary').length;
  const totalValue = myCards.reduce((sum, c) => sum + c.sellPrice.usdt, 0);

  // Filter and sort cards
  let filteredCards = [...myCards];
  if (filterCollection) {
    filteredCards = filteredCards.filter(c => c.collectionId === filterCollection);
  }
  if (filterRarity !== 'all') {
    filteredCards = filteredCards.filter(c => c.rarity === filterRarity);
  }

  // Sort
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  filteredCards.sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime();
      case 'rarity': return rarityOrder[a.rarity] - rarityOrder[b.rarity];
      case 'value': return b.sellPrice.usdt - a.sellPrice.usdt;
      case 'name': return a.name.localeCompare(b.name);
      case 'serial': return a.serialNumber - b.serialNumber;
      default: return 0;
    }
  });

  const handleOpenPack = (pack: Pack, cards: Card[]) => {
    setOpeningPack(pack);
    setView('pack-opening');
  };

  const handlePackOpeningComplete = () => {
    setView('main');
    setOpeningPack(null);
    clearOpenedCards();
    refreshBalance();
    loadInventory();
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setView('card-detail');
  };

  const handleCollectionClick = (col: Collection) => {
    setSelectedCollection(col);
    setView('collection-detail');
  };

  // View routing
  if (view === 'pack-opening' && openedCards.length > 0) {
    return <PackOpeningView cards={openedCards} onComplete={handlePackOpeningComplete} />;
  }

  if (view === 'packs') {
    return <PacksView onBack={() => setView('main')} onOpenPack={handleOpenPack} />;
  }

  if (view === 'card-detail' && selectedCard) {
    return <CardDetailView card={selectedCard} onBack={() => { setView('main'); loadInventory(); }} />;
  }

  if (view === 'collection-detail' && selectedCollection) {
    return (
      <CollectionDetailView 
        collection={selectedCollection} 
        onBack={() => setView('main')} 
        onCardClick={(card) => { setSelectedCard(card); setView('card-detail'); }}
      />
    );
  }

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

  // Collection gradient backgrounds
  const collectionGradients = [
    'from-violet-600/40 via-purple-500/30 to-fuchsia-600/40',
    'from-blue-600/40 via-cyan-500/30 to-teal-600/40',
    'from-rose-600/40 via-pink-500/30 to-orange-600/40',
    'from-emerald-600/40 via-green-500/30 to-lime-600/40',
    'from-amber-600/40 via-yellow-500/30 to-orange-600/40',
  ];

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] overflow-auto">
      {/* Header */}
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Card Collection</h1>
          <div className="text-right">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Total Value</p>
            <p className="text-emerald-400 font-bold">${totalValue.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Balance Pills */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <span className="text-xs">💵</span>
            <span className="text-emerald-400 text-xs font-medium">${formatNum(balanceUsdt)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1">
            <span className="text-xs">🪙</span>
            <span className="text-violet-400 text-xs font-medium">{formatNum(balanceX)} $X</span>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Total" value={totalCards} icon="🃏" />
          <StatCard label="Unique" value={uniqueCards} icon="✨" />
          <StatCard label="Legend" value={legendaryCount} icon="👑" />
          <StatCard label="Value" value={`$${totalValue.toFixed(0)}`} icon="💰" />
        </div>
      </div>

      {/* Open Packs Button */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setView('packs')}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-[1px]"
        >
          <div className="relative bg-gradient-to-r from-violet-600/90 via-purple-600/90 to-fuchsia-600/90 rounded-2xl px-4 py-3">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine rounded-2xl" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Open Packs</p>
                  <p className="text-white/60 text-xs">Free & Premium available</p>
                </div>
              </div>
              <ChevronRight />
            </div>
          </div>
        </button>
      </div>

      {/* Collections - Wide Beautiful Cards */}
      <div className="pb-4">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-white font-semibold">Collections</h2>
          <span className="text-white/40 text-xs">{collections.length} collections</span>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 px-5 scrollbar-hide snap-x snap-mandatory">
          {collections.map((col, idx) => {
            const colCards = myCards.filter(c => c.collectionId === col.id);
            const progress = col.totalCards > 0 ? (colCards.length / col.totalCards) * 100 : 0;
            const gradient = collectionGradients[idx % collectionGradients.length];
            
            return (
              <button
                key={col.id}
                onClick={() => handleCollectionClick(col)}
                className="flex-shrink-0 w-44 snap-start group"
              >
                {/* Card */}
                <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${gradient} transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]`}>
                  {/* Pattern overlay */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
                  </div>
                  
                  {/* Image area */}
                  <div className="aspect-[4/3] flex items-center justify-center relative">
                    {col.imageUrl ? (
                      <img 
                        src={col.imageUrl} 
                        alt={col.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl drop-shadow-2xl transform group-hover:scale-110 transition-transform">
                        {col.icon}
                      </span>
                    )}
                    
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </div>
                  
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                    <div 
                      className="h-full bg-white/80 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Info */}
                <div className="mt-2 px-1">
                  <p className="text-white font-semibold text-sm truncate">{col.name}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white/40 text-xs">{colCards.length}/{col.totalCards} cards</p>
                    <p className="text-violet-400 text-xs font-medium">{Math.round(progress)}%</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 pb-3">
        <div className="flex gap-2">
          {/* Collection Filter */}
          <div className="flex-1 relative">
            <select
              value={filterCollection || ''}
              onChange={(e) => setFilterCollection(e.target.value || null)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none cursor-pointer"
            >
              <option value="">All Collections</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          
          {/* Rarity Filter */}
          <div className="flex-1 relative">
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value as Rarity | 'all')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none cursor-pointer"
            >
              <option value="all">All Rarities</option>
              <option value="legendary">👑 Legendary</option>
              <option value="epic">💜 Epic</option>
              <option value="rare">💙 Rare</option>
              <option value="common">⚪ Common</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        
        {/* Sort */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'newest', label: '🕐 Newest' },
            { id: 'rarity', label: '⭐ Rarity' },
            { id: 'value', label: '💰 Value' },
            { id: 'name', label: '🔤 Name' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id as SortBy)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                sortBy === s.id
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards count */}
      <div className="px-5 pb-2">
        <p className="text-white/40 text-sm">
          {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
          {filterCollection && ` in ${collections.find(c => c.id === filterCollection)?.name}`}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 px-5 pb-6">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🃏</span>
            </div>
            <p className="text-white/40 mb-1">No cards found</p>
            <p className="text-white/20 text-sm">
              {myCards.length === 0 ? 'Open packs to start collecting!' : 'Try different filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className={`rounded-2xl bg-gradient-to-br ${rarityColors[card.rarity]} border p-[2px] transition-all hover:scale-[1.02] relative overflow-hidden group`}
              >
                <div className="w-full rounded-2xl bg-[#0D0D0D] overflow-hidden">
                  {/* Card image area */}
                  <button
                    onClick={() => handleCardClick(card)}
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
                    {/* Name and collection */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{card.name}</p>
                        <p className="text-white/40 text-[10px] truncate">{card.collectionName}</p>
                      </div>
                      {/* Value badge */}
                      <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
                        <p className="text-emerald-400 text-xs font-bold">${card.sellPrice.usdt}</p>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCardClick(card)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <span>👁</span> Details
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCardClick(card); }}
                        className="flex-1 py-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 text-violet-300 hover:text-violet-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 border border-violet-500/20"
                      >
                        <span>💰</span> Sell
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

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-2 text-center">
      <span className="text-lg">{icon}</span>
      <p className="text-white font-bold text-sm">{value}</p>
      <p className="text-white/40 text-[10px]">{label}</p>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-white/40 ${className}`}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
