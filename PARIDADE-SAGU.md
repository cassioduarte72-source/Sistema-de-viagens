# SAV v2 — Paridade com o módulo Viagens do SAGU

Evolução do backend a partir da análise detalhada do SAGU (CNPMF), para que o SAV
possa **substituir o módulo de Viagens do SAGU** na etapa que antecede o SDP.
Validado por **22 testes unitários** e um teste ponta a ponta via API cobrindo
todo o ciclo: viagem com projeto → favorecidos → aprovação → orçamento → frota → transcrição SDP.

## Mapeamento SAGU → SAV

| Conceito no SAGU | Implementação no SAV |
|---|---|
| Bloco **Favorecidos** (1 viagem : N pessoas, diárias fracionadas, hotel, adicionais, total por pessoa e geral) | `TravelBeneficiary` — endpoint `/api/v1/beneficiaries/`; `total_value` por pessoa e `total_beneficiaries_value` na viagem |
| Bloco **Financeiro** por favorecido (339014.14, UGR, fonte, PTRES, PI, empenho, valor ajustado) | `BudgetAllocation` — endpoint `/api/v1/budget-allocations/`, **escrita restrita ao SOF/analista** |
| Bloco **Recurso** (projeto de pesquisa: número, nome, responsável) | `ResearchProject` + FK `project` na viagem — `/api/v1/projects/` |
| Cadastro **Agências** (CNPq, FAPESB… — fomento, não turismo) | `FundingAgency` vinculável ao projeto — `/api/v1/funding-agencies/` |
| **Modalidade** (texto descritivo do transporte) | Campo `modality` na viagem |
| **SEI por favorecido** (NNNNN.NNNNNN/NNNN-NN) | Campo `sei_process` com validação de formato no serializer |
| Tela **Alterar Status** (Solicitada, Em análise, Aprovada, Não atendida, Cancelada, Finalizada; observação; "Salvar e Enviar E-mail") | Máquina de estados com transições controladas (`ALLOWED_TRANSITIONS`), endpoint `POST /travel-requests/{id}/change-status/` com `observation` e `send_email`, histórico em `StatusChange` (`GET …/status-history/`) e task Celery `notify_status_changed`. Rótulos SAGU mantidos na API (`status_sagu`) |
| Cadastros **Veículos** e **Motoristas** (placa/modelo/ano/carga; CNH/validade/Embrapa×SLT) | App `fleet`: `Vehicle` e `Driver` — `/api/v1/fleet/vehicles/`, `/api/v1/fleet/drivers/` |
| Ação **Motorista e Veículo** com checagem de agenda | `VehicleAssignment` com validação de sobreposição de período (veículo E motorista) contra viagens ativas; viagens canceladas/não atendidas liberam a agenda |
| **Agenda Veículos / Agenda Motoristas** (grade de ocupação) | `GET /fleet/vehicles/agenda/?start=&end=` e `GET /fleet/drivers/agenda/` — períodos ocupados por recurso, prontos para o calendário do frontend |

## Sobre a "exportação para o SDP"

**Não requer API do SDP.** O endpoint `GET /travel-requests/{id}/sdp-transcript/`
devolve todos os dados da viagem organizados na ordem das telas do SDP
(tipo de viagem, tipo de favorecido, ônus, UG, período, diárias, orçamento, empenho),
para o SOF transcrever sem redigitar de rascunho — o mesmo trabalho que já é feito
hoje entre SAGU e SDP, com muito menos atrito. Automação real do SDP (por ser
aplicação web, seria via automação de navegador) fica como possibilidade futura
condicionada à autorização da Sede.

## Correções desta rodada

- Permissões por objeto refinadas: supervisor da equipe e SOF podem executar
  `change-status`, sem ganhar direito de editar a solicitação alheia.
- Refatoração das ações SAGU para `sagu_actions.py` (mixin com herança explícita).

## Validação executada

```
22 passed  (test_travel_requests.py + test_sagu_parity.py)
Smoke E2E: viagem c/ projeto → 2 favorecidos (3,5d + 2d) → SEI validado →
Em análise → Aprovada (obs + e-mail + histórico) → bloco financeiro pelo SOF
(solicitante recebe 403) → veículo alocado, conflito de agenda recusado,
agenda consultada → transcrição SDP com total geral R$ 4.558,11
```

## O que ainda falta para desligar o SAGU (próximas rodadas)

1. Frontend conectado (formulário de viagem com favorecidos, agendas em grade, tela de transcrição SDP).
2. Importador do histórico do SAGU (carga inicial de viagens, veículos, motoristas, projetos).
3. PDF da Autorização de Viagem no evento de aprovação.
4. Cadastros de apoio restantes se necessários (Patrocinadores/Liberados hoje são tipos de favorecido).

---

# v3 — Portal do solicitante (wizard "Minhas Viagens")

Implementação da segunda face do SAGU descoberta na análise complementar:
o autoatendimento do funcionário, com formulário dinâmico por fonte de custeio.

## Mapeamento wizard SAGU → SAV

