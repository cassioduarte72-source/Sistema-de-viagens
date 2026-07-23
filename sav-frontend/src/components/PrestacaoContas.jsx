/**
 * PrestacaoContas.jsx — Prestação de Contas de Viagem (PCV).
 * O favorecido localiza o adiantamento (a viagem), abre a PCV e informa as
 * despesas comprovadas; o sistema calcula o saldo (a devolver / a receber).
 */
import { useCallback, useEffect, useState } from 'react';
import { api, firstError } from '../api';

const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');

const TIPOS = [
  ['LODGING', 'Hospedagem'], ['TICKETS', 'Passagens'], ['TAXI', 'Táxi'],
  ['TOLL_PARKING', 'Pedágio / Estacionamento'], ['SERVICES', 'Serviços'],
  ['FUEL', 'Combustível'], ['OTHER', 'Outros'],
];
const NOVO = () => ({ item_type: 'LODGING', description: '', proven_value: '' });

export default function PrestacaoContas() {
  const [elegiveis, setElegiveis] = useState(null);
  const [pcv, setPcv] = useState(null);        // PCV aberta (modo formulário)
  const [novo, setNovo] = useState(NOVO());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const carregarElegiveis = useCallback(() => {
    api.pcvElegiveis().then(setElegiveis).catch((e) => setError(firstError(e)));
  }, []);
  useEffect(() => { carregarElegiveis(); }, [carregarElegiveis]);

  async function abrir(row) {
    setError('');
    try {
      const id = row.pcv_id || (await api.createPcv(row.travel_request)).id;
      setPcv(await api.pcv(id));
    } catch (e) { setError(firstError(e)); }
  }

  const recarregar = async () => setPcv(await api.pcv(pcv.id));

  async function addDespesa(e) {
    e.preventDefault();
    if (!novo.description || !novo.proven_value) return;
    setBusy(true); setError('');
    try {
      await api.addExpense({
        report: pcv.id, item_type: novo.item_type, description: novo.description,
        proven_value: novo.proven_value, approved_value: novo.proven_value,
      });
      setNovo(NOVO()); await recarregar();
    } catch (err) { setError(firstError(err)); } finally { setBusy(false); }
  }

  async function removerDespesa(id) {
    setBusy(true);
    try { await api.deleteExpense(id); await recarregar(); }
    catch (e) { setError(firstError(e)); } finally { setBusy(false); }
  }

  async function salvarAdiantamento(valor) {
    try { await api.updatePcv(pcv.id, { advance_received: valor || '0' }); await recarregar(); }
    catch (e) { setError(firstError(e)); }
  }

  async function enviar() {
    setBusy(true); setError('');
    try { await api.submitPcv(pcv.id); await recarregar(); }
    catch (e) { setError(firstError(e)); } finally { setBusy(false); }
  }

  // ─── Lista de viagens elegíveis (localizar o adiantamento) ───────────────
  if (!pcv) {
    return (
      <>
        <h1 className="page-title">Prestação de Contas</h1>
        <p className="page-sub">Localize o adiantamento da sua viagem e preste contas das despesas.</p>
        {error && <div className="alert error">{error}</div>}
        {elegiveis === null && <div className="card empty">Carregando…</div>}
        {elegiveis && elegiveis.length === 0 && (
          <div className="card empty">Nenhuma viagem elegível para prestação de contas.</div>
        )}
        {elegiveis && elegiveis.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>Nº</th><th>Roteiro</th><th>Período</th><th>Adiantamento</th><th>PCV</th><th></th></tr>
            </thead>
            <tbody>
              {elegiveis.map((r) => (
                <tr key={r.travel_request}>
                  <td className="mono">{r.request_number}</td>
                  <td>{r.roteiro || '—'}</td>
                  <td className="mono">{fmt(r.departure_date)} – {fmt(r.return_date)}</td>
                  <td className="mono">{money(r.adiantamento)}</td>
                  <td>{r.pcv_status
                    ? <span className="status" data-s={r.pcv_status}>{r.pcv_status}</span>
                    : <span style={{ color: '#99a' }}>—</span>}</td>
                  <td><button className="btn ghost" onClick={() => abrir(r)}>
                    {r.pcv_id ? 'Abrir PCV' : 'Prestar contas'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  }

  // ─── Formulário da PCV ───────────────────────────────────────────────────
  const editavel = pcv.status === 'DRAFT';
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title mono">PCV · {pcv.trip.request_number}</h1>
          <p className="page-sub">
            <span className="status" data-s={pcv.status_display}>{pcv.status_display}</span>
          </p>
        </div>
        <button className="btn quiet" onClick={() => { setPcv(null); carregarElegiveis(); }}>Voltar</button>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="blocks">
        <div className="card block">
          <h3>Dados da viagem</h3>
          <dl className="kv">
            <dt>Favorecido</dt><dd>{pcv.trip.favorecido}</dd>
            <dt>Roteiro</dt><dd>{pcv.trip.roteiro || '—'}</dd>
            <dt>Período</dt><dd className="mono">{fmt(pcv.trip.departure_date)} a {fmt(pcv.trip.return_date)}</dd>
            <dt>Objetivo</dt><dd>{pcv.trip.objetivo || '—'}</dd>
            {pcv.trip.sei_process && (<><dt>Processo SEI</dt><dd className="mono">{pcv.trip.sei_process}</dd></>)}
            {pcv.trip.empenho && (<><dt>Empenho</dt><dd className="mono">{pcv.trip.empenho}</dd></>)}
          </dl>
        </div>

        <div className="card block">
          <h3>Comprovação de Despesa</h3>
          <table className="table">
            <thead>
              <tr><th>Tipo</th><th>Descrição</th><th>Comprovado</th><th>Aprovado</th>{editavel && <th></th>}</tr>
            </thead>
            <tbody>
              {pcv.expense_items.map((it) => (
                <tr key={it.id}>
                  <td>{it.item_type_display}</td>
                  <td>{it.description}</td>
                  <td className="mono">{money(it.proven_value)}</td>
                  <td className="mono">{money(it.approved_value)}</td>
                  {editavel && <td><button className="btn danger" onClick={() => removerDespesa(it.id)}>✕</button></td>}
                </tr>
              ))}
              {pcv.expense_items.length === 0 && (
                <tr><td colSpan={editavel ? 5 : 4} className="lead">Nenhuma despesa informada.</td></tr>
              )}
            </tbody>
          </table>

          {editavel && (
            <form onSubmit={addDespesa} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
              <div className="field" style={{ minWidth: 160 }}>
                <label>Tipo</label>
                <select value={novo.item_type} onChange={(e) => setNovo((n) => ({ ...n, item_type: e.target.value }))}>
                  {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1, minWidth: 180 }}>
                <label>Descrição</label>
                <input value={novo.description} onChange={(e) => setNovo((n) => ({ ...n, description: e.target.value }))}
                  placeholder="Ex.: Hotel Atlantica, NF 67220" />
              </div>
              <div className="field" style={{ width: 120 }}>
                <label>Comprovado (R$)</label>
                <input inputMode="decimal" value={novo.proven_value}
                  onChange={(e) => setNovo((n) => ({ ...n, proven_value: e.target.value.replace(',', '.') }))} />
              </div>
              <button className="btn" disabled={busy}>+ Adicionar</button>
            </form>
          )}
        </div>

        <div className="card block">
          <h3>Resumo financeiro</h3>
          <dl className="kv">
            <dt>Total de Diárias</dt><dd className="mono">{money(pcv.total_diarias)}</dd>
            <dt>Total Despesas Aprovadas</dt><dd className="mono">{money(pcv.total_despesas_aprovadas)}</dd>
            <dt>Valor Total da Viagem</dt><dd className="mono"><strong>{money(pcv.valor_total_viagem)}</strong></dd>
            <dt>Adiantamento Realizado</dt>
            <dd>
              {editavel ? (
                <input className="mono" defaultValue={pcv.advance_received} style={{ width: 140, padding: '6px 8px' }}
                  onBlur={(e) => salvarAdiantamento(e.target.value.replace(',', '.'))} />
              ) : <span className="mono">{money(pcv.advance_received)}</span>}
            </dd>
          </dl>
          <div className="total-bar">
            {Number(pcv.valor_a_devolver) > 0
              ? <>A devolver à Embrapa <strong>{money(pcv.valor_a_devolver)}</strong></>
              : <>A receber da Embrapa <strong>{money(pcv.valor_a_receber)}</strong></>}
          </div>
          {pcv.commitment_number && (
            <p className="hint" style={{ marginTop: 8 }}>Nota de Empenho (PCV): <strong className="mono">{pcv.commitment_number}</strong></p>
          )}
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
                    <td className="mono">{r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editavel && (
        <div className="wiz-actions" style={{ marginTop: 16 }}>
          <span />
          <button className="btn" disabled={busy} onClick={enviar}>
            {busy ? 'Enviando…' : 'Enviar prestação de contas'}
          </button>
        </div>
      )}
    </>
  );
}
