import { useEffect, useState } from 'react';
import { api, firstError } from '../api';

const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');

export default function MinhasViagens({ onNew, onOpen }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.minhasViagens().then(setRows).catch((e) => setError(firstError(e)));
  useEffect(() => { load(); }, []);

  async function cancel(row) {
    if (!window.confirm(`Cancelar a viagem ${row.numero}?`)) return;
    try { await api.cancelTrip(row.id); load(); }
    catch (e) { setError(firstError(e)); }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Minhas viagens</h1>
          <p className="page-sub">Acompanhe suas solicitações e o andamento de cada uma.</p>
        </div>
        <button className="btn" onClick={onNew}>Solicitar viagem</button>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}

      <div className="card">
        {rows === null && <div className="empty">Carregando…</div>}
        {rows && rows.length === 0 && (
          <div className="empty">
            <h3>Nenhuma viagem por aqui</h3>
            <p>Sua primeira solicitação leva menos de dois minutos.</p>
            <button className="btn" onClick={onNew}>Solicitar viagem</button>
          </div>
        )}
        {rows && rows.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th><th>Favorecido</th><th>Roteiro</th><th>Meio</th>
                <th>Ônus</th><th>Período</th><th>Situação</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.numero}</td>
                  <td>{r.favorecido || '—'}</td>
                  <td>{r.roteiro || '—'}</td>
                  <td>{r.meio || '—'}</td>
                  <td>{r.onus}</td>
                  <td className="mono">{fmt(r.saida)} – {fmt(r.retorno)}</td>
                  <td><span className="status" data-s={r.status}>{r.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn quiet" onClick={() => onOpen(r.id)}>Detalhes</button>{' '}
                    {r.pode_cancelar && (
                      <button className="btn danger" onClick={() => cancel(r)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
