/**
 * TripDetail.jsx — Detalhe da viagem: blocos como no SAGU (informações gerais,
 * favorecidos com totais, histórico de status) e o botão "Copiar para o SDP",
 * que leva a transcrição já ordenada para a área de transferência.
 */
import { useEffect, useState } from 'react';
import { api, firstError } from '../api';
import RequisicaoVeiculo from './RequisicaoVeiculo';
import AutorizacaoViagem from './AutorizacaoViagem';

const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');
const money = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function transcriptToText(t) {
  const lines = [
    `SAV ${t.numero_sav} — ${t.status_sagu}`,
    t.processo_sei ? `Processo SEI: ${t.processo_sei}` : null,
    t.empenho ? `Empenho: ${t.empenho}${t.valor_empenhado ? ` — ${money(t.valor_empenhado)}` : ''}` : null,
    `Solicitante: ${t.solicitante}`,
    `Meio de transporte: ${t.meio_transporte || '—'}`,
    `Roteiro: ${t.roteiro}`,
    `Período: ${fmt(t.saida)} a ${fmt(t.retorno)}`,
    `Descrição: ${t.descricao || '—'}`,
    t.observacoes ? `Observações: ${t.observacoes}` : null,
    `Ônus: ${t.onus}`,
    t.atividade
      ? `Atividade (recurso): ${t.atividade.codigo} — ${t.atividade.titulo} (saldo ${money(t.atividade.saldo)})`
      : null,
    '',
    '── FAVORECIDOS ──',
  ].filter(Boolean);
  t.favorecidos.forEach((f, i) => {
    lines.push(
      `${i + 1}. ${f.favorecido_nome} (${f.favorecido_tipo})`,
      `   Período: ${fmt(f.periodo.inicio)} a ${fmt(f.periodo.fim)} | Cidade: ${f.cidade || '—'}`,
      `   Diárias: ${f.qtde_diarias} × ${money(f.valor_diaria)} = ${money(f.total)}`,
    );
  });
  if (t.adiantamentos?.length) {
    lines.push('', '── OUTROS ADIANTAMENTOS ──');
    t.adiantamentos.forEach((a) =>
      lines.push(`   ${a.natureza}: ${money(a.valor)}${a.justificativa ? ` — ${a.justificativa}` : ''}`));
  }
  lines.push(
    '',
    `Total diárias: ${money(t.total_diarias)}`,
    `Total adiantamentos: ${money(t.total_adiantamentos)}`,
    `CUSTO TOTAL DA VIAGEM: ${money(t.total_geral)}`,
  );
  return lines.join('\n');
}

