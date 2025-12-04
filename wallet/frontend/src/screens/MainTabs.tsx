import { useState } from 'react';
import { WalletScreen } from './WalletScreen';
import { CollectionsScreen } from './CollectionsScreen';

type Tab = 'wallet' | 'collections';

export function MainTabs() {
  const [tab, setTab] = useState<Tab>('wallet');

  return (
    <div className="h-screen flex flex-col bg-black">
      <div className="flex-1 overflow-hidden">
        {tab === 'wallet' ? <WalletScreen /> : <CollectionsScreen />}
      </div>

      <nav className="h-16 px-4 pb-4 pt-2 bg-black/90 border-t border-white/10 flex items-center gap-2">
        <button
          onClick={() => setTab('wallet')}
          className={`flex-1 h-11 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            tab === 'wallet'
              ? 'bg-white text-black'
              : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <span>💰</span>
          <span>Wallet</span>
        </button>
        <button
          onClick={() => setTab('collections')}
          className={`flex-1 h-11 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            tab === 'collections'
              ? 'bg-violet-500 text-white'
              : 'bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <span>🃏</span>
          <span>Collections</span>
        </button>
      </nav>
    </div>
  );
}


