# FinPilot AI — Complete System Deep-Dive

> **Purpose:** This document is a senior-level interview preparation guide. It explains every layer of the FinPilot AI system — from a single HTTP request all the way down to database rows and Redis keys, then back up through Docker containers, Kubernetes pods, and Jenkins pipelines.

---

## 1️⃣ System Overview

### What FinPilot AI Does

FinPilot AI is an **AI-powered personal finance SaaS platform**. Users can:

- **Sign up / log in** with secure JWT-based authentication
- **Track transactions** (income & expenses) with full CRUD operations
- **Set monthly budgets** per category and see real-time spending vs. limit
- **Get AI-powered insights** — their transactions are sent to a GPT model which returns a financial health summary, spending highlights, and actionable recommendations

### The "Interview Elevator Pitch"

> "FinPilot AI is a cloud-native SaaS platform I built from scratch. It's a FastAPI + Next.js full-stack application with PostgreSQL for persistence, Redis for caching, and GPT integration for AI financial insights. I containerized it with Docker, orchestrated it with Kubernetes, and automated the CI/CD pipeline with Jenkins — all deployed on AWS with EKS, RDS, and ElastiCache."

---

## 2️⃣ Architecture Breakdown

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                            │
│                     http://localhost:3000                            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP (fetch API)
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16 / TypeScript)                 │
│                                                                       │
│  src/lib/auth.tsx  ─── AuthProvider (React Context)                  │
│  src/lib/api.ts    ─── HTTP client (JWT auto-injection)              │
│  src/lib/types.ts  ─── TypeScript interfaces                         │
│  src/app/          ─── Pages (login, signup, dashboard, etc.)        │
│                                                                       │
│  Token stored in: localStorage.getItem("token")                      │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ REST API calls to http://localhost:8000
                            │ Authorization: Bearer <JWT>
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI / Python 3.11)                    │
│                                                                       │
│  app/main.py       ─── App entry, lifespan, /health endpoint         │
│  app/config.py     ─── Pydantic Settings (env vars)                  │
│  app/database.py   ─── SQLAlchemy engine + session factory           │
│  app/redis.py      ─── Redis connection pool (singleton)             │
│                                                                       │
│  app/auth/         ─── JWT signup/login/token validation             │
│  app/routers/      ─── REST endpoints (transactions, budgets, AI)    │
│  app/models/       ─── SQLAlchemy ORM models (User, Transaction, Budget)│
│  app/schemas/      ─── Pydantic request/response validation          │
│  app/services/     ─── Business logic (AI service, cache utilities)   │
└──────────┬───────────────────────────────┬───────────────────────────┘
           │                               │
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│  PostgreSQL 16      │         │     Redis 7          │
│  (Persistent Data)  │         │  (Cache Layer)       │
│                     │         │                      │
│  Tables:            │         │  Keys:               │
│  • users            │         │  • user:{id}:txn:*   │
│  • transactions     │         │  • user:{id}:budgets:*│
│  • budgets          │         │                      │
│  • alembic_version  │         │  TTL: 300 seconds    │
└─────────────────────┘         └──────────────────────┘
           │
           ▼
┌─────────────────────┐
│   OpenRouter API    │
│   (GPT model)       │
│   AI Insights       │
└─────────────────────┘
```

### How the Pieces Connect (In Plain English)

1. **User opens browser** → Next.js serves the React frontend
2. **Frontend calls backend** via `fetch()` with JWT in the `Authorization` header
3. **FastAPI receives the request** → validates JWT → extracts user ID
4. **Router checks Redis cache** → if HIT, returns immediately (sub-millisecond)
5. **If cache MISS** → queries PostgreSQL → stores result in Redis (TTL 300s) → returns
6. **On mutations (POST/PUT/DELETE)** → writes to PostgreSQL → invalidates related Redis keys
7. **AI endpoint** → sends transactions to OpenRouter GPT → returns structured insights

---

## 3️⃣ File-by-File Explanation

### Backend (`/backend`)

#### `backend/app/main.py` — **The Application Entry Point**

**What it does:** Creates the FastAPI application instance, configures CORS, registers all routers, manages the Redis lifecycle, and exposes health endpoints.

**How it works internally:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: warm up Redis connection pool
    get_redis_client()
    yield
    # SHUTDOWN: close Redis connections
    close_redis()
```

The `lifespan` context manager runs on startup (before any requests) and shutdown. This is where you initialize expensive resources like database connections and Redis pools.

**The `/health` endpoint** is critical for production:
- Checks PostgreSQL: `SELECT 1` test query
- Checks Redis: `PING` command
- Returns `200 OK` if both pass, `503 Service Unavailable` if either fails
- Used by Docker HEALTHCHECK, Kubernetes liveness/readiness probes, and load balancers

**Interview answer:** "The health endpoint is a deep health check, not just a 200 OK. It actually validates connectivity to both PostgreSQL and Redis. This is critical because Kubernetes readiness probes use it to decide if a pod should receive traffic. If the database is down, the pod reports unhealthy and is removed from the load balancer."

---

#### `backend/app/config.py` — **Configuration Management**

