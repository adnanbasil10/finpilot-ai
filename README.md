<div align="center">

# 🚀 FinPilot AI

### AI-Powered Personal Finance Platform

*Intelligent spending insights, budgeting, and financial analytics — built with production-grade cloud-native architecture.*

[![CI](https://github.com/your-org/finpilot-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/finpilot-ai/actions)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](docker-compose.yml)
[![Kubernetes](https://img.shields.io/badge/K8s-Orchestrated-326CE5?logo=kubernetes)](k8s/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📖 Overview

FinPilot AI is a full-stack SaaS platform that helps users track transactions, manage budgets, and receive AI-powered financial insights. The project demonstrates **production-grade architecture** with Docker containerization, Kubernetes orchestration, Redis caching, PostgreSQL persistence, and Jenkins CI/CD — ready for deployment on AWS.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Authentication** | Secure signup/login with bcrypt password hashing |
| 💳 **Transaction Management** | Full CRUD with pagination, filtering, and caching |
| 🎯 **Budget Tracking** | Monthly category budgets with real-time spend calculation |
| 🤖 **AI Insights** | GPT-powered spending analysis via OpenRouter |
| ⚡ **Redis Caching** | Sub-millisecond reads with automatic invalidation |
| 📊 **Dashboard Analytics** | Visual charts and financial summaries |
| 🏗️ **Cloud-Native** | Docker + Kubernetes + AWS-ready architecture |
| 🔁 **CI/CD Pipeline** | Automated build, test, and deploy via Jenkins |

---

## 🛠️ Tech Stack

### Why Each Technology Was Chosen

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | FastAPI (Python 3.11) | Async-capable, automatic OpenAPI docs, Pydantic validation |
| **Frontend** | Next.js 15 (TypeScript) | Server-side rendering, file-based routing, React 19 |
| **Database** | PostgreSQL 16 | ACID compliance, JSON support, battle-tested reliability |
| **Cache** | Redis 7 | Sub-millisecond latency, LRU eviction, pub/sub capability |
| **ORM** | SQLAlchemy 2.0 | Type-safe queries, connection pooling, Alembic migrations |
| **AI** | OpenRouter (GPT) | Cost-effective model routing, OpenAI-compatible SDK |
| **Auth** | JWT + bcrypt | Stateless authentication, industry-standard password hashing |
| **Container** | Docker | Reproducible builds, isolation, multi-stage optimization |
| **Orchestration** | Kubernetes | Auto-scaling, self-healing, declarative infrastructure |
| **CI/CD** | Jenkins | Extensible pipeline, Docker/K8s integration |
| **Cloud** | AWS (EKS/RDS/ElastiCache) | Managed services, global infrastructure, auto-scaling |
| **Styling** | Tailwind CSS | Utility-first, responsive design, dark mode |

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          AWS Cloud (EKS Cluster)                         │
│                                                                          │
│  ┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │  Users   │───▶│   Ingress    │───▶│   Frontend   │    │  Jenkins   │  │
│  │ (HTTPS)  │    │  (nginx)     │    │  (Next.js)   │    │  CI/CD     │  │
│  └─────────┘    └──────┬───────┘    └──────────────┘    └────────────┘  │
│                        │                                                 │
│                        ▼                                                 │
│                 ┌──────────────┐                                         │
│                 │   Backend    │                                         │
│                 │  (FastAPI)   │                                         │
│                 └──────┬───────┘                                         │
│                        │                                                 │
│              ┌─────────┼─────────┐                                       │
│              ▼                   ▼                                       │
│    ┌──────────────┐    ┌──────────────┐                                  │
│    │ PostgreSQL   │    │    Redis     │                                  │
│    │  (AWS RDS)   │    │(ElastiCache) │                                  │
│    └──────────────┘    └──────────────┘                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User → Ingress (nginx) → Frontend (Next.js) → Backend (FastAPI)
                                                   │
                                        ┌──────────┼──────────┐
                                        ▼                     ▼
                                   Redis Cache          PostgreSQL
                                  (hit → return)     (miss → query → cache)
```

---

## 🐳 Docker Strategy

### Multi-Stage Builds

| Component | Base Image | Stages | Production Features |
|-----------|-----------|--------|-------------------|
| Backend | `python:3.11-slim` | 1 | Non-root user, healthcheck, unbuffered output |
| Frontend | `node:20-alpine` | 3 (deps → build → runner) | Standalone output, non-root user, healthcheck |

### Docker Compose (Development)

```bash
# Start all services
docker compose up -d

# Services:
#   db       → PostgreSQL 16 (port 5432)
#   redis    → Redis 7 with LRU eviction (port 6379)
#   backend  → FastAPI (port 8000)
#   frontend → Next.js (port 3000)
```

All services include health checks and proper dependency ordering.

---

## ☸️ Kubernetes Orchestration

### Manifest Overview

| Manifest | Kind | Purpose |
|----------|------|---------|
| `namespace.yaml` | Namespace | Isolates all FinPilot resources |
| `configmap.yaml` | ConfigMap | Non-secret environment variables |
| `secrets.yaml` | Secret | Sensitive credentials (base64) |
| `backend-deployment.yaml` | Deployment | 2 replicas, probes, resource limits |
| `backend-service.yaml` | Service | ClusterIP on port 8000 |
| `frontend-deployment.yaml` | Deployment | 2 replicas, probes, resource limits |
| `frontend-service.yaml` | Service | LoadBalancer on port 80 |
| `redis-deployment.yaml` | Deployment | 1 replica, LRU eviction |
| `redis-service.yaml` | Service | ClusterIP on port 6379 |
| `postgres-deployment.yaml` | Deployment | Dev/staging only (use RDS in prod) |
| `postgres-service.yaml` | Service | ClusterIP on port 5432 |
| `ingress.yaml` | Ingress | nginx routing + rate limiting |

### Deploy to Cluster

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

### Features

- **Readiness/Liveness probes** on all deployments
- **Resource requests/limits** for CPU and memory
- **Environment injection** via ConfigMap + Secrets
- **Ingress** with rate limiting and TLS-ready configuration

---

## ⚡ Redis Caching Layer

### Architecture

```
Request → Check Redis Cache
              │
        ┌─────┴─────┐
        │            │
    HIT → Return   MISS → Query PostgreSQL
                          → Store in Redis (TTL=300s)
                          → Return
```

### Implementation

| Module | Purpose |
|--------|---------|
| `app/redis.py` | Connection pool, health check, lifecycle management |
| `app/services/cache.py` | `cache_get`, `cache_set`, `cache_delete`, `cache_invalidate_pattern` |

### Cache Invalidation Strategy

| Event | Action |
|-------|--------|
| Create transaction | Invalidate `user:{id}:txn:*` and `user:{id}:budgets:*` |
| Update transaction | Invalidate `user:{id}:txn:*` and `user:{id}:budgets:*` |
| Delete transaction | Invalidate `user:{id}:txn:*` and `user:{id}:budgets:*` |
| Create/update budget | Invalidate `user:{id}:budgets:*` |

All cache operations are **fail-safe** — if Redis is down, requests fall through to PostgreSQL.

---

## 🔁 CI/CD with Jenkins

### Pipeline Stages

```
┌──────────┐  ┌───────────────┐  ┌─────────────┐  ┌──────────────┐
│ Checkout  │→│ Install Deps  │→│ Lint & Test  │→│ Build Frontend│
└──────────┘  │  (parallel)   │  │  (parallel)  │  └──────────────┘
              └───────────────┘  └─────────────┘         │
                                                         ▼
┌──────────┐  ┌───────────────┐  ┌─────────────┐  ┌──────────────┐
│  Deploy  │←│  Docker Push  │←│ Docker Build │←│              │
│   K8s    │  │  (main only)  │  │  (parallel)  │  │              │
└──────────┘  └───────────────┘  └─────────────┘  └──────────────┘
```

### Key Features

- Parallel dependency installation
- Parallel Docker image builds (backend + frontend)
- Push only on `main` branch
- Kubernetes deployment with rollout verification
- Automatic Docker cleanup

---

## ☁️ AWS Deployment Model

### Service Mapping

| Component | AWS Service | Why |
|-----------|-------------|-----|
| Kubernetes | **EKS** | Managed control plane, auto-scaling node groups |
| PostgreSQL | **RDS** | Automated backups, Multi-AZ, read replicas |
| Redis | **ElastiCache** | Managed Redis, cluster mode, auto-failover |
| Container Registry | **ECR** | Private registry, integrated with EKS |
| Load Balancer | **ALB** | Layer 7, path-based routing, WAF integration |
| DNS | **Route 53** | Domain management, health-check routing |
| TLS Certificates | **ACM** | Free SSL/TLS, auto-renewal |

### Environment Variable Strategy

| Environment | Secrets Management | Config |
|-------------|-------------------|--------|
| Development | `.env` file | `docker-compose.yml` |
| Staging | K8s Secrets | K8s ConfigMap |
| Production | AWS Secrets Manager | K8s ConfigMap + External Secrets Operator |

### Networking

```
Internet → Route 53 → ALB (TLS termination)
                        │
              ┌─────────┼─────────┐
              ▼                   ▼
        EKS (Frontend)     EKS (Backend)
                                  │
                    ┌─────────────┼─────────────┐
                    ▼                           ▼
              RDS (Private Subnet)     ElastiCache (Private Subnet)
```

---

## 📁 Project Structure

```
finpilot-ai/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── auth/               # JWT authentication
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── routers/            # API route handlers
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # Business logic + cache
│   │   │   ├── ai_service.py   # OpenRouter AI integration
│   │   │   └── cache.py        # Redis cache utilities
│   │   ├── config.py           # Application settings
│   │   ├── database.py         # SQLAlchemy engine/session
│   │   ├── main.py             # FastAPI app + health check
│   │   └── redis.py            # Redis connection pool
│   ├── alembic/                # Database migrations
│   ├── requirements.txt
│   └── start.sh                # Entrypoint with DB wait
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/                # Pages (App Router)
│   │   ├── components/         # Reusable UI components
│   │   └── lib/                # API client, auth, types
│   ├── package.json
│   └── next.config.ts
├── docker/                     # Dockerfiles
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── k8s/                        # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml
│   ├── postgres-deployment.yaml
│   ├── postgres-service.yaml
│   └── ingress.yaml
├── .github/workflows/ci.yml   # GitHub Actions CI
├── Jenkinsfile                 # Jenkins CI/CD pipeline
├── docker-compose.yml          # Development environment
├── .dockerignore
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/finpilot-ai.git
cd finpilot-ai
cp .env.example .env
# Edit .env with your OpenRouter API key and secrets
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

### 3. Access the Application

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:8000](http://localhost:8000) |
| API Docs | [http://localhost:8000/docs](http://localhost:8000/docs) |
| Health Check | [http://localhost:8000/health](http://localhost:8000/health) |

---

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://finpilot:finpilot@db:5432/finpilot` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `SECRET_KEY` | JWT signing key | `your-secret-key-change-me-in-production` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `1440` (24 hours) |
| `OPENROUTER_API_KEY` | OpenRouter API key | — |
| `OPENROUTER_MODEL` | AI model identifier | `openai/gpt-oss-120b:free` |
| `CORS_ORIGINS` | Allowed origins (JSON array) | `["http://localhost:3000"]` |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend | `http://localhost:8000` |

---

## 📡 API Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/signup` | Register new user | ❌ |
| `POST` | `/auth/login` | Authenticate user | ❌ |
| `GET` | `/auth/me` | Get current user | ✅ |
| `GET` | `/transactions` | List transactions (paginated) | ✅ |
| `POST` | `/transactions` | Create transaction | ✅ |
| `PUT` | `/transactions/{id}` | Update transaction | ✅ |
| `DELETE` | `/transactions/{id}` | Delete transaction | ✅ |
| `GET` | `/budgets` | List budgets with spending | ✅ |
| `POST` | `/budgets` | Create/update budget | ✅ |
| `GET` | `/insights/analyze` | AI spending analysis | ✅ |
| `GET` | `/health` | Deep health check (DB + Redis) | ❌ |

---

## 🗄️ Database Management

- **ORM**: SQLAlchemy 2.0 with declarative models
- **Migrations**: Alembic (no `create_all` in production)
- **Connection pooling**: `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`
- **Indexing**: Optimized queries with proper constraints

```bash
# Run migrations
cd backend && alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ using FastAPI · Next.js · PostgreSQL · Redis · Docker · Kubernetes · Jenkins · AWS**

</div>
