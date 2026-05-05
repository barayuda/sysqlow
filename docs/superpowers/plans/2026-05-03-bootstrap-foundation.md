# SysQlow Bootstrap Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a runnable SysQlow monorepo foundation with Bun workspace wiring, a minimal API health route, container bootstrap files, placeholder package boundaries, and verification commands.

**Architecture:** Keep the first slice intentionally narrow. Root configuration owns workspace/tooling, `apps/api` owns only process startup and `GET /health`, and all non-API apps/packages stay as placeholders so the repo shape matches the product plan without prematurely choosing deeper domain boundaries.

**Tech Stack:** Bun, TypeScript, Hono, Docker Compose

---

### Task 1: Root Workspace And Monorepo Skeleton

**Files:**
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/tsconfig.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/bunfig.toml`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/.gitignore`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/api/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/api/tsconfig.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/api/src/index.ts`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/api/src/app.ts`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/api/test/health.test.ts`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/worker/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/cli/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/mcp-server/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/web/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/apps/vscode-extension/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/shared/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/shared/tsconfig.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/shared/src/index.ts`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/config/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/config/tsconfig.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/config/src/index.ts`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/database/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/ingestion/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/retrieval/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/memory/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/context-compiler/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/model-adapters/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/evals/package.json`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/packages/security/package.json`

- [ ] **Step 1: Write the failing API health test**

```ts
import { describe, expect, test } from 'bun:test'
import { createApp } from "../src/app"

describe('GET /health', () => {
	test('returns ok status payload', async () => {
		const app = createApp()

		const response = await app.request('/health')

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			status: 'ok'
		})
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test apps/api/test/health.test.ts`
Expected: FAIL because `apps/api/src/app.ts` and exported `createApp()` do not exist yet

- [ ] **Step 3: Add the root workspace and placeholder package manifests**

```json
{
	"name": "sysqlow",
	"private": true,
	"workspaces": [
		"apps/*",
		"packages/*"
	],
	"scripts": {
		"dev:api": "bun run --cwd apps/api dev",
		"dev:worker": "bun run --cwd apps/worker dev",
		"dev:mcp": "bun run --cwd apps/mcp-server dev",
		"test": "bun test",
		"typecheck": "bunx tsc --noEmit",
		"lint": "echo 'lint not configured yet'"
	},
	"devDependencies": {
		"typescript": "^5.9.0"
	}
}
```

```ts
export {}
```

- [ ] **Step 4: Implement the minimal API app and runtime entrypoint**

```ts
import { Hono } from 'hono'

export function createApp() {
	const app = new Hono()

	app.get('/health', (context) => {
		return context.json({
			status: 'ok'
		})
	})

	return app
}
```

```ts
import { serve } from 'bun'
import { createApp } from './app'

const app = createApp()

serve({
	fetch: app.fetch,
	port: Number(process.env.PORT ?? '3000')
})
```

- [ ] **Step 5: Run the targeted test to verify it passes**

Run: `bun test apps/api/test/health.test.ts`
Expected: PASS with `1 pass`

- [ ] **Step 6: Run workspace typecheck**

Run: `bun run typecheck`
Expected: PASS with exit code `0`

### Task 2: Runtime Bootstrap Files

**Files:**
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/docker-compose.yml`
- Create: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/.env.example`

- [ ] **Step 1: Write the failing compose validation expectation**

Run: `docker compose config`
Expected: FAIL because `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/docker-compose.yml` does not exist yet

- [ ] **Step 2: Add the minimal container bootstrap files**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_DB: sysqlow
      POSTGRES_USER: sysqlow
      POSTGRES_PASSWORD: sysqlow
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data

  ollama:
    image: ollama/ollama:latest
    ports:
      - '11434:11434'
    volumes:
      - ollama-data:/root/.ollama

volumes:
  postgres-data:
  ollama-data:
```

```dotenv
PORT=3000
DATABASE_URL=postgres://sysqlow:sysqlow@localhost:5432/sysqlow
OLLAMA_BASE_URL=http://localhost:11434
API_KEY=change-me
```

- [ ] **Step 3: Run compose validation**

Run: `docker compose config`
Expected: PASS and rendered service configuration for `postgres` and `ollama`

### Task 3: Documentation And Verification

**Files:**
- Modify: `/Users/barayuda/Projects/personal/sysqlow-portable-context-engine/README.md`

- [ ] **Step 1: Replace the starter-kit README with repo-specific setup instructions**

```md
# SysQlow

SysQlow is a self-hosted portable context engine for small LLMs.

## Current status

This repository currently provides the bootstrap monorepo foundation:
- Bun workspace wiring
- `apps/api` with `GET /health`
- placeholder apps and packages matching the planned repo structure
- Docker Compose services for PostgreSQL with pgvector and Ollama

## Prerequisites

- Bun
- Docker

## Install

```bash
bun install
```

## Run the API

```bash
bun run dev:api
```

Health check:

```bash
curl http://localhost:3000/health
```

## Validate the stack

```bash
bun test
bun run typecheck
docker compose config
```
```

- [ ] **Step 2: Run full verification for the bootstrap slice**

Run: `bun install`
Expected: PASS and generate `bun.lock`

Run: `bun test`
Expected: PASS with the health test green

Run: `bun run typecheck`
Expected: PASS with exit code `0`

Run: `docker compose config`
Expected: PASS with rendered config output
