/**
 * App.jsx — casca do portal SAV: autenticação, barra lateral e navegação
 * entre Minhas Viagens, o assistente de solicitação e o detalhe da viagem.
 */
import { useEffect, useState } from 'react';
import { api } from './api';
import Login from './components/Login';
import MinhasViagens from './components/MinhasViagens';
import SolicitacaoViagem from './components/SolicitacaoViagem';
import TripDetail from './components/TripDetail';
import CaixaSLT from './components/CaixaSLT';
import CaixaSOF from './components/CaixaSOF';
import PrestacaoContas from './components/PrestacaoContas';
import AnalisePCV from './components/AnalisePCV';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(api.hasSession());
  const [view, setView] = useState({ name: 'mine' });
  const [toast, setToast] = useState('');

  // Página inicial conforme o papel: SLT → Caixa SLT; SOF → Caixa SOF; demais → Minhas viagens
  const telaInicial = (u) => {
    if (u?.profile_role === 'SIL') return { name: 'slt' };
    if (u?.profile_role === 'FINANCE') return { name: 'sof' };
    return { name: 'mine' };
  };
  function entrar(u) { setUser(u); setView(telaInicial(u)); }

  useEffect(() => {
    if (!api.hasSession()) return;
    api.me().then(entrar).catch(() => api.logout()).finally(() => setChecking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) return null;
  if (!user) return <Login onLogin={entrar} />;

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
          <button className={`navlink ${view.name === 'pcv' ? 'active' : ''}`}
            onClick={() => setView({ name: 'pcv' })}>Prestação de contas</button>
          {(user.profile_role === 'SIL' || user.profile_role === 'ADMIN') && (
            <button className={`navlink ${view.name === 'slt' ? 'active' : ''}`}
              onClick={() => setView({ name: 'slt' })}>Caixa do SLT</button>
          )}
          {(user.profile_role === 'FINANCE' || user.profile_role === 'ADMIN') && (
            <button className={`navlink ${view.name === 'sof' ? 'active' : ''}`}
              onClick={() => setView({ name: 'sof' })}>Caixa do SOF</button>
          )}
          {(user.profile_role === 'FINANCE' || user.profile_role === 'ADMIN') && (
            <button className={`navlink ${view.name === 'analise-pcv' ? 'active' : ''}`}
              onClick={() => setView({ name: 'analise-pcv' })}>Análise de PCV</button>
          )}
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
          <SolicitacaoViagem
            user={user}
            onCancel={() => setView({ name: 'mine' })}
            onDone={(id, submitted) => {
              flash(submitted
                ? 'Solicitação encaminhada ao SLT para lançamento no SDP.'
                : 'Rascunho salvo. Encaminhe quando estiver pronto.');
              setView({ name: 'detail', id });
            }}
          />
        )}
        {view.name === 'slt' && (
          <CaixaSLT onOpen={(id) => setView({ name: 'detail', id, from: 'slt' })} />
        )}
        {view.name === 'sof' && (
          <CaixaSOF onOpen={(id) => setView({ name: 'detail', id, from: 'sof' })} />
        )}
        {view.name === 'pcv' && <PrestacaoContas />}
        {view.name === 'analise-pcv' && <AnalisePCV />}
        {view.name === 'detail' && (
          <TripDetail tripId={view.id} user={user}
            onBack={() => setView({ name: ['slt', 'sof'].includes(view.from) ? view.from : 'mine' })} />
        )}
      </main>
    </div>
  );
}
