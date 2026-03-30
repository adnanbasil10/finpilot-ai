<div align="center">

# 🚀 FinPilot AI

### AI-Powered Personal Finance Platform

*Intelligent spending insights, budgeting, and financial analytics — built with production-grade cloud-native architecture.*

[![CI](https://github.com/adnanbasil10/finpilot-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/adnanbasil10/finpilot-ai/actions)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-00C7B7?style=flat-square&logo=vercel)](https://finpilot-ai-frontend-pud1.onrender.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](docker-compose.yml)
[![Kubernetes](https://img.shields.io/badge/K8s-Orchestrated-326CE5?style=flat-square&logo=kubernetes)](k8s/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

</div>

---

## 🟢 Live Deployment

FinPilot AI is currently deployed and live on Render using their managed infrastructure (PostgreSQL, Redis, Node, Python):

**Frontend:** [https://finpilot-ai-frontend-pud1.onrender.com](https://finpilot-ai-frontend-pud1.onrender.com)  
**Backend API:** [https://finpilot-ai-eeok.onrender.com](https://finpilot-ai-eeok.onrender.com)

*(Note: Free-tier servers may take 30-50 seconds to spin up on the first request if they are idle).*

---

## 📖 Overview

FinPilot AI is a full-stack SaaS platform that helps users track transactions, manage budgets, and receive AI-powered financial insights. 

While the live demo utilizes managed PaaS services for rapid deployment, the underlying source code demonstrates **production-grade enterprise architecture** utilizing Docker containerization, Kubernetes orchestration, Redis caching, PostgreSQL persistence, and CI/CD pipelines — explicitly designed to scale on AWS (EKS) or Oracle Cloud (OKE).

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Authentication** | Secure signup/login with bcrypt password hashing |
| 💳 **Transaction Management** | Full CRUD with pagination, filtering, and caching |
| 🎯 **Budget Tracking** | Monthly category budgets with real-time spend calculation |
| 🤖 **AI Insights** | Groq API (Llama 3) powered instant spending analysis |
| ⚡ **Redis Caching** | Sub-millisecond reads with automatic intelligent invalidation |
| 📊 **Dashboard Analytics** | Recharts-driven visual charts and financial summaries |
| 🏗️ **Cloud-Native** | Docker + Kubernetes + AWS/Oracle-ready architecture |
| 🔁 **CI/CD Pipeline** | Automated build, lint, and deploy workflows |

---

## 🛠️ Tech Stack

### Why Each Technology Was Chosen

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | FastAPI (Python 3.11) | Async-capable, automatic OpenAPI docs, Pydantic validation |
| **Frontend** | Next.js 15 (TypeScript) | App Router, Server-side rendering, React 19 |
| **Database** | PostgreSQL 16 | ACID compliance, JSON support, battle-tested reliability |
| **Cache** | Redis 7 | Sub-millisecond latency, LRU eviction, pub/sub capability |
| **ORM** | SQLAlchemy 2.0 | Type-safe queries, connection pooling, Alembic migrations |
| **AI** | Groq API (LPU) | Ultra-low latency Llama-3 inference via OpenAI-compatible SDK |
| **Auth** | JWT + bcrypt | Stateless authentication, industry-standard password hashing |
| **Container** | Docker | Reproducible builds, isolation, multi-stage optimization |
| **Cluster** | Kubernetes | Auto-scaling, self-healing, declarative infrastructure |
| **Cloud** | Oracle Cloud / AWS | Designed for OKE / EKS professional cluster deployments |
| **Styling** | Tailwind CSS | Utility-first, responsive design, dark mode, custom glassmorphism |

---

## 🏗️ Enterprise Architecture Pattern

### System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│              Oracle Cloud (OKE) / AWS Cloud (EKS Cluster)                │
│                                                                          │
│  ┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐   │
│  │  Users  │───▶│   Ingress    │───▶│   Frontend   │    │ Github/    │   │
│  │ (HTTPS) │    │  (nginx)     │    │  (Next.js)   │    │ Jenkins CI │   │
│  └─────────┘    └──────┬───────┘    └──────────────┘    └────────────┘   │
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
│    │  (Stateful)  │    │ (In-Memory)  │                                  │
│    └──────────────┘    └──────────────┘                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### High-Performance Request Flow
```text
User → Ingress (nginx) → Frontend (Next.js) → Backend (FastAPI)
                                                   │
                                        ┌──────────┼──────────┐
                                        ▼                     ▼
                                   Redis Cache          PostgreSQL
                                  (hit → return)     (miss → query → cache)
```

---

## ☁️ Enterprise Deployment (Kubernetes)

While the default live URLs use Render.com, FinPilot AI includes complete Kubernetes manifests in the `k8s/` directory to deploy to a professional cloud cluster seamlessly (AWS EKS or Oracle Cloud Infrastructure OKE).

### Cluster Setup Instructions
1. **Provision Cluster**: Provision an Always-Free Oracle Kubernetes Engine (OKE) cluster or AWS EKS.
2. **Apply Namespaces & Configs**:
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   ```
3. **Secret Injection**: Apply your base64 encoded Production credentials:
   ```bash
   kubectl apply -f k8s/secrets.yaml
   ```
4. **Deploy Infrastructure**:
   ```bash
   kubectl apply -f k8s/
   ```

### Included K8s Constraints:
- **Readiness/Liveness probes** on all deployments to ensure zero-downtime rollouts.
- **Resource requests/limits** for strict CPU and memory bounds.
- **Ingress Configuration** tailored for API load-balancing.
- **Fail-safe App Logic** (The FastAPI backend will fall back gracefully to Postgres if the Redis pod crashes).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (optional, for local frontend dev)
- Python 3.11+ (optional, for local backend dev)

### 1. Clone & Configure
```bash
git clone https://github.com/adnanbasil10/finpilot-ai.git
cd finpilot-ai
cp .env.example .env
# Edit .env by inserting your Groq API key and random JWT secret
```

### 2. Start all services globally via Docker Compose
```bash
docker compose up -d
```
*This command spins up Next.js (port 3000), FastAPI (port 8000), Redis (port 6379), and PostgreSQL (port 5432) inside completely isolated, network-bridged containers.*

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (`redis://redis:6379/0`) |
| `SECRET_KEY` | JWT HS256 encryption key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Set to `1440` (24hrs) |
| `GROQ_API_KEY` | Groq LPU API key for Insights generation |
| `GROQ_MODEL` | AI model identifier (defaults to `llama-3.1-8b-instant`) |
| `CORS_ORIGINS` | JSON array of permitted UI origins `["http://localhost:3000"]` |
| `NEXT_PUBLIC_API_URL` | Backend Endpoint targeting Frontend |

---

## 🗄️ Database Management
- **ORM**: SQLAlchemy 2.0 with declarative models & Pydantic V2 validations
- **Migrations**: Alembic (using `alembic upgrade head` rather than unsafe `create_all`)
- **Connection pooling**: Configured with `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True` natively in FastAPI.

---

## 📄 License

This project is licensed under the MIT License. You are free to fork, customize, and deploy.

---

<div align="center">
    <br/>
    <p><b>Crafted with ♥ by Adnan Basil</b></p>
    <p><i>FastAPI · Next.js · PostgreSQL · Redis · Kubernetes · Oracle Cloud</i></p>
</div>
