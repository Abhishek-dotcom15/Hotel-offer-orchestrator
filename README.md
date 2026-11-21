# Hotel Offer Orchestrator

Hotel offer aggregation service with supplier deduplication, price filtering, and graceful degradation.

## Tech Stack

Node.js, TypeScript, Express, Temporal.io, Redis, Zod, Winston, Vitest, Docker

---

## Setup & Run

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure (Redis, Temporal, PostgreSQL)
docker compose up -d

# 3. Start application (API + Worker)
npm run dev
```

### Docker Deployment

```bash
docker compose up -d --build
```

### Verify

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/api-docs |
| Temporal UI | http://localhost:8233 |
| Health Check | http://localhost:3000/health |

```bash
curl "http://localhost:3000/api/hotels?city=delhi"
```

---

## Architecture

```
Client Request
      ↓
Express + Zod Validation
      ↓
Temporal Workflow
  ├── Check Redis cache (hit → return cached)
  ├── Fetch suppliers in parallel (Promise.allSettled)
  ├── Deduplicate by name (lowest price wins)
  ├── Save to Redis Sorted Set (score = price)
  └── Query with ZRANGEBYSCORE (price filtering in Redis)
      ↓
Response with meta { dataFreshness, sources, fromCache }
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hotels?city={city}` | Aggregated deduplicated hotels |
| GET | `/api/hotels?city={city}&minPrice=X&maxPrice=Y` | With price filter |
| GET | `/supplierA/hotels?city={city}` | Mock Supplier A |
| GET | `/supplierB/hotels?city={city}` | Mock Supplier B |
| POST | `/supplierA/hotels` | Add hotel to Supplier A |
| POST | `/supplierB/hotels` | Add hotel to Supplier B |
| GET | `/health` | Health check (Redis, Temporal status) |
| POST | `/simulation/suppliers/{A\|B}/fail` | Enable failure simulation |
| DELETE | `/simulation/suppliers/{A\|B}/fail` | Disable simulation |
| GET | `/simulation/status` | Current simulation state |
| POST | `/simulation/reset` | Reset all simulations |

Full API documentation available at Swagger UI.

---

## Key Design Decisions

### 1. Deduplication Logic
Hotels matched by normalized name (`trim().toLowerCase()`).

**Selection priority:**
1. Lower price wins
2. Equal price → higher commission wins (more revenue)
3. Equal both → Supplier A wins

### 2. Price Filtering in Redis
Uses `ZRANGEBYSCORE` - filtering happens inside Redis, not in application code.

```
Key: hotels:{city}
Score: price
Member: JSON hotel object
```

### 3. Graceful Degradation
System remains useful when parts fail:

| Scenario | Behavior |
|----------|----------|
| Both suppliers OK | `dataFreshness: "live"` |
| One supplier down | `dataFreshness: "partial"` + data from working supplier |
| Both down + cache exists | `dataFreshness: "stale"` + cached data |
| Both down + no cache | `503 SERVICE_UNAVAILABLE` |

### 4. Simulation Controls
Test failure scenarios at runtime without restart:

```bash
# Simulate Supplier A down
curl -X POST http://localhost:3000/simulation/suppliers/A/fail \
  -H "Content-Type: application/json" -d '{"mode": "down"}'

# Test - should return partial results from B
curl "http://localhost:3000/api/hotels?city=delhi"

# Reset
curl -X POST http://localhost:3000/simulation/reset
```

**Modes:** `down`, `timeout`, `slow`, `invalid`

---

## Response Format

```json
{
  "hotels": [
    {
      "hotelId": "b1",
      "name": "Holtin",
      "price": 5340,
      "city": "delhi",
      "commissionPct": 20,
      "supplier": "B"
    }
  ],
  "meta": {
    "sources": { "supplierA": "success", "supplierB": "success" },
    "fromCache": false,
    "dataFreshness": "live"
  }
}
```

---

## Testing

### Unit Tests
```bash
npm test
```

### Manual Testing

**Option 1: Swagger UI** → http://localhost:3000/api-docs (interactive, recommended)

**Option 2: curl**
```bash
curl "http://localhost:3000/api/hotels?city=delhi"
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
curl "http://localhost:3000/health"
```

**Option 3: Postman** → Import `postman/collection.json`

---

## Test Data & Expected Output

### Input (Delhi)

| Hotel | Supplier A | Supplier B |
|-------|------------|------------|
| Holtin | ₹6000 (10%) | ₹5340 (20%) |
| Radison | ₹5900 (13%) | ₹6200 (15%) |
| City Inn | ₹3500 (12%) | - |
| Equal Stay | ₹4500 (9%) | ₹4500 (18%) |
| Grand Stay | - | ₹7200 (15%) |

### Expected Output (sorted by price)

| Hotel | Price | Supplier | Reason |
|-------|-------|----------|--------|
| City Inn | 3500 | A | Only in A |
| Equal Stay | 4500 | B | Same price, B has higher commission |
| Holtin | 5340 | B | B is cheaper |
| Radison | 5900 | A | A is cheaper |
| Grand Stay | 7200 | B | Only in B |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + Worker (development) |
| `npm start` | Start API + Worker (production) |
| `npm test` | Run unit tests |
| `npm run build` | Compile TypeScript |
| `npm run typecheck` | Type check |

---

## Project Structure

```
src/
├── index.ts              # Entry point
├── app.ts                # Express setup
├── config.ts             # Environment config
├── routes/               # API endpoints
├── temporal/
│   ├── workflows.ts      # Workflow definitions
│   ├── activities/       # I/O operations
│   ├── worker.ts         # Temporal worker
│   └── client.ts         # Temporal client
├── services/
│   ├── redis.ts          # Redis operations
│   └── simulation.ts     # Simulation state
├── domain/
│   ├── types.ts          # TypeScript interfaces
│   ├── dedupe.ts         # Deduplication logic
│   └── normalize.ts      # String normalization
├── validation/           # Zod schemas
└── data/                 # Mock supplier data
```

---

## Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid query parameters |
| 502 | SUPPLIER_UNAVAILABLE | Supplier fetch failed |
| 503 | SERVICE_UNAVAILABLE | All suppliers down, no cache |
| 504 | WORKFLOW_TIMEOUT | Temporal workflow timed out |
| 500 | INTERNAL_ERROR | Unexpected error |