| Elemento do wizard SAGU | Implementação no SAV |
|---|---|
| **Passo 1 — fonte de recurso** (sem custo no município / ônus Embrapa / projeto externo / patrocinador) | `CostType` ampliado: `NO_COST_LOCAL`, `EMBRAPA_COST`, `EXTERNAL_PROJECT`, `SPONSOR` (legado `NO_EMBRAPA_COST` preservado para registros antigos, oculto no wizard) |
| **Formulário dinâmico por custeio** | Validação condicional: `EXTERNAL_PROJECT` exige `project`; `SPONSOR` exige `sponsor` — erros de campo específicos guiam o frontend |
| **Passo 2 — Recurso** (despesas fixas, tributos, eventos, reserva, investimentos, sentenças judiciais, restos a pagar) | Modelo `ResourceLine` + fixture com as 7 linhas — `GET /api/v1/resource-lines/` |
| **Passo 2 — 6 tipos de viagem com texto explicativo** | `TripType` (carga, veículo particular, locado/táxi, Embrapa com SLT, Embrapa sem SLT, aérea) + dicionário `TRIP_TYPE_HELP` com as orientações de uso |
| **Passo 3 — data E hora de saída/retorno** | Campos `departure_time` / `return_time` adicionados |
| **Seção Passagens separada das Diárias** | Modelo `FlightTicket` (origem, destino, data do voo, valor estimado), vinculável a favorecido específico — `/api/v1/tickets/` |
| **Justificativa de Excepcionalidade < 17 dias (aérea)** | Regra parametrizada (`EXCEPTIONALITY_ADVANCE_DAYS=17` no SystemConfig): viagem aérea com antecedência menor exige `exceptionality_justification`; terrestre segue apenas o mínimo geral |
| **Cadastro Patrocinadores** | Modelo `Sponsor` — `/api/v1/sponsors/` |
| **Cadastro Projetos Externos** | Flag `is_external` no `ResearchProject` |
| **Grade "Minhas Viagens"** (nº, modalidade, cidade, UF, ônus, status, cancelar) | `GET /api/v1/travel-requests/mine/` — colunas idênticas, status nos rótulos do SAGU, flag `pode_cancelar` |
| **Wizard renderizável pelo frontend** | `GET /api/v1/travel-requests/wizard-options/` — devolve fontes de custeio, linhas de recurso, tipos com textos de ajuda e parâmetros de antecedência: o frontend monta as etapas a partir da API, sem hardcode |

## Validação v3

```
30 passed — inclui: aérea <17d sem justificativa → 400; com justificativa → 201;
aérea ≥17d → 201; terrestre <17d → 201 (regra só vale para aérea);
projeto externo/patrocinador obrigatórios por fonte; metadados do wizard;
Minhas Viagens com rótulos SAGU.
```

---

# v4 — Frontend do portal do solicitante (React conectado à API)

O protótipo estático do `sav-frontend` foi substituído por uma aplicação real.
Sem dependências novas: React 19 + Vite, `fetch` nativo, CSS próprio.

## O que foi construído

| Tela | Arquivo | Destaques |
|---|---|---|
| Login | `src/components/Login.jsx` | JWT com renovação automática do token (refresh transparente em 401) |
| Minhas Viagens | `src/components/MinhasViagens.jsx` | Colunas do SAGU (nº, modalidade, cidade, UF, ônus, situação), status coloridos com os rótulos em português, cancelamento da própria viagem |
| Wizard 3 etapas | `src/components/Wizard.jsx` | Totalmente dirigido por `wizard-options` (zero hardcode); campos condicionais por custeio; tipos de viagem com textos de orientação; favorecidos 1:N com total geral ao vivo; seção Passagens só para aérea; **aviso âmbar + campo de excepcionalidade aparecem automaticamente quando a saída está a menos de 17 dias**; erros de campo do DRF mapeados campo a campo; "Salvar rascunho" ou "Salvar e enviar" |
| Detalhe da viagem | `src/components/TripDetail.jsx` | Blocos como no SAGU (gerais, favorecidos com totais, histórico de situação) e **"Copiar para o SDP"** — leva a transcrição formatada à área de transferência, na ordem das telas do SDP (o mesmo gesto do "Copiar SEI" do SAGU) |

**Assinatura visual**: o stepper do wizard é uma rota de viagem — pontos de parada
ligados por estrada tracejada que se preenche de verde conforme o avanço.
Paleta verde-Embrapa sobre papel; Archivo (títulos), IBM Plex Sans (texto)
e IBM Plex Mono (números de SV, valores e datas). Responsivo, foco visível,
`prefers-reduced-motion` respeitado.

## Validação

```
npm run build → ✓ (218 kB js / 8 kB css)
Contrato frontend↔API íntegro: carga do wizard (options/destinos/projetos/
patrocinadores), aérea <17d → 400 com campo mapeável → 201 com justificativa,
favorecido + trecho + envio, Minhas Viagens e detalhe com todos os campos
que a UI lê, transcrição SDP. Suíte: 30 passed.
```

## Rodando o conjunto (dev, sem Docker)

```bash
# terminal 1 — API
cd backend && export DB_ENGINE=sqlite3
python manage.py migrate && python manage.py loaddata fixtures/initial_data.json
python manage.py createsuperuser   # crie também um UserProfile no /admin/
python manage.py runserver

# terminal 2 — portal
cd sav-frontend && npm install && npm run dev   # http://localhost:5173 (proxy /api → 8000)
```

Observação: o login exige que o usuário tenha um **UserProfile** vinculado
(crie em /admin/ → Perfis de Usuários). Próximo passo natural: comando
`manage.py seed_demo` para gerar usuários de demonstração, e depois as telas
administrativas (aprovação, agendas em grade, painel do SOF).
