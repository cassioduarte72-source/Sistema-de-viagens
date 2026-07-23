/**
 * RequisicaoVeiculo.jsx — Módulo de Requisição de Veículo, aberto a partir da
 * viagem (espelha o popup "Veículo da Empresa" do SDP, sem a parte de hotel).
 *
 * O solicitante abre a requisição; conforme o papel do usuário logado
 * (SOF → CHADM → SIL), aparecem os botões que avançam o fluxo do fluxograma.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, firstError } from '../api';

// Texto de orientação idêntico ao do SDP
const AJUDA_SDP =
  'Informe: itinerário, data/hora de saída e retorno, necessidade de ' +
  'motorista e/ou transporte de carga, observações em geral.';

const VAZIO = { objective: '', route: '', estimated_km: '', passengers: '', needs_driver: false, requester_is_driver: false };

// Níveis de combustível (espelham as choices do backend)
const COMBUSTIVEL = [
  ['RESERVE', 'Reserva'], ['QUARTER', '1/4'], ['HALF', '1/2'],
  ['THREE_QUARTER', '3/4'], ['FULL', 'Cheio'],
];
// Itens conferidos no check-list (chave → rótulo)
const ITENS = [
  ['tires_ok', 'Pneus e estepe'], ['lights_ok', 'Faróis e lanternas'],
  ['documents_ok', 'Documentos (CRLV)'], ['extinguisher_ok', 'Extintor'],
  ['cleanliness_ok', 'Limpeza'],
];
const CHECK_VAZIO = {
  km: '', fuel_level: 'FULL', tires_ok: true, lights_ok: true,
  documents_ok: true, extinguisher_ok: true, cleanliness_ok: true,
  damages: '', observations: '',
};
const has = (r, kind) => (r.checklists || []).some((c) => c.kind === kind);

export default function RequisicaoVeiculo({ tripId, user }) {
  const role = user?.profile_role;
  const isAdmin = role === 'ADMIN';
  const can = (r) => isAdmin || role === r;

  const [reqs, setReqs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);     // formulário de nova requisição
  const [form, setForm] = useState(VAZIO);
  const [reserving, setReserving] = useState(null); // { id, vehicle_id, driver_id, notes }
  const [checking, setChecking] = useState(null);   // { id, kind, ...CHECK_VAZIO }

  const load = useCallback(() => {
    api.tripRequisitions(tripId).then(setReqs).catch((e) => setError(firstError(e)));
  }, [tripId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (can('SIL')) {
      api.vehicles().then(setVehicles).catch(() => {});
      api.drivers().then(setDrivers).catch(() => {});
    }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function criar(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createRequisition({
        travel_request: tripId,
        objective: form.objective,
        route: form.route,
        estimated_km: form.estimated_km ? Number(form.estimated_km) : null,
        passengers: form.passengers,
        needs_driver: form.needs_driver,
        requester_is_driver: form.requester_is_driver,
      });
      setForm(VAZIO); setOpen(false); load();
    } catch (err) { setError(firstError(err)); }
    finally { setBusy(false); }
  }

  async function acao(id, action, body) {
    setBusy(true); setError('');
    try { await api.requisitionAction(id, action, body); load(); }
    catch (err) { setError(firstError(err)); }
    finally { setBusy(false); }
  }

  function negar(id) {
    const reason = window.prompt('Motivo da negativa (falta de recurso):');
    if (reason !== null) acao(id, 'negar', { reason });
  }
  function fechar(id) {
    const km = window.prompt('KM real percorrida (deixe em branco se não souber):');
    if (km !== null) acao(id, 'fechar', { actual_km: km || null });
  }
  async function confirmarReserva(e) {
    e.preventDefault();
    const { id, vehicle_id, driver_id, notes } = reserving;
    await acao(id, 'reservar', { vehicle_id, driver_id: driver_id || null, notes });
    setReserving(null);
  }

  async function confirmarChecklist(e) {
    e.preventDefault();
    const { id, kind, km, ...rest } = checking;
    await acao(id, 'checklist', { kind, km: km ? Number(km) : null, ...rest });
    setChecking(null);
  }

  // Botões disponíveis para uma requisição, conforme papel + status
  function botoes(r) {
    const b = [];
    if (r.status === 'REQUESTED' && can('FINANCE'))
      b.push(<button key="c" className="btn ghost" disabled={busy} onClick={() => acao(r.id, 'enviar-chadm')}>Enviar ao CHADM</button>);
    if (r.status === 'CHADM_REVIEW' && can('CHADM')) {
      b.push(<button key="s" className="btn ghost" disabled={busy} onClick={() => acao(r.id, 'remeter-sil')}>Remeter ao SIL</button>);
      b.push(<button key="n" className="btn danger" disabled={busy} onClick={() => negar(r.id)}>Negar</button>);
    }
    if (r.status === 'AT_SIL' && can('SIL'))
      b.push(<button key="r" className="btn ghost" disabled={busy} onClick={() => setReserving({ id: r.id, vehicle_id: '', driver_id: '', notes: '' })}>Reservar veículo</button>);
    if (r.status === 'RESERVED' && can('SIL')) {
      if (!has(r, 'INITIAL'))
        b.push(<button key="ci" className="btn ghost" disabled={busy} onClick={() => setChecking({ id: r.id, kind: 'INITIAL', ...CHECK_VAZIO })}>Check-list de saída</button>);
      else
        b.push(<button key="u" className="btn ghost" disabled={busy} onClick={() => acao(r.id, 'iniciar-uso')}>Iniciar uso (retirar)</button>);
    }
    if (r.status === 'IN_USE' && can('SIL')) {
      if (!has(r, 'FINAL'))
        b.push(<button key="cf" className="btn ghost" disabled={busy} onClick={() => setChecking({ id: r.id, kind: 'FINAL', ...CHECK_VAZIO })}>Check-list de retorno</button>);
      else
        b.push(<button key="f" className="btn ghost" disabled={busy} onClick={() => fechar(r.id)}>Fechar requisição</button>);
    }
    const cancelavel = ['REQUESTED', 'CHADM_REVIEW', 'AT_SIL', 'RESERVED'].includes(r.status);
    if (cancelavel && (can('SIL') || can('REQUESTER')))
      b.push(<button key="x" className="btn quiet" disabled={busy} onClick={() => acao(r.id, 'cancelar')}>Cancelar</button>);
    return b;
  }

  return (
    <div className="card block">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Veículo da Empresa</h3>
        {!open && (
          <button className="btn ghost" onClick={() => setOpen(true)}>Solicitar veículo</button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      {/* Formulário de nova requisição — espelha o popup do SDP */}
      {open && (
        <form onSubmit={criar} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div className="field">
            <label>Descrição da necessidade</label>
            <textarea rows={3} value={form.objective}
              onChange={(e) => set('objective', e.target.value)}
              placeholder={AJUDA_SDP} required />
            <span className="hint">{AJUDA_SDP}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Trajeto</label>
              <input value={form.route} onChange={(e) => set('route', e.target.value)}
                placeholder="Ex.: Cruz das Almas → Salvador → Cruz das Almas" />
            </div>
            <div className="field">
              <label>KM estimada</label>
              <input type="number" min="0" value={form.estimated_km}
                onChange={(e) => set('estimated_km', e.target.value)} placeholder="Ex.: 300" />
            </div>
          </div>
          <div className="field">
            <label>Passageiros (mesmo veículo)</label>
            <textarea rows={2} value={form.passengers} onChange={(e) => set('passengers', e.target.value)}
              placeholder="Nomes de quem vai neste veículo — ex.: viagem coletiva com 4 pessoas." />
            <span className="hint">Informe se mais de uma pessoa vai no mesmo veículo, para o SLT reservar apenas um.</span>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={form.needs_driver}
              onChange={(e) => set('needs_driver', e.target.checked)} />
            Necessita motorista (SLT)?
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={form.requester_is_driver}
              onChange={(e) => set('requester_is_driver', e.target.checked)} />
            O próprio solicitante irá dirigir?
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn quiet" onClick={() => { setOpen(false); setForm(VAZIO); }}>Fechar</button>
          </div>
        </form>
      )}

      {/* Lista das requisições da viagem */}
      {reqs.length === 0 && !open && (
        <p className="lead" style={{ marginTop: 10 }}>Nenhuma requisição de veículo para esta viagem.</p>
      )}
      {reqs.length > 0 && (
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr><th>Nº</th><th>Situação</th><th>Trajeto / KM</th><th>Veículo</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {reqs.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.number}</td>
                <td><span className="status" data-s={r.status_display}>{r.status_display}</span></td>
                <td>
                  {r.route || '—'}
                  {r.estimated_km ? <span className="mono"> · {r.estimated_km} km</span> : ''}
                  {r.needs_driver ? <span className="hint"> · c/ motorista</span> : ''}
                  {r.passengers ? <div className="hint">🚗 Passageiros: {r.passengers}</div> : null}
                </td>
                <td>
                  {r.assignment_detail
                    ? <span className="mono">{r.assignment_detail.vehicle_label}
                        {r.assignment_detail.driver_label ? ` · ${r.assignment_detail.driver_label}` : ''}</span>
                    : '—'}
                  {r.status === 'NEGATED' && r.negation_reason
                    ? <div className="err">Negada: {r.negation_reason}</div> : null}
                  {(r.checklists || []).length > 0 && (
                    <div className="hint">
                      {(r.checklists || []).map((c) =>
                        `${c.kind === 'INITIAL' ? 'Saída' : 'Retorno'}: ${c.km ?? '—'} km`
                      ).join(' · ')}
                    </div>
                  )}
                  {r.actual_km ? <div className="hint">KM real: {r.actual_km}</div> : null}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{botoes(r)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Sub-formulário de reserva (SIL escolhe veículo e motorista) */}
      {reserving && (
        <form onSubmit={confirmarReserva} className="card" style={{ marginTop: 12, padding: 14, display: 'grid', gap: 12 }}>
          <strong>Reservar veículo</strong>
          <div className="field">
            <label>Veículo</label>
            <select required value={reserving.vehicle_id}
              onChange={(e) => setReserving((s) => ({ ...s, vehicle_id: e.target.value }))}>
              <option value="">Selecione…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.model}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Motorista (opcional)</label>
            <select value={reserving.driver_id}
              onChange={(e) => setReserving((s) => ({ ...s, driver_id: e.target.value }))}>
              <option value="">Sem motorista designado</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" disabled={busy}>{busy ? 'Reservando…' : 'Confirmar reserva'}</button>
            <button type="button" className="btn quiet" onClick={() => setReserving(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Sub-formulário de check-list / vistoria (SIL) */}
      {checking && (
        <form onSubmit={confirmarChecklist} className="card" style={{ marginTop: 12, padding: 14, display: 'grid', gap: 12 }}>
          <strong>{checking.kind === 'INITIAL' ? 'Check-list de saída (vistoria prévia)' : 'Check-list de retorno'}</strong>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Odômetro (KM)</label>
              <input type="number" min="0" value={checking.km}
                onChange={(e) => setChecking((s) => ({ ...s, km: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Nível de combustível</label>
              <select value={checking.fuel_level}
                onChange={(e) => setChecking((s) => ({ ...s, fuel_level: e.target.value }))}>
                {COMBUSTIVEL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {ITENS.map(([k, label]) => (
              <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13.5 }}>
                <input type="checkbox" checked={checking[k]}
                  onChange={(e) => setChecking((s) => ({ ...s, [k]: e.target.checked }))} />
                {label}
              </label>
            ))}
          </div>
          <div className="field">
            <label>Avarias observadas</label>
            <textarea rows={2} value={checking.damages}
              onChange={(e) => setChecking((s) => ({ ...s, damages: e.target.value }))}
              placeholder="Ex.: arranhão na porta traseira direita (ou deixe em branco)" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar check-list'}</button>
            <button type="button" className="btn quiet" onClick={() => setChecking(null)}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
