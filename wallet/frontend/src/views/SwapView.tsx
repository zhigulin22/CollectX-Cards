import { useState } from 'react';
import { useStore } from '../store';
import { Header } from '../components/Header';
import { SwapIcon } from '../components/Icons';
import { formatNum } from '../utils/format';

interface SwapViewProps {
  onBack: () => void;
}

export function SwapView({ onBack }: SwapViewProps) {
  const { balanceUsdt, balanceX, rate, swapFee, swap, isLoading, error, setError } = useStore();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'usdt_to_x' | 'x_to_usdt'>('usdt_to_x');

  const amountNum = parseFloat(amount) || 0;
  const isUsdtToX = direction === 'usdt_to_x';

  const fromBalance = isUsdtToX ? balanceUsdt : balanceX;
  const fromCurrency = isUsdtToX ? 'USDT' : '$X';
  const toCurrency = isUsdtToX ? '$X' : 'USDT';

  let fee: number;
  let receive: number;

  if (isUsdtToX) {
    fee = amountNum * (swapFee / 100);
    receive = (amountNum - fee) * rate;
  } else {
    const usdtAmount = amountNum / rate;
    fee = usdtAmount * (swapFee / 100);
    receive = usdtAmount - fee;
  }

  const minAmount = isUsdtToX ? 0.1 : 1;
  const canSwap = amountNum >= minAmount && amountNum <= parseFloat(fromBalance);

  const handleSwap = async () => {
    try {
      await swap(amount, direction);
      onBack();
    } catch { }
  };

  const toggleDirection = () => {
    setDirection(d => d === 'usdt_to_x' ? 'x_to_usdt' : 'usdt_to_x');
    setAmount('');
    setError(null);
  };

  const setMax = () => {
    setAmount(fromBalance);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <Header title="Swap" onBack={onBack} />

      <div className="flex-1 p-5 flex flex-col">
        {/* From Card */}
        <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-white/40">You pay</p>
            <button
              onClick={setMax}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              MAX
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-light text-white outline-none 
                         placeholder:text-white/20"
            />
            <div className="px-4 py-2 bg-white/5 rounded-xl text-white/60 font-medium">
              {fromCurrency}
            </div>
          </div>
          <p className="text-xs text-white/30 mt-3">
            Balance: {formatNum(fromBalance)} {fromCurrency}
          </p>
        </div>

        {/* Swap Toggle */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={toggleDirection}
            className="w-12 h-12 bg-violet-500/20 hover:bg-violet-500/30 
                       rounded-2xl flex items-center justify-center 
                       text-violet-400 border-4 border-[#0A0A0A]
                       transition-all active:scale-90"
          >
            <SwapIcon size={20} />
          </button>
        </div>

        {/* To Card */}
        <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
          <p className="text-sm text-white/40 mb-3">You receive</p>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-3xl font-light text-emerald-400">
              {receive > 0 ? formatNum(receive.toString()) : '0'}
            </span>
            <div className="px-4 py-2 bg-emerald-500/10 rounded-xl text-emerald-400 font-medium">
              {toCurrency}
            </div>
          </div>
        </div>

        {/* Swap Details */}
        {amountNum > 0 && (
          <div className="bg-white/[0.02] rounded-xl p-4 mt-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <span className="text-sm">💡</span>
              <span className="text-xs text-white/50">Swap breakdown</span>
            </div>

            {/* Rate */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">Exchange rate</span>
              <span className="text-white">1 USDT = {rate} $X</span>
            </div>

            {/* Gross amount (before fee) */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">
                {isUsdtToX ? 'USDT amount' : '$X amount'}
              </span>
              <span className="text-white">
                {isUsdtToX
                  ? `${formatNum(amountNum.toString())} USDT`
                  : `${formatNum(amountNum.toString())} $X`
                }
              </span>
            </div>

            {/* Fee calculation with explanation */}
            <div className="flex justify-between items-start text-sm mb-2">
              <div className="flex flex-col">
                <span className="text-white/40">Platform fee ({swapFee}%)</span>
                <span className="text-[10px] text-white/25 mt-0.5">
                  {isUsdtToX
                    ? `${amountNum} × ${swapFee}% = ${fee.toFixed(4)} USDT`
                    : `${(amountNum / rate).toFixed(4)} USDT × ${swapFee}%`
                  }
                </span>
              </div>
              <span className="text-orange-400 font-medium">
                −{fee < 0.01 ? fee.toFixed(4) : fee.toFixed(2)} USDT
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 pt-3 mt-3">
              {/* Net result */}
              <div className="flex justify-between items-center">
                <span className="text-white/60 font-medium">You receive</span>
                <span className="text-lg font-semibold text-emerald-400">
                  {formatNum(receive.toString())} {toCurrency}
                </span>
              </div>

              {/* Effective rate hint */}
              {isUsdtToX && amountNum > 0 && (
                <p className="text-[10px] text-white/25 text-right mt-1">
                  Effective rate: 1 USDT = {(receive / amountNum).toFixed(2)} $X
                </p>
              )}
            </div>
          </div>
        )}

        {/* Min amount hint */}
        <div className="text-center py-3">
          <p className="text-xs text-white/30">
            Min: {minAmount} {fromCurrency}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4">
            <p className="text-rose-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={!canSwap || isLoading}
          className="w-full py-4 bg-gradient-to-r from-violet-500 to-violet-600 
                     hover:from-violet-400 hover:to-violet-500
                     disabled:from-white/5 disabled:to-white/5 disabled:text-white/30
                     text-white font-semibold rounded-2xl
                     transition-all active:scale-[0.98] disabled:active:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Swap ${fromCurrency} → ${toCurrency}`
          )}
        </button>
      </div>
    </div>
  );
}
