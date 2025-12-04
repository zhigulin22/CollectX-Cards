import { useTonConnectUI } from '@tonconnect/ui-react';
import { useTonContext } from '../ton/TonConnectProvider';

export function TonConnectButton() {
  const [tonConnectUI] = useTonConnectUI();
  const { walletAddress } = useTonContext();

  const shortAddress =
    walletAddress && walletAddress.length > 10
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
      : walletAddress;

  const label = walletAddress ? shortAddress : 'Connect TON';

  return (
    <button
      onClick={() => tonConnectUI.openModal()}
      className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/80 hover:bg-white/20 transition-colors"
    >
      {label}
    </button>
  );
}


