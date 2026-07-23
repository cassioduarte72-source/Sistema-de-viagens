/**
 * AnalisePCV.jsx — Análise da Prestação de Contas pelo SOF.
 * Lista as PCVs enviadas, permite ajustar o valor "Aprovado" de cada despesa,
 * informar a Nota de Empenho e Aprovar (atestar) ou Retornar à fase anterior
 * com justificativa. Mostra o Histórico de Encaminhamento.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, firstError } from '../api';

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');
const dt = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

export default function AnalisePCV() {
  const [lista, setLista] = useState(null);
  const [pcv, setPcv] = useState(null);
  const [empenho, setEmpenho] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(() => {
    api.pcvAnalise().then(setLista).catch((e) => setError(firstError(e)));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function abrir(id) {
    setError('');
    try { const p = await api.pcv(id); setPcv(p); setEmpenho(p.commitment_number || ''); setJustificativa(''); }
    catch (e) { setError(firstError(e)); }
  }
  const recarregar = async () => setPcv(await api.pcv(pcv.id));

  async function ajustarAprovado(itemId, valor) {
    try { await api.updateExpense(itemId, { approved_value: valor || '0' }); await recarregar(); }
    catch (e) { setError(firstError(e)); }
  }

  async function decidir(decision) {
    if (decision === 'RETURNED' && !justificativa.trim()) {
      setError('Informe a justificativa para retornar a PCV.'); return;
    }
    setBusy(true); setError('');
    try {
      await api.pcvReview(pcv.id, { decision, notes: justificativa, commitment_number: empenho });
      setPcv(null); carregar();
    } catch (e) { setError(firstError(e)); } finally { setBusy(false); }
  }

  // ─── Lista de PCVs para analisar ─────────────────────────────────────────
  if (!pcv) {
    return (
      <>
        <h1 className="page-title">Análise de Prestação de Contas (SOF)</h1>
        <p className="page-sub">Prestações enviadas aguardando atesto ou retorno.</p>
        {error && <div className="alert error">{error}</div>}
        {lista === null && <div className="card empty">Carregando…</div>}
        {lista && lista.length === 0 && (
          <div className="card empty">Nenhuma prestação de contas para analisar.</div>
        )}
        {lista && lista.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>Nº</th><th>Favorecido</th><th>Total da Viagem</th><th>Saldo</th><th>Enviada em</th><th></th></tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.trip.request_number}</td>
                  <td>{p.trip.favorecido}</td>
                  <td className="mono">{money(p.valor_total_viagem)}</td>
                  <td className="mono">{Number(p.valor_a_devolver) > 0
                    ? `Devolver ${money(p.valor_a_devolver)}` : `Receber ${money(p.valor_a_receber)}`}</td>
                  <td className="mono">{dt(p.submitted_at)}</td>
                  <td><button className="btn ghost" onClick={() => abrir(p.id)}>Analisar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  }

  // ─── Análise de uma PCV ──────────────────────────────────────────────────
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title mono">Análise PCV · {pcv.trip.request_number}</h1>
          <p className="page-sub"><span className="status" data-s={pcv.status_display}>{pcv.status_display}</span></p>
        </div>
        <button className="btn quiet" onClick={() => { setPcv(null); carregar(); }}>Voltar</button>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="blocks">
        <div className="card block">
          <h3>Favorecido / Viagem</h3>
          <dl className="kv">
            <dt>Favorecido</dt><dd>{pcv.trip.favorecido}</dd>
            <dt>Roteiro</dt><dd>{pcv.trip.roteiro || '—'}</dd>
            <dt>Período</dt><dd className="mono">{fmt(pcv.trip.departure_date)} a {fmt(pcv.trip.return_date)}</dd>
            {pcv.trip.sei_process && (<><dt>Processo SEI</dt><dd className="mono">{pcv.trip.sei_process}</dd></>)}
          </dl>
        </div>

        <div className="card block">
          <h3>Comprovação de Despesa</h3>
          <p className="lead">Ajuste o valor <strong>Aprovado</strong> de cada despesa se necessário.</p>
          <table className="table">
            <thead>
              <tr><th>Tipo</th><th>Descrição</th><th>Comprovado</th><th>Aprovado (R$)</th></tr>
            </thead>
            <tbody>
              {pcv.expense_items.map((it) => (
                <tr key={it.id}>
                  <td>{it.item_type_display}</td>
                  <td>{it.description}</td>
                  <td className="mono">{money(it.proven_value)}</td>
                  <td>
                    <input className="mono" defaultValue={it.approved_value} style={{ width: 120, padding: '5px 7px', textAlign: 'right' }}
                      onBlur={(e) => ajustarAprovado(it.id, e.target.value.replace(',', '.'))} />
                  </td>
                </tr>
              ))}
              {pcv.expense_items.length === 0 && (
                <tr><td colSpan={4} className="lead">Nenhuma despesa informada.</td></tr>
              )}
            </tbody>
          </table>
          <div className="total-bar">
            Diárias {money(pcv.total_diarias)} + Despesas aprovadas {money(pcv.total_despesas_aprovadas)} ={' '}
            <strong>Total {money(pcv.valor_total_viagem)}</strong> · Adiantamento {money(pcv.advance_received)} ·{' '}
            {Number(pcv.valor_a_devolver) > 0
              ? <strong>A devolver {money(pcv.valor_a_devolver)}</strong>
              : <strong>A receber {money(pcv.valor_a_receber)}</strong>}
          </div>
        </div>

        {pcv.routings?.length > 0 && (
          <div className="card block">
            <h3>Histórico de Encaminhamento</h3>
            <table className="table">
              <thead><tr><th>Natureza</th><th>Responsável</th><th>Data</th></tr></thead>
              <tbody>
                {pcv.routings.map((r) => (
                  <tr key={r.id}>
                    <td>{r.action}{r.note ? <div className="hint">{r.note}</div> : null}</td>
                    <td>{r.responsible_name || '—'}</td>
                    <td className="mono">{dt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card block">
          <h3>Decisão do SOF</h3>
          <div className="field" style={{ maxWidth: 260 }}>
            <label>Nota de Empenho (PCV)</label>
            <input className="mono" value={empenho} onChange={(e) => setEmpenho(e.target.value)}
              placeholder="2026NE000121" />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Justificativa (obrigatória ao retornar)</label>
            <textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex.: A receita indireta não condiz com a viagem…" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn" disabled={busy} onClick={() => decidir('APPROVED')}>
              {busy ? 'Processando…' : 'Aprovar (atestar)'}
            </button>
            <button className="btn danger" disabled={busy} onClick={() => decidir('RETURNED')}>
              Retornar para a fase anterior
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
