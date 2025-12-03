import { useState, useEffect } from 'react';
import { adminApi, UserDetails, ActivityItem, ActivityStat } from '../api';

interface UserModalProps {
  userId: string;
  onClose: () => void;
  onBalanceUpdated: () => void;
}

type Tab = 'overview' | 'activity' | 'adjust' | 'security';

export function UserModal({ userId, onClose, onBalanceUpdated }: UserModalProps) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    adminApi.getUser(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-[#111] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : user ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white ${
                    user.isBlocked 
                      ? 'bg-gradient-to-br from-rose-400 to-rose-600' 
                      : 'bg-gradient-to-br from-orange-400 to-orange-600'
                  }`}>
                    {user.isBlocked ? '🚫' : (user.firstName || user.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-medium text-white">
                        {user.firstName || user.username || 'User'}
                      </h2>
                      {user.isBlocked && (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs rounded-full font-medium">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-sm">
                      {user.username ? `@${user.username}` : `TG: ${user.telegramId}`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 
                           flex items-center justify-center text-white/60"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4 bg-white/5 p-1 rounded-xl">
                {[
                  { id: 'overview', label: '📋 Overview' },
                  { id: 'activity', label: '📊 Activity' },
                  { id: 'adjust', label: '💰 Adjust' },
                  { id: 'security', label: '🔒 Security' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as Tab)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      tab === t.id
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {tab === 'overview' && <OverviewTab user={user} />}
              {tab === 'activity' && <ActivityTab userId={userId} />}
              {tab === 'adjust' && (
                <AdjustTab 
                  userId={userId} 
                  onSuccess={() => {
                    adminApi.getUser(userId).then(setUser);
                    onBalanceUpdated();
                  }}
                />
              )}
              {tab === 'security' && (
                <SecurityTab
                  user={user}
                  onUpdate={() => {
                    adminApi.getUser(userId).then(setUser);
                    onBalanceUpdated();
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-white/40">User not found</div>
        )}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ user }: { user: UserDetails }) {
  return (
    <div className="p-6 space-y-6">
      {/* Balances */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] rounded-2xl p-4">
          <p className="text-white/40 text-xs uppercase mb-1">USDT Balance</p>
          <p className="text-3xl font-light text-white">
            ${parseFloat(user.wallet?.balanceUsdt || '0').toFixed(2)}
          </p>
        </div>
        <div className="bg-emerald-500/10 rounded-2xl p-4">
          <p className="text-emerald-400/60 text-xs uppercase mb-1">$X Balance</p>
          <p className="text-3xl font-light text-emerald-400">
            {parseFloat(user.wallet?.balanceX || '0').toFixed(0)}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white/[0.03] rounded-2xl p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-white/40">User ID</span>
          <span className="text-white/60 font-mono text-sm">{user.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Telegram ID</span>
          <span className="text-white/60 font-mono">{user.telegramId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Username</span>
          <span className="text-white/60">{user.username ? `@${user.username}` : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Joined</span>
          <span className="text-white/60">{new Date(user.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Recent Withdrawals */}
      {user.recentWithdrawals.length > 0 && (
        <div>
          <p className="text-white/40 text-xs uppercase mb-3">Recent Withdrawals</p>
          <div className="space-y-2">
            {user.recentWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-xl">
                <span className="text-white/80">{w.amount} USDT</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  w.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-rose-500/20 text-rose-400'
                }`}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Activity Tab with Timeline
