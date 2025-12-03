import { useState } from 'react';

interface AdminLoginProps {
  onLogin: (key: string) => Promise<void>;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError('');

    try {
      await onLogin(key.trim());
    } catch (err: any) {
      setError(err.message || 'Invalid API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 
                        rounded-2xl flex items-center justify-center mx-auto mb-4
                        shadow-lg shadow-orange-500/20">
            <span className="text-2xl font-bold text-white">⚙</span>
          </div>
          <h1 className="text-2xl font-light text-white">Admin Panel</h1>
          <p className="text-white/40 text-sm mt-1">CollectX Management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Admin API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your admin key..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                       text-white placeholder:text-white/20 outline-none
                       focus:border-orange-500/50 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              <p className="text-rose-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 
                     hover:from-orange-400 hover:to-orange-500
                     disabled:from-white/5 disabled:to-white/5 disabled:text-white/30
                     text-white font-semibold rounded-xl
                     transition-all active:scale-[0.98]"
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-8">
          Contact your administrator for access
        </p>
      </div>
    </div>
  );
}

