import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { formatNum } from '../utils/format';
import { ActionBtn } from '../components/ActionBtn';
import { TxItem } from '../components/TxItem';
import { ArrowDownIcon, ArrowUpIcon, SwapIcon, ChevronRightIcon } from '../components/Icons';
import { TonConnectButton } from '../components/TonConnectButton';
import { HistoryView } from '../views/HistoryView';
import { SwapView } from '../views/SwapView';
import { SendView } from '../views/SendView';
import { ReceiveView } from '../views/ReceiveView';

type View = 'main' | 'history' | 'swap' | 'send' | 'receive';

export function WalletScreen() {
  const { balanceUsdt, balanceX, rate, transactions, fetchBalance, fetchHistory } = useStore();
  const [view, setView] = useState<View>('main');
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, []);

  const goBack = () => setView('main');

  if (view === 'history') return <HistoryView onBack={goBack} />;
  if (view === 'swap') return <SwapView onBack={goBack} />;
  if (view === 'send') return <SendView onBack={goBack} />;
  if (view === 'receive') return <ReceiveView onBack={goBack} />;

  // Calculate values
  const usdtNum = parseFloat(balanceUsdt) || 0;
  const xNum = parseFloat(balanceX) || 0;
  const xInUsdt = xNum / rate; // Convert $X to USDT
  const totalPortfolio = usdtNum + xInUsdt;

  // Format for display
  const hidden = '••••••';

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* Header */}
      <header className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs font-medium tracking-wider uppercase">
            CollectX
          </p>
          <TonConnectButton />
        </div>
        {/* Hide Balance Toggle */}
        <button
          onClick={() => setHideBalance(!hideBalance)}
          className="p-2 -mr-2 text-white/30 hover:text-white/60 transition-colors"
          title={hideBalance ? 'Show balance' : 'Hide balance'}
        >
          {hideBalance ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </header>

      {/* Total Portfolio Value */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Total Portfolio</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-light tracking-tight text-white">
            ${hideBalance ? hidden : totalPortfolio.toFixed(2)}
          </span>
          <span className="text-white/30 text-sm">USD</span>
        </div>
      </div>

      {/* Asset Cards */}
      <div className="px-6 py-4 space-y-3">
        {/* USDT Card */}
        <AssetCard
          icon="💵"
          name="USDT"
          fullName="Tether"
          balance={hideBalance ? hidden : formatNum(balanceUsdt)}
          usdValue={hideBalance ? hidden : `$${usdtNum.toFixed(2)}`}
          color="emerald"
        />

        {/* $X Card */}
        <AssetCard
          icon="🪙"
          name="$X"
          fullName="CollectX Token"
          balance={hideBalance ? hidden : formatNum(balanceX)}
          usdValue={hideBalance ? hidden : `≈ $${xInUsdt.toFixed(2)}`}
          subtext={`1 $X = $${(1 / rate).toFixed(4)}`}
          color="violet"
        />
      </div>

      {/* Action Buttons */}
      <div className="px-6 pb-6">
        <div className="flex gap-3">
          <ActionBtn
            icon={<ArrowDownIcon size={20} />}
            label="Receive"
            onClick={() => setView('receive')}
            variant="primary"
          />
          <ActionBtn
            icon={<SwapIcon size={20} />}
            label="Swap"
            onClick={() => setView('swap')}
            variant="accent"
          />
          <ActionBtn
            icon={<ArrowUpIcon size={20} />}
            label="Send"
            onClick={() => setView('send')}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex-1 bg-white/[0.02] rounded-t-3xl px-6 pt-5 pb-4 overflow-auto">
        <button
          onClick={() => setView('history')}
          className="w-full flex items-center justify-between mb-4 group"
        >
          <h2 className="text-white/80 font-medium">Recent Activity</h2>
          <ChevronRightIcon
            size={18}
            className="text-white/30 group-hover:text-white/60 transition-colors"
          />
        </button>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-white/30">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <SwapIcon size={24} className="text-white/20" />
            </div>
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <TxItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Asset Card Component
function AssetCard({ icon, name, fullName, balance, usdValue, subtext, color }: {
  icon: string;
  name: string;
  fullName: string;
  balance: string;
  usdValue: string;
  subtext?: string;
  color: 'emerald' | 'violet';
}) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
    violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/20',
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-2xl p-4 border`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-white font-medium">{name}</p>
            <p className="text-white/40 text-xs">{fullName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">{balance}</p>
          <p className="text-white/50 text-xs">{usdValue}</p>
          {subtext && <p className="text-white/30 text-[10px] mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

// Eye Icons
function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
