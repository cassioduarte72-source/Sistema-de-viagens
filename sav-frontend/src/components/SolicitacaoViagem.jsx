/**
 * SolicitacaoViagem.jsx — Formulário de solicitação no layout do SDP
 * (Sistema de Diárias e Passagens da Embrapa). Página única com faixas azuis,
 * seções e botões verdes, fiel ao sistema de referência.
 *
 * Mantém a mesma interface do antigo Wizard (props onDone/onCancel) e usa os
 * mesmos endpoints: createTrip + addBeneficiary + addTicket + submitTrip.
 */
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, firstError } from '../api';
import { AEROPORTOS } from '../aeroportos';

const money = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Formato moeda para input: a digitação preenche pelos centavos (ex.: 15000 -> 150,00)
function moedaParaValor(str) {
  const digits = (str || '').replace(/\D/g, '');
  return digits ? (Number(digits) / 100).toFixed(2) : '';
}

// Ordenador da Despesa — fixo para a unidade (CNPMF)
const ORDENADOR = { unidade: 'CNPMF', chefe: 'Francisco Ferraz Laranjeira Barbosa' };

// Valores de diária (por localidade)
const DIARIA_CAPITAL = 160;
const DIARIA_INTERIOR = 128;

// As 27 capitais (chave "Cidade/UF") — definem o valor de capital
const CAPITAIS = new Set([
  'Rio Branco/AC', 'Maceió/AL', 'Macapá/AP', 'Manaus/AM', 'Salvador/BA', 'Fortaleza/CE',
  'Brasília/DF', 'Vitória/ES', 'Goiânia/GO', 'São Luís/MA', 'Cuiabá/MT', 'Campo Grande/MS',
  'Belo Horizonte/MG', 'Belém/PA', 'João Pessoa/PB', 'Curitiba/PR', 'Recife/PE', 'Teresina/PI',
  'Rio de Janeiro/RJ', 'Natal/RN', 'Porto Alegre/RS', 'Porto Velho/RO', 'Boa Vista/RR',
  'Florianópolis/SC', 'São Paulo/SP', 'Aracaju/SE', 'Palmas/TO',
]);

// Valor da diária conforme a localidade (capital x interior)
const rateFor = (city) => (city ? (CAPITAIS.has(city) ? DIARIA_CAPITAL : DIARIA_INTERIOR) : 0);

// Qtd de diárias: dias entre início e fim, com o ÚLTIMO dia contando como meia.
// Ex.: 01/08 a 03/08 = 2,5 diárias (dias 1 e 2 inteiros + dia 3 meia).
function calcDiarias(start, end) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  const dias = Math.round((b - a) / 86400000);
  return dias < 0 ? 0 : dias + 0.5;
}

// Busca (uma vez por sessão) todos os municípios do país na API do IBGE
let CIDADES_CACHE = null;
async function fetchCidadesBR() {
  if (CIDADES_CACHE) return CIDADES_CACHE;
  const r = await fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome',
  );
  const data = await r.json();
  CIDADES_CACHE = data.map((m) => {
    const uf = m.microrregiao?.mesorregiao?.UF?.sigla
      || m['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla || '';
    return `${m.nome}/${uf}`;
  });
  return CIDADES_CACHE;
}

const EMPTY_DIARIA = () => ({ city: '', start_date: '', end_date: '' });
const EMPTY_TICKET = () => ({ origin: '', destination: '', flight_date: '', estimated_value: '' });
const EMPTY_ADV = () => ({ nature: '', value: '', justification: '' });

// Natureza de "Outros Adiantamentos" (valores do backend)
const NATUREZAS = [
  ['PROVEN_EXPENSES', 'Despesas comprovadas'],
  ['LODGING', 'Hospedagem'],
  ['URBAN_TRANSPORT', 'Deslocamento urbano'],
  ['SERVICES', 'Serviços'],
  ['EVENT_FEE', 'Serviços - Taxa de inscrição em eventos'],
];
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');

// Dias de antecedência entre hoje e a data de saída
function diasAntecedencia(dateStr) {
  if (!dateStr) return null;
  const dep = new Date(`${dateStr}T00:00:00`);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((dep - hoje) / 86400000);
}
const JUSTIFICATIVA_DIAS = 15; // abaixo disso, justificativa é obrigatória

