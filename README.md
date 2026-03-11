# SAV — Sistema de Autorização de Viagens (Embrapa)

Sistema corporativo para gestão completa de solicitações de viagem, aprovações eletrônicas,
cálculo de diárias e prestação de contas — conforme normas do serviço público federal.

---

## Stack Tecnológica

| Camada       | Tecnologia                  | Justificativa |
|--------------|-----------------------------|---------------|
| Backend      | Django 5 + DRF              | Maturidade, ORM robusto, admin nativo |
| Autenticação | JWT (SimpleJWT)             | Stateless, expira em 8h, seguro |
| Frontend     | React 18 + TypeScript       | Ecossistema corporativo maduro |
| UI           | Ant Design                  | Componentes prontos para sistemas gov |
| Estado       | Zustand                     | Simples e performático |
| Banco        | PostgreSQL 15+              | Integridade referencial, auditoria |
| Cache/Filas  | Redis 7 + Celery            | Notificações assíncronas por e-mail |
| Deploy       | Docker Compose              | Reprodutibilidade de ambiente |

---

## Configuração Local (Desenvolvimento)

### Pré-requisitos
- Docker 24+ e Docker Compose 2+
- Git

### Passos

```bash
# 1. Clone o repositório
git clone <repo> sav_embrapa
cd sav_embrapa

# 2. Copie e configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações locais

# 3. Suba todos os serviços
docker-compose up -d

# 4. Acesse o sistema
# Frontend: http://localhost:3000
# API:      http://localhost:8000/api/v1/
# Admin:    http://localhost:8000/admin/
```

### Criar superusuário (admin)

```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## Variáveis de Ambiente (.env)

```env
# Django
SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Banco de dados
DB_NAME=sav_embrapa
DB_USER=sav_user
DB_PASSWORD=sav_password
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# E-mail
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@embrapa.br

# Frontend URL (para links nos e-mails)
FRONTEND_URL=http://localhost:3000

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## Fluxo de Uso Básico

```
1. Usuário faz login  →  JWT retornado
2. Preenche formulário de solicitação  →  Salva como DRAFT
3. Envia para aprovação  →  Status: SUBMITTED
4. Sistema notifica supervisor por e-mail (Celery)
5. Supervisor aprova/rejeita com assinatura eletrônica SHA-256
6. Solicitante é notificado da decisão
7. Após a viagem, preenche prestação de contas
8. Setor financeiro analisa e encerra
```

---

## Estrutura do Projeto

```
sav_embrapa/
├── backend/
│   ├── config/          # Settings, URLs, WSGI
│   ├── apps/
│   │   ├── users/           # Perfis e permissões
│   │   ├── travel_requests/ # Solicitações e autorizações (core)
│   │   ├── allowances/      # Diárias
│   │   ├── flights/         # Passagens aéreas
│   │   ├── accountability/  # Prestação de contas
│   │   ├── notifications/   # E-mails via Celery
│   │   └── integrations/    # APIs externas (futuro)
│   ├── core/            # BaseModel, AuditLog, utils
│   ├── fixtures/        # Dados iniciais (taxas, configs)
│   └── tests/           # Testes unitários
├── frontend/
│   └── src/
│       ├── pages/       # Dashboard, Solicitações, Aprovações
│       ├── services/    # Chamadas API (Axios)
│       ├── store/       # Zustand
│       └── types/       # TypeScript interfaces
├── docker-compose.yml
└── docs/
    ├── database_schema.md
    ├── api_reference.md
    ├── access_profiles.md
    └── authorization_flow.md
```

---

## Perfis de Acesso

| Perfil          | Permissões Principais |
|-----------------|-----------------------|
| REQUESTER       | Criar/editar suas solicitações, prestação de contas |
| SUPERVISOR      | + Aprovar/rejeitar da equipe |
| TRAVEL_ANALYST  | Visualizar tudo, registrar passagens |
| FINANCE         | Diárias e prestações de contas |
| DIRECTOR        | Aprovação nível 2 (viagens acima do threshold) |
| ADMIN           | Acesso total + configurações + audit_log |

---

## Segurança

- ✅ JWT com expiração 8h + refresh 24h
- ✅ Rate limiting no endpoint de login
- ✅ CORS restrito a domínios autorizados
- ✅ ORM Django exclusivo (sem SQL raw)
- ✅ Upload validado por MIME type + limite 10MB
- ✅ Dados sensíveis nunca logados (CPF, dados bancários)
- ✅ Audit log imutável (apenas INSERT)
- ✅ Assinatura eletrônica SHA-256 em aprovações
- ✅ Permissões por objeto (usuário vê só seus dados)

---

## Testes

```bash
docker-compose exec backend pytest tests/ -v
```

Cobertura mínima implementada:
- Cálculo de diárias (nacional, internacional, meia, override por destino)
- Geração e sequência de `request_number`
- Fluxo completo de status (DRAFT → SUBMITTED → APPROVED)
- Cancelamento e validações de negócio

---

## Integrações Futuras

O módulo `apps/integrations/` define a interface abstrata `FlightAPIProvider`
para futura integração com provedores de passagens aéreas:
- **CWT / BCD Travel** — agências corporativas
- **Amadeus / Sabre** — GDS (Global Distribution System)
- **GOL / LATAM** — APIs diretas das companhias

As implementações concretas dependerão de contratos com os provedores.

---

*Sistema desenvolvido para a Empresa Brasileira de Pesquisa Agropecuária — Embrapa*
*Vinculada ao Ministério da Agricultura, Pecuária e Abastecimento — MAPA*
