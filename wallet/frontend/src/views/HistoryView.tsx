import { useState } from 'react';
import { useStore } from '../store';
import { Header } from '../components/Header';
import { TxItem } from '../components/TxItem';
import { DepositIcon, RefreshIcon, SendTxIcon, ReceiveTxIcon } from '../components/Icons';

type TxType = 'all' | 'deposit' | 'swap' | 'send' | 'receive';
type CurrencyFilter = 'all' | 'USDT' | 'X';

const typeConfig: Record<TxType, { label: string; icon: React.ReactNode }> = {
  all: { label: 'All', icon: null },
  deposit: { label: 'Deposit', icon: <DepositIcon size={14} /> },
  swap: { label: 'Swap', icon: <RefreshIcon size={14} /> },
  send: { label: 'Sent', icon: <SendTxIcon size={14} /> },
  receive: { label: 'Received', icon: <ReceiveTxIcon size={14} /> },
};

interface HistoryViewProps {
  onBack: () => void;
}

export function HistoryView({ onBack }: HistoryViewProps) {
  const { transactions } = useStore();
  const [typeFilter, setTypeFilter] = useState<TxType>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesCurrency = currencyFilter === 'all' || tx.currency === currencyFilter;
    return matchesType && matchesCurrency;
  });

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <Header title="History" onBack={onBack} />

      {/* Filters */}
      <div className="px-5 py-4 space-y-4 border-b border-white/5">
        {/* Type Filter */}
        <div>
          <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">
            Type
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'deposit', 'swap', 'send', 'receive'] as TxType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm 
                           whitespace-nowrap transition-all active:scale-95 ${typeFilter === t
                    ? 'bg-white/10 text-white font-medium'
                    : 'bg-white/[0.03] text-white/50 hover:text-white/80'
                  }`}
              >
                {typeConfig[t].icon}
                <span>{typeConfig[t].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Currency Filter */}
        <div>
          <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">
            Currency
          </p>
          <div className="flex gap-2">
            {(['all', 'USDT', 'X'] as CurrencyFilter[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrencyFilter(c)}
                className={`px-4 py-2 rounded-xl text-sm transition-all active:scale-95 ${currencyFilter === c
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/40 hover:text-white/70'
                  }`}
              >
                {c === 'all' ? 'All' : c === 'X' ? '$X' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-5 py-3">
        <p className="text-xs text-white/30">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/30">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <RefreshIcon size={28} className="text-white/20" />
            </div>
            <p className="text-sm mb-1">No transactions found</p>
            <p className="text-xs text-white/20">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map((tx) => (
            <TxItem key={tx.id} tx={tx} />
          ))
        )}
      </div>
    </div>
  );
}
