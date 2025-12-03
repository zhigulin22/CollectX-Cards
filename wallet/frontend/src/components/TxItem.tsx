import { formatNum } from '../utils/format';
import { DepositIcon, RefreshIcon, SendTxIcon, ReceiveTxIcon } from './Icons';
import { useStore } from '../store';
import type { Transaction } from '../api';

interface TxItemProps {
  tx: Transaction;
}

const typeConfig: Record<string, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}> = {
  deposit: {
    label: 'Deposit',
    icon: <DepositIcon size={18} />,
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  swap: {
    label: 'Swap',
    icon: <RefreshIcon size={18} />,
    bgColor: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  send: {
    label: 'Sent',
    icon: <SendTxIcon size={18} />,
    bgColor: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
  },
  receive: {
    label: 'Received',
    icon: <ReceiveTxIcon size={18} />,
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  withdraw: {
    label: 'Withdraw',
    icon: <SendTxIcon size={18} />,
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
  },
};

export function TxItem({ tx }: TxItemProps) {
  const { rate } = useStore();
  const isPositive = parseFloat(tx.amount) > 0;
  const amountNum = Math.abs(parseFloat(tx.amount));

  const config = typeConfig[tx.type] || {
    label: tx.type,
    icon: <RefreshIcon size={18} />,
    bgColor: 'bg-white/5',
    iconColor: 'text-white/60',
  };

  // Show related user for send/receive
  const relatedUserInfo = tx.relatedUser
    ? (tx.relatedUser.firstName || tx.relatedUser.username || 'User')
    : null;

  const subtitle = (tx.type === 'send' && relatedUserInfo)
    ? `To ${relatedUserInfo}`
    : (tx.type === 'receive' && relatedUserInfo)
      ? `From ${relatedUserInfo}`
      : tx.currency;

  // Calculate USD equivalent for $X
  const isXCurrency = tx.currency === 'X';
  const usdEquivalent = isXCurrency ? amountNum / rate : amountNum;

  // Format date
  const date = new Date(tx.createdAt);
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.05] 
                    rounded-2xl transition-colors cursor-default">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgColor} ${config.iconColor}`}>
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white/90">{config.label}</p>
          <p className="text-xs text-white/40">{subtitle}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-mono text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-white/80'}`}>
          {isPositive ? '+' : '−'}{formatNum(amountNum.toString())} {isXCurrency ? '$X' : tx.currency}
        </p>
        {/* USD equivalent */}
        <p className="text-xs text-white/30">
          ≈ ${usdEquivalent.toFixed(2)} · {dateStr}
        </p>
      </div>
    </div>
  );
}
