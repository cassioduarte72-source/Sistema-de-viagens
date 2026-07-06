/**
 * Wizard.jsx — Assistente de solicitação em 3 etapas (paridade SAGU):
 *   1. Fonte de custeio (campos condicionais: projeto externo / patrocinador)
 *   2. Linha de recurso + tipo de viagem (com textos de orientação)
 *   3. Dados da viagem: datas/horas, destino, favorecidos (1:N),
 *      passagens (se aérea), roteiro e justificativa de excepcionalidade
 *      quando a antecedência é inferior ao prazo regulamentar.
 *
 * Todas as opções vêm de GET /travel-requests/wizard-options/ — nada é
 * hardcoded: mudou a regra no backend, o wizard acompanha.
 */
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, firstError } from '../api';

const STEPS = ['Custeio', 'Recurso e tipo', 'Dados da viagem'];
const money = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function daysAhead(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return Math.floor((d - new Date()) / 86400000) + 1;
}

function RouteRail({ step }) {
  return (
    <div className="route" aria-label={`Etapa ${step + 1} de 3`}>
      {STEPS.map((label, i) => (
        <RouteStop key={label} i={i} label={label} step={step} />
      ))}
    </div>
  );
}
function RouteStop({ i, label, step }) {
  const cls = i < step ? 'done' : i === step ? 'now' : '';
  return (
    <>
      {i > 0 && <div className={`road ${i <= step ? 'done' : ''}`} />}
      <div className={`stop ${cls}`}>
        <div className="dot">{i < step ? '✓' : i + 1}</div>
        <span>{label}</span>
      </div>
    </>
  );
}

const EMPTY_BENEF = () => ({
  full_name: '', beneficiary_type: 'EMPLOYEE', city: '',
  daily_quantity: '', daily_rate: '', hotel_value: '', additional_value: '',
});
const EMPTY_TICKET = () => ({ origin: '', destination: '', flight_date: '', estimated_value: '' });

