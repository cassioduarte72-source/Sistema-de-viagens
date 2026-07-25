# SAV — imagem única de produção: Django serve a API e o frontend (React) já compilado.
# Usada pelo Render (e por qualquer host que rode Docker).

# ---- Etapa 1: compila o frontend (React / Vite) ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY sav-frontend/package*.json ./
RUN npm ci
COPY sav-frontend/ ./
RUN npm run build

# ---- Etapa 2: backend Django servindo API + frontend ----
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
# build do frontend servido na raiz do site pelo WhiteNoise
COPY --from=frontend /fe/dist ./frontend_dist

RUN python manage.py collectstatic --noinput

EXPOSE 8000
# migra o banco, cria os dados de demonstração e sobe o servidor
CMD python manage.py migrate --noinput \
    && python manage.py seed_demo \
    && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3
