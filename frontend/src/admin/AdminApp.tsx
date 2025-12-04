import { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { adminApi } from './api';

export function AdminApp() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Проверяем сохранённый ключ
    const savedKey = localStorage.getItem('adminKey');
    if (savedKey) {
      adminApi.checkAuth()
        .then(() => setIsAuthed(true))
        .catch(() => localStorage.removeItem('adminKey'))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = async (key: string) => {
    localStorage.setItem('adminKey', key);
    try {
      await adminApi.checkAuth();
      setIsAuthed(true);
    } catch (err) {
      localStorage.removeItem('adminKey');
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminKey');
    setIsAuthed(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthed) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

