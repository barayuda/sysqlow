# SysQlow

SysQlow is a self-hosted portable context engine for small LLMs.

## Current Status

This repository currently provides the bootstrap monorepo foundation:

- Bun workspace wiring
- `apps/api` with `GET /health`
- `packages/shared` domain types and Zod validation schemas
- `packages/database` Drizzle schema and initial PostgreSQL/pgvector migration
- `packages/memory` service for manual memory and decision records
- authenticated `/v1/memory` and `/v1/decisions` API routes
- `apps/cli` command request builder for memory and decision commands
- placeholder apps and packages matching the planned repository structure
- Docker Compose services for PostgreSQL with pgvector and Ollama

The deeper product architecture is still document-driven at this stage. The scaffold intentionally avoids premature business logic and keeps non-core apps and packages as placeholders.

## Repository Layout

```txt
apps/
  api/
  worker/
  cli/
  mcp-server/
  web/
  vscode-extension/

packages/
  shared/
  config/
  context-engine/
  database/
  ingestion/
  retrieval/
  memory/
  context-compiler/
  model-adapters/
  evals/
  security/
```

## Prerequisites

- Bun
- Docker with Compose support

## Install Dependencies

```bash
bun install
```

## Run The API

```bash
bun run dev:api
```

Health check:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

Versioned API routes under `/v1/*` require `API_KEY` to be configured. Local clients can send either header:

```bash
API_KEY=change-me bun run dev:api
curl -H 'Authorization: Bearer change-me' http://localhost:3000/v1/health
curl -H 'x-api-key: change-me' http://localhost:3000/v1/health
```

API errors use this response shape:

```json
{
	"error": {
		"code": "UNAUTHORIZED",
		"message": "Missing or invalid API key"
	}
}
```

## Validate The Bootstrap

```bash
bun test
bun run typecheck
docker compose config
```

## Database Migrations

The Drizzle schema lives in `packages/database/src/schema.ts`.

Generate migrations after schema changes:

```bash
bun run db:generate
```

Apply migrations to the configured database:

```bash
bun run db:migrate
```

The local database URL defaults to the value in `.env.example`:

```bash
DATABASE_URL=postgres://sysqlow:sysqlow@localhost:5432/sysqlow
```

## Environment

Copy values from `.env.example` into your local environment as needed for development.

## Memory And Decision API

Create a manual memory:

```bash
curl -X POST http://localhost:3000/v1/memory \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{
    "workspaceId": "0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0",
    "projectId": "51a8949c-8ab2-4577-91cc-4f70fc77aace",
    "type": "fact",
    "title": "Context pack output",
    "content": "Never send raw chunks as final output."
  }'
```

List or search memories:

```bash
curl -H 'Authorization: Bearer change-me' \
  'http://localhost:3000/v1/memory?workspaceId=0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0&projectId=51a8949c-8ab2-4577-91cc-4f70fc77aace&q=context'
```

Create a decision:

```bash
curl -X POST http://localhost:3000/v1/decisions \
  -H 'Authorization: Bearer change-me' \
  -H 'content-type: application/json' \
  -d '{
    "workspaceId": "0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0",
    "projectId": "51a8949c-8ab2-4577-91cc-4f70fc77aace",
    "title": "Use MCP-first architecture",
    "decision": "Expose project context through MCP tools.",
    "reason": "Multiple clients can consume the same context engine."
  }'
```

Deprecation endpoints update status without deleting records:

```bash
PATCH /v1/memory/:memoryId/deprecate
PATCH /v1/decisions/:decisionId/deprecate
```

## CLI

The CLI currently builds API requests and sends them to `SYSQLOW_API_URL`.

```bash
SYSQLOW_API_KEY=change-me bun run --cwd apps/cli dev -- memory add "Never send raw chunks." \
  --workspace-id 0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0 \
  --project-id 51a8949c-8ab2-4577-91cc-4f70fc77aace \
  --title "Context pack output" \
  --type fact

SYSQLOW_API_KEY=change-me bun run --cwd apps/cli dev -- memory list \
  --workspace-id 0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0 \
  --project-id 51a8949c-8ab2-4577-91cc-4f70fc77aace \
  --query context

SYSQLOW_API_KEY=change-me bun run --cwd apps/cli dev -- decision add \
  --workspace-id 0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0 \
  --project-id 51a8949c-8ab2-4577-91cc-4f70fc77aace \
  --title "Use MCP-first architecture" \
  --decision "Expose project context through MCP tools." \
  --reason "Multiple clients can consume the same context engine."
```

## Notes

- The repository currently runs on the `main` branch in this workspace.
- Memory and decision records currently use an in-process repository when the API starts. A database-backed repository is a later persistence slice.
- Placeholder packages and apps are intentionally empty until their dedicated implementation tasks are started.
- The project docs in `AGENTS.md`, `CODEX_TASK_PROMPTS.md`, and `SYSQLOW_CODEX_IMPLEMENTATION_PLAN.md` still define the next slices of work.
