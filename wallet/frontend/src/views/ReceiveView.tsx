import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { CopyIcon, CheckIcon } from '../components/Icons';

interface ReceiveViewProps {
  onBack: () => void;
}

interface DepositInfo {
  address: string;
  memo: string;
  note: string;
}

export function ReceiveView({ onBack }: ReceiveViewProps) {
  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [copiedField, setCopiedField] = useState<'address' | 'memo' | null>(null);

  useEffect(() => {
    import('../api').then(({ api }) => {
      api.getDeposit().then(setDeposit).catch(console.error);
    });
  }, []);

  const copyToClipboard = async (text: string, field: 'address' | 'memo') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <Header title="Receive USDT" onBack={onBack} />

      <div className="flex-1 p-5">
        {deposit ? (
          <div className="space-y-5">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-white/5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deposit.address)}&bgcolor=ffffff&color=0A0A0A`}
                  alt="QR Code"
                  className="w-[200px] h-[200px] rounded-xl"
                />
              </div>
            </div>

            {/* Network Badge */}
            <div className="flex justify-center">
              <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 
                             text-xs font-medium rounded-full border border-emerald-500/20">
                TON Network · USDT
              </span>
            </div>

            {/* Address Card */}
            <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                  Deposit Address
                </p>
                <CopyButton
                  onClick={() => copyToClipboard(deposit.address, 'address')}
                  copied={copiedField === 'address'}
                />
              </div>
              <p className="font-mono text-sm text-white/80 break-all leading-relaxed select-all">
                {deposit.address}
              </p>
            </div>

            {/* Memo Card */}
            <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                  Memo
                </p>
                <CopyButton
                  onClick={() => copyToClipboard(deposit.memo, 'memo')}
                  copied={copiedField === 'memo'}
                />
              </div>
              <p className="font-mono text-2xl text-white font-medium select-all">
                {deposit.memo}
              </p>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <p className="text-amber-400/90 text-sm text-center leading-relaxed">
                ⚠️ Always include the Memo when sending!
                <br />
                <span className="text-amber-400/60 text-xs">
                  Funds without memo cannot be recovered.
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-60">
            <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 
                          rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// Copy Button Component
function CopyButton({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                  transition-all active:scale-95 ${copied
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
        }`}
    >
      {copied ? (
        <>
          <CheckIcon size={14} />
          Copied
        </>
      ) : (
        <>
          <CopyIcon size={14} />
          Copy
        </>
      )}
    </button>
  );
}
