# SAV — Sistema de Autorização de Viagens (Embrapa CNPMF)

Documentação funcional do sistema. Descreve o que o sistema faz, o fluxo
completo de uma viagem e todas as funcionalidades implementadas até o momento.

> **O que é:** um módulo do SAGU que organiza o pedido de viagem, encaminha ao SLT
> (que relança no SDP oficial), passa pelo SOF (empenho) e controla a prestação de
> contas — replicando o visual e as regras do **SDP (Sistema de Diárias e Passagens)**
> da Embrapa, com algumas melhorias.

---

## 1. Tecnologias

| Parte | Tecnologia |
|-------|-----------|
| Backend (regras, API, banco) | **Python / Django** + Django REST Framework |
| Frontend (telas) | **JavaScript / React** (Vite) |
| Banco de dados | **SQLite** (desenvolvimento) / **PostgreSQL** (produção) |
| Tarefas e e-mails | **Celery** (assíncrono) |

---

## 2. Atores (papéis)

| Papel | Quem é | O que faz |
|-------|--------|-----------|
| **Solicitante** | Qualquer empregado | Preenche o pedido de viagem (AV) e presta contas |
| **Envolvido / Favorecido** | Empregado, bolsista ou convidado | Pessoa que viaja; presta contas das despesas |
| **SLT** | Setor de Logística e Transporte | Recebe o pedido, relança no SDP, abre o SEI, cuida da frota |
| **SOF** | Setor de Orçamento e Finanças | Informa o empenho e analisa a prestação de contas |
| **Administrador** | Gestão | Acesso total a todas as funções |

**Visibilidade:** o empregado comum vê apenas as viagens em que participa (que fez
ou em que é favorecido). SOF, SLT e Admin veem todas.

---

## 3. Fluxo completo de uma viagem

```
1. SOLICITANTE preenche o pedido (AV) e ENCAMINHA
      ↓
2. SLT (Caixa do SLT) relança no SDP e informa o número do SEI
      ↓ (ao informar o SEI: e-mail "AV pronta" ao solicitante/envolvido)
3. SOF (Caixa do SOF) informa a Nota de Empenho e o valor  →  viagem Finalizada
      ↓
4. Após a viagem: ENVOLVIDO presta contas (PCV) — despesas comprovadas
      ↓
5. SOF (Análise de PCV) atesta ou retorna com justificativa
```

**Prazos e inadimplência:**
- Prazo da PCV = **data de retorno + 5 dias**.
- **1 dia antes** do prazo → e-mail com link para inserir os documentos.
- **1 dia após** o prazo sem prestar contas → **CPF bloqueado** (não pode nova viagem
  até regularizar). Ao enviar a PCV, o CPF é desbloqueado automaticamente.

---

## 4. Funcionalidades por módulo

### 4.1 Solicitação de Viagem (AV)
Formulário no visual do SDP (cabeçalho azul, seções, botões verdes). Blocos:
- **Favorecido** — começa vazio; preenchido pela **busca** (Empregado/Colaborador).
- **Ordenador da Despesa** — fixo (CNPMF / chefe).
- **Dados da Viagem** — meio de transporte (5 opções: Aéreo, Aéreo/Rodoviário,
  Fluvial, Fluvial/Rodoviário, Rodoviário), período, roteiro, descrição, observações,
  **Justificativa** (obrigatória para viagens com menos de 15 dias de antecedência) e a
  pergunta **"Veículo da frota da Embrapa? Sim/Não"**.
- **Diárias** — busca de cidade (todos os municípios do país via IBGE); **quantidade
  calculada** (último dia conta meia) e **valor automático** (Capital R$ 160 / Interior R$ 128).
- **Outros Adiantamentos** — Natureza (Despesas comprovadas, Hospedagem, Deslocamento
  urbano, Serviços, Taxa de inscrição), valor em **formato moeda**, justificativa.
- **Custo total** = Diárias + Outros Adiantamentos.
- **Passagens Aéreas** (quando aéreo) — Origem/Destino com **busca dos aeroportos do
  Brasil** (padrão IATA), valor em formato moeda.
- **Dados de Custo** (ao final) — **Ônus**: Com Ônus / Sem Ônus. Ao marcar Com Ônus,
  lista as **atividades de pesquisa (Plano de Ação)** no nome do solicitante, com **saldo**,
  para seleção (botão Selecionar).

**Salvar** (rascunho) ou **Encaminhar** (envia ao SLT). Um rascunho pode ser encaminhado
depois, pela tela de detalhes.