**What it does:** Centralizes all configuration using Pydantic Settings, which automatically reads from environment variables.

```python
class Settings(BaseModel):
    APP_NAME: str = "FinPilot AI"
    DATABASE_URL: str           # From .env or K8s ConfigMap
    SECRET_KEY: str             # From .env or K8s Secret
    REDIS_URL: str              # From .env or K8s ConfigMap
    OPENROUTER_API_KEY: str     # From .env or K8s Secret
```

**Why this exists:** Follows the 12-Factor App methodology — configuration is injected via environment variables, never hardcoded. The same Docker image works in development, staging, and production with different env vars.

**The `@lru_cache` decorator** on `get_settings()` ensures the Settings object is created only once (singleton pattern). Without it, every request would re-parse all environment variables.

---

#### `backend/app/database.py` — **Database Connection Layer**

**What it does:** Creates the SQLAlchemy engine, session factory, and provides a FastAPI dependency for database sessions.

**Key configuration:**
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,    # Test connections before use (handles stale connections)
    pool_size=10,          # Keep 10 persistent connections in the pool
    max_overflow=20,       # Allow up to 20 additional connections under load
)
```

**How `get_db()` works as a FastAPI dependency:**
```python
def get_db():
    db = SessionLocal()    # Get a session from the pool
    try:
        yield db           # Give it to the route handler
    finally:
        db.close()         # Return it to the pool when done
```

This is a **generator dependency**. FastAPI calls `next()` to get the session, passes it to your route handler, and when the handler returns (or throws), the `finally` block runs and the session is returned to the pool.

**Interview answer:** "I use connection pooling with `pool_pre_ping=True` to handle stale connections — if a connection was idle too long and the database closed it, SQLAlchemy will detect that and create a new one before handing it to my code. This prevents 'connection reset' errors that are common in containerized environments where pods can restart."

---

#### `backend/app/redis.py` — **Redis Connection Layer**

**What it does:** Manages a singleton Redis client with connection pooling.

**Why a singleton:** Creating a Redis connection for every request would be wasteful. Instead, we create ONE connection pool on startup and reuse it across all requests. The `get_redis_client()` function checks `if _redis_client is None` (lazy initialization).

```python
_redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,     # Return strings, not bytes
    socket_connect_timeout=5,  # Don't hang if Redis is unreachable
    retry_on_timeout=True,     # Auto-retry transient failures
)
```

**The `redis_health_check()` function** runs `client.ping()` wrapped in try/except. This is used by the `/health` endpoint.

---

#### `backend/app/services/cache.py` — **Cache Utility Functions**

**What it does:** Provides four functions that wrap Redis operations with error handling:

| Function | Purpose |
|----------|---------|
| `cache_get(key)` | Retrieve cached JSON data by key |
| `cache_set(key, data, ttl)` | Store JSON data with expiration |
| `cache_delete(key)` | Remove a specific cache entry |
| `cache_invalidate_pattern(pattern)` | Delete ALL keys matching a glob pattern |

**Why every function has try/except:** Redis is a **cache**, not the source of truth. If Redis crashes, the application MUST continue working — it just becomes slower because every request hits PostgreSQL directly. This is called **fail-safe caching** or **cache-aside pattern**.

**The `cache_invalidate_pattern()` function** uses Redis `SCAN` instead of `KEYS`:
```python
while True:
    cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
    if keys:
        client.delete(*keys)
    if cursor == 0:
        break
```
**Why SCAN instead of KEYS?** `KEYS *` blocks the entire Redis server while it iterates ALL keys. `SCAN` is cursor-based — it returns results in batches (100 at a time) without blocking. In production with millions of keys, `KEYS` could freeze Redis for seconds.

---

#### `backend/app/models/` — **ORM Models (Database Tables)**

These files define the PostgreSQL table structure using SQLAlchemy 2.0 declarative syntax.

##### `user.py` — Users Table
```
users
├── id          VARCHAR(36)  PK  (UUID)
├── email       VARCHAR(255) UNIQUE, INDEXED
├── hashed_password VARCHAR(255)
├── full_name   VARCHAR(150)
└── created_at  TIMESTAMP WITH TIMEZONE
```
- **UUID as primary key** (`str(uuid.uuid4())`): Avoids sequential integer IDs which can leak information (e.g., "you're user #5" tells an attacker there are ~5 users)
- **`cascade="all, delete-orphan"`** on relationships: When a user is deleted, all their transactions and budgets are automatically deleted (database cascade)

##### `transaction.py` — Transactions Table
```
transactions
├── id          VARCHAR(36)  PK  (UUID)
├── user_id     VARCHAR(36)  FK → users.id  (CASCADE DELETE)
├── amount      FLOAT
├── type        VARCHAR(10)   ("income" or "expense")
├── category    VARCHAR(50)
├── description VARCHAR(255)
├── date        DATE
└── created_at  TIMESTAMP WITH TIMEZONE

