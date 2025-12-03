export function Splash() {
  return (
    <div className="h-full flex items-center justify-center bg-[#0A0A0A]">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 
                        rounded-2xl animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-white">X</span>
          </div>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center gap-2 text-white/40">
          <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 
                        rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    </div>
  );
}
