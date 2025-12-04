import type { Collection } from '../types';

interface Props {
  collection: Collection;
  onClick: () => void;
}

export function CollectionCard({ collection, onClick }: Props) {
  const completion =
    collection.total === 0 ? 0 : Math.round((collection.owned / collection.total) * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[120px] bg-white/[0.04] rounded-2xl px-3 py-3 border border-white/5
                 text-left active:scale-95 transition-transform"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center text-xl">
          {collection.icon}
        </div>
        <p className="text-xs text-white/80 leading-snug line-clamp-2">
          {collection.name}
        </p>
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/40 mb-1">
        <span>
          {collection.owned}/{collection.total}
        </span>
        <span>{completion}%</span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400"
          style={{ width: `${completion}%` }}
        />
      </div>
    </button>
  );
}


