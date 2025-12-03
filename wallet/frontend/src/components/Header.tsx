import { ChevronLeftIcon } from './Icons';

interface HeaderProps {
  title: string;
  onBack: () => void;
}

export function Header({ title, onBack }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
      <button
        onClick={onBack}
        className="w-10 h-10 -ml-2 flex items-center justify-center rounded-xl
                   text-white/60 hover:text-white hover:bg-white/5 
                   transition-all active:scale-95"
      >
        <ChevronLeftIcon size={24} />
      </button>
      <h1 className="text-lg font-medium text-white/90">{title}</h1>
    </header>
  );
}
