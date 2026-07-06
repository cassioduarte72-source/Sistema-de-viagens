# SAV — O que foi completado nesta entrega

O repositório original tinha uma base bem desenhada (models, views, serializers, tasks, testes),
mas **não rodava**: faltavam módulos inteiros que o código importava e havia divergência de API
entre camadas escritas em momentos diferentes. Esta entrega torna o sistema executável e
**validada por 13 testes unitários + 1 teste ponta a ponta via API** (login → SV → aprovação → PC).

## Módulos criados (não existiam)

| Arquivo | Conteúdo |
|---|---|
| `core/models.py` | `BaseModel` (UUID + timestamps) e `SystemConfig` (taxas de diária, prazos — editáveis sem deploy) |
| `core/audit_model.py` | `AuditLog` imutável (referenciado por `core/audit.py`) |
| `core/apps.py` | Registro do app core |
| `apps/users/` | **App completo**: `UserProfile` (matrícula, vínculo, papel, supervisor/subordinados), serializers, endpoint `/users/me/`, admin |
| `apps/accountability/` | **App completo**: `AccountabilityReport` com cálculo automático de saldo (`balance`, `requires_refund`, `requires_complement`), fluxo Rascunho → Enviada → Atestada → Encerrada, e encerramento que marca a viagem como COMPLETED |
| `apps/travel_requests/filters.py` | `TravelRequestFilter` (status, tipo, período, ano) — era importado mas não existia |
| `apps/travel_requests/permissions.py` | `TravelRequestPermission` (acesso por objeto: solicitante/equipe/papéis elevados) — idem |
| `apps/travel_requests/admin.py` | Admin dos 3 modelos |
| `config/celery.py` + `config/__init__.py` | Worker Celery (o docker-compose já o referenciava) |
| `backend/fixtures/initial_data.json` | Taxas de diária + destinos iniciais |
| `backend/pytest.ini`, `.env.example` | Configuração de testes e ambiente |

## Correções em código existente

1. **`models.py` alinhado com views/serializers/testes** — constantes planas viraram
   `TextChoices` (`StatusChoices`, `CostType`, `DecisionChoices`), com aliases legados mantidos.
   Adicionados os métodos/propriedades que as views chamavam mas não existiam:
   `submit()`, `cancel()`, `can_be_submitted`, `can_be_edited`, `_generate_request_number()`.
2. **Condição de corrida na numeração** — o signal usava `count()`, que gera números duplicados
   sob concorrência e após exclusões. Agora usa o maior número existente do ano + retentativa
   sob a constraint unique.
3. **`config/urls.py`** — só tinha o admin; agora expõe toda a API v1
   (JWT, travel-requests, authorizations, destinations, accountability, users/me).
4. **`settings/base.py`** — os apps do projeto não estavam em `INSTALLED_APPS` (nada migrava);
   adicionados DRF+JWT (8h/24h como no README), Celery/Redis com filas e beat diário de PC pendente,
   throttling de login, CORS restrito fora de DEBUG, e fallback `DB_ENGINE=sqlite3` para rodar sem Docker.
5. **Serializer da SV** — `employee_type` e `estimated_daily_total` viraram read-only
   (são calculados no backend; o cliente não pode enviá-los). Bug encontrado no teste E2E.
6. **`docker-compose.yml`** — contexto do frontend corrigido de `./frontend` para `./sav-frontend`.

## Como rodar sem Docker (validação rápida)

```bash
cd backend
pip install -r requirements.txt
export DB_ENGINE=sqlite3
python manage.py migrate
python manage.py loaddata fixtures/initial_data.json
python manage.py createsuperuser
python manage.py runserver     # API em http://localhost:8000/api/v1/
python -m pytest tests/ -v     # 13 testes
```

Com Docker: `cp .env.example .env && docker-compose up -d` (Postgres + Redis + worker).

## Próximos passos sugeridos (fora desta entrega)

1. **Frontend**: conectar o `sav-frontend` (hoje um protótipo estático) à API — login JWT,
   formulário de SV com autocomplete de destinos e painel de aprovações pendentes.
2. **PDF da Autorização de Viagem** — gerar a AV nato-digital no evento de aprovação
   (elimina a impressão do fluxo atual).
3. **Exportação para o SDP** — tela "fila de digitação" com os dados formatados na ordem
   das telas do SDP, até haver via de integração.
4. **Módulo de importação SAGU** — carga do histórico durante a transição.