export default function TripDetail({ tripId, user, onBack }) {
  const [trip, setTrip] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sei, setSei] = useState('');
  const [seiMsg, setSeiMsg] = useState('');
  const [showAV, setShowAV] = useState(false);
  const [empenho, setEmpenho] = useState('');
  const [valor, setValor] = useState('');
  const [empenhoMsg, setEmpenhoMsg] = useState('');

  useEffect(() => {
    api.trip(tripId).then(setTrip).catch((e) => setError(firstError(e)));
    api.statusHistory(tripId).then(setHistory).catch(() => {});
  }, [tripId]);

  // Sincroniza os campos SEI / empenho com o que está salvo na viagem
  useEffect(() => { setSei(trip?.sei_process || ''); }, [trip?.sei_process]);
  useEffect(() => {
    setEmpenho(trip?.commitment_number || '');
    setValor(trip?.committed_value != null ? String(trip.committed_value) : '');
  }, [trip?.commitment_number, trip?.committed_value]);

  async function salvarSei() {
    setSeiMsg('');
    try {
      await api.informarSei(tripId, sei.trim());
      const t = await api.trip(tripId); setTrip(t);
      setSeiMsg('SEI salvo ✓'); setTimeout(() => setSeiMsg(''), 2500);
    } catch (e) { setSeiMsg(firstError(e)); }
  }

  async function salvarEmpenho() {
    setEmpenhoMsg('');
    try {
      await api.informarEmpenho(tripId, empenho.trim(), valor || null);
      const t = await api.trip(tripId); setTrip(t);
      setEmpenhoMsg('Empenho salvo ✓'); setTimeout(() => setEmpenhoMsg(''), 2500);
    } catch (e) { setEmpenhoMsg(firstError(e)); }
  }

  async function copySdp() {
    try {
      const t = await api.sdpTranscript(tripId);
      await navigator.clipboard.writeText(transcriptToText(t));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) { setError(firstError(e)); }
  }

  async function concluirSdp() {
    try {
      await api.concluirSdp(tripId);
      const t = await api.trip(tripId);
      setTrip(t);
    } catch (e) { setError(firstError(e)); }
  }

  async function encaminhar() {
    try {
      await api.submitTrip(tripId);
      const t = await api.trip(tripId);
      setTrip(t);
    } catch (e) { setError(firstError(e)); }
  }

  const isSLT = user?.profile_role === 'SIL' || user?.profile_role === 'ADMIN';
  const isSOF = user?.profile_role === 'FINANCE' || user?.profile_role === 'ADMIN';
  const isOwner = user?.id === trip?.requester?.id;

  if (error) return <div className="alert error">{error}</div>;
  if (!trip) return <div className="card empty">Carregando…</div>;
  if (showAV) return <AutorizacaoViagem trip={trip} onClose={() => setShowAV(false)} />;

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
          {isOwner && trip.status === 'DRAFT' && (
            <button className="btn" onClick={encaminhar}>Encaminhar ao SLT</button>
          )}
          <button className="btn ghost" onClick={() => setShowAV(true)}>Autorização de Viagem (AV)</button>
          <button className="btn ghost" onClick={copySdp}>
            {copied ? 'Copiado ✓' : 'Copiar para o SDP'}
          </button>
          {isSLT && trip.status === 'SUBMITTED' && (
            <button className="btn" onClick={concluirSdp}>Marcar como lançada no SDP</button>
          )}
          <button className="btn quiet" onClick={onBack}>Voltar</button>
        </div>
      </div>

      <div className="blocks">
        {/* Painel de como o SLT recebe as informações para lançar no SDP */}
        <div className="card block" style={{ borderLeft: '4px solid var(--verde-folha)' }}>
          <h3>Dados para lançamento no SDP (recebidos pelo SLT)</h3>
          <dl className="kv">
            <dt>Processo SEI</dt>
            <dd>
              {isSLT ? (
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input className="mono" value={sei} onChange={(e) => setSei(e.target.value)}
                    placeholder="21186.001323/2026-15" style={{ width: 210, padding: '6px 8px' }} />
                  <button className="btn ghost" onClick={salvarSei}>Salvar SEI</button>
                  {seiMsg && <span style={{ fontSize: 12.5, color: 'var(--tinta-2)' }}>{seiMsg}</span>}
                </span>
              ) : (
                <span className="mono">{trip.sei_process || '—'}</span>
              )}
            </dd>
            <dt>Empenho / Valor</dt>
            <dd>
              {isSOF ? (
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input className="mono" value={empenho} onChange={(e) => setEmpenho(e.target.value)}
                    placeholder="2026NE000121" style={{ width: 155, padding: '6px 8px' }} />
                  <input value={valor} inputMode="decimal"
                    onChange={(e) => setValor(e.target.value.replace(',', '.'))}
                    placeholder="Valor (R$)" style={{ width: 120, padding: '6px 8px' }} />
                  <button className="btn ghost" onClick={salvarEmpenho}>Salvar empenho</button>
                  {empenhoMsg && <span style={{ fontSize: 12.5, color: 'var(--tinta-2)' }}>{empenhoMsg}</span>}
                </span>
              ) : (
                <span className="mono">{trip.commitment_number || '—'}
                  {trip.committed_value != null ? ` · ${money(trip.committed_value)}` : ''}</span>
              )}
            </dd>
            <dt>Favorecido</dt>
            <dd>{trip.beneficiaries[0]?.full_name || '—'}</dd>
            <dt>Meio de transporte</dt><dd>{trip.transport_means_display || '—'}</dd>
            <dt>Roteiro</dt><dd>{trip.itinerary || '—'}</dd>
            <dt>Período</dt><dd className="mono">{fmt(trip.departure_date)} a {fmt(trip.return_date)}</dd>
            <dt>Descrição</dt><dd>{trip.objective || '—'}</dd>
            {trip.observations && (<><dt>Observações</dt><dd>{trip.observations}</dd></>)}
            <dt>Ônus</dt><dd>{trip.cost_type_display || '—'}</dd>
            {trip.research_activity_detail && (
              <><dt>Atividade (recurso)</dt>
                <dd className="mono">{trip.research_activity_detail.code} — {trip.research_activity_detail.description}
                  {' '}(saldo {money(trip.research_activity_detail.balance)})</dd></>
            )}
          </dl>

          {trip.advances?.length > 0 && (
            <>
              <h3 style={{ marginTop: 14, fontSize: 15 }}>Outros Adiantamentos</h3>
              <table className="table">
                <thead><tr><th>Natureza</th><th>Valor</th><th>Justificativa</th></tr></thead>
                <tbody>
                  {trip.advances.map((a) => (
                    <tr key={a.id}>
                      <td>{a.nature_display}</td>
                      <td className="mono">{money(a.value)}</td>
                      <td>{a.justification || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="total-bar">
            Diárias {money(trip.total_beneficiaries_value)} + Adiantamentos {money(trip.advances_total)} ={' '}
            <strong>Custo total {money(Number(trip.total_beneficiaries_value) + Number(trip.advances_total || 0))}</strong>
          </div>
        </div>

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

        <RequisicaoVeiculo tripId={tripId} user={user} />

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
