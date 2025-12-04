import { useMemo, useState } from 'react';
import { collections, cards } from '../collections/data';
import type { Collection } from '../collections/types';
import { CollectionCard } from '../collections/components/CollectionCard';
import { CardTile } from '../collections/components/CardTile';
import { CollectionDetailsScreen } from './CollectionDetailsScreen';

export function CollectionsScreen() {
  const totalNfts = cards.length;
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);

  const byNewest = useMemo(() => cards, []);

  if (activeCollection) {
    return (
      <CollectionDetailsScreen
        collection={activeCollection}
        onBack={() => setActiveCollection(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050505]">
      {/* Top pills / tabs */}
      <header className="px-4 pt-4 pb-3">
        <div className="flex gap-2">
          <button
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600
                       text-white text-sm font-medium shadow-lg shadow-violet-500/30"
            disabled
          >
            📦 Open Packs
          </button>
          <button
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500
                       text-white text-sm font-medium shadow-lg shadow-amber-400/30"
            disabled
          >
            ⚙ Admin
          </button>
        </div>
      </header>

      {/* Collections row */}
      <section className="px-4">
        <h2 className="text-white text-base font-semibold mb-3">Collections</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {collections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              onClick={() => setActiveCollection(c)}
            />
          ))}
        </div>
      </section>

      {/* My Cards */}
      <section className="mt-4 px-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-white text-base font-semibold">My Cards</h2>
            <span className="text-xs text-white/40">{totalNfts} NFTs</span>
          </div>
          <div className="flex gap-2 text-[11px] text-white/40">
            <button className="px-2 py-1 rounded-lg bg-white/10 text-white/80">
              All
            </button>
            <button className="px-2 py-1 rounded-lg bg-white/5">All Rarities</button>
            <button className="px-2 py-1 rounded-lg bg-white/5">Newest</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-6">
          {byNewest.map((card) => (
            <CardTile key={card.id} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}


