import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Messenger } from './components/Messenger';
import { loadCredentials, saveCredentials } from './lib/storage';
import type { Credentials } from './types';

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials);

  function handleLogin(next: Credentials) {
    saveCredentials(next);
    setCredentials(next);
  }

  function handleLogout() {
    saveCredentials(null);
    setCredentials(null);
  }

  if (!credentials) return <LoginScreen onLogin={handleLogin} />;
  return <Messenger key={credentials.idInstance} credentials={credentials} onLogout={handleLogout} />;
}
