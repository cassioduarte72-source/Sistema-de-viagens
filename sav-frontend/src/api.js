/**
 * api.js — cliente HTTP do SAV.
 * JWT em localStorage, renovação automática via refresh token,
 * e helpers para todos os endpoints usados pelo portal.
 */
const BASE = '/api/v1';

const tokens = {
  get access() { return localStorage.getItem('sav_access'); },
  get refresh() { return localStorage.getItem('sav_refresh'); },
  set({ access, refresh }) {
    if (access) localStorage.setItem('sav_access', access);
    if (refresh) localStorage.setItem('sav_refresh', refresh);
  },
  clear() {
    localStorage.removeItem('sav_access');
    localStorage.removeItem('sav_refresh');
  },
};

export class ApiError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body; // erros de campo do DRF: { campo: [mensagens] }
  }
}

async function refreshAccess() {
  const r = await fetch(`${BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!r.ok) { tokens.clear(); return false; }
  tokens.set(await r.json());
  return true;
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  const r = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401 && retry && tokens.refresh) {
    if (await refreshAccess()) return request(path, { method, body, retry: false });
  }
  if (r.status === 204) return null;
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, data);
  return data;
}

export const api = {
  async login(username, password) {
    const r = await fetch(`${BASE}/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new ApiError(r.status, data);
    tokens.set(data);
    return request('/users/me/');
  },
  logout: () => tokens.clear(),
  hasSession: () => Boolean(tokens.access),
  me: () => request('/users/me/'),
  searchFavorecidos: (q, tipo) =>
    request(`/favorecidos/?q=${encodeURIComponent(q)}${tipo ? `&tipo=${tipo}` : ''}`),

  wizardOptions: () => request('/travel-requests/wizard-options/'),
  minhasViagens: () => request('/travel-requests/mine/'),
  trip: (id) => request(`/travel-requests/${id}/`),
  createTrip: (payload) => request('/travel-requests/', { method: 'POST', body: payload }),
  submitTrip: (id) => request(`/travel-requests/${id}/submit/`, { method: 'POST' }),
  cancelTrip: (id) => request(`/travel-requests/${id}/cancel/`, { method: 'POST' }),
  statusHistory: (id) => request(`/travel-requests/${id}/status-history/`),
  sdpTranscript: (id) => request(`/travel-requests/${id}/sdp-transcript/`),
  sltInbox: () => request('/travel-requests/slt-inbox/'),
  concluirSdp: (id) => request(`/travel-requests/${id}/concluir-sdp/`, { method: 'POST' }),
  informarSei: (id, sei) =>
    request(`/travel-requests/${id}/informar-sei/`, { method: 'POST', body: { sei_process: sei } }),
  sofInbox: () => request('/travel-requests/sof-inbox/'),
  informarEmpenho: (id, empenho, valor) =>
    request(`/travel-requests/${id}/informar-empenho/`, {
      method: 'POST', body: { commitment_number: empenho, committed_value: valor },
    }),

  destinations: () => request('/destinations/'),
  projects: () => request('/projects/?active=true'),
  sponsors: () => request('/sponsors/?active=true'),

  addBeneficiary: (payload) => request('/beneficiaries/', { method: 'POST', body: payload }),
  addTicket: (payload) => request('/tickets/', { method: 'POST', body: payload }),
  addAdvance: (payload) => request('/advances/', { method: 'POST', body: payload }),
  activitiesByResponsavel: (nome) =>
    request(`/atividades-pesquisa/?responsavel=${encodeURIComponent(nome)}`),

  // ─── Prestação de Contas (PCV) ───────────────────────────────────────────
  pcvElegiveis: () => request('/accountability/elegiveis/'),
  createPcv: (travelId) => request('/accountability/', { method: 'POST', body: { travel_request: travelId } }),
  pcv: (id) => request(`/accountability/${id}/`),
  updatePcv: (id, payload) => request(`/accountability/${id}/`, { method: 'PATCH', body: payload }),
  submitPcv: (id) => request(`/accountability/${id}/submit/`, { method: 'POST' }),
  baixarPcvPdf: async (id, numero) => {
    const r = await fetch(`${BASE}/accountability/${id}/pdf/`, {
      headers: tokens.access ? { Authorization: `Bearer ${tokens.access}` } : {},
    });
    if (!r.ok) throw new ApiError(r.status, null);
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `PCV-${numero || id}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
  addExpense: (payload) => request('/expense-items/', { method: 'POST', body: payload }),
  updateExpense: (id, payload) => request(`/expense-items/${id}/`, { method: 'PATCH', body: payload }),
  deleteExpense: (id) => request(`/expense-items/${id}/`, { method: 'DELETE' }),
  // Análise do SOF
  pcvAnalise: () => request('/accountability/analise/'),
  pcvReview: (id, payload) => request(`/accountability/${id}/review/`, { method: 'POST', body: payload }),

  // ─── Requisição de veículo (frota) ───────────────────────────────────────
  vehicles: () => unwrap(request('/fleet/vehicles/?active=true')),
  drivers: () => unwrap(request('/fleet/drivers/?active=true')),
  tripRequisitions: (tripId) =>
    unwrap(request(`/fleet/requisitions/?travel_request=${tripId}`)),
  createRequisition: (payload) =>
    request('/fleet/requisitions/', { method: 'POST', body: payload }),
  // action: enviar-chadm | remeter-sil | negar | reservar | iniciar-uso | fechar | cancelar
  requisitionAction: (id, action, body) =>
    request(`/fleet/requisitions/${id}/${action}/`, { method: 'POST', body: body || {} }),
};

/** Normaliza respostas paginadas do DRF ({results:[...]}) para lista simples. */
async function unwrap(promise) {
  const data = await promise;
  return Array.isArray(data) ? data : (data?.results ?? []);
}

/** Extrai a primeira mensagem legível de um erro da API. */
export function firstError(err, fallback = 'Não foi possível concluir a operação.') {
  if (err instanceof ApiError && err.body && typeof err.body === 'object') {
    const v = Object.values(err.body)[0];
    if (Array.isArray(v)) return v[0];
    if (typeof v === 'string') return v;
  }
  return fallback;
}
