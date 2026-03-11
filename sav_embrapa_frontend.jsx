import { useState, useEffect } from "react";

// ─── Dados mock para demonstração ─────────────────────────────────────────────
const mockRequests = [
  {
    id: "1", request_number: "SAV-2025-00255", requester_name: "FRANCISCO FERRAZ LARANJEIRA BARBOSA",
    destination_label: "Brasília / DF", departure_date: "2025-05-06", return_date: "2025-05-10",
    total_days: 4, status: "APPROVED", employee_type: "EMPLOYEE", cost_type: "EMBRAPA_COST",
    estimated_daily_total: 3402.09, needs_flights: true, created_at: "2025-04-17",
    objective: "Participar do aniversário da Embrapa, Evento Pré-COP e Reuniões de Gestores.",
    department: "CNPMF - Centro Nacional de Pesquisa de Mandioca e Fruticultura Tropical",
    daily_quantity: 4.5
  },
  {
    id: "2", request_number: "SAV-2025-00312", requester_name: "ANA PAULA SOUZA FERREIRA",
    destination_label: "São Paulo / SP", departure_date: "2025-06-10", return_date: "2025-06-14",
    total_days: 4, status: "SUBMITTED", employee_type: "EMPLOYEE", cost_type: "EMBRAPA_COST",
    estimated_daily_total: 3024.08, needs_flights: true, created_at: "2025-05-20",
    objective: "Apresentação de resultados de pesquisa em congresso nacional.",
    department: "CNPA - Centro Nacional de Pesquisa do Algodão",
    daily_quantity: 4.0
  },
  {
    id: "3", request_number: "SAV-2025-00298", requester_name: "MARCOS ANTONIO LIMA NETO",
    destination_label: "Recife / PE", departure_date: "2025-05-25", return_date: "2025-05-27",
    total_days: 2, status: "DRAFT", employee_type: "COLLABORATOR", cost_type: "NO_EMBRAPA_COST",
    estimated_daily_total: 1512.04, needs_flights: false, created_at: "2025-05-15",
    objective: "Reunião técnica sobre projeto de pesquisa em fruticultura.",
    department: "CNPMF", daily_quantity: 2.0
  },
  {
    id: "4", request_number: "SAV-2025-00187", requester_name: "CARLA MENDES RODRIGUES",
    destination_label: "Buenos Aires / Argentina", departure_date: "2025-07-01", return_date: "2025-07-07",
    total_days: 6, status: "UNDER_REVIEW", employee_type: "EMPLOYEE", cost_type: "EMBRAPA_COST",
    estimated_daily_total: 7200.00, needs_flights: true, created_at: "2025-05-10",
    objective: "Missão técnica internacional — cooperação em pesquisa agropecuária.",
    department: "SERE - Secretaria de Relações Internacionais",
    daily_quantity: 6.0
  },
  {
    id: "5", request_number: "SAV-2025-00156", requester_name: "PEDRO HENRIQUE COSTA",
    destination_label: "Campinas / SP", departure_date: "2025-04-15", return_date: "2025-04-17",
    total_days: 2, status: "COMPLETED", employee_type: "EMPLOYEE", cost_type: "EMBRAPA_COST",
    estimated_daily_total: 1512.04, needs_flights: false, created_at: "2025-04-01",
    objective: "Workshop de inovação tecnológica.",
    department: "CNPTIA - Centro Nacional de Pesquisa Tecnológica em Informática",
    daily_quantity: 2.0
  },
];