### 4.2 Favorecido (banco de pessoas do SAGU)
Busca por nome ou matrícula, filtrada por **Empregado** ou **Colaborador**. Traz
matrícula, CPF, unidade, cargo, dados bancários e e-mail (usado nas notificações).

### 4.3 Requisição de Veículo (frota)
Aberta a partir da viagem. Ciclo: Solicitada → Remetida ao SLT → Reservada → Em uso →
Fechada. O SLT reserva veículo/motorista (com trava de conflito de agenda), faz
**check-list de saída e retorno** e registra a **KM real**. Campo **Passageiros** para
**veículo compartilhado** (várias pessoas no mesmo carro) — o SLT vê e reserva só um.

### 4.4 Caixa do SLT
Lista as viagens encaminhadas (com indicador 🚗 de quem pediu veículo). O SLT abre a
viagem, vê o **painel "Dados para lançamento no SDP"** (tudo organizado para relançar),
**Copia para o SDP**, informa o **número do SEI** (formato `21186.001323/2026-15`) e
avança ao SOF.

### 4.5 Caixa do SOF
Recebe as viagens com SEI informado. O SOF informa a **Nota de Empenho** (formato
`2026NE000121`) e o **valor** → a viagem é finalizada.

### 4.6 Prestação de Contas (PCV)
O envolvido **localiza a viagem** (o adiantamento), abre a PCV e informa a **Comprovação
de Despesa** (Tipo, Descrição, Comprovado). O sistema calcula: Total de Diárias, Despesas
Aprovadas, Valor Total, Adiantamento e o **saldo** (a devolver ou a receber da Embrapa).

### 4.7 Análise da PCV (SOF)
O SOF abre a PCV enviada, ajusta os valores **Aprovados**, informa o **empenho da PCV** e
**Atesta** ou **Retorna à fase anterior** com justificativa. Tudo fica registrado no
**Histórico de Encaminhamento** (cada fase, responsável, data e justificativa).

### 4.8 Notificações por e-mail
- **AV pronta** — ao informar o SEI (solicitante + envolvidos).
- **Falta 1 dia** para o prazo da PCV — com link para inserir os documentos.
- Outras: aprovação/decisão, mudança de status.

### 4.9 Empenho na AV e na PCV
Melhoria em relação ao SDP: **ambos** (AV e PCV) têm campo para registrar o número do
empenho.

---

## 5. Regras de negócio principais

- **Antecedência mínima**: configurável (`MIN_ADVANCE_DAYS`). Datas retroativas podem ser
  liberadas para simulação (valor negativo) e travadas em produção (voltar para 3).
- **Justificativa obrigatória** para viagens solicitadas com menos de **15 dias** de
  antecedência.
- **Diárias**: quantidade = dias do período com o **último dia valendo meia**; valor por
  localidade (Capital/Interior).
- **Prazo da PCV** = retorno + **5 dias** (`PCV_DEADLINE_DAYS`).
- **Inadimplência**: 1 dia após o prazo sem PCV → **bloqueio do CPF**; regulariza ao
  enviar a PCV.

---

## 6. Como rodar (desenvolvimento)

Na raiz do projeto, com Python e Node instalados:

```
.\iniciar.ps1
```

O script sobe o **backend** (http://127.0.0.1:8000) e o **frontend**
(http://localhost:5173) em janelas separadas. Acesse **http://localhost:5173**.

Comando de prazos (em produção, agendar diariamente via Celery Beat):
```
python manage.py checar_prazos            # usa a data de hoje
python manage.py checar_prazos --hoje 2026-06-07   # simula uma data
```

### Usuários de demonstração (senha: `sav@2026`)
| Usuário | Papel |
|---------|-------|
| `cassio` | Administrador (acesso total) |
| `chefe` | Supervisor |
| `sof` | Financeiro (SOF) |
| `sil` | SLT (Logística/Transporte) |
| `chadm` | CHADM |

---

## 7. Fora do escopo (nesta fase)

- Controle de **cotas**.
- **Fatura** / interação com a **agência de passagens**.
- Operação em **múltiplas unidades** (o sistema opera em uma unidade — CNPMF).

## 8. Pendências previstas

- Geração de **PDF da PCV** (para subir no SEI).
- Texto **padrão definitivo** dos e-mails.
- Em produção: configurar **SMTP** (envio real de e-mail) e **Celery Beat** (agendamento).

---

*Documento gerado automaticamente a partir do estado atual do sistema.*
