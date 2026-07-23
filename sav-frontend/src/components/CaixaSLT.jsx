/**
 * CaixaSLT.jsx — Caixa de entrada do SLT: lista as solicitações encaminhadas
 * (Solicitadas) que aguardam ser lançadas no SDP. O SLT abre cada uma, usa
 * "Copiar para o SDP" e depois marca como lançada.
 */
import { useEffect, useState } from 'react';
import { api, firstError } from '../api';

const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');

export default function CaixaSLT({ onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.sltInbox().then(setItems).catch((e) => setError(firstError(e)));
  }, []);

  if (error) return <div className="alert error">{error}</div>;

  return (
    <>
      <h1 className="page-title">Caixa de entrada do SLT</h1>
      <p className="page-sub">
        Solicitações encaminhadas aguardando lançamento no SDP. Abra cada uma,
        use «Copiar para o SDP» e marque como lançada.
      </p>

      {items === null && <div className="card empty">Carregando…</div>}
      {items && items.length === 0 && (
        <div className="card empty">Nenhuma solicitação encaminhada no momento.</div>
      )}
      {items && items.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Nº</th><th>Solicitante</th><th>Destino</th><th>Período</th><th>Veículo</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.request_number}</td>
                <td>{t.requester_name}</td>
                <td>{t.destination_label || '—'}</td>
                <td className="mono">{fmt(t.departure_date)} – {fmt(t.return_date)}</td>
                <td>{t.has_vehicle
                  ? <span title="Solicitou veículo da frota">🚗 Sim</span>
                  : <span style={{ color: '#99a' }}>—</span>}</td>
                <td><span className="status" data-s={t.status_display}>{t.status_display}</span></td>
                <td><button className="btn ghost" onClick={() => onOpen(t.id)}>Abrir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