const STATUS_CONFIG = {
  DRAFT:        { label: "Rascunho",           color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF" },
  SUBMITTED:    { label: "Aguardando Aprovação", color: "#D97706", bg: "#FFFBEB", dot: "#F59E0B" },
  UNDER_REVIEW: { label: "Em Análise",          color: "#2563EB", bg: "#EFF6FF", dot: "#3B82F6" },
  APPROVED:     { label: "Aprovado",            color: "#059669", bg: "#ECFDF5", dot: "#10B981" },
  REJECTED:     { label: "Rejeitado",           color: "#DC2626", bg: "#FEF2F2", dot: "#EF4444" },
  CANCELLED:    { label: "Cancelado",           color: "#6B7280", bg: "#F9FAFB", dot: "#9CA3AF" },
  COMPLETED:    { label: "Concluído",           color: "#7C3AED", bg: "#F5F3FF", dot: "#8B5CF6" },
};

const EMPLOYEE_LABEL = { EMPLOYEE: "Empregado", COLLABORATOR: "Colaborador" };
const COST_LABEL = { EMBRAPA_COST: "Ônus Embrapa", NO_EMBRAPA_COST: "Sem Ônus" };

const fmtCurrency = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }) {
  const nav = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "requests",  icon: "✈", label: "Solicitações" },
    { id: "approvals", icon: "✓", label: "Aprovações", badge: 2 },
    { id: "new",       icon: "+", label: "Nova Solicitação" },
    { id: "accountability", icon: "₿", label: "Prestação de Contas" },
    { id: "reports",   icon: "▤", label: "Relatórios" },
  ];
  return (
    <aside style={{
      width: 240, background: "#0D1B2A", display: "flex", flexDirection: "column",
      height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 100,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "#1A8754",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#fff"
          }}>E</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 0.3 }}>SAV</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Embrapa · Viagens</div>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            padding: "10px 20px", background: active === item.id ? "rgba(26,135,84,0.2)" : "transparent",
            border: "none", cursor: "pointer", color: active === item.id ? "#4ADE80" : "rgba(255,255,255,0.6)",
            fontSize: 13.5, fontWeight: active === item.id ? 600 : 400,
            borderLeft: active === item.id ? "3px solid #1A8754" : "3px solid transparent",
            transition: "all 0.15s", textAlign: "left",
          }}>
            <span style={{ fontSize: 16, opacity: 0.9 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{
                background: "#EF4444", color: "#fff", borderRadius: 10,
                padding: "1px 7px", fontSize: 11, fontWeight: 700
              }}>{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
      {/* User */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#1A8754",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 13
          }}>FF</div>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Francisco Ferraz</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Empregado · CNPMF</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── STATUS BADGE ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22`,
      borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

// ─── METRIC CARD ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      border: "1px solid #E5E7EB", flex: 1, minWidth: 0,
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, color: accent,
        }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
  const total = mockRequests.length;
  const pending = mockRequests.filter(r => r.status === "SUBMITTED").length;
  const approved = mockRequests.filter(r => r.status === "APPROVED").length;
  const totalDiarias = mockRequests.reduce((s, r) => s + (r.estimated_daily_total || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Dashboard</h1>
        <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: 14 }}>
          Visão geral — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Métricas */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <MetricCard label="Total de Solicitações" value={total} sub="Todas as viagens" accent="#2563EB" icon="✈" />
        <MetricCard label="Aguardando Aprovação" value={pending} sub="Requerem ação" accent="#D97706" icon="⏳" />
        <MetricCard label="Aprovadas (ano)" value={approved} sub="Viagens autorizadas" accent="#059669" icon="✓" />
        <MetricCard label="Total Diárias" value={fmtCurrency(totalDiarias)} sub="Valor estimado" accent="#7C3AED" icon="₿" />
      </div>

      {/* Tabela recente */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>Solicitações Recentes</h2>
          <button onClick={() => onNavigate("requests")} style={{
            background: "transparent", border: "1px solid #D1D5DB", borderRadius: 8,
            padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#374151"
          }}>Ver todas →</button>
        </div>
        <RequestTable requests={mockRequests.slice(0, 4)} compact />
      </div>
    </div>
  );
}

// ─── REQUEST TABLE ─────────────────────────────────────────────────────────────
function RequestTable({ requests, compact }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {["Nº SV", "Solicitante", "Destino", "Período", "Vínculo", "Ônus", "Diárias", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6B7280", fontWeight: 600, whiteSpace: "nowrap", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((req, i) => (
              <tr key={req.id} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, color: "#2563EB", fontSize: 12 }}>
                  {req.request_number}
                </td>
                <td style={{ padding: "12px 16px", maxWidth: 200 }}>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {req.requester_name}
                  </div>
                  {!compact && <div style={{ color: "#9CA3AF", fontSize: 11 }}>{req.department}</div>}
                </td>
                <td style={{ padding: "12px 16px", color: "#374151", whiteSpace: "nowrap" }}>{req.destination_label}</td>
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "#374151" }}>
                  {fmtDate(req.departure_date)} → {fmtDate(req.return_date)}
                  <span style={{ marginLeft: 6, fontSize: 11, color: "#9CA3AF" }}>({req.total_days}d)</span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    background: req.employee_type === "EMPLOYEE" ? "#EFF6FF" : "#FFF7ED",
                    color: req.employee_type === "EMPLOYEE" ? "#1D4ED8" : "#C2410C",
                    padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600
                  }}>{EMPLOYEE_LABEL[req.employee_type]}</span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    background: req.cost_type === "EMBRAPA_COST" ? "#ECFDF5" : "#F5F3FF",
                    color: req.cost_type === "EMBRAPA_COST" ? "#065F46" : "#5B21B6",
                    padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600
                  }}>{COST_LABEL[req.cost_type]}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#111827", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {fmtCurrency(req.estimated_daily_total)}
                </td>
                <td style={{ padding: "12px 16px" }}><StatusBadge status={req.status} /></td>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => setSelected(req)} style={{
                    background: "#F3F4F6", border: "none", borderRadius: 6, padding: "4px 10px",
                    fontSize: 12, cursor: "pointer", color: "#374151"
                  }}>Detalhes</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && <RequestModal req={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

// ─── REQUEST DETAIL MODAL ─────────────────────────────────────────────────────
function RequestModal({ req, onClose }) {
  const cfg = STATUS_CONFIG[req.status];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, maxWidth: 680, width: "100%",
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #E5E7EB",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#F9FAFB", borderRadius: "16px 16px 0 0"
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "monospace" }}>SOLICITAÇÃO DE VIAGEM</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{req.request_number}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <StatusBadge status={req.status} />
            <button onClick={onClose} style={{
              background: "#E5E7EB", border: "none", borderRadius: "50%", width: 30, height: 30,
              cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center"
            }}>×</button>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {/* Favorecido */}
          <Section title="Favorecido">
            <Field label="Nome / Matrícula" value={req.requester_name} />
            <Field label="Unidade" value={req.department} />
            <Field label="Tipo de Vínculo" value={EMPLOYEE_LABEL[req.employee_type]} />
          </Section>
          {/* Dados da Viagem */}
          <Section title="Dados da Viagem">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Origem" value={`Cruz das Almas / BA`} />
              <Field label="Destino" value={req.destination_label} />
              <Field label="Data de Saída" value={fmtDate(req.departure_date)} />
              <Field label="Data de Retorno" value={fmtDate(req.return_date)} />
            </div>
            <Field label="Objetivo" value={req.objective} />
          </Section>
          {/* Recursos Solicitados */}
          <Section title="Recursos Solicitados">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <ResourceItem active={req.needs_flights} label="Passagens Aéreas" icon="✈" />
              <ResourceItem active={true} label={`${req.daily_quantity} Diárias`} icon="₿" />
              <ResourceItem active={req.cost_type === "EMBRAPA_COST"} label="Ônus Embrapa" icon="🏛" />
            </div>
          </Section>
          {/* Resumo Financeiro */}
          <Section title="Resumo Financeiro">
            <div style={{
              background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 16,
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ fontSize: 13, color: "#065F46" }}>Total Estimado de Diárias</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#059669" }}>
                {fmtCurrency(req.estimated_daily_total)}
              </div>
            </div>
          </Section>
          {/* Ações */}
          {req.status === "SUBMITTED" && (
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button style={{
                flex: 1, background: "#059669", color: "#fff", border: "none", borderRadius: 8,
                padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer"
              }}>✓ Aprovar Solicitação</button>
              <button style={{
                flex: 1, background: "#fff", color: "#DC2626", border: "2px solid #FCA5A5",
                borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer"
              }}>✕ Rejeitar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #F3F4F6" }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );
}

function ResourceItem({ active, label, icon }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, border: `1px solid ${active ? "#BBF7D0" : "#E5E7EB"}`,
      background: active ? "#F0FDF4" : "#F9FAFB", textAlign: "center"
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 12, color: active ? "#059669" : "#9CA3AF", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ─── REQUESTS PAGE ────────────────────────────────────────────────────────────
function RequestsPage() {
  const [filters, setFilters] = useState({ status: "", employee_type: "", cost_type: "", search: "" });

  const filtered = mockRequests.filter(r => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.employee_type && r.employee_type !== filters.employee_type) return false;
    if (filters.cost_type && r.cost_type !== filters.cost_type) return false;
    if (filters.search && !r.requester_name.toLowerCase().includes(filters.search.toLowerCase()) && !r.request_number.includes(filters.search)) return false;
    return true;
  });

  const Select = ({ k, label, options }) => (
    <select value={filters[k]} onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))} style={{
      border: "1px solid #D1D5DB", borderRadius: 8, padding: "8px 12px", fontSize: 13,
      color: "#374151", background: "#fff", cursor: "pointer"
    }}>
      <option value="">{label}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Solicitações de Viagem</h1>
          <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: 13 }}>{filtered.length} registro(s)</p>
        </div>
      </div>
      {/* Filtros */}
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
        padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center"
      }}>
        <input
          placeholder="Buscar por nome ou nº SV..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{
            border: "1px solid #D1D5DB", borderRadius: 8, padding: "8px 12px", fontSize: 13,
            flex: 1, minWidth: 200, outline: "none"
          }}
        />
        <Select k="status" label="Todos os Status" options={Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])} />
        <Select k="employee_type" label="Tipo de Vínculo" options={[["EMPLOYEE", "Empregado"], ["COLLABORATOR", "Colaborador"]]} />
        <Select k="cost_type" label="Tipo de Ônus" options={[["EMBRAPA_COST", "Ônus Embrapa"], ["NO_EMBRAPA_COST", "Sem Ônus"]]} />
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({ status: "", employee_type: "", cost_type: "", search: "" })} style={{
            background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5",
            borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer"
          }}>Limpar</button>
        )}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <RequestTable requests={filtered} />
      </div>
    </div>
  );
}

// ─── NEW REQUEST FORM (Wizard 3 etapas) ───────────────────────────────────────
function NewRequestPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    employee_type: "EMPLOYEE", cost_type: "EMBRAPA_COST", funding_source: "",
    origin_city: "Cruz das Almas", origin_state: "BA", destination: "",
    departure_date: "", return_date: "", objective: "", project_code: "",
    needs_flights: false, needs_daily_allowance: false, daily_quantity: "",
    needs_accommodation: false, accommodation_notes: "", other_expenses: "",
    other_expenses_value: "", agreed: false,
  });

  const DAILY_RATE = 756.02;
  const estimatedTotal = form.needs_daily_allowance && form.daily_quantity
    ? (parseFloat(form.daily_quantity) * DAILY_RATE).toFixed(2) : 0;

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const steps = ["Dados da Viagem", "Recursos Solicitados", "Revisão e Envio"];

  const inputStyle = {
    width: "100%", border: "1px solid #D1D5DB", borderRadius: 8, padding: "9px 12px",
    fontSize: 13, outline: "none", boxSizing: "border-box", color: "#111827"
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Nova Solicitação de Viagem</h1>
        <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: 13 }}>Preencha as informações abaixo</p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32, background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "14px 16px", textAlign: "center", cursor: "pointer",
            background: i === step ? "#0D1B2A" : i < step ? "#ECFDF5" : "#fff",
            color: i === step ? "#fff" : i < step ? "#059669" : "#9CA3AF",
            fontWeight: i === step ? 700 : 500, fontSize: 13,
            borderRight: i < 2 ? "1px solid #E5E7EB" : "none",
            transition: "all 0.2s",
          }} onClick={() => i < step && setStep(i)}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{i < step ? "✓" : i + 1}</div>
            {s}
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 28 }}>
        {/* Etapa 1 */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 12, color: "#065F46" }}>Solicitante</div>
              <div style={{ fontWeight: 700, color: "#111827" }}>FRANCISCO FERRAZ LARANJEIRA BARBOSA</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>Matrícula 302856 · CNPMF</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Tipo de Vínculo *</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["EMPLOYEE", "Empregado"], ["COLLABORATOR", "Colaborador"]].map(([v, l]) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, padding: "8px 14px", border: `2px solid ${form.employee_type === v ? "#2563EB" : "#E5E7EB"}`, borderRadius: 8, flex: 1, justifyContent: "center", background: form.employee_type === v ? "#EFF6FF" : "#fff" }}>
                      <input type="radio" name="emp" value={v} checked={form.employee_type === v} onChange={f("employee_type")} style={{ display: "none" }} />{l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tipo de Ônus *</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["EMBRAPA_COST", "Ônus Embrapa"], ["NO_EMBRAPA_COST", "Sem Ônus"]].map(([v, l]) => (
                    <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, padding: "8px 14px", border: `2px solid ${form.cost_type === v ? "#059669" : "#E5E7EB"}`, borderRadius: 8, flex: 1, justifyContent: "center", background: form.cost_type === v ? "#ECFDF5" : "#fff" }}>
                      <input type="radio" name="cost" value={v} checked={form.cost_type === v} onChange={f("cost_type")} style={{ display: "none" }} />{l}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {form.cost_type === "NO_EMBRAPA_COST" && (
              <div>
                <label style={labelStyle}>Fonte de Recursos *</label>
                <input style={inputStyle} placeholder="Informe a fonte de recursos" value={form.funding_source} onChange={f("funding_source")} />
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Cidade de Origem *</label>
                <input style={inputStyle} value={form.origin_city} onChange={f("origin_city")} />
              </div>
              <div>
                <label style={labelStyle}>Destino *</label>
                <input style={inputStyle} placeholder="Digite a cidade de destino" value={form.destination} onChange={f("destination")} />
              </div>
              <div>
                <label style={labelStyle}>Data de Saída *</label>
                <input type="date" style={inputStyle} value={form.departure_date} onChange={f("departure_date")} />
              </div>
              <div>
                <label style={labelStyle}>Data de Retorno *</label>
                <input type="date" style={inputStyle} value={form.return_date} onChange={f("return_date")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Objetivo da Viagem *</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Descreva o objetivo da viagem..." value={form.objective} onChange={f("objective")} />
            </div>
            <div>
              <label style={labelStyle}>Código do Projeto / Ação</label>
              <input style={inputStyle} placeholder="Ex: 02.16.01.012.00.00" value={form.project_code} onChange={f("project_code")} />
            </div>
          </div>
        )}

        {/* Etapa 2 */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CheckBlock checked={form.needs_flights} onChange={f("needs_flights")} label="Solicitar Passagens Aéreas" icon="✈" desc="Solicitação de passagens para o setor responsável">
              {form.needs_flights && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div><label style={labelStyle}>Aeroporto de Origem (IATA)</label><input style={inputStyle} placeholder="SSA" /></div>
                  <div><label style={labelStyle}>Aeroporto de Destino (IATA)</label><input style={inputStyle} placeholder="BSB" /></div>
                  <div><label style={labelStyle}>Classe</label>
                    <select style={inputStyle}><option>Econômica</option><option>Executiva</option></select>
                  </div>
                </div>
              )}
            </CheckBlock>

            <CheckBlock checked={form.needs_daily_allowance} onChange={f("needs_daily_allowance")} label="Solicitar Diárias" icon="₿" desc="Valores de diária conforme tabela vigente">
              {form.needs_daily_allowance && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Quantidade de Diárias</label>
                      <input type="number" step="0.5" min="0.5" style={inputStyle} value={form.daily_quantity} onChange={f("daily_quantity")} placeholder="Ex: 4.5" />
                    </div>
                    <div>
                      <label style={labelStyle}>Valor Estimado Total</label>
                      <div style={{
                        background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
                        padding: "9px 12px", fontSize: 16, fontWeight: 800, color: "#059669"
                      }}>{estimatedTotal ? `R$ ${parseFloat(estimatedTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "—"}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
                    Taxa aplicada: R$ 756,02 / diária (nacional padrão) · Conforme Resolução Embrapa
                  </div>
                </div>
              )}
            </CheckBlock>

            <CheckBlock checked={form.needs_accommodation} onChange={f("needs_accommodation")} label="Necessita Hospedagem" icon="🏨" desc="Solicitação de hospedagem pela Embrapa">
              {form.needs_accommodation && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Observações sobre Hospedagem</label>
                  <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.accommodation_notes} onChange={f("accommodation_notes")} />
                </div>
              )}
            </CheckBlock>

            <div>
              <label style={labelStyle}>Outras Despesas (descrição)</label>
              <input style={inputStyle} placeholder="Ex: Inscrição em congresso" value={form.other_expenses} onChange={f("other_expenses")} />
            </div>
          </div>
        )}

        {/* Etapa 3 */}
        {step === 2 && (
          <div>
            <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Resumo da Solicitação</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                {[
                  ["Solicitante", "FRANCISCO FERRAZ LARANJEIRA BARBOSA"],
                  ["Tipo de Vínculo", EMPLOYEE_LABEL[form.employee_type]],
                  ["Ônus", COST_LABEL[form.cost_type]],
                  ["Origem", `${form.origin_city} / ${form.origin_state}`],
                  ["Destino", form.destination || "—"],
                  ["Período", form.departure_date ? `${fmtDate(form.departure_date)} a ${fmtDate(form.return_date)}` : "—"],
                  ["Objetivo", form.objective || "—"],
                  ["Passagens", form.needs_flights ? "Sim" : "Não"],
                  ["Diárias", form.needs_daily_allowance ? `${form.daily_quantity} × R$ 756,02` : "Não"],
                  ["Hospedagem", form.needs_accommodation ? "Sim" : "Não"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{l}</span>
                    <span style={{ color: "#111827", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {estimatedTotal > 0 && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "#065F46" }}>Total Estimado de Diárias</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: "#059669" }}>
                  {`R$ ${parseFloat(estimatedTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            )}

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13, color: "#374151", padding: "12px 16px", border: `2px solid ${form.agreed ? "#059669" : "#E5E7EB"}`, borderRadius: 8, background: form.agreed ? "#ECFDF5" : "#fff" }}>
              <input type="checkbox" checked={form.agreed} onChange={f("agreed")} style={{ marginTop: 2 }} />
              Declaro ciência das normas de diárias e passagens da Embrapa e confirmo que as informações prestadas são verdadeiras.
            </label>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{
          background: step === 0 ? "#F3F4F6" : "#fff", color: step === 0 ? "#D1D5DB" : "#374151",
          border: "1px solid #D1D5DB", borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: step === 0 ? "default" : "pointer"
        }}>← Anterior</button>
        <div style={{ display: "flex", gap: 10 }}>
          {step === 2 && (
            <button style={{
              background: "#F9FAFB", color: "#374151", border: "1px solid #D1D5DB",
              borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer"
            }}>Salvar Rascunho</button>
          )}
          <button
            onClick={() => step < 2 ? setStep(s => s + 1) : alert("Solicitação enviada para aprovação!")}
            disabled={step === 2 && !form.agreed}
            style={{
              background: step === 2 && !form.agreed ? "#D1D5DB" : "#0D1B2A",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 24px", fontSize: 13, fontWeight: 700,
              cursor: step === 2 && !form.agreed ? "default" : "pointer"
            }}>
            {step === 2 ? "Enviar para Aprovação →" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckBlock({ checked, onChange, label, icon, desc, children }) {
  return (
    <div style={{ border: `2px solid ${checked ? "#2563EB" : "#E5E7EB"}`, borderRadius: 10, padding: 16, background: checked ? "#F0F9FF" : "#fff" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 18, height: 18, accentColor: "#2563EB" }} />
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{label}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>{desc}</div>
        </div>
      </label>
      {children}
    </div>
  );
}

// ─── APPROVALS PAGE ────────────────────────────────────────────────────────────
function ApprovalsPage() {
  const pending = mockRequests.filter(r => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW");
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Painel de Aprovações</h1>
        <p style={{ color: "#6B7280", margin: "4px 0 0", fontSize: 13 }}>{pending.length} solicitação(ões) pendente(s) de análise</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pending.map(req => (
          <div key={req.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{req.request_number}</span>
                <StatusBadge status={req.status} />
              </div>
              <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{req.requester_name}</div>
              <div style={{ color: "#6B7280", fontSize: 13 }}>
                {req.destination_label} · {fmtDate(req.departure_date)} a {fmtDate(req.return_date)} · {req.total_days} dias
              </div>
              <div style={{ color: "#374151", fontSize: 12, marginTop: 4 }}>{req.objective}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#059669" }}>{fmtCurrency(req.estimated_daily_total)}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>Total estimado diárias</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => alert(`Aprovando ${req.request_number}...`)} style={{
                  background: "#059669", color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer"
                }}>✓ Aprovar</button>
                <button onClick={() => alert(`Rejeitando ${req.request_number}...`)} style={{
                  background: "#fff", color: "#DC2626", border: "2px solid #FCA5A5",
                  borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer"
                }}>✕</button>
                <button onClick={() => setSelected(req)} style={{
                  background: "#F3F4F6", color: "#374151", border: "none",
                  borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer"
                }}>Ver</button>
              </div>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Nenhuma solicitação pendente</div>
          </div>
        )}
      </div>
      {selected && <RequestModal req={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");

  const pages = {
    dashboard: <Dashboard onNavigate={setPage} />,
    requests: <RequestsPage />,
    new: <NewRequestPage />,
    approvals: <ApprovalsPage />,
    accountability: <div style={{ padding: 20 }}><h2>Prestação de Contas — em desenvolvimento</h2></div>,
    reports: <div style={{ padding: 20 }}><h2>Relatórios — em desenvolvimento</h2></div>,
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", background: "#F3F4F6", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <Sidebar active={page} setActive={setPage} />
      <main style={{ marginLeft: 240, padding: "32px", minHeight: "100vh" }}>
        {pages[page]}
      </main>
    </div>
  );
}
