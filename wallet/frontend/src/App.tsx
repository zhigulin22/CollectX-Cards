import { useEffect } from 'react';
import { useStore } from './store';
import { Splash } from './screens/Splash';
import { LoginScreen } from './screens/LoginScreen';
import { WalletScreen } from './screens/WalletScreen';
import { AdminApp } from './admin/AdminApp';

export default function App() {
  const { token, user, isLoading, error, init, login } = useStore();

  // Проверка на админ-панель
  const isAdminRoute = window.location.pathname === '/admin';

  useEffect(() => {
    if (!isAdminRoute) {
      init();
    }
  }, [isAdminRoute]);

  // Админ-панель
  if (isAdminRoute) {
    return <AdminApp />;
  }

  // Обычное приложение кошелька
  if (isLoading && !token) {
    return <Splash />;
  }

  if (!token || !user) {
    return <LoginScreen onLogin={login} isLoading={isLoading} error={error} />;
  }

  return <WalletScreen />;
}
