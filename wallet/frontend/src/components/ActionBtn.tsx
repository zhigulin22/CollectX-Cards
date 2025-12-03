import { ReactNode } from 'react';

interface ActionBtnProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'accent';
}

export function ActionBtn({ icon, label, onClick, variant = 'default' }: ActionBtnProps) {
  const variants = {
    default: 'bg-white/5 hover:bg-white/10 text-white/80',
    primary: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400',
    accent: 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400',
  };

  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2 group"
    >
      <div className={`
        w-full h-14 rounded-2xl flex items-center justify-center gap-2
        transition-all duration-200 ease-out
        group-hover:scale-[1.02] group-active:scale-[0.98]
        ${variants[variant]}
      `}>
        {icon}
        <span className="text-sm font-medium">
          {label}
        </span>
      </div>
    </button>
  );
}
