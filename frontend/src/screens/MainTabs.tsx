import { useState } from 'react';
import { WalletScreen } from './WalletScreen';
import { CardsScreen } from './CardsScreen';

type Tab = 'wallet' | 'cards';

export function MainTabs() {
  const [tab, setTab] = useState<Tab>('wallet');

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A]">
      <div className="flex-1 overflow-hidden">
        {tab === 'wallet' ? <WalletScreen /> : <CardsScreen />}
      </div>

      {/* Bottom Navigation */}
      <nav className="h-20 px-6 pb-6 pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => setTab('wallet')}
            className={`flex-1 h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 ${
              tab === 'wallet'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <WalletIcon active={tab === 'wallet'} />
            <span>Wallet</span>
          </button>
          <button
            onClick={() => setTab('cards')}
            className={`flex-1 h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 ${
              tab === 'cards'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <CardsIcon active={tab === 'cards'} />
            <span>Cards</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
         className={`transition-all ${active ? 'drop-shadow-glow' : ''}`}>
      <path 
        d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <path 
        d="M18 12C18 10.8954 18.8954 10 20 10H22V14H20C18.8954 14 18 13.1046 18 12Z" 
        stroke="currentColor" 
        strokeWidth="2"
      />
      <circle cx="20" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function CardsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
         className={`transition-all ${active ? 'drop-shadow-glow' : ''}`}>
      <rect x="4" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="2" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill={active ? 'currentColor' : 'none'} fillOpacity="0.2" />
      <path d="M12 10L14 14L12 12L10 14L12 10Z" fill="currentColor" />
    </svg>
  );
}
