import type { Collection } from '../collections/types';
import { cards } from '../collections/data';
import { CardTile } from '../collections/components/CardTile';

interface Props {
  collection: Collection;
  onBack: () => void;
}

export function CollectionDetailsScreen({ collection, onBack }: Props) {
  const collectionCards = cards.filter((c) => c.collectionId === collection.id);
  const completion =
    collection.total === 0 ? 0 : Math.round((collection.owned / collection.total) * 100);

  return (
    <div className="h-full flex flex-col bg-[#050505]">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center text-2xl">
            {collection.icon}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{collection.name}</p>
            <p className="text-[11px] text-white/40">
              {collection.owned}/{collection.total} cards · {completion}% complete
            </p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <section className="px-4 mb-4">
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/60 font-medium">Completion</span>
            <span className="text-xs text-white/70">{completion}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-violet-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="text-[11px] text-white/35">
            Collect all cards to complete the set and unlock future rewards.
          </p>
        </div>
      </section>

      {/* Cards grid */}
      <section className="px-4 flex-1">
        <h2 className="text-white text-sm font-semibold mb-3">Cards in this collection</h2>
        {collectionCards.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
            No cards yet – open packs to discover them.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {collectionCards.map((card) => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


