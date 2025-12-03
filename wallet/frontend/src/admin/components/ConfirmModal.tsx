interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  inputLabel?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
  loading,
  inputLabel,
  inputValue,
  onInputChange,
}: ConfirmModalProps) {
  const colors = {
    danger: 'bg-rose-500 hover:bg-rose-400',
    success: 'bg-emerald-500 hover:bg-emerald-400',
    warning: 'bg-orange-500 hover:bg-orange-400',
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div 
        className="bg-[#111] rounded-2xl w-full max-w-sm border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
          <p className="text-white/60 text-sm">{message}</p>

          {inputLabel && onInputChange && (
            <div className="mt-4">
              <label className="text-white/40 text-xs uppercase block mb-2">{inputLabel}</label>
              <input
                type="text"
                value={inputValue || ''}
                onChange={(e) => onInputChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-white/5">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/80 
                     font-medium rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 ${colors[variant]} disabled:opacity-50
                       text-white font-medium rounded-xl transition-colors`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