export default function SolicitacaoViagem({ user, onDone, onCancel }) {
  const [opts, setOpts] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    transport_means: 'AIR',
    departure_date: '', return_date: '',
    itinerary: '', objective: '', observations: '', justificativa: '',
    cost_type: '', vehicle_fleet: 'NAO',
  });
  const [diarias, setDiarias] = useState([EMPTY_DIARIA()]);
  const [tickets, setTickets] = useState([EMPTY_TICKET()]);
  const [adiantamentos, setAdiantamentos] = useState([EMPTY_ADV()]);
  const [cidades, setCidades] = useState([]);
  const [atividades, setAtividades] = useState([]);   // atividades do solicitante (Com Ônus)
  const [atividadeSel, setAtividadeSel] = useState(''); // atividade escolhida como fonte

  // Favorecido: começa vazio — só é preenchido após a busca no cadastro do SAGU
  const [favorecido, setFavorecido] = useState(null);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [favTipo, setFavTipo] = useState('EMPLOYEE'); // Empregado | Colaborador

  // Busca de favorecidos no cadastro do SAGU, filtrada pelo tipo (Empregado/Colaborador)
  useEffect(() => {
    const q = busca.trim();
    if (q.length < 2) { setResultados([]); return undefined; }
    const id = setTimeout(() => {
      api.searchFavorecidos(q, favTipo).then(setResultados).catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(id);
  }, [busca, favTipo]);

  // Trocar de tipo limpa a seleção e a busca (é outra categoria)
  function trocarTipo(t) {
    setFavTipo(t); setFavorecido(null); setBusca(''); setResultados([]);
  }

  useEffect(() => {
    api.wizardOptions().then(setOpts)
      .catch((e) => setError(firstError(e, 'Não foi possível carregar as opções.')));
    fetchCidadesBR().then(setCidades).catch(() => setCidades([])); // busca de cidades (IBGE)
  }, []);

  // Com Ônus: carrega as atividades no nome do solicitante (com saldos)
  useEffect(() => {
    if (form.cost_type === 'EMBRAPA_COST' && user?.full_name) {
      api.activitiesByResponsavel(user.full_name).then(setAtividades).catch(() => setAtividades([]));
    } else {
      setAtividades([]); setAtividadeSel('');
    }
  }, [form.cost_type, user]);

  // Preenche as datas das diárias com o período da viagem (quando ainda vazias)
  useEffect(() => {
    setDiarias((rows) => rows.map((r) => ({
      ...r,
      start_date: r.start_date || form.departure_date,
      end_date: r.end_date || form.return_date,
    })));
  }, [form.departure_date, form.return_date]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isAir = form.transport_means === 'AIR' || form.transport_means === 'AIR_ROAD';
  const antecedencia = diasAntecedencia(form.departure_date);
  const precisaJustificativa = antecedencia !== null && antecedencia < JUSTIFICATIVA_DIAS;

  const totalDiarias = useMemo(
    () => diarias.reduce((acc, d) => acc + calcDiarias(d.start_date, d.end_date) * rateFor(d.city), 0),
    [diarias],
  );
  const totalAdiantamentos = useMemo(
    () => adiantamentos.reduce((acc, a) => acc + Number(a.value || 0), 0),
    [adiantamentos],
  );
  // Custo total da viagem = diárias + outros adiantamentos
  const totalGeral = totalDiarias + totalAdiantamentos;

  const setDiaria = (i, k, v) =>
    setDiarias((arr) => arr.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setTicket = (i, k, v) =>
    setTickets((arr) => arr.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setAdv = (i, k, v) =>
    setAdiantamentos((arr) => arr.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const fe = (k) => fieldErrors[k] && (
    <div className="err" style={{ color: '#b3261e', fontSize: 11 }}>
      {Array.isArray(fieldErrors[k]) ? fieldErrors[k][0] : fieldErrors[k]}
    </div>
  );

  async function salvar({ submit }) {
    if (!favorecido) {
      setError('Selecione o favorecido usando a busca antes de salvar.');
      return;
    }
    if (!form.cost_type) {
      setError('Em Dados de Custo, selecione o ônus (Com Ônus ou Sem Ônus).');
      return;
    }
    if (precisaJustificativa && !form.justificativa.trim()) {
      setError('Viagens com menos de 15 dias de antecedência exigem justificativa (em Dados da Viagem).');
      return;
    }
    setBusy(true); setError(''); setFieldErrors({});
    try {
      const trip = await api.createTrip({
        transport_means: form.transport_means,
        cost_type: form.cost_type,
        research_activity: form.cost_type === 'EMBRAPA_COST' ? (atividadeSel || null) : null,
        origin_city: 'Cruz das Almas', origin_state: 'BA',
        destination: null,
        departure_date: form.departure_date, return_date: form.return_date,
        itinerary: form.itinerary,
        objective: form.objective,
        observations: form.observations,
        exceptionality_justification: form.justificativa,
      });

      // Diárias → favorecidos (o favorecido é o próprio empregado solicitante).
      // Quantidade e valor são calculados (último dia = meia; capital x interior).
      for (const d of diarias.filter((x) => x.city || x.start_date)) {
        const qty = calcDiarias(d.start_date, d.end_date);
        await api.addBeneficiary({
          travel_request: trip.id,
          full_name: favorecido.full_name,
          beneficiary_type: favTipo,
          registration_number: favorecido.registration_number || '',
          cpf: favorecido.cpf || '',
          email: favorecido.email || '',
          position: favorecido.position || '',
          bank_info: favorecido.bank_info || '',
          start_date: d.start_date || form.departure_date,
          end_date: d.end_date || form.return_date,
          city: d.city,
          daily_quantity: String(qty || '0'),
          daily_rate: String(rateFor(d.city) || '0'),
        });
      }
      // Outros Adiantamentos
      for (const a of adiantamentos.filter((x) => x.nature && x.value)) {
        await api.addAdvance({
          travel_request: trip.id, nature: a.nature,
          value: a.value, justification: a.justification,
        });
      }
      // Veículo da frota: se "Sim", abre a requisição de veículo já vinculada
      if (form.vehicle_fleet === 'SIM') {
        try {
          await api.createRequisition({
            travel_request: trip.id,
            objective: form.objective,
            route: form.itinerary,
          });
        } catch { /* não impede o salvamento da viagem */ }
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
        setError('Revise os campos destacados.');
      } else {
        setError(firstError(err));
      }
    } finally { setBusy(false); }
  }

  if (!opts) {
    return <div className="sdp-form" style={{ padding: 16 }}>{error
      ? <div className="alert error">{error}</div> : 'Carregando…'}</div>;
  }

  return (
    <div className="sdp-form">
      {/* Cabeçalho do sistema */}
      <div className="sdp-appbar">
        <div className="sdp-logo">Emb<span>rapa</span></div>
        <div className="sdp-sys">Sistema de Diárias e Passagens - SDP</div>
        <div className="sdp-userinfo">
          {user?.full_name}<br />? ajuda | sair
        </div>
      </div>
      <div className="sdp-topmenu">
        <span>Solicitação de Viagem</span><span>Prestação de Contas</span>
        <span>Fatura</span><span>Configuração</span><span>Consultas / Relatórios</span>
      </div>
      <div className="sdp-crumb">Solicitação de Viagem &gt; Cadastrar</div>

      {error && <div className="alert error" style={{ margin: 10 }}>{error}</div>}

      <div className="sdp-band">
        Solicitação de Viagem Nacional para {favTipo === 'EMPLOYEE' ? 'Empregado' : 'Colaborador'}
      </div>

      {/* Favorecido — busca no cadastro do SAGU */}
      <div className="sdp-group">
        <div className="sdp-group-h">Favorecido</div>
        <div className="sdp-row"><div className="lbl">Tipo de favorecido:</div>
          <div className="val" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="radio" name="favtipo" checked={favTipo === 'EMPLOYEE'}
                onChange={() => trocarTipo('EMPLOYEE')} /> Empregado
            </label>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="radio" name="favtipo" checked={favTipo === 'COLLABORATOR'}
                onChange={() => trocarTipo('COLLABORATOR')} /> Colaborador
            </label>
          </div></div>
        <div className="sdp-row"><div className="lbl">Buscar favorecido:</div>
          <div className="val" style={{ position: 'relative', maxWidth: 460 }}>
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome ou a matrícula…" autoComplete="off" />
            {resultados.length > 0 && (
              <div className="sdp-ac">
                {resultados.map((f) => (
                  <button type="button" key={f.id} className="sdp-ac-item"
                    onClick={() => { setFavorecido(f); setBusca(''); setResultados([]); }}>
                    {f.full_name}<span> · mat. {f.registration_number || '—'} · {f.unit || '—'}</span>
                  </button>
                ))}
              </div>
            )}
          </div></div>
        <div className="sdp-row"><div className="lbl">Nome/Matrícula/CPF:</div>
          <div className="val plain">
            {favorecido ? `${favorecido.full_name} / ${favorecido.registration_number || '—'} / ${favorecido.cpf || '—'}` : '—'}
          </div></div>
        <div className="sdp-row"><div className="lbl">Endereço:</div>
          <div className="val plain">{favorecido?.address || '—'}</div></div>
        <div className="sdp-row"><div className="lbl">Dados Bancários:</div>
          <div className="val plain">{favorecido?.bank_info || '—'}</div></div>
      </div>

      {/* Ordenador da Despesa — fixo (unidade CNPMF) */}
      <div className="sdp-group">
        <div className="sdp-group-h">Ordenador da Despesa</div>
        <div className="sdp-row"><div className="lbl">Unidade:</div>
          <div className="val plain">{ORDENADOR.unidade}</div></div>
        <div className="sdp-row"><div className="lbl">Chefe:</div>
          <div className="val plain">{ORDENADOR.chefe}</div></div>
      </div>

      {/* Dados da Viagem */}
      <div className="sdp-group">
        <div className="sdp-group-h">Dados da Viagem</div>
        <div className="sdp-row"><div className="lbl">Meio de Transporte:</div>
          <div className="val" style={{ maxWidth: 220 }}>
            <select value={form.transport_means} onChange={set('transport_means')}>
              {(opts.transport_means_choices || []).map((c) =>
                <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div></div>
        <div className="sdp-row"><div className="lbl">Período<span className="req">*</span>:</div>
          <div className="val" style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 320 }}>
            <input type="date" value={form.departure_date} onChange={set('departure_date')} />
            <span>a</span>
            <input type="date" value={form.return_date} onChange={set('return_date')} />
          </div></div>
        {(fieldErrors.departure_date || fieldErrors.return_date) &&
          <div style={{ padding: '0 8px 6px 163px' }}>{fe('departure_date')}{fe('return_date')}</div>}
        <div className="sdp-row"><div className="lbl">Roteiro<span className="req">*</span>:</div>
          <div className="val"><input value={form.itinerary} onChange={set('itinerary')}
            placeholder="Ex.: Cruz das Almas - Salvador - Brasília" /></div></div>
        <div className="sdp-row"><div className="lbl">Descrição<span className="req">*</span>:</div>
          <div className="val"><textarea rows={2} value={form.objective} onChange={set('objective')} />{fe('objective')}</div></div>
        <div className="sdp-row"><div className="lbl">Observações:</div>
          <div className="val"><textarea rows={2} value={form.observations} onChange={set('observations')} /></div></div>
        <div className="sdp-row">
          <div className="lbl">Justificativa{precisaJustificativa && <span className="req">*</span>}:</div>
          <div className="val">
            <textarea rows={2} value={form.justificativa} onChange={set('justificativa')}
              placeholder={precisaJustificativa
                ? 'Obrigatória — viagem solicitada com menos de 15 dias de antecedência.'
                : 'Opcional'} />
            {precisaJustificativa && (
              <div style={{ color: '#b45309', fontSize: 11.5, marginTop: 3 }}>
                Saída em {antecedencia} dia{antecedencia === 1 ? '' : 's'} — abaixo de 15 dias: justificativa obrigatória.
              </div>
            )}
            {fe('exceptionality_justification')}
          </div></div>
        <div className="sdp-row"><div className="lbl">Veículo da frota da Embrapa?</div>
          <div className="val" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="radio" name="vfrota" checked={form.vehicle_fleet === 'SIM'}
                onChange={() => setForm((f) => ({ ...f, vehicle_fleet: 'SIM' }))} /> Sim
            </label>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="radio" name="vfrota" checked={form.vehicle_fleet === 'NAO'}
                onChange={() => setForm((f) => ({ ...f, vehicle_fleet: 'NAO' }))} /> Não
            </label>
          </div></div>
      </div>
      {form.vehicle_fleet === 'SIM' && (
        <div className="alert warn" style={{ margin: '0 10px' }}>
          Ao salvar, será aberta automaticamente uma <strong>requisição de veículo</strong> vinculada
          a esta viagem. Você poderá acompanhá-la na viagem, no bloco «Veículo da Empresa».
        </div>
      )}

      {/* Diárias */}
      <div className="sdp-band">Diárias</div>
      <div className="sdp-tools">
        <button type="button" className="sdp-mini" onClick={() => setDiarias((a) => [...a, EMPTY_DIARIA()])}>+ Adicionar</button>
      </div>
      <datalist id="cidades-br">
        {cidades.map((c) => <option key={c} value={c} />)}
      </datalist>
      <table className="sdp-table" style={{ marginTop: 6 }}>
        <thead>
          <tr><th>Localidade</th><th>Início</th><th>Fim</th><th>Qtd. Diárias</th><th>Valor Base (R$)</th><th>Total (R$)</th><th></th></tr>
        </thead>
        <tbody>
          {diarias.map((d, i) => {
            const qtd = calcDiarias(d.start_date, d.end_date);
            const valor = rateFor(d.city);
            const tipo = d.city ? (CAPITAIS.has(d.city) ? 'Capital' : 'Interior') : '';
            return (
              <tr key={i}>
                <td>
                  <input list="cidades-br" value={d.city} placeholder={cidades.length ? 'Digite a cidade…' : 'Cidade'}
                    onChange={(e) => setDiaria(i, 'city', e.target.value)} />
                </td>
                <td><input type="date" value={d.start_date} onChange={(e) => setDiaria(i, 'start_date', e.target.value)} /></td>
                <td><input type="date" value={d.end_date} onChange={(e) => setDiaria(i, 'end_date', e.target.value)} /></td>
                <td className="num">{qtd ? qtd.toLocaleString('pt-BR') : '—'}</td>
                <td className="num">{valor ? money(valor) : '—'}{tipo && <span style={{ color: '#667', fontSize: 10 }}> ({tipo})</span>}</td>
                <td className="num">{money(qtd * valor)}</td>
                <td>{diarias.length > 1 &&
                  <button type="button" className="sdp-mini rem" onClick={() => setDiarias((a) => a.filter((_, j) => j !== i))}>✕</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sdp-total">Subtotal Diárias: {money(totalDiarias)}</div>

      {/* Outros Adiantamentos */}
      <div className="sdp-band">Outros Adiantamentos</div>
      <div className="sdp-tools">
        <button type="button" className="sdp-mini" onClick={() => setAdiantamentos((a) => [...a, EMPTY_ADV()])}>+ Adicionar</button>
      </div>
      <table className="sdp-table" style={{ marginTop: 6 }}>
        <thead>
          <tr><th>Natureza</th><th>Valor (R$)</th><th>Justificativa</th><th></th></tr>
        </thead>
        <tbody>
          {adiantamentos.map((a, i) => (
            <tr key={i}>
              <td>
                <select value={a.nature} onChange={(e) => setAdv(i, 'nature', e.target.value)}>
                  <option value=""></option>
                  {NATUREZAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </td>
              <td><input inputMode="numeric" style={{ textAlign: 'right' }}
                value={a.value ? money(a.value) : ''} placeholder="R$ 0,00"
                onChange={(e) => setAdv(i, 'value', moedaParaValor(e.target.value))} /></td>
              <td><input value={a.justification} onChange={(e) => setAdv(i, 'justification', e.target.value)} /></td>
              <td>{adiantamentos.length > 1 &&
                <button type="button" className="sdp-mini rem" onClick={() => setAdiantamentos((arr) => arr.filter((_, j) => j !== i))}>✕</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sdp-total" style={{ fontSize: 13.5, borderTop: '2px solid #c4d2df', paddingTop: 8 }}>
        Custo total da viagem (Diárias + Adiantamentos): {money(totalGeral)}
      </div>

      {/* Passagens Aéreas (só quando o meio é aéreo) */}
      {isAir && (
        <>
          <div className="sdp-band">Passagens Aéreas</div>
          <datalist id="aeroportos-br">
            {AEROPORTOS.map((a) => <option key={a} value={a} />)}
          </datalist>
          <div className="sdp-tools">
            <button type="button" className="sdp-mini" onClick={() => setTickets((a) => [...a, EMPTY_TICKET()])}>+ Adicionar</button>
          </div>
          <table className="sdp-table" style={{ marginTop: 6 }}>
            <thead>
              <tr><th>Origem</th><th>Destino</th><th>Data de Embarque</th><th>Valor estimado (R$)</th><th></th></tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={i}>
                  <td><input list="aeroportos-br" value={t.origin} placeholder="Ex.: SSA — Salvador"
                    onChange={(e) => setTicket(i, 'origin', e.target.value)} /></td>
                  <td><input list="aeroportos-br" value={t.destination} placeholder="Ex.: BSB — Brasília"
                    onChange={(e) => setTicket(i, 'destination', e.target.value)} /></td>
                  <td><input type="date" value={t.flight_date} onChange={(e) => setTicket(i, 'flight_date', e.target.value)} /></td>
                  <td><input inputMode="numeric" style={{ textAlign: 'right' }}
                    value={t.estimated_value ? money(t.estimated_value) : ''} placeholder="R$ 0,00"
                    onChange={(e) => setTicket(i, 'estimated_value', moedaParaValor(e.target.value))} /></td>
                  <td>{tickets.length > 1 &&
                    <button type="button" className="sdp-mini rem" onClick={() => setTickets((a) => a.filter((_, j) => j !== i))}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Dados de Custo — após definido o custo da viagem: ônus + atividade */}
      <div className="sdp-group">
        <div className="sdp-group-h">Dados de Custo</div>
        <div className="sdp-row"><div className="lbl">Unidade Executora:</div>
          <div className="val plain">{ORDENADOR.unidade}</div></div>
        <div className="sdp-row"><div className="lbl">Ônus<span className="req">*</span>:</div>
          <div className="val" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="radio" name="onus" checked={form.cost_type === 'EMBRAPA_COST'}
                onChange={() => setForm((f) => ({ ...f, cost_type: 'EMBRAPA_COST' }))} />
              Com Ônus para Embrapa
            </label>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="radio" name="onus" checked={form.cost_type === 'NO_ONUS'}
                onChange={() => setForm((f) => ({ ...f, cost_type: 'NO_ONUS' }))} />
              Sem Ônus para Embrapa
            </label>
          </div></div>
      </div>

      {/* Com Ônus: atividades no nome do solicitante (com saldos) */}
      {form.cost_type === 'EMBRAPA_COST' && (
        <>
          <div className="sdp-band">Atividades do solicitante (Fonte de Recurso)</div>
          {atividades.length === 0 && (
            <p style={{ margin: 10, fontSize: 12, color: '#667' }}>
              Nenhuma atividade encontrada em nome de {user?.full_name}.
            </p>
          )}
          {atividades.length > 0 && (
            <table className="sdp-table" style={{ marginTop: 6 }}>
              <thead>
                <tr><th></th><th>Número</th><th>Título da atividade</th><th>Início</th><th>Término</th><th>Saldo (R$)</th></tr>
              </thead>
              <tbody>
                {atividades.map((at) => (
                  <tr key={at.id} style={atividadeSel === at.id ? { background: '#eaf4f8' } : undefined}>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {atividadeSel === at.id
                        ? <span style={{ color: '#2e8b3d', fontWeight: 'bold' }}>✓ Selecionado</span>
                        : <button type="button" className="sdp-mini" onClick={() => setAtividadeSel(at.id)}>Selecionar</button>}
                    </td>
                    <td className="mono">{at.code}</td>
                    <td>{at.description}</td>
                    <td className="num">{fmtDate(at.start_date)}</td>
                    <td className="num">{fmtDate(at.end_date)}</td>
                    <td className="num">{money(at.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Aviso de validação também aqui, junto dos botões (para ficar visível) */}
      {error && <div className="alert error" style={{ margin: '10px' }}>{error}</div>}

      {/* Ações */}
      <div className="sdp-actions">
        <button type="button" className="sdp-btn gray" disabled={busy} onClick={onCancel}>Voltar</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="sdp-btn" disabled={busy} onClick={() => salvar({ submit: false })}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" className="sdp-btn" disabled={busy} onClick={() => salvar({ submit: true })}>
            {busy ? 'Enviando…' : 'Encaminhar'}
          </button>
        </div>
      </div>
    </div>
  );
}
