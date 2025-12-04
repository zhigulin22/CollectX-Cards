import { TonConnectUIProvider, useTonWallet } from '@tonconnect/ui-react';
import { createContext, useContext, useMemo } from 'react';
import { api } from '../api';

interface TonContextValue {
  walletAddress: string | null;
}

const TonContext = createContext<TonContextValue>({ walletAddress: null });

export function TonConnectAppProvider({ children }: { children: React.ReactNode }) {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <TonContextInner>{children}</TonContextInner>
    </TonConnectUIProvider>
  );
}

function TonContextInner({ children }: { children: React.ReactNode }) {
  const wallet = useTonWallet();

  const walletAddress = useMemo(() => {
    if (!wallet || !wallet.account) return null;
    return wallet.account.address;
  }, [wallet]);

  // On connect: send address to backend (fire and forget)
  if (walletAddress) {
    api
      .linkTonAddress(walletAddress)
      .catch(() => {
        // ignore errors here, UI не блокируем
      });
  }

  const value: TonContextValue = { walletAddress };

  return <TonContext.Provider value={value}>{children}</TonContext.Provider>;
}

export function useTonContext() {
  return useContext(TonContext);
}