function ActivityTab({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<ActivityStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    adminApi.getUserActivity(userId, page, 20, filter)
      .then((res) => {
        setActivities(res.items);
        setStats(res.stats);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [userId, page, filter]);

  const typeIcons: Record<string, string> = {
    deposit: '💰',
    withdraw: '💸',
    swap: '🔄',
    send: '↗️',
    receive: '↙️',
  };

  const typeColors: Record<string, string> = {
    deposit: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    withdraw: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    swap: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    send: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    receive: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {stats.map((s) => (
          <button
            key={s.type}
            onClick={() => setFilter(filter === s.type ? 'all' : s.type)}
            className={`p-3 rounded-xl text-center transition-all ${
              filter === s.type 
                ? 'bg-orange-500/20 border border-orange-500/30' 
                : 'bg-white/[0.03] hover:bg-white/[0.05]'
            }`}
          >
            <span className="text-lg">{typeIcons[s.type] || '•'}</span>
            <p className="text-white text-sm font-medium mt-1">{s.count}</p>
            <p className="text-white/40 text-xs capitalize">{s.type}</p>
          </button>
        ))}
      </div>

      {/* Filter indicator */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">Showing: {filter}</span>
          <button 
            onClick={() => setFilter('all')}
            className="text-orange-400 text-sm hover:text-orange-300"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-white/40">No activity found</div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />
          
          {/* Activities */}
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const isPositive = parseFloat(activity.amount) > 0;
              const date = new Date(activity.createdAt);
              
              return (
                <div key={activity.id} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                    typeColors[activity.type] || 'bg-white/20 border-white/30'
                  } flex items-center justify-center`}>
                    <span className="text-xs">{typeIcons[activity.type]}</span>
                  </div>

                  {/* Content */}
                  <div className="bg-white/[0.03] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                            typeColors[activity.type] || 'bg-white/10 text-white/60'
                          }`}>
                            {activity.type}
                          </span>
                          <span className="text-white/30 text-xs">
                            {activity.currency}
                          </span>
                        </div>
                        
                        {activity.description && (
                          <p className="text-white/60 text-sm">{activity.description}</p>
                        )}
                        
                        {activity.relatedUser && (
                          <p className="text-white/40 text-xs mt-1">
                            {activity.type === 'send' ? 'To: ' : 'From: '}
                            {activity.relatedUser.firstName || activity.relatedUser.username}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-mono font-medium ${
                          isPositive ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {isPositive ? '+' : ''}{parseFloat(activity.amount).toFixed(
                            activity.currency === 'USDT' ? 2 : 0
                          )} {activity.currency === 'X' ? '$X' : activity.currency}
                        </p>
                        {activity.fee && (
                          <p className="text-white/30 text-xs">
                            Fee: {activity.fee}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-white/30 text-xs">
                        Balance after: {parseFloat(activity.balanceAfter).toFixed(
                          activity.currency === 'USDT' ? 2 : 0
                        )} {activity.currency === 'X' ? '$X' : activity.currency}
                      </span>
                      <span className="text-white/30 text-xs">
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <span className="text-white/40 text-sm">{total} total activities</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white/5 rounded-lg text-white/60 text-sm disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="px-3 py-1 text-white/40 text-sm">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={activities.length < 20}
              className="px-3 py-1 bg-white/5 rounded-lg text-white/60 text-sm disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Security Tab
function SecurityTab({ user, onUpdate }: { user: UserDetails; onUpdate: () => void }) {
  const [blocking, setBlocking] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [notes, setNotes] = useState(user.adminNotes || '');

  const handleBlock = async (block: boolean) => {
    if (block && !blockReason) {
      alert('Please provide a reason for blocking');
      return;
    }
    
    setBlocking(true);
    try {
      await adminApi.blockUser(user.id, block, blockReason);
      setBlockReason('');
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBlocking(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await adminApi.updateUserNotes(user.id, notes);
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Block Status */}
      <div className={`rounded-2xl p-5 border ${
        user.isBlocked 
          ? 'bg-rose-500/10 border-rose-500/20' 
          : 'bg-emerald-500/10 border-emerald-500/20'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{user.isBlocked ? '🚫' : '✅'}</span>
            <div>
              <p className={`font-medium ${user.isBlocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                {user.isBlocked ? 'Account Blocked' : 'Account Active'}
              </p>
              {user.isBlocked && user.blockReason && (
                <p className="text-rose-400/60 text-sm">Reason: {user.blockReason}</p>
              )}
            </div>
          </div>
        </div>

        {user.isBlocked ? (
          <button
            onClick={() => handleBlock(false)}
            disabled={blocking}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {blocking ? 'Processing...' : '✓ Unblock Account'}
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Reason for blocking (required)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30"
            />
            <button
              onClick={() => handleBlock(true)}
              disabled={blocking || !blockReason}
              className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:bg-rose-500/30"
            >
              {blocking ? 'Processing...' : '🚫 Block Account'}
            </button>
          </div>
        )}
      </div>

      {/* Admin Notes */}
      <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
        <p className="text-white/40 text-xs uppercase mb-3">Admin Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about this user..."
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 resize-none"
        />
        <button
          onClick={handleSaveNotes}
          disabled={savingNotes || notes === (user.adminNotes || '')}
          className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors disabled:opacity-30"
        >
          {savingNotes ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* User Risk Info */}
      <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
        <p className="text-white/40 text-xs uppercase mb-3">Risk Information</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">Account Age</span>
            <span className="text-white/60">
              {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Total Balance</span>
            <span className="text-white/60">
              ${(parseFloat(user.wallet?.balanceUsdt || '0') + parseFloat(user.wallet?.balanceX || '0') / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Withdrawals</span>
            <span className="text-white/60">{user.recentWithdrawals.length}</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
        <p className="text-orange-400/80 text-sm">
          ⚠️ Blocked users cannot perform any transactions. All security actions are logged.
        </p>
      </div>
    </div>
  );
}

// Adjust Tab
function AdjustTab({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [adjusting, setAdjusting] = useState(false);
  const [currency, setCurrency] = useState<'USDT' | 'X'>('USDT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdjust = async () => {
    if (!amount || !reason) {
      setError('Fill in amount and reason');
      return;
    }

    setAdjusting(true);
    setError('');
    setSuccess('');

    try {
      await adminApi.adjustBalance(userId, currency, amount, reason);
      setSuccess(`Balance updated: ${amount} ${currency}`);
      setAmount('');
      setReason('');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdjusting(false);
    }
  };

  const quickPresets = [
    { label: '+$10', amount: '10', currency: 'USDT' as const },
    { label: '+$50', amount: '50', currency: 'USDT' as const },
    { label: '+$100', amount: '100', currency: 'USDT' as const },
    { label: '+100 $X', amount: '100', currency: 'X' as const },
    { label: '+500 $X', amount: '500', currency: 'X' as const },
    { label: '+1000 $X', amount: '1000', currency: 'X' as const },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Quick Presets */}
      <div>
        <p className="text-white/40 text-xs uppercase mb-3">Quick Presets</p>
        <div className="grid grid-cols-3 gap-2">
          {quickPresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setCurrency(preset.currency);
                setAmount(preset.amount);
                setReason(`Quick top-up ${preset.label}`);
              }}
              className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                preset.currency === 'USDT'
                  ? 'bg-white/5 hover:bg-white/10 text-white/80'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Form */}
      <div className="space-y-4">
        <p className="text-white/40 text-xs uppercase">Manual Adjustment</p>
        
        <div className="flex gap-3">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'USDT' | 'X')}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          >
            <option value="USDT">USDT</option>
            <option value="X">$X</option>
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (use - for deduct)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          />
        </div>
        
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required for audit)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
        />
        
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-emerald-400 text-sm">{success}</p>
          </div>
        )}

        <button
          onClick={handleAdjust}
          disabled={adjusting || !amount || !reason}
          className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:bg-white/5 
                   disabled:text-white/30 text-white font-semibold rounded-xl transition-colors"
        >
          {adjusting ? 'Processing...' : 'Apply Adjustment'}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
        <p className="text-orange-400/80 text-sm">
          ⚠️ All adjustments are logged in the audit trail and cannot be undone.
        </p>
      </div>
    </div>
  );
}
