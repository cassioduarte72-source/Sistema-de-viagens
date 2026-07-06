import { useState } from 'react';
import { api, firstError } from '../api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      onLogin(await api.login(username, password));
    } catch (err) {
      setError(err.status === 401
        ? 'Matrícula ou senha incorretas.'
        : firstError(err, 'Servidor indisponível. Tente novamente.'));
    } finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">SAV<small>Sistema de Autorização de Viagens · Embrapa CNPMF</small></div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="u">Usuário</label>
            <input id="u" value={username} onChange={(e) => setUsername(e.target.value)}
              autoComplete="username" autoFocus required />
          </div>
          <div className="field">
            <label htmlFor="p">Senha</label>
            <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required />
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );
}