INDEX: ix_transactions_user_date (user_id, date)  ← Composite index
```
**Why the composite index?** Most queries filter by `user_id` AND sort by `date`. Without this index, PostgreSQL would scan the entire table. With it, lookups are O(log n).

##### `budget.py` — Budgets Table
```
budgets
├── id           VARCHAR(36)  PK  (UUID)
├── user_id      VARCHAR(36)  FK → users.id  (CASCADE DELETE)
├── category     VARCHAR(50)
├── limit_amount FLOAT
├── month        INTEGER (1-12)
├── year         INTEGER (2020-2100)
└── created_at   TIMESTAMP WITH TIMEZONE

UNIQUE CONSTRAINT: uq_budget_user_cat_period (user_id, category, month, year)
```
**Why the unique constraint?** A user can only have ONE budget per category per month. If they try to create a duplicate, the router detects it and updates the existing record instead.

---

#### `backend/app/schemas/` — **Request/Response Validation**

These are **Pydantic models** — they define the shape of data going IN and OUT of the API. They are NOT database tables.

| File | Classes | Purpose |
|------|---------|---------|
| `user.py` | `UserCreate`, `UserLogin`, `Token`, `UserResponse` | Auth request/response shapes |
| `transaction.py` | `TransactionCreate`, `TransactionUpdate`, `TransactionResponse`, `PaginatedTransactions` | CRUD shapes with validation |
| `budget.py` | `BudgetCreate`, `BudgetResponse` | Budget shapes with `spent` calculated field |
| `insights.py` | `InsightsRequest`, `InsightsResponse` | AI analysis shapes |

**How Pydantic validation works:**
```python
class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)         # MUST be > 0
    category: str = Field(..., min_length=1, max_length=50)  # 1-50 chars
    date: DateType                           # MUST be a valid date
