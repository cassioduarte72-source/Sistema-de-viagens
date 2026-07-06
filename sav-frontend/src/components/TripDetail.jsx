/**
 * TripDetail.jsx — Detalhe da viagem: blocos como no SAGU (informações gerais,
 * favorecidos com totais, histórico de status) e o botão "Copiar para o SDP",
 * que leva a transcrição já ordenada para a área de transferência.
 */
import { useEffect, useState } from 'react';
import { api, firstError } from '../api';

const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');
const money = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function transcriptToText(t) {
  const lines = [
    `SAV ${t.numero_sav} — ${t.status_sagu}`,
    `Solicitante: ${t.solicitante}`,
    `Modalidade: ${t.modalidade || '—'}`,
    `Roteiro: ${t.roteiro}`,
    `Período: ${fmt(t.saida)} a ${fmt(t.retorno)}`,
    `Justificativa: ${t.justificativa}`,
    t.projeto ? `Projeto: ${t.projeto}` : null,
    `Total geral: ${money(t.total_geral)}`,
    '',
    '── FAVORECIDOS (ordem das telas do SDP) ──',
  ].filter(Boolean);
  t.favorecidos.forEach((f, i) => {
    lines.push(
      `${i + 1}. ${f.favorecido_nome} (${f.favorecido_tipo})`,
      `   Viagem: ${f.viagem} | Ônus: ${f.onus} | UG: ${f.unidade_gestora}`,
      `   Período: ${fmt(f.periodo.inicio)} a ${fmt(f.periodo.fim)} | Cidade: ${f.cidade || '—'}`,
      `   Diárias: ${f.qtde_diarias} × ${money(f.valor_diaria)} | Hotel: ${money(f.hotel)} | Adicionais: ${money(f.adicionais)} | Total: ${money(f.total)}`,
      f.processo_sei ? `   SEI: ${f.processo_sei}` : '   SEI: —',
    );
    if (f.orcamento) {
      lines.push(
        `   Orçamento: ${f.orcamento.elemento_despesa} | UGR ${f.orcamento.ugr || '—'} | Fonte ${f.orcamento.fonte || '—'} | PTRES ${f.orcamento.ptres || '—'} | PI ${f.orcamento.pi || '—'} | NE ${f.orcamento.empenho || '—'}`,
      );
    }
  });
  return lines.join('\n');
}

export default function TripDetail({ tripId, onBack }) {
  const [trip, setTrip] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.trip(tripId).then(setTrip).catch((e) => setError(firstError(e)));
    api.statusHistory(tripId).then(setHistory).catch(() => {});
  }, [tripId]);

  async function copySdp() {
    try {
      const t = await api.sdpTranscript(tripId);
      await navigator.clipboard.writeText(transcriptToText(t));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) { setError(firstError(e)); }
  }

  if (error) return <div className="alert error">{error}</div>;
  if (!trip) return <div className="card empty">Carregando…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title mono">{trip.request_number}</h1>
          <p className="page-sub">
            <span className="status" data-s={trip.status_display}>{trip.status_display}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={copySdp}>
            {copied ? 'Copiado ✓' : 'Copiar para o SDP'}
          </button>
          <button className="btn quiet" onClick={onBack}>Voltar</button>
        </div>
      </div>

      <div className="blocks">
        <div className="card block">
          <h3>Informações gerais</h3>
          <dl className="kv">
            <dt>Modalidade</dt><dd>{trip.modality || '—'}</dd>
            <dt>Roteiro</dt>
            <dd>{trip.origin_city}/{trip.origin_state} → {trip.destination_detail
              ? `${trip.destination_detail.city}/${trip.destination_detail.state}` : '—'} → {trip.origin_city}/{trip.origin_state}</dd>
            <dt>Saída</dt><dd className="mono">{fmt(trip.departure_date)} {trip.departure_time?.slice(0, 5) || ''}</dd>
            <dt>Retorno</dt><dd className="mono">{fmt(trip.return_date)} {trip.return_time?.slice(0, 5) || ''}</dd>
            <dt>Justificativa</dt><dd>{trip.objective}</dd>
            {trip.exceptionality_justification && (
              <><dt>Excepcionalidade</dt><dd>{trip.exceptionality_justification}</dd></>
            )}
            {trip.project_detail && (
              <><dt>Recurso (projeto)</dt>
                <dd>{trip.project_detail.number} — {trip.project_detail.name}</dd></>
            )}
          </dl>
        </div>

        <div className="card block">
          <h3>Favorecidos</h3>
          {trip.beneficiaries.length === 0 && <p className="lead">Nenhum favorecido incluído.</p>}
          {trip.beneficiaries.length > 0 && (
            <table className="table">
              <thead>
                <tr><th>Nome</th><th>Período</th><th>Diárias</th><th>Hotel</th><th>Total</th><th>SEI</th></tr>
              </thead>
              <tbody>
                {trip.beneficiaries.map((b) => (
                  <tr key={b.id}>
                    <td>{b.full_name}</td>
                    <td className="mono">{fmt(b.start_date)} – {fmt(b.end_date)}</td>
                    <td className="mono">{b.daily_quantity} × {money(b.daily_rate)}</td>
                    <td className="mono">{money(b.hotel_value)}</td>
                    <td className="mono"><strong>{money(b.total_value)}</strong></td>
                    <td className="mono">{b.sei_process || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="total-bar">Total geral <strong>{money(trip.total_beneficiaries_value)}</strong></div>
        </div>

        {history.length > 0 && (
          <div className="card block">
            <h3>Histórico de situação</h3>
            <table className="table">
              <thead><tr><th>Quando</th><th>Mudança</th><th>Por</th><th>Observação</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="mono">{new Date(h.created_at).toLocaleString('pt-BR')}</td>
                    <td>{h.from_status} → {h.to_status}</td>
                    <td>{h.changed_by_name || '—'}</td>
                    <td>{h.observation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
