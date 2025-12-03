import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api, SearchUser, SendPreviewResponse } from '../api';
import { Header } from '../components/Header';
import { formatNum } from '../utils/format';

interface SendViewProps {
  onBack: () => void;
}

interface SendInfo {
  minAmount: number;
  fee: number;
}

type Step = 'input' | 'confirm' | 'success';

export function SendView({ onBack }: SendViewProps) {
  const { balanceX, refreshBalance, isLoading, error, setError, setLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [amount, setAmount] = useState('');
  const [sendInfo, setSendInfo] = useState<SendInfo>({ minAmount: 1, fee: 0.5 });
  
  // Confirmation flow state
  const [step, setStep] = useState<Step>('input');
  const [preview, setPreview] = useState<SendPreviewResponse | null>(null);
  const [successData, setSuccessData] = useState<{ sent: string; recipient: string } | null>(null);

  // Load send info (fee, limits)
  useEffect(() => {
    api.getSendInfo().then(setSendInfo).catch(console.error);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchUsers(searchQuery);
        setSearchResults(res.users);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery('');
  };

  const amountNum = parseFloat(amount) || 0;
  const totalWithFee = amountNum + sendInfo.fee;
  const balanceNum = parseFloat(balanceX) || 0;
  const canSend = selectedUser && amountNum >= sendInfo.minAmount && totalWithFee <= balanceNum;

  // Calculate max sendable amount (balance - fee)
  const maxSendable = Math.max(0, balanceNum - sendInfo.fee);

  const handleSetMax = () => {
    setAmount(maxSendable.toFixed(2));
    setError(null);
  };

  // Step 1: Get preview
  const handlePreview = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.sendPreview(selectedUser.id, amount);
      setPreview(result);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to create transfer preview');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm transfer
  const handleConfirm = async () => {
    if (!preview) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.sendConfirm(preview.confirmationToken);
      setSuccessData({ sent: result.sent, recipient: result.recipient });
      setStep('success');
      refreshBalance();
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
      // If token expired, go back to input
      if (err.message?.includes('expired')) {
        setStep('input');
        setPreview(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Cancel confirmation
  const handleCancelConfirm = () => {
    setStep('input');
    setPreview(null);
    setError(null);
  };

  const displayName = selectedUser?.firstName || selectedUser?.username || 'User';

  // Success screen
  if (step === 'success' && successData) {
    return (
      <div className="h-full flex flex-col bg-[#0A0A0A]">
        <Header title="Transfer Complete" onBack={onBack} />
        
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6
                          animate-[scale-in_0.3s_ease-out]">
            <span className="text-4xl">✓</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Sent Successfully!</h2>
          
          <p className="text-white/50 text-center mb-8">
            <span className="text-emerald-400 font-semibold">{successData.sent} $X</span>
            {' '}has been sent to{' '}
            <span className="text-white">{successData.recipient}</span>
          </p>
          
          <button
            onClick={onBack}
            className="px-8 py-3 bg-white/10 hover:bg-white/15 
                       text-white font-medium rounded-xl transition-all"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  // Confirmation screen
  if (step === 'confirm' && preview) {
    return (
      <div className="h-full flex flex-col bg-[#0A0A0A]">
        <Header title="Confirm Transfer" onBack={handleCancelConfirm} />
        
        <div className="flex-1 p-5 flex flex-col">
          {/* Confirmation Card */}
          <div className="bg-gradient-to-b from-emerald-500/10 to-transparent 
                          rounded-3xl p-6 border border-emerald-500/20 mb-6">
            <div className="text-center mb-6">
              <p className="text-white/50 text-sm mb-2">You are sending</p>
              <p className="text-4xl font-bold text-white mb-1">
                {preview.preview.amount} <span className="text-emerald-400">$X</span>
              </p>
              <p className="text-white/40 text-sm">to {preview.preview.receiverName}</p>
            </div>
            
            {/* Details */}
            <div className="bg-black/30 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-white/50">Recipient</span>
                <span className="text-white font-medium">
                  {preview.preview.receiverUsername 
                    ? `@${preview.preview.receiverUsername}` 
                    : preview.preview.receiverName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Amount</span>
                <span className="text-white">{preview.preview.amount} $X</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Fee</span>
                <span className="text-orange-400">{preview.preview.fee} $X</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white/70 font-medium">Total</span>
                <span className="text-white font-bold">{preview.preview.total} $X</span>
              </div>
            </div>
          </div>
          
          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg">⚠️</span>
              <div>
                <p className="text-amber-400 font-medium text-sm">Please verify details</p>
                <p className="text-amber-400/70 text-xs mt-1">
                  This action cannot be undone. Make sure the recipient and amount are correct.
                </p>
              </div>
            </div>
          </div>
          
          {/* Timer */}
          <p className="text-center text-white/30 text-xs mb-4">
            Confirmation expires in {Math.floor(preview.preview.expiresIn / 60)} minutes
          </p>
          
          {/* Error */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4">
              <p className="text-rose-400 text-sm text-center">{error}</p>
            </div>
          )}
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 
                         hover:from-emerald-400 hover:to-emerald-500
                         disabled:from-emerald-500/50 disabled:to-emerald-600/50
                         text-white font-semibold rounded-2xl
                         transition-all active:scale-[0.98] disabled:active:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : (
                '✓ Confirm & Send'
              )}
            </button>
            
            <button
              onClick={handleCancelConfirm}
              disabled={isLoading}
              className="w-full py-3 bg-white/5 hover:bg-white/10
                         text-white/70 font-medium rounded-2xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Input screen (Step 1)
  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <Header title="Send $X" onBack={onBack} />

      <div className="flex-1 p-5 flex flex-col">
        {/* Recipient */}
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 mb-4">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
            Recipient
          </p>

          {selectedUser ? (
            <SelectedUserCard user={selectedUser} onClear={handleClearUser} />
          ) : (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or Telegram ID"
                className="w-full bg-transparent text-white text-lg outline-none 
                           placeholder:text-white/20"
              />
              {isSearching && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 
                                rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
              {searchResults.map((user) => (
                <UserSearchResult key={user.id} user={user} onSelect={handleSelectUser} />
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <p className="text-xs text-white/30 mt-3">No users found</p>
          )}
        </div>

        {/* Amount */}
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
              Amount
            </p>
            <button
              onClick={handleSetMax}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
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
            <div className="px-4 py-2 bg-emerald-500/10 rounded-xl text-emerald-400 font-medium">
              $X
            </div>
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-white/30">Balance: {formatNum(balanceX)} $X</p>
            <p className="text-xs text-white/30">Min: {sendInfo.minAmount} $X</p>
          </div>
        </div>

        {/* Fee Breakdown */}
        {amountNum > 0 && (
          <div className="bg-white/[0.02] rounded-xl p-4 mb-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <span className="text-sm">💡</span>
              <span className="text-xs text-white/50">Transfer breakdown</span>
            </div>

            {/* Amount */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">You send</span>
              <span className="text-white font-medium">{formatNum(amountNum.toString())} $X</span>
            </div>

            {/* Recipient gets */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/40">Recipient gets</span>
              <span className="text-emerald-400 font-medium">{formatNum(amountNum.toString())} $X</span>
            </div>

            {/* Fee - with explanation */}
            <div className="flex justify-between items-start text-sm mb-3">
              <div className="flex flex-col">
                <span className="text-white/40">Platform fee</span>
                <span className="text-[10px] text-white/25 mt-0.5">Fixed service fee</span>
              </div>
              <span className="text-orange-400 font-medium">{sendInfo.fee} $X</span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 pt-3">
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-white/60 font-medium">Total from balance</span>
                <span className={`text-lg font-semibold ${totalWithFee > balanceNum ? 'text-rose-400' : 'text-white'}`}>
                  {formatNum(totalWithFee.toString())} $X
                </span>
              </div>

              {/* Insufficient balance warning */}
              {totalWithFee > balanceNum && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-rose-500/10 rounded-lg">
                  <span className="text-rose-400 text-xs">⚠</span>
                  <p className="text-rose-400/80 text-xs">
                    Insufficient balance (need {formatNum(totalWithFee.toString())} $X)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4">
            <p className="text-rose-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview Button */}
        <button
          onClick={handlePreview}
          disabled={!canSend || isLoading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 
                     hover:from-emerald-400 hover:to-emerald-500
                     disabled:from-white/5 disabled:to-white/5 disabled:text-white/30
                     text-white font-semibold rounded-2xl
                     transition-all active:scale-[0.98] disabled:active:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading...
            </span>
          ) : selectedUser ? (
            `Continue to ${displayName}`
          ) : (
            'Select Recipient'
          )}
        </button>
      </div>
    </div>
  );
}

// Selected User Card
function SelectedUserCard({ user, onClear }: { user: SearchUser; onClear: () => void }) {
  const initial = (user.firstName || user.username || '?')[0].toUpperCase();
  const name = user.firstName || user.username || 'User';
  const subtitle = user.username ? `@${user.username}` : `ID: ${user.telegramId}`;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-emerald-600 
                      rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="text-white font-semibold text-lg">{initial}</span>
        </div>
        <div>
          <p className="font-medium text-white">{name}</p>
          <p className="text-xs text-white/40">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onClear}
        className="w-8 h-8 flex items-center justify-center rounded-lg
                   text-white/40 hover:text-white hover:bg-white/5 transition-all"
      >
        ✕
      </button>
    </div>
  );
}

// User Search Result
function UserSearchResult({ user, onSelect }: { user: SearchUser; onSelect: (u: SearchUser) => void }) {
  const initial = (user.firstName || user.username || '?')[0].toUpperCase();
  const name = user.firstName || user.username || 'User';
  const subtitle = user.username ? `@${user.username}` : `TG: ${user.telegramId}`;

  return (
    <button
      onClick={() => onSelect(user)}
      className="w-full flex items-center gap-3 p-2 -mx-2 rounded-xl 
                 hover:bg-white/5 transition-colors text-left"
    >
      <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
        <span className="text-white/80 text-sm font-medium">{initial}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-white/90">{name}</p>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
    </button>
  );
}