export default function Wizard({ onDone, onCancel }) {
  const [opts, setOpts] = useState(null);
  const [refs, setRefs] = useState({ destinations: [], projects: [], sponsors: [] });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    cost_type: '', project: '', sponsor: '',
    resource_line: '', trip_type: '',
    departure_date: '', departure_time: '', return_date: '', return_time: '',
    destination: '', origin_city: 'Cruz das Almas', origin_state: 'BA',
    objective: '', modality: '', exceptionality_justification: '',
  });
  const [beneficiaries, setBeneficiaries] = useState([EMPTY_BENEF()]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    Promise.all([api.wizardOptions(), api.destinations(), api.projects(), api.sponsors()])
      .then(([o, d, p, s]) => {
        setOpts(o);
        setRefs({
          destinations: d.results ?? d,
          projects: (p.results ?? p),
          sponsors: (s.results ?? s),
        });
      })
      .catch((e) => setError(firstError(e, 'Não foi possível carregar as opções do assistente.')));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isAir = form.trip_type === 'AIR';
  const advance = daysAhead(form.departure_date);
  const needsException = isAir && advance !== null
    && opts && advance < opts.exceptionality_advance_days;

  const totalGeral = useMemo(
    () => beneficiaries.reduce((acc, b) =>
      acc + Number(b.daily_quantity || 0) * Number(b.daily_rate || 0)
        + Number(b.hotel_value || 0) + Number(b.additional_value || 0), 0),
    [beneficiaries],
  );

  // ── validação leve por etapa (a validação de verdade é do backend) ──
  function stepReady() {
    if (step === 0) {
      if (!form.cost_type) return false;
      if (form.cost_type === 'EXTERNAL_PROJECT' && !form.project) return false;
      if (form.cost_type === 'SPONSOR' && !form.sponsor) return false;
      return true;
    }
    if (step === 1) return Boolean(form.trip_type);
    return true;
  }

  async function saveTrip({ submit }) {
    setBusy(true); setError(''); setFieldErrors({});
    try {
      const payload = {
        cost_type: form.cost_type,
        trip_type: form.trip_type,
        origin_city: form.origin_city, origin_state: form.origin_state,
        destination: form.destination || null,
        departure_date: form.departure_date, return_date: form.return_date,
        departure_time: form.departure_time || null, return_time: form.return_time || null,
        objective: form.objective,
        modality: form.modality,
        exceptionality_justification: form.exceptionality_justification,
        resource_line: form.resource_line || null,
        project: form.project || null,
        sponsor: form.sponsor || null,
      };
      const trip = await api.createTrip(payload);

      for (const b of beneficiaries.filter((x) => x.full_name.trim())) {
        await api.addBeneficiary({
          travel_request: trip.id,
          full_name: b.full_name, beneficiary_type: b.beneficiary_type,
          start_date: form.departure_date, end_date: form.return_date,
          city: b.city,
          daily_quantity: b.daily_quantity || '0',
          daily_rate: b.daily_rate || '0',
          hotel_value: b.hotel_value || '0',
          additional_value: b.additional_value || '0',
        });
      }
      if (isAir) {
        for (const t of tickets.filter((x) => x.origin && x.destination)) {
          await api.addTicket({
            travel_request: trip.id,
            origin: t.origin, destination: t.destination,
            flight_date: t.flight_date || null,
            estimated_value: t.estimated_value || null,
          });
        }
      }
      if (submit) await api.submitTrip(trip.id);
      onDone(trip.id, submit);
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === 'object') {
        setFieldErrors(err.body);
        setError('Revise os campos destacados abaixo.');
      } else {
        setError(firstError(err));
      }
    } finally { setBusy(false); }
  }

  const fe = (k) => fieldErrors[k] && (
    <span className="err">{Array.isArray(fieldErrors[k]) ? fieldErrors[k][0] : fieldErrors[k]}</span>
  );

  if (!opts) {
    return <div className="card wiz-panel">{error
      ? <div className="alert error">{error}</div> : 'Carregando o assistente…'}</div>;
  }

  return (
    <>
      <h1 className="page-title">Solicitar viagem</h1>
      <p className="page-sub">Três etapas, do custeio aos favorecidos. Nada é enviado antes da sua confirmação.</p>
      <RouteRail step={step} />

      {error && <div className="alert error" role="alert">{error}</div>}

      {/* ═══ ETAPA 1 — fonte de custeio ═══ */}
      {step === 0 && (
        <div className="card wiz-panel">
          <h2>Quem custeia esta viagem?</h2>
          <p className="lead">A escolha define os campos das próximas etapas.</p>
          <div className="opt-grid" role="radiogroup" aria-label="Fonte de custeio">
            {opts.cost_sources.map((c) => (
              <button key={c.value} type="button"
                className={`opt ${form.cost_type === c.value ? 'sel' : ''}`}
                onClick={() => setForm((f) => ({ ...f, cost_type: c.value }))}>
                <strong>{c.label}</strong>
              </button>
            ))}
          </div>

          {form.cost_type === 'EXTERNAL_PROJECT' && (
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="proj">Projeto externo que custeará a viagem</label>
              <select id="proj" value={form.project} onChange={set('project')}>
                <option value="">Selecione…</option>
                {refs.projects.filter((p) => p.is_external).map((p) => (
                  <option key={p.id} value={p.id}>{p.number} — {p.name}</option>
                ))}
              </select>
              {fe('project')}
            </div>
          )}
          {form.cost_type === 'SPONSOR' && (
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="spon">Patrocinador</label>
              <select id="spon" value={form.sponsor} onChange={set('sponsor')}>
                <option value="">Selecione…</option>
                {refs.sponsors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {fe('sponsor')}
            </div>
          )}

          <div className="wiz-actions">
            <button className="btn quiet" onClick={onCancel}>Voltar às minhas viagens</button>
            <button className="btn" disabled={!stepReady()} onClick={() => setStep(1)}>Avançar</button>
          </div>
        </div>
      )}

      {/* ═══ ETAPA 2 — recurso e tipo ═══ */}
      {step === 1 && (
        <div className="card wiz-panel">
          <h2>Recurso e tipo de viagem</h2>
          <p className="lead">Cada tipo traz uma orientação de quando usá-lo.</p>

          <div className="field" style={{ maxWidth: 380, marginBottom: 20 }}>
            <label htmlFor="rl">Linha de recurso</label>
            <select id="rl" value={form.resource_line} onChange={set('resource_line')}>
              <option value="">Selecione…</option>
              {opts.resource_lines.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {fe('resource_line')}
          </div>

          <div className="opt-grid" role="radiogroup" aria-label="Tipo de viagem">
            {opts.trip_types.map((t) => (
              <button key={t.value} type="button"
                className={`opt ${form.trip_type === t.value ? 'sel' : ''}`}
                onClick={() => setForm((f) => ({ ...f, trip_type: t.value, modality: t.label }))}>
                <strong>{t.label}</strong>
                <p>{t.help}</p>
              </button>
            ))}
          </div>

          <div className="wiz-actions">
            <button className="btn ghost" onClick={() => setStep(0)}>Voltar</button>
            <button className="btn" disabled={!stepReady()} onClick={() => setStep(2)}>Avançar</button>
          </div>
        </div>
      )}

      {/* ═══ ETAPA 3 — dados da viagem ═══ */}
      {step === 2 && (
        <div className="card wiz-panel">
          <h2>Dados da viagem</h2>
          <p className="lead">
            {isAir
              ? `Viagem aérea: antecedência mínima de ${opts.exceptionality_advance_days} dias sem justificativa.`
              : `Antecedência mínima de ${opts.min_advance_days} dias.`}
          </p>

          <div className="grid4">
            <div className="field"><label>Data de saída</label>
              <input type="date" value={form.departure_date} onChange={set('departure_date')} />{fe('departure_date')}</div>
            <div className="field"><label>Hora de saída</label>
              <input type="time" value={form.departure_time} onChange={set('departure_time')} /></div>
            <div className="field"><label>Data de retorno</label>
              <input type="date" value={form.return_date} onChange={set('return_date')} />{fe('return_date')}</div>
            <div className="field"><label>Hora de retorno</label>
              <input type="time" value={form.return_time} onChange={set('return_time')} /></div>
          </div>

          <div className="grid2" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="dest">Cidade de destino</label>
              <select id="dest" value={form.destination} onChange={set('destination')}>
                <option value="">Selecione…</option>
                {refs.destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.city}{d.state ? `/${d.state}` : ''}{d.is_international ? ` — ${d.country}` : ''}
                  </option>
                ))}
              </select>
              {fe('destination')}
            </div>
            <div className="field">
              <label htmlFor="obj">Descrição / justificativa da viagem</label>
              <input id="obj" value={form.objective} onChange={set('objective')}
                placeholder="Ex.: Reunião técnica do projeto na Sede" />
              {fe('objective')}
            </div>
          </div>

          {needsException && (
            <>
              <div className="alert warn" role="alert">
                Saída em {advance} dia{advance === 1 ? '' : 's'} — abaixo do prazo de{' '}
                {opts.exceptionality_advance_days} dias para viagem aérea. Justifique a excepcionalidade.
              </div>
              <div className="field">
                <label htmlFor="exc">Justificativa de excepcionalidade</label>
                <textarea id="exc" rows={3} value={form.exceptionality_justification}
                  onChange={set('exceptionality_justification')} />
                {fe('exceptionality_justification')}
              </div>
            </>
          )}

          {/* ── Favorecidos (1:N) ── */}
          <div className="section-h">
            <h3>Favorecidos</h3>
            <button className="btn ghost" type="button"
              onClick={() => setBeneficiaries((b) => [...b, EMPTY_BENEF()])}>+ Adicionar favorecido</button>
          </div>
          <div className="rowlist">
            {beneficiaries.map((b, i) => (
              <div className="rowitem" key={i}>
                <div className="field"><label>Nome</label>
                  <input value={b.full_name} onChange={(e) => {
                    const v = e.target.value;
                    setBeneficiaries((arr) => arr.map((x, j) => (j === i ? { ...x, full_name: v } : x)));
                  }} /></div>
                <div className="field"><label>Diárias</label>
                  <input inputMode="decimal" placeholder="3,5" value={b.daily_quantity} onChange={(e) => {
                    const v = e.target.value.replace(',', '.');
                    setBeneficiaries((arr) => arr.map((x, j) => (j === i ? { ...x, daily_quantity: v } : x)));
                  }} /></div>
                <div className="field"><label>Valor diária</label>
                  <input inputMode="decimal" placeholder="756,02" value={b.daily_rate} onChange={(e) => {
                    const v = e.target.value.replace(',', '.');
                    setBeneficiaries((arr) => arr.map((x, j) => (j === i ? { ...x, daily_rate: v } : x)));
                  }} /></div>
                <div className="field"><label>Hotel</label>
                  <input inputMode="decimal" value={b.hotel_value} onChange={(e) => {
                    const v = e.target.value.replace(',', '.');
                    setBeneficiaries((arr) => arr.map((x, j) => (j === i ? { ...x, hotel_value: v } : x)));
                  }} /></div>
                <button className="btn danger" type="button" aria-label="Remover favorecido"
                  onClick={() => setBeneficiaries((arr) => arr.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
          <div className="total-bar">Total geral estimado <strong>{money(totalGeral)}</strong></div>

          {/* ── Passagens (só aérea) ── */}
          {isAir && (
            <>
              <div className="section-h">
                <h3>Passagens</h3>
                <button className="btn ghost" type="button"
                  onClick={() => setTickets((t) => [...t, EMPTY_TICKET()])}>+ Adicionar trecho</button>
              </div>
              {tickets.length === 0 && (
                <p className="lead">Nenhum trecho informado ainda — os trechos são separados das diárias.</p>
              )}
              <div className="rowlist">
                {tickets.map((t, i) => (
                  <div className="rowitem" key={i}>
                    <div className="field"><label>Origem</label>
                      <input value={t.origin} onChange={(e) => {
                        const v = e.target.value;
                        setTickets((arr) => arr.map((x, j) => (j === i ? { ...x, origin: v } : x)));
                      }} /></div>
                    <div className="field"><label>Destino</label>
                      <input value={t.destination} onChange={(e) => {
                        const v = e.target.value;
                        setTickets((arr) => arr.map((x, j) => (j === i ? { ...x, destination: v } : x)));
                      }} /></div>
                    <div className="field"><label>Data do voo</label>
                      <input type="date" value={t.flight_date} onChange={(e) => {
                        const v = e.target.value;
                        setTickets((arr) => arr.map((x, j) => (j === i ? { ...x, flight_date: v } : x)));
                      }} /></div>
                    <div className="field"><label>Valor estimado</label>
                      <input inputMode="decimal" value={t.estimated_value} onChange={(e) => {
                        const v = e.target.value.replace(',', '.');
                        setTickets((arr) => arr.map((x, j) => (j === i ? { ...x, estimated_value: v } : x)));
                      }} /></div>
                    <button className="btn danger" type="button" aria-label="Remover trecho"
                      onClick={() => setTickets((arr) => arr.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="wiz-actions">
            <button className="btn ghost" onClick={() => setStep(1)} disabled={busy}>Voltar</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn quiet" disabled={busy} onClick={() => saveTrip({ submit: false })}>
                Salvar rascunho
              </button>
              <button className="btn" disabled={busy} onClick={() => saveTrip({ submit: true })}>
                {busy ? 'Enviando…' : 'Salvar e enviar para aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
