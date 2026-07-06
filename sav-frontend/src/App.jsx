/**
 * App.jsx — casca do portal SAV: autenticação, barra lateral e navegação
 * entre Minhas Viagens, o assistente de solicitação e o detalhe da viagem.
 */
import { useEffect, useState } from 'react';
import { api } from './api';
import Login from './components/Login';
import MinhasViagens from './components/MinhasViagens';
import Wizard from './components/Wizard';
import TripDetail from './components/TripDetail';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(api.hasSession());
  const [view, setView] = useState({ name: 'mine' });
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!api.hasSession()) return;
    api.me().then(setUser).catch(() => api.logout()).finally(() => setChecking(false));
  }, []);

  if (checking) return null;
  if (!user) return <Login onLogin={setUser} />;

  function logout() { api.logout(); setUser(null); setView({ name: 'mine' }); }
  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 4000); }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">SAV<small>Autorização de Viagens · CNPMF</small></div>
        <nav>
          <button className={`navlink ${view.name === 'mine' ? 'active' : ''}`}
            onClick={() => setView({ name: 'mine' })}>Minhas viagens</button>
          <button className={`navlink ${view.name === 'wizard' ? 'active' : ''}`}
            onClick={() => setView({ name: 'wizard' })}>Solicitar viagem</button>
        </nav>
        <div className="spacer" />
        <div className="userbox">
          <strong>{user.full_name}</strong>
          {user.registration_number}
          <div style={{ marginTop: 10 }}>
            <button className="navlink" onClick={logout}>Sair</button>
          </div>
        </div>
      </aside>

      <main className="main">
        {toast && <div className="alert warn" role="status">{toast}</div>}
        {view.name === 'mine' && (
          <MinhasViagens
            onNew={() => setView({ name: 'wizard' })}
            onOpen={(id) => setView({ name: 'detail', id })}
          />
        )}
        {view.name === 'wizard' && (
          <Wizard
            onCancel={() => setView({ name: 'mine' })}
            onDone={(id, submitted) => {
              flash(submitted
                ? 'Viagem enviada para aprovação. Você será avisado por e-mail.'
                : 'Rascunho salvo. Envie quando estiver pronto.');
              setView({ name: 'detail', id });
            }}
          />
        )}
        {view.name === 'detail' && (
          <TripDetail tripId={view.id} onBack={() => setView({ name: 'mine' })} />
        )}
      </main>
    </div>
  );
}
