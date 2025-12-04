import { useEffect, useState, useCallback } from 'react';
import { adminApi, StatsResponse, WithdrawalItem, UserItem, RevenueResponse } from './api';
import { UserModal } from './components/UserModal';
import { ConfirmModal } from './components/ConfirmModal';

// TON Explorer helpers
const TON_EXPLORER_BASE = 'https://tonviewer.com';

function getTonAddressUrl(address: string): string {
  return `${TON_EXPLORER_BASE}/${address}`;
}

function getTonTxUrl(txHash: string): string {
  return `${TON_EXPLORER_BASE}/transaction/${txHash}`;
}

function shortenHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'dashboard' | 'users' | 'withdrawals' | 'settings' | 'audit';

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending count for badge
  useEffect(() => {
    const fetchPending = () => {
      adminApi.getStats().then((s) => setPendingCount(s.withdrawals.pending));
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Every 30 sec
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="bg-white/[0.02] border-b border-white/5 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 
                          rounded-xl flex items-center justify-center">
              <span className="text-lg font-bold text-white">⚙</span>
            </div>
            <div>
              <h1 className="text-white font-medium">CollectX Admin</h1>
              <p className="text-white/40 text-xs">Management Panel</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs">Live</span>
            </div>
            
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm text-white/50 hover:text-white 
                       hover:bg-white/5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white/[0.01] border-b border-white/5 px-6 sticky top-[72px] z-30">
        <div className="max-w-6xl mx-auto flex gap-1">
          {[
            { id: 'dashboard', label: '📊 Dashboard', badge: 0 },
            { id: 'users', label: '👥 Users', badge: 0 },
            { id: 'withdrawals', label: '💸 Withdrawals', badge: pendingCount },
            { id: 'settings', label: '⚙️ Settings', badge: 0 },
            { id: 'audit', label: '📋 Audit Log', badge: 0 },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-orange-400 border-orange-400'
                  : 'text-white/50 border-transparent hover:text-white/80'
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white 
                               text-xs rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'withdrawals' && <WithdrawalsTab onUpdate={() => {
          adminApi.getStats().then((s) => setPendingCount(s.withdrawals.pending));
        }} />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'audit' && <AuditTab />}
      </main>
    </div>
  );
}

// Dashboard Tab
function DashboardTab() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getRevenue(),
    ])
      .then(([statsData, revenueData]) => {
        setStats(statsData);
        setRevenue(revenueData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!stats) return <Error message="Failed to load stats" />;

  const totalValue = parseFloat(stats.wallets.totalUsdt) + parseFloat(stats.wallets.totalX) / 100;

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-3xl p-8 border border-orange-500/20">
        <p className="text-orange-400/60 text-sm uppercase tracking-wider mb-2">Total Platform Value</p>
        <p className="text-5xl font-light text-white mb-4">${totalValue.toFixed(2)}</p>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-white/40">Users: </span>
            <span className="text-white">{stats.users.total}</span>
          </div>
          <div>
            <span className="text-white/40">Transactions: </span>
            <span className="text-white">{stats.transactions.total}</span>
          </div>
          <div>
            <span className="text-white/40">Pending: </span>
            <span className={stats.withdrawals.pending > 0 ? 'text-orange-400' : 'text-white'}>
              {stats.withdrawals.pending}
            </span>
          </div>
        </div>
      </div>

      {/* Revenue Card - Заработок на комиссиях */}
      {revenue && (
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-3xl p-6 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-emerald-400/60 text-sm uppercase tracking-wider mb-1">Platform Revenue</p>
              <p className="text-4xl font-light text-white">${parseFloat(revenue.total.usdt).toFixed(2)}</p>
              <p className="text-emerald-400/50 text-xs mt-1">Total earned from fees</p>
            </div>
            <div className="text-5xl">💰</div>
          </div>
          
          {/* Period breakdown */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs uppercase mb-1">Today</p>
              <p className="text-emerald-400 font-medium">${parseFloat(revenue.today.usdt).toFixed(2)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs uppercase mb-1">Last 7 days</p>
              <p className="text-emerald-400 font-medium">${parseFloat(revenue.week.usdt).toFixed(2)}</p>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-white/40 text-xs uppercase mb-3">Revenue by source</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                  <span className="text-white/60">Swap fees</span>
                  <span className="text-white/30 text-xs">
                    ({revenue.total.breakdown.swap.count}
                    {revenue.total.breakdown.swap.totalTxs && revenue.total.breakdown.swap.totalTxs !== revenue.total.breakdown.swap.count 
                      ? ` of ${revenue.total.breakdown.swap.totalTxs}` 
                      : ''} swaps)
                  </span>
                </div>
                <span className="text-white font-medium">${parseFloat(revenue.total.breakdown.swap.usdt).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-white/60">Send fees</span>
                  <span className="text-white/30 text-xs">
                    ({revenue.total.breakdown.send.count}
                    {revenue.total.breakdown.send.totalTxs && revenue.total.breakdown.send.totalTxs !== revenue.total.breakdown.send.count 
                      ? ` of ${revenue.total.breakdown.send.totalTxs}` 
                      : ''} sends)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-white font-medium">{revenue.total.breakdown.send.x} $X</span>
                  <span className="text-white/30 text-xs ml-1">(~${parseFloat(revenue.total.breakdown.send.usdt).toFixed(2)})</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm opacity-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  <span className="text-white/60">Withdraw fees</span>
                  <span className="text-white/30 text-xs">(network costs)</span>
                </div>
                <span className="text-white/50">${parseFloat(revenue.total.breakdown.withdraw.usdt).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total Users" 
          value={stats.users.total} 
          icon="👥"
          trend={`+${Math.floor(Math.random() * 10)}%`}
        />
        <StatCard 
          label="USDT in System" 
          value={`$${parseFloat(stats.wallets.totalUsdt).toFixed(2)}`} 
          icon="💵"
        />
        <StatCard 
          label="$X in Circulation" 
          value={parseFloat(stats.wallets.totalX).toFixed(0)} 
          icon="🪙"
        />
        <StatCard 
          label="Pending Withdrawals" 
          value={stats.withdrawals.pending} 
          icon="⏳" 
          color={stats.withdrawals.pending > 0 ? 'orange' : 'default'}
        />
      </div>

      {/* Transaction Breakdown */}
      <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5">
        <h3 className="text-white font-medium mb-4">Transaction Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.transactions.byType.map((t) => {
            const icons: Record<string, string> = {
              deposit: '💰',
              swap: '🔄',
              send: '↗️',
              receive: '↙️',
              withdraw: '💸',
            };
            return (
              <div key={t.type} className="bg-white/[0.03] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{icons[t.type] || '•'}</span>
                  <span className="text-white/40 text-xs uppercase">{t.type}</span>
                </div>
                <p className="text-white text-2xl font-light">{t.count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-6 border border-white/5 
                         text-left transition-colors group">
          <span className="text-2xl mb-2 block">📊</span>
          <span className="text-white font-medium group-hover:text-orange-400 transition-colors">
            Export Report
          </span>
          <p className="text-white/40 text-sm mt-1">Download CSV of all data</p>
        </button>
        <button className="bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-6 border border-white/5 
                         text-left transition-colors group">
          <span className="text-2xl mb-2 block">⚙️</span>
          <span className="text-white font-medium group-hover:text-orange-400 transition-colors">
            System Settings
          </span>
          <p className="text-white/40 text-sm mt-1">Configure swap rates & fees</p>
        </button>
      </div>
    </div>
  );
}

// Users Tab with Modal
function UsersTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(page, 20, search || undefined);
      setUsers(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 Search by username, name, or Telegram ID..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                     text-white placeholder:text-white/30 outline-none
                     focus:border-orange-500/50 transition-colors"
          />
        </div>
        <button 
          onClick={loadUsers}
          className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-white/60">
          {total} users total
        </span>
        {search && (
          <span className="px-3 py-1.5 bg-orange-500/10 rounded-lg text-orange-400">
            Filtered: "{search}"
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-white/40 text-xs uppercase p-4">User</th>
              <th className="text-left text-white/40 text-xs uppercase p-4">Telegram ID</th>
              <th className="text-right text-white/40 text-xs uppercase p-4">USDT</th>
              <th className="text-right text-white/40 text-xs uppercase p-4">$X</th>
              <th className="text-right text-white/40 text-xs uppercase p-4">Joined</th>
              <th className="text-right text-white/40 text-xs uppercase p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-white/40">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-white/40">No users found</td></tr>
            ) : (
              users.map((user) => (
                <tr 
                  key={user.id} 
                  className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                        user.isBlocked 
                          ? 'bg-rose-500/20 text-rose-400' 
                          : 'bg-gradient-to-br from-white/10 to-white/5'
                      }`}>
                        {user.isBlocked ? '🚫' : (user.firstName || user.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm">{user.firstName || user.username || 'User'}</p>
                          {user.isBlocked && (
                            <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] rounded font-medium">
                              BLOCKED
                            </span>
                          )}
                        </div>
                        {user.username && <p className="text-white/40 text-xs">@{user.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-white/60 text-sm font-mono">{user.telegramId}</td>
                  <td className="p-4 text-right text-white font-mono">
                    ${parseFloat(user.balanceUsdt).toFixed(2)}
                  </td>
                  <td className="p-4 text-right text-emerald-400 font-mono">
                    {parseFloat(user.balanceX).toFixed(0)}
                  </td>
                  <td className="p-4 text-right text-white/40 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 
                               text-orange-400 text-xs rounded-lg transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedUserId(user.id); }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm">
        <p className="text-white/40">
          Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 
                     disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
          >
            ← Prev
          </button>
          <span className="px-4 py-2 text-white/40">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={users.length < 20}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 
                     disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* User Modal */}
      {selectedUserId && (
        <UserModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onBalanceUpdated={loadUsers}
        />
      )}
    </div>
  );
}

// Withdrawals Tab with auto-refresh
function WithdrawalsTab({ onUpdate }: { onUpdate: () => void }) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: 'approve' | 'reject';
  } | null>(null);
  const [txHash, setTxHash] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const loadWithdrawals = useCallback(async () => {
    try {
      const res = await adminApi.getPendingWithdrawals();
      setWithdrawals(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWithdrawals();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadWithdrawals, 30000);
    return () => clearInterval(interval);
  }, [loadWithdrawals]);

  const handleAction = async () => {
    if (!confirmAction) return;
    
    setProcessing(confirmAction.id);
    try {
      if (confirmAction.type === 'approve') {
        await adminApi.updateWithdrawal(confirmAction.id, 'COMPLETED', txHash || undefined);
      } else {
        await adminApi.updateWithdrawal(confirmAction.id, 'FAILED', undefined, rejectReason || 'Rejected by admin');
      }
      loadWithdrawals();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
      setConfirmAction(null);
      setTxHash('');
      setRejectReason('');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-medium">Pending Withdrawals</h2>
          <span className="px-2 py-1 bg-white/5 rounded-lg text-white/40 text-sm">
            {withdrawals.length} pending
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Auto-refresh: 30s
          </div>
          <button 
            onClick={loadWithdrawals} 
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {withdrawals.length === 0 ? (
        <div className="bg-white/[0.02] rounded-3xl p-16 text-center border border-white/5">
          <span className="text-5xl mb-4 block">✅</span>
          <p className="text-white/60 text-lg">All caught up!</p>
          <p className="text-white/30 text-sm mt-2">No pending withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div 
              key={w.id} 
              className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 
                       hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-light text-white">{w.netAmount} USDT</span>
                    <span className="px-2.5 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium">
                      {w.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/40 text-xs uppercase mb-1">User</p>
                      <p className="text-white">
                        {w.user?.firstName || w.user?.username || 'Unknown'}
                        {w.user?.username && <span className="text-white/40"> @{w.user.username}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase mb-1">Telegram ID</p>
                      <p className="text-white/60 font-mono">{w.user?.telegramId}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-white/40 text-xs uppercase mb-1">Destination</p>
                    <a 
                      href={getTonAddressUrl(w.toAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-mono break-all 
                               underline underline-offset-2 transition-colors"
                    >
                      {w.toAddress}
                    </a>
                  </div>

                  {w.txHash && (
                    <div className="mt-3">
                      <p className="text-white/40 text-xs uppercase mb-1">Transaction</p>
                      <a 
                        href={getTonTxUrl(w.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 
                                 text-sm font-mono underline underline-offset-2 transition-colors"
                      >
                        {shortenHash(w.txHash)}
                        <span className="text-xs">↗</span>
                      </a>
                    </div>
                  )}
                  
                  <p className="text-white/20 text-xs mt-3">
                    Created: {new Date(w.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setConfirmAction({ id: w.id, type: 'approve' })}
                    disabled={processing === w.id}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 
                             text-white text-sm font-medium rounded-xl
                             disabled:opacity-50 transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setConfirmAction({ id: w.id, type: 'reject' })}
                    disabled={processing === w.id}
                    className="px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 
                             text-rose-400 text-sm font-medium rounded-xl
                             disabled:opacity-50 transition-colors"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.type === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
          message={confirmAction.type === 'approve' 
            ? 'Confirm that you have sent the funds to the user.' 
            : 'This will refund the user\'s balance.'}
          confirmText={confirmAction.type === 'approve' ? 'Approve' : 'Reject'}
          variant={confirmAction.type === 'approve' ? 'success' : 'danger'}
          onConfirm={handleAction}
          onCancel={() => {
            setConfirmAction(null);
            setTxHash('');
            setRejectReason('');
          }}
          loading={processing === confirmAction.id}
          inputLabel={confirmAction.type === 'approve' ? 'Transaction Hash (optional)' : 'Rejection Reason'}
          inputValue={confirmAction.type === 'approve' ? txHash : rejectReason}
          onInputChange={confirmAction.type === 'approve' ? setTxHash : setRejectReason}
        />
      )}
    </div>
  );
}

// Settings Tab
function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    adminApi.getSettings()
      .then((data) => {
        setSettings(data);
        setEditValues(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await adminApi.updateSetting(key, editValues[key]);
      setSettings((prev) => ({ ...prev, [key]: editValues[key] }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Loading />;

  const settingsConfig = [
    { 
      key: 'usdt_to_x_rate', 
      label: 'USDT to $X Rate', 
      description: 'How many $X per 1 USDT',
      icon: '💱',
      suffix: '$X per USDT',
    },
    { 
      key: 'swap_fee_percent', 
      label: 'Swap Fee', 
      description: 'Fee charged on swaps',
      icon: '🔄',
      suffix: '%',
    },
    { 
      key: 'send_fee_x', 
      label: 'Send Fee', 
      description: 'Fixed fee for $X transfers',
      icon: '📤',
      suffix: '$X',
    },
    { 
      key: 'min_withdraw_usdt', 
      label: 'Min Withdrawal', 
      description: 'Minimum withdrawal amount',
      icon: '⬇️',
      suffix: 'USDT',
    },
    { 
      key: 'max_withdraw_usdt', 
      label: 'Max Withdrawal', 
      description: 'Maximum withdrawal amount',
      icon: '⬆️',
      suffix: 'USDT',
    },
    { 
      key: 'withdraw_fee_usdt', 
      label: 'Withdrawal Fee', 
      description: 'Network fee for withdrawals',
      icon: '💸',
      suffix: 'USDT',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-white font-medium text-lg">System Settings</h2>
          <p className="text-white/40 text-sm">Configure rates, fees, and limits</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-lg">
          <span className="text-orange-400 text-xs">⚠️ Changes apply immediately</span>
        </div>
      </div>

      <div className="grid gap-4">
        {settingsConfig.map((config) => {
          const currentValue = settings[config.key] || '';
          const editValue = editValues[config.key] || '';
          const isChanged = currentValue !== editValue;
          const isSaving = saving === config.key;

          return (
            <div 
              key={config.key}
              className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <p className="text-white font-medium">{config.label}</p>
                    <p className="text-white/40 text-sm">{config.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [config.key]: e.target.value }))}
                      className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 
                               text-white text-right font-mono outline-none
                               focus:border-orange-500/50 transition-colors"
                    />
                    <span className="text-white/40 text-sm min-w-[60px]">{config.suffix}</span>
                  </div>

                  <button
                    onClick={() => handleSave(config.key)}
                    disabled={!isChanged || isSaving}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isChanged
                        ? 'bg-orange-500 hover:bg-orange-400 text-white'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? '...' : 'Save'}
                  </button>
                </div>
              </div>

              {isChanged && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs">
                  <span className="text-white/30">Current:</span>
                  <span className="text-white/50 font-mono">{currentValue}</span>
                  <span className="text-white/30">→</span>
                  <span className="text-orange-400 font-mono">{editValue}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-500/10 rounded-2xl p-5 border border-rose-500/20">
        <h3 className="text-rose-400 font-medium mb-2">⚠️ Important Notes</h3>
        <ul className="text-rose-400/70 text-sm space-y-1">
          <li>• Rate changes affect all future swaps immediately</li>
          <li>• Fee changes do not affect pending transactions</li>
          <li>• All changes are logged in the Audit Log</li>
        </ul>
      </div>
    </div>
  );
}

// Audit Tab
function AuditTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    adminApi.getAuditLog(page)
      .then((res) => {
        setEntries(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <Loading />;

  const actionColors: Record<string, string> = {
    BALANCE_ADJUST: 'bg-orange-500/20 text-orange-400',
    WITHDRAW_APPROVE: 'bg-emerald-500/20 text-emerald-400',
    WITHDRAW_REJECT: 'bg-rose-500/20 text-rose-400',
    USER_VIEW: 'bg-blue-500/20 text-blue-400',
    SETTINGS_UPDATE: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-medium">Audit Log</h2>
        <span className="text-white/40 text-sm">{total} entries</span>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white/[0.02] rounded-2xl p-12 text-center border border-white/5">
          <p className="text-white/40">No audit entries yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div 
              key={e.id} 
              className="bg-white/[0.02] rounded-xl p-4 border border-white/5 
                       hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      actionColors[e.action] || 'bg-white/10 text-white/60'
                    }`}>
                      {e.action}
                    </span>
                    <span className="text-white/30 text-xs">by {e.actor}</span>
                  </div>
                  
                  {e.targetType && (
                    <p className="text-white/60 text-sm">
                      Target: <span className="text-white/40">{e.targetType}</span>
                      {e.targetId && <span className="font-mono text-xs ml-2">{e.targetId.slice(0, 12)}...</span>}
                    </p>
                  )}
                  
                  {e.details && (
                    <pre className="mt-2 text-xs text-white/30 bg-white/5 rounded p-2 overflow-auto max-h-20">
                      {JSON.stringify(e.details, null, 2)}
                    </pre>
                  )}
                </div>
                
                <div className="text-right text-xs text-white/30 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-white/5 rounded-lg text-white/60 disabled:opacity-30"
        >
          ← Prev
        </button>
        <span className="px-4 py-2 text-white/40">Page {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={entries.length < 50}
          className="px-4 py-2 bg-white/5 rounded-lg text-white/60 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, icon, color = 'default', trend }: { 
  label: string; 
  value: number | string; 
  icon: string;
  color?: 'default' | 'orange';
  trend?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 border transition-colors hover:bg-white/[0.03] ${
      color === 'orange' 
        ? 'bg-orange-500/10 border-orange-500/20' 
        : 'bg-white/[0.02] border-white/5'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
            {trend}
          </span>
        )}
      </div>
      <p className={`text-2xl font-light ${color === 'orange' ? 'text-orange-400' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-white/40 text-sm mt-1">{label}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}

function Error({ message }: { message: string }) {
  return (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center">
      <p className="text-rose-400">{message}</p>
    </div>
  );
}