```

If a user sends `{"amount": -50}`, FastAPI automatically returns:
```json
{
  "detail": [{"msg": "Input should be greater than 0", "loc": ["body", "amount"]}]
}
```
You never write manual validation code — Pydantic handles it.

**`model_config = {"from_attributes": True}`** tells Pydantic to read from SQLAlchemy model attributes (like `user.email`) instead of requiring a dict.

---

#### `backend/app/auth/` — **Authentication System**

##### `security.py` — Password Hashing & JWT

**Password hashing with bcrypt:**
```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)  # "$2b$12$LJ3..." (60-char hash)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)  # True or False
```

Bcrypt is a one-way hash. You **cannot** reverse `$2b$12$LJ3...` back to the original password. On login, you hash the provided password with the same salt and compare the results.

**JWT creation:**
```python
def create_access_token(subject: str) -> str:
    payload = {
        "sub": str(subject),   # user_id
        "exp": expire,         # expiration timestamp
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
```

The JWT is a base64-encoded string with three parts: `header.payload.signature`. The signature is created using `SECRET_KEY`, so only your server can create valid tokens. If anyone tampers with the payload, the signature check fails.

##### `dependencies.py` — Route Protection

```python
def get_current_user(
    token: str = Depends(oauth2_scheme),   # Extract token from header
    db: Session = Depends(get_db),         # Get DB session
) -> User:
    user_id = decode_access_token(token)    # Decode JWT → get user_id
    if user_id is None:
        raise HTTPException(401)            # Invalid/expired token
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(401)            # User deleted
    return user                             # Return the User object
```

**How it's used in routes:**
```python
@router.get("/transactions")
def list_transactions(current_user: User = Depends(get_current_user)):
    # current_user is automatically injected and guaranteed to exist
    # If the token is missing/invalid, FastAPI never reaches this code
```

##### `router.py` — Auth Endpoints

Three endpoints:
1. `POST /auth/signup` — Creates user, hashes password, returns JWT
2. `POST /auth/login` — Verifies credentials, returns JWT
3. `GET /auth/me` — Returns current user profile (requires JWT)

---

#### `backend/app/routers/` — **API Route Handlers**

##### `transactions.py` — Transaction CRUD

**Cache key structure:** `user:{user_id}:txn:p{page}:pp{per_page}:t{type}:c{category}`

Example: `user:abc-123:txn:p1:pp10:tall:call` (page 1, 10 per page, all types, all categories)

**GET /transactions (list):**
1. Build cache key from user_id + query params
2. Check Redis: `cache_get(key)` → if hit, return immediately
3. If miss: Query PostgreSQL with filters, pagination
4. Serialize result with Pydantic
5. Store in Redis: `cache_set(key, result, ttl=300)`
6. Return result

**POST/PUT/DELETE (mutations):**
1. Perform the database operation
2. Call `_invalidate_user_cache(user_id)` which does:
   ```python
   cache_invalidate_pattern(f"user:{user_id}:txn:*")     # All transaction caches
   cache_invalidate_pattern(f"user:{user_id}:budgets:*")  # All budget caches too!
   ```
   Why both? Because creating an expense transaction changes the `spent` field in budgets.

##### `budgets.py` — Budget Management

**The N+1 query fix:**

BEFORE (N+1 problem):
```python
for budget in budgets:
    spent = db.query(func.sum(Transaction.amount))  # 1 query PER budget!
        .filter(category == budget.category)
```
If you have 10 budgets, this runs 10 queries.

AFTER (single optimized query):
```python
spending_rows = db.query(
    Transaction.category,
    func.sum(Transaction.amount).label("spent"),
).filter(
    Transaction.category.in_(categories),  # All categories in ONE query
).group_by(Transaction.category).all()

spending_map = {row.category: row.spent for row in spending_rows}
```
Now it's always 2 queries total: one for budgets, one for all spending. This is O(1) vs O(n).

##### `insights.py` — AI Analysis

1. Fetches all transactions for the given month/year
2. Serializes them into a list of dicts
3. Calls `generate_spending_insights()` from `ai_service.py`
4. Returns the structured response

---

#### `backend/app/services/ai_service.py` — **GPT Integration**

**How it works:**
1. Takes a list of transaction dicts
2. Calculates summary stats (total income, expenses, savings rate, spending by category)
3. Constructs a structured prompt asking the AI to return JSON
4. Calls OpenRouter API (OpenAI-compatible SDK)
5. Strips markdown code fences from the response (```json ... ```)
6. Parses the JSON response
7. Returns `{summary, highlights, recommendations}`

**Error handling chain:**
- Empty response → raises `ValueError`
- Non-JSON response → catches `JSONDecodeError` → returns raw text as summary
- API failure → catches generic `Exception` → returns fallback message

**Interview answer:** "I used the OpenAI-compatible SDK to call OpenRouter, which acts as a model router — I can switch between GPT-4, Claude, Mistral, or any model by changing one env var. The AI service is gracefully degraded — if the API is down, users still get their data, just without AI analysis."

---

### Frontend (`/frontend`)

#### `src/lib/api.ts` — **HTTP Client**

The central `request<T>()` function:
1. Gets the JWT from `localStorage`
2. Adds `Authorization: Bearer <token>` header if token exists
3. Makes the HTTP request via `fetch()`
4. If response is not OK → throws `ApiError` with the error detail
5. If 204 No Content → returns undefined
6. Otherwise → parses JSON and returns typed result

The `api` object exports type-safe functions:
```typescript
api.signup({email, password, full_name})  → Promise<Token>
api.login({email, password})              → Promise<Token>
api.getTransactions(page, perPage, type)  → Promise<PaginatedTransactions>
api.createTransaction(data)               → Promise<Transaction>
api.analyzeSpending(month, year)          → Promise<InsightsResponse>
```

#### `src/lib/auth.tsx` — **Authentication State Manager**

Uses React Context to provide auth state to the entire app:

```
AuthProvider (wraps the app)
├── user: User | null
├── token: string | null  
├── loading: boolean
├── login(email, password) → stores token → fetches user
├── signup(email, password, fullName) → stores token → fetches user
└── logout() → removes token from localStorage
```

**On app load:**
1. Check `localStorage` for existing token
2. If found → call `GET /auth/me` to validate it
3. If valid → set user state
4. If invalid (401) → clear token, redirect to login

#### `src/lib/types.ts` — **TypeScript Interfaces**

Mirrors the backend Pydantic schemas exactly. This ensures type safety across the full stack:
- Backend: `TransactionResponse(BaseModel)` → defines the shape
- Frontend: `interface Transaction {}` → consumes the shape

#### `src/app/` — **Pages (Next.js App Router)**

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Redirects to `/login` | No |
| `/login` | Login form | No |
| `/signup` | Registration form | No |
| `/dashboard` | Financial overview | Yes |
| `/transactions` | Transaction CRUD | Yes |
| `/budgets` | Budget management | Yes |
| `/insights` | AI analysis | Yes |

---

### Docker (`/docker`)

#### `docker/backend.Dockerfile`
```dockerfile
FROM python:3.11-slim          # Base image
# Install system deps (gcc for C extensions, libpq-dev for psycopg2)
COPY requirements.txt .        # Cache layer — only re-installs if deps change
RUN pip install -r requirements.txt
COPY backend/ .                # Application code
RUN adduser --system appuser   # Non-root user for security
USER appuser                   # Switch to non-root
HEALTHCHECK CMD curl -f http://127.0.0.1:8000/health  # Docker health check
CMD ["./start.sh"]             # Run migrations then start uvicorn
```

**Why non-root user?** If an attacker exploits a vulnerability in your app, they get the same permissions as the container user. Running as root means they could modify system files, install malware, etc. Non-root limits the blast radius.

**Why separate COPY for requirements.txt?** Docker builds use layer caching. If you copy requirements.txt first and install dependencies, that layer is cached. Next time you change Python code, Docker skips reinstalling dependencies (which takes 30+ seconds) and only re-copies your code (which takes < 1 second). This is a **10x build speed improvement**.

#### `docker/frontend.Dockerfile`
A 3-stage multi-stage build:
```
Stage 1 (deps):     Install npm packages
Stage 2 (builder):  Build the Next.js production bundle
Stage 3 (runner):   Copy only the built output (no source code, no devDependencies)
```
The final image contains only the production build — **no source code, no node_modules** — making it smaller and more secure.

#### `docker-compose.yml`
Defines 4 services and their relationships:

```
db (PostgreSQL 16)  ←──┐
                       │ depends_on (service_healthy)
redis (Redis 7)    ←───┤
                       │ depends_on (service_healthy)
backend (FastAPI)  ←───┘
                       │ depends_on (service_healthy)
frontend (Next.js) ←───┘
```

**Docker Compose Networking:** All 4 services are on the same Docker network (`fullstack_default`). They can reach each other by service name — `db:5432`, `redis:6379`, `backend:8000`. This is DNS-based service discovery within Docker.

---

### Kubernetes (`/k8s`)

12 manifest files that deploy the entire system to a Kubernetes cluster.

#### Understanding Kubernetes Resources

**Namespace** (`namespace.yaml`): An isolated scope. All FinPilot resources live in the `finpilot` namespace, separate from other apps on the same cluster.

**ConfigMap** (`configmap.yaml`): Stores non-secret configuration (app name, CORS origins, Redis URL). Injected as env vars into pods via `envFrom`.

**Secret** (`secrets.yaml`): Stores sensitive values (database password, JWT secret key, API keys). Base64-encoded. In production, use AWS Secrets Manager instead.

**Deployment** (4 files): Defines HOW to run your containers:
```yaml
spec:
  replicas: 2              # Run 2 copies for high availability
  containers:
    resources:
      requests:
        cpu: 100m           # Guaranteed minimum CPU
        memory: 256Mi       # Guaranteed minimum RAM
      limits:
        cpu: 500m           # Maximum CPU (throttled beyond this)
        memory: 512Mi       # Maximum RAM (OOMKilled beyond this)
    readinessProbe:         # "Is this pod ready to receive traffic?"
      httpGet: /health
    livenessProbe:          # "Is this pod still alive?"
      httpGet: /health
```

**Service** (4 files): Creates a stable network endpoint for pods:
- Backend + Redis + Postgres: `ClusterIP` (internal only)
- Frontend: `LoadBalancer` (exposed externally on port 80)

**Ingress** (`ingress.yaml`): Routes external HTTP traffic:
- `finpilot.example.com` → frontend-service:80
- `api.finpilot.example.com` → backend-service:8000
- Includes rate limiting (100 req/min) and 10MB body size limit

---

### Jenkins (`Jenkinsfile`)

An 8-stage CI/CD pipeline:

```
Stage 1: Checkout           → git clone
Stage 2: Install Deps       → pip install + npm ci  (PARALLEL)
Stage 3: Lint/Test Backend   → ruff check + pytest
Stage 4: Lint/Type Frontend  → tsc --noEmit + npm run lint
Stage 5: Build Frontend      → npm run build (production bundle)
Stage 6: Docker Build        → Build both images  (PARALLEL)
Stage 7: Docker Push         → Push to registry  (MAIN BRANCH ONLY)
Stage 8: K8s Deploy          → kubectl apply + rollout  (MAIN BRANCH ONLY)
```

**Key features:**
- `disableConcurrentBuilds()`: Only one pipeline runs at a time
- `withCredentials()`: Docker Hub and K8s credentials are injected securely
- `kubectl rollout status`: Waits for pods to be Ready before declaring success

---

## 4️⃣ API Deep Dive

### HTTP Methods Explained

| Method | Purpose | Idempotent? | Has Body? |
|--------|---------|-------------|-----------|
| `GET` | Read data | Yes (same request → same result) | No |
| `POST` | Create new data | No (each call creates a new resource) | Yes |
| `PUT` | Update existing data | Yes (sending the same update is fine) | Yes |
| `DELETE` | Remove data | Yes (deleting twice → same result) | No |

### Complete Endpoint Reference

#### `POST /auth/signup`
- **Purpose:** Register a new user
- **Auth:** ❌ Not required
- **Input:**
```json
{
  "email": "adnan@example.com",
  "password": "MySecure123!",
  "full_name": "Adnan Khan"
}
```
- **What happens internally:**
  1. Pydantic validates: email format, password 8-128 chars, name 1-150 chars
  2. Check if email exists → 409 Conflict if duplicate
  3. Hash password with bcrypt
  4. Create User row in PostgreSQL
  5. Generate JWT with user.id as subject
  6. Return token
- **Output (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

#### `POST /auth/login`
- **Purpose:** Authenticate and get a token
- **Auth:** ❌ Not required
- **Input:**
```json
{
  "email": "adnan@example.com",
  "password": "MySecure123!"
}
```
- **What happens:** Find user by email → verify password hash → generate JWT
- **Output (200 OK):** Same `Token` shape as signup
- **Error (401):** `{"detail": "Invalid email or password"}`

#### `GET /auth/me`
- **Purpose:** Get current user's profile
- **Auth:** ✅ Required (`Authorization: Bearer <token>`)
- **Output (200 OK):**
```json
{
  "id": "da9cfffd-8919-4393-a5fe-5a13d35f2b0f",
  "email": "adnan@example.com",
  "full_name": "Adnan Khan"
}
```

#### `GET /transactions?page=1&per_page=10&type=expense&category=Food`
- **Purpose:** List user's transactions with pagination and filtering
- **Auth:** ✅ Required
- **Query parameters:**
  - `page` (default 1, min 1)
  - `per_page` (default 10, min 1, max 100)
  - `type` (optional: "income" or "expense")
  - `category` (optional: "Food", "Transport", etc.)
- **Cache behavior:**
  - Key: `user:abc:txn:p1:pp10:texpense:cFood`
  - On HIT → returns from Redis (< 1ms)
  - On MISS → queries PostgreSQL, caches for 300 seconds
- **Output (200 OK):**
```json
{
  "items": [
    {
      "id": "txn-uuid",
      "amount": 50.0,
      "type": "expense",
      "category": "Food",
      "description": "Lunch",
      "date": "2026-02-22"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 10,
  "pages": 5
}
```
- **Pagination formula:** `pages = ceil(total / per_page)`, `offset = (page - 1) * per_page`

#### `POST /transactions`
- **Purpose:** Create a new transaction
- **Auth:** ✅ Required
- **Input:**
```json
{
  "amount": 50.00,
  "type": "expense",
  "category": "Food",
  "description": "Lunch at office",
  "date": "2026-02-22"
}
```
- **What happens:** Validates → inserts into PostgreSQL → invalidates ALL transaction AND budget caches for this user → returns created transaction
- **Output (201 Created):** The created Transaction object

#### `PUT /transactions/{txn_id}`
- **Purpose:** Update an existing transaction
- **Auth:** ✅ Required
- **Input (partial — only send fields to update):**
```json
{
  "amount": 75.00,
  "description": "Dinner instead"
}
```
- **What happens:** Finds the transaction (checks both ID and user_id for security — prevents IDOR), applies changes, invalidates caches
- **Error (404):** If transaction doesn't exist or belongs to another user

#### `DELETE /transactions/{txn_id}`
- **Purpose:** Delete a transaction
- **Auth:** ✅ Required
- **Output:** `204 No Content` (empty body)

#### `GET /budgets?month=2&year=2026`
- **Purpose:** List budgets with calculated spending
- **Auth:** ✅ Required
- **Output (200 OK):**
```json
[
  {
    "id": "budget-uuid",
    "category": "Food",
    "limit_amount": 500.00,
    "month": 2,
    "year": 2026,
    "spent": 125.50
  }
]
```
Note: `spent` is NOT stored in the database. It's calculated at query time using `SUM(transactions.amount)` grouped by category.

#### `POST /budgets`
- **Purpose:** Create or update a budget
- **Auth:** ✅ Required
- **Input:**
```json
{
  "category": "Food",
  "limit_amount": 500.00,
  "month": 2,
  "year": 2026
}
```
- **Upsert logic:** If a budget already exists for this user + category + month + year → updates the limit. Otherwise → creates new.

#### `POST /insights/analyze`
- **Purpose:** Get AI-powered spending analysis
- **Auth:** ✅ Required
- **Input:**
```json
{
  "month": 2,
  "year": 2026
}
```
- **Output (200 OK):**
```json
{
  "summary": "You spent $1,250 this month with a 32% savings rate...",
  "highlights": [
    "Food is your largest expense category at $450",
    "Your savings rate improved by 5% from last month"
  ],
  "recommendations": [
    "Consider meal prepping to reduce food spending",
    "Set up automatic transfers to a savings account"
  ]
}
```

#### `GET /health`
- **Purpose:** System health check
- **Auth:** ❌ Not required
- **Output (200 OK):**
```json
{
  "status": "healthy",
  "app": "FinPilot AI",
  "version": "1.0.0",
  "checks": { "database": true, "redis": true }
}
```
- **Output (503 Service Unavailable):** If either check fails

---

## 5️⃣ Authentication Flow (Visual)

```
                            SIGNUP FLOW
                            
User → POST /auth/signup {email, password, full_name}
  │
  ▼
Pydantic validates input (email format, password 8+ chars)
  │
  ▼
Check: Does email already exist?  ──YES──▶ 409 Conflict
  │ NO
  ▼
Hash password with bcrypt ──▶ "$2b$12$LJ3m9..."
  │
  ▼
INSERT INTO users (id, email, hashed_password, full_name)
  │
  ▼    
Generate JWT: {sub: "user-uuid", exp: 1440min}
  │
  ▼
Sign with SECRET_KEY using HS256
  │
  ▼
Return: {"access_token": "eyJhbG...", "token_type": "bearer"}
  │
  ▼
Frontend stores token in localStorage.setItem("token", token)


                            LOGIN FLOW

User → POST /auth/login {email, password}
  │
  ▼
Find user by email ──NOT FOUND──▶ 401 Unauthorized
  │ FOUND
  ▼
bcrypt.verify(password, user.hashed_password) ──FALSE──▶ 401
  │ TRUE
  ▼
Generate JWT → Return token → Frontend stores in localStorage


                        PROTECTED REQUEST FLOW

User → GET /transactions
  │
  ▼
Frontend adds: Authorization: Bearer eyJhbG...
  │
  ▼
FastAPI oauth2_scheme extracts token from header
  │
  ▼
jwt.decode(token, SECRET_KEY) → {sub: "user-uuid", exp: ...}
  │
  ├── ExpiredSignatureError → 401 "Token expired"
  ├── JWTError → 401 "Invalid token"
  │
  ▼
Query: SELECT * FROM users WHERE id = "user-uuid"
  │
  ├── User not found → 401 "User not found"
  │
  ▼
Inject User object into route handler as `current_user`
  │
  ▼
Route handler executes with guaranteed authenticated user
```

---

## 6️⃣ Database Usage

### How to Inspect PostgreSQL Manually

```bash
# Connect to the database container
docker exec -it fullstack-db-1 psql -U finpilot -d finpilot

# List all tables
\dt

# View table structure
\d users
\d transactions
\d budgets

# Query data
SELECT * FROM users;
SELECT * FROM transactions WHERE user_id = 'your-uuid' ORDER BY date DESC;
SELECT category, SUM(amount) FROM transactions WHERE type = 'expense' GROUP BY category;

# View indexes
\di

# Check Alembic migration version
SELECT * FROM alembic_version;

# Exit
\q
```

### Alembic Migrations

Alembic manages database schema changes. **Never use `Base.metadata.create_all()` in production.**

```bash
# Run all pending migrations
docker exec fullstack-backend-1 alembic upgrade head

# Create a new migration after changing models
docker exec fullstack-backend-1 alembic revision --autogenerate -m "add phone column to users"

# Rollback one migration
docker exec fullstack-backend-1 alembic downgrade -1

# View migration history
docker exec fullstack-backend-1 alembic history
```

---

## 7️⃣ Redis Usage

### What Is Cached and Why

| Cache Key Pattern | Data | TTL | Why |
|-------------------|------|-----|-----|
| `user:{id}:txn:p1:pp10:tall:call` | JSON-serialized paginated transactions | 300s | Transaction lists are read 10x more than written |
| `user:{id}:budgets:2026-2` | JSON-serialized budget list with spending | 300s | Budget queries include an expensive GROUP BY |

### Cache Invalidation Strategy

When a user creates/updates/deletes a transaction:
```python
cache_invalidate_pattern(f"user:{user_id}:txn:*")      # All transaction pages
cache_invalidate_pattern(f"user:{user_id}:budgets:*")   # Budgets too (spending changes)
```

This is the **cache-aside pattern with active invalidation:**
1. Read: Check cache first → if miss, query DB, cache result
2. Write: Write to DB → immediately invalidate cached data
3. Next read: Cache miss → fresh data from DB → re-cached

### TTL (Time To Live)

Even without explicit invalidation, cached data expires after 300 seconds (5 minutes). This is a safety net — if invalidation fails for any reason, stale data is automatically removed.

### How to Inspect Redis Manually

```bash
# Connect to the Redis container
docker exec -it fullstack-redis-1 redis-cli

# View all keys
KEYS *

# View a specific key's value
GET "user:abc-123:txn:p1:pp10:tall:call"

# Check TTL remaining
TTL "user:abc-123:txn:p1:pp10:tall:call"

# Check memory usage
INFO memory

# Flush all keys (DANGER!)
FLUSHALL

# Monitor real-time commands
MONITOR

# Exit
EXIT
```

---

## 8️⃣ Docker Workflow

### Essential Commands

```bash
# Build and start everything
docker compose up -d --build

# View container status
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View logs (all services)
docker compose logs -f

# View logs (single service)
docker compose logs backend --tail 50

# Restart a service
docker compose restart backend

# Rebuild one service
docker compose up -d --build backend

# Stop everything
docker compose down

# Stop and remove volumes (DELETES DATA!)
docker compose down -v

# Shell into a container
docker exec -it fullstack-backend-1 bash
docker exec -it fullstack-db-1 psql -U finpilot
docker exec -it fullstack-redis-1 redis-cli
```

### Docker Compose Networking (Interview Explanation)

"When Docker Compose starts, it creates a virtual network called `fullstack_default`. All four containers are connected to this network. Each container gets a DNS name matching its service name — so the backend can reach PostgreSQL at `db:5432` and Redis at `redis:6379`. This is Docker's built-in service discovery. From the host machine, you access services through published ports: `localhost:8000` for the backend, `localhost:3000` for the frontend."

---

## 9️⃣ Kubernetes Workflow

### Essential kubectl Commands

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/

# View pods
kubectl get pods -n finpilot

# View services
kubectl get svc -n finpilot

# View logs
kubectl logs deployment/backend -n finpilot --tail 50

# Shell into a pod
kubectl exec -it deployment/backend -n finpilot -- bash

# Check pod health
kubectl describe pod <pod-name> -n finpilot

# Scale up/down
kubectl scale deployment/backend --replicas=4 -n finpilot

# Rolling restart (zero-downtime)
kubectl rollout restart deployment/backend -n finpilot

# View rollout status
kubectl rollout status deployment/backend -n finpilot
```

### Kubernetes Probes (Interview Explanation)

"I configured two probes on every deployment. The **readiness probe** tells Kubernetes 'is this pod ready to receive traffic?' — it hits `/health` every 10 seconds. If it fails 3 times, the pod is removed from the Service's endpoint list, so the load balancer stops sending traffic to it. The **liveness probe** asks 'is this pod still alive?' — if it fails 3 times, Kubernetes kills the pod and restarts it. The key difference: readiness removes traffic, liveness restarts the pod."

---

## 🔟 AWS Deployment Strategy

### Service Mapping

| Component | AWS Service | Why Not Self-Managed? |
|-----------|-------------|----------------------|
| Kubernetes | **EKS** | AWS manages the control plane (API server, etcd, scheduler) |
| PostgreSQL | **RDS** | Automated backups, Multi-AZ failover, read replicas |
| Redis | **ElastiCache** | Managed clustering, automatic failover, no patching |
| Container Registry | **ECR** | Private, integrated with EKS IAM |
| DNS | **Route 53** | Health-check routing, alias records for ALB |
| TLS | **ACM** | Free certificates, auto-renewal |
| Load Balancer | **ALB** | Layer 7, path-based routing, WAF integration |

### Production Checklist

| Concern | Solution |
|---------|----------|
| Secrets | AWS Secrets Manager + External Secrets Operator |
| HTTPS | ACM certificate + ALB TLS termination |
| Scaling | HPA (Horizontal Pod Autoscaler) based on CPU/memory |
| Monitoring | CloudWatch + Prometheus + Grafana |
| Logging | CloudWatch Logs or EFK stack (Elasticsearch, Fluent Bit, Kibana) |
| Database backup | RDS automated daily snapshots + point-in-time recovery |
| CI/CD | Jenkins → ECR → EKS with rolling update |

---

## 1️⃣1️⃣ Common Pitfalls & Fixes We Encountered

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| `TypeError: unsupported operand type(s) for \|` | Field name `date` shadowed the `datetime.date` type in Pydantic model | Import as `from datetime import date as DateType` |
| `AttributeError: module 'bcrypt' has no attribute '__about__'` | `passlib 1.7.4` incompatible with `bcrypt >= 4.1` | Pinned `bcrypt==4.0.1` |
| Frontend container `unhealthy` | `wget localhost` resolved to IPv6 `[::1]` in Alpine, but Node listens on IPv4 | Changed healthcheck to `127.0.0.1` |
| N+1 query in budgets | Per-category spending queried in a loop | Single `GROUP BY` query with `SUM()` |
| `KEYS *` blocking | Could block Redis on large datasets | Used `SCAN` with cursor-based pagination |

---

## 1️⃣2️⃣ Interview Answer Templates

### "Tell me about a project you built."

> "I built FinPilot AI, a cloud-native financial management platform. It's a full-stack SaaS application with a FastAPI backend and Next.js frontend. Users can track transactions, set budgets, and get AI-powered spending insights using GPT. I implemented Redis caching with a cache-aside pattern that reduced response times by 90% for read-heavy endpoints. The system is containerized with Docker, orchestrated with Kubernetes, and deployed through a Jenkins CI/CD pipeline to AWS EKS."

### "Explain how authentication works."

> "I use stateless JWT authentication. On signup, the password is hashed with bcrypt — a one-way hash with a unique salt per password. The server generates a JWT containing the user ID and an expiration timestamp, signed with a server-side secret key using HS256. The frontend stores this token in localStorage and attaches it as a Bearer token in every API request. On the server side, a FastAPI dependency called `get_current_user` extracts the token, verifies the signature, checks expiration, and loads the user from the database. If any step fails, it returns a 401."

### "Explain your caching strategy."

> "I implemented the cache-aside pattern with Redis. For read-heavy endpoints like transaction listings, the router first checks Redis with a deterministic cache key that includes the user ID, page number, and filters. On a cache hit, the response is served in under a millisecond without touching PostgreSQL. On a cache miss, we query the database, serialize the result, store it in Redis with a 300-second TTL, and return it. On any write operation — create, update, or delete — we actively invalidate all related cache keys using Redis SCAN with glob patterns. All cache operations are wrapped in try/except, making Redis fail-safe — if Redis goes down, the app degrades gracefully to direct database queries."

### "How does your CI/CD pipeline work?"

> "I use a Jenkins declarative pipeline with 8 stages. Dependency installation and Docker builds run in parallel to minimize pipeline time. Backend gets linted with Ruff and tested with pytest, frontend gets TypeScript type-checked and ESLint linted. Docker images are built with build-number and git-commit tags for traceability. The push and deploy stages are gated to the main branch only. For deployment, Jenkins applies all Kubernetes manifests, updates the image tags with `kubectl set image`, and waits for the rollout to complete before declaring success. If a new pod fails its health check, Kubernetes automatically rolls back."

### "How would you scale this in production?"

> "Horizontally. The backend is stateless — all session state is in the JWT, all data is in PostgreSQL, all cache is in Redis. I can scale from 2 pods to 20 pods without changing any code. I'd use Kubernetes Horizontal Pod Autoscaler based on CPU utilization — when average CPU exceeds 70%, HPA spins up new pods. For the database, I'd use RDS with read replicas for read-heavy queries. For Redis, ElastiCache with cluster mode for sharding across multiple nodes. The ALB handles SSL termination and distributes traffic across healthy pods."

---

> **You now have mastery-level understanding of every layer in FinPilot AI.** From `docker compose up` to `kubectl rollout status`, from a JWT being created to a Redis SCAN wiping stale cache keys — you can explain it all. Good luck in your interviews! 🚀
