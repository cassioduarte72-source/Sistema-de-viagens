/**
 * CaixaSOF.jsx — Caixa de entrada do SOF: pedidos com SEI já informado pelo SLT,
 * aguardando a Nota de Empenho e o valor. O SOF abre cada um e informa o empenho.
 */
import { useEffect, useState } from 'react';
import { api, firstError } from '../api';

const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');

export default function CaixaSOF({ onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.sofInbox().then(setItems).catch((e) => setError(firstError(e)));
  }, []);

  if (error) return <div className="alert error">{error}</div>;

  return (
    <>
      <h1 className="page-title">Caixa de entrada do SOF</h1>
      <p className="page-sub">
        Pedidos com SEI informado pelo SLT, aguardando a Nota de Empenho e o valor.
      </p>

      {items === null && <div className="card empty">Carregando…</div>}
      {items && items.length === 0 && (
        <div className="card empty">Nenhum pedido aguardando empenho no momento.</div>
      )}
      {items && items.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Nº</th><th>Solicitante</th><th>Destino</th><th>Período</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.request_number}</td>
                <td>{t.requester_name}</td>
                <td>{t.destination_label || '—'}</td>
                <td className="mono">{fmt(t.departure_date)} – {fmt(t.return_date)}</td>
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
