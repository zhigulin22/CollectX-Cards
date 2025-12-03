import React from 'react';
import ReactDOM from 'react-dom/client';
import MainApp from './MainApp';
import './index.css';
import { TonConnectAppProvider } from './ton/TonConnectProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectAppProvider>
      <MainApp />
    </TonConnectAppProvider>
  </React.StrictMode>
);


