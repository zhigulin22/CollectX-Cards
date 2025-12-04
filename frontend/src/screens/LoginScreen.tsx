interface LoginScreenProps {
  onLogin: () => void;
  isLoading: boolean;
  error: string | null;
}

export function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  return (
    <div className="h-full flex items-center justify-center p-8 bg-[#0A0A0A]">
      <div className="text-center w-full max-w-xs">
        {/* Logo */}
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 
                      rounded-3xl flex items-center justify-center mx-auto mb-8
                      shadow-2xl shadow-emerald-500/30">
          <span className="text-5xl font-bold text-white">X</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
          Collect<span className="font-semibold">X</span>
        </h1>
        <p className="text-white/40 mb-10">Your digital wallet</p>

        {/* Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-6">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {/* Connect Button */}
        <button
          onClick={onLogin}
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 
                     hover:from-emerald-400 hover:to-emerald-500
                     disabled:from-white/5 disabled:to-white/5 disabled:text-white/30
                     text-white font-semibold rounded-2xl
                     transition-all active:scale-[0.98] disabled:active:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </span>
          ) : (
            'Connect Wallet'
          )}
        </button>

        {/* Footer */}
        <p className="text-xs text-white/20 mt-8">
          Powered by TON Network
        </p>
      </div>
    </div>
  );
}
