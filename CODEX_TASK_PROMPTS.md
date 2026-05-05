# SysQlow Codex Task Prompts

Use these prompts as separate Codex tasks. Do not run them all at once.

## T00 — Monorepo Foundation

```md
You are implementing SysQlow.

Read AGENTS.md first.

Task:
Create the initial monorepo foundation for SysQlow.

Requirements:
- Bun workspace
- TypeScript config
- apps/api
- apps/worker
- apps/cli
- apps/mcp-server
- apps/web
- apps/vscode-extension
- packages/shared
- packages/database
- packages/ingestion
- packages/retrieval
- packages/memory
- packages/context-compiler
- packages/model-adapters
- packages/evals
- packages/security
- packages/config
- docker-compose.yml with Postgres + pgvector and Ollama
- .env.example
- README.md with setup commands
- minimal health route in apps/api
- package scripts:
  - dev:api
  - dev:worker
  - dev:mcp
  - test
  - typecheck
  - lint placeholder if lint is not configured yet

Constraints:
- Use Bun + TypeScript
- Use tabs, single quotes, no semicolons
- Keep the initial implementation small
- No business logic yet
- Add minimal tests only if useful
- Do not add unnecessary dependencies

Done when:
- bun install works
- docker compose config is valid
- API health route can run
- README explains how to start local dev
```

## T01 — Shared Domain Types

```md
Task:
Implement packages/shared with domain types and Zod schemas.

Read AGENTS.md first.

Create types and schemas for:
- Workspace
- Project
- KnowledgeSource
- KnowledgeChunk
- MemoryRecord
- DecisionMemory
- QueryIntent
- RetrievalCandidate
- ContextPack
- ModelContextProfile
- EvaluationCase
- EvaluationRun

Requirements:
- Export all types from packages/shared/src/index.ts
- Add Zod validation schemas
- Add bun tests for valid and invalid objects
- Keep this package framework-independent
- No database, API, or model adapter imports
```

## T02 — Database Schema

```md
Task:
Implement database schema and migrations.

Read AGENTS.md first.

Use Drizzle ORM with PostgreSQL.

Create tables:
- workspaces
- projects
- knowledge_sources
- knowledge_chunks
- memory_records
- decision_memories
- embeddings
- context_packs
- evaluation_cases
- evaluation_runs
- audit_logs
- api_keys

Requirements:
- Use UUID primary keys
- Include workspaceId and projectId where relevant
- Include createdAt and updatedAt
- Add indexes for workspace/project/source lookups
- Add vector column for embeddings using pgvector
- Add schema exports
- Add migration setup
- Add README notes for running migrations
```

## T03 — API Foundation

```md
Task:
Create the Bun + Hono API server foundation.

Requirements:
- GET /health
- API key auth middleware for /v1 routes
- Zod request validation helper
- consistent error response format
- audit logging interface
- clean route/service separation

Do not implement full business logic yet.
Add tests for auth middleware and health route if practical.
```

## T04 — Memory + Decision APIs

```md
Task:
Implement manual memory and decision memory.

Features:
- create memory record
- list memory records
- search memory records with simple text search first
- deprecate memory record
- create decision memory
- list decision memories
- search decision memories
- deprecate decision memory

Add CLI commands:
- sysqlow memory add
- sysqlow memory list
- sysqlow decision add
- sysqlow decision list

Add tests.
```

## T05 — Markdown Ingestion

```md
Task:
Implement Markdown ingestion.

Input:
- projectId
- path to file or directory

Behavior:
- scan .md and .mdx files
- ignore node_modules, dist, build, coverage, .git, .env*, private key files
- chunk by headings
- preserve heading path
- compute content hash
- upsert KnowledgeSource
- upsert KnowledgeChunk
- avoid duplicate chunks
- include metadata: filePath, headingPath, line range if possible

Add CLI:
- sysqlow ingest ./docs

Add tests for chunking and ignore rules.
```

## T06 — Embeddings + Vector Search

```md
Task:
Implement embedding provider abstraction and pgvector search.

Create interfaces:
- EmbeddingProvider
- VectorSearchRepository
- TextSearchRepository
- Retriever

Implement:
- OllamaEmbeddingProvider or OpenAI-compatible EmbeddingProvider behind config
- pgvector embedding storage
- vector search topK
- simple keyword search
- naive RAG retrieval mode

Add CLI:
- sysqlow retrieve "query"
- sysqlow ask --mode naive-rag "query"

Add tests with mocked embedding provider.
```

## T07 — Intent Classifier

```md
Task:
Implement a simple rule-based QueryIntentClassifier.

Classify:
- before_acting
- decision_lookup
- implementation_plan
- risk_discovery
- debugging
- onboarding
- code_convention
- conflict_detection
- explain
- search

Use deterministic keyword rules first.
Add tests for classification.
Do not call an LLM for intent classification yet.
```

## T08 — Hybrid Retriever + Reranker

```md
Task:
Implement HybridRetriever and rule-based Reranker v0.

Hybrid retrieval should combine:
- vector score
- keyword score
- metadata score
- recency score
- source priority score

Reranker rules:
- boost exact file/module/symbol matches
- boost active decisions
- boost same project
- boost recent active memories
- penalize deprecated/replaced memory
- penalize stale records where validUntil has passed

Return RetrievalCandidate objects with score breakdown.
Add tests for scoring behavior.
```

## T09 — Context Pack Compiler

```md
Task:
Implement ContextPackCompiler.

Input:
- workspaceId
- projectId
- query
- intent
- retrieval candidates
- model context profile
- token budget

Output:
- ContextPack

Behavior:
- group evidence into facts, decisions, constraints, risks, source excerpts
- include suggested answer structure based on intent
- prioritize high-score sources
- keep under token budget
- keep source references
- do not include deprecated memory unless query asks for historical/deprecated context
- include insufficient_context warning if retrieval quality is weak

Add tests for:
- before_acting pack
- decision_lookup pack
- risk_discovery pack
- token budget trimming
- deprecated memory filtering
```

## T10 — Model Adapter + Ask Flow

```md
Task:
Implement ModelAdapter abstraction and Ollama-compatible adapter.

Create:
- ModelAdapter
- OllamaModelAdapter
- PromptRenderer for ContextPack

Add:
- POST /v1/ask
- CLI sysqlow ask

Modes:
- no-rag
- naive-rag
- context-pack

The context-pack mode must render structured context, then ask the model to answer only using the provided context.
Add tests with mocked ModelAdapter.
```

## T11 — Eval Harness

```md
Task:
Implement the SysQlow eval harness.

Features:
- load evaluation cases from JSON
- run modes:
  - no-rag
  - naive-rag
  - context-pack
- store outputs
- score expected answer points
- detect forbidden claims
- measure context token length
- generate markdown report

Add CLI:
- sysqlow eval run
- sysqlow eval report

Use deterministic string/semantic-light scoring first.
Do not require an LLM judge yet.
```

## T12 — MCP Server

```md
Task:
Implement the SysQlow MCP server.

Tools:
- get_context_pack
- ask_project_memory
- before_editing_file
- search_project_memory
- save_memory
- save_decision
- find_related_decisions
- find_risks_for_change

The MCP server should call the SysQlow API/service layer.
Do not duplicate context-engine logic inside the MCP layer.
Add docs for using the MCP server with compatible clients.
```

## T13 — VS Code Extension Skeleton

```md
Task:
Create a VS Code extension as a thin SysQlow client.

Features:
- configure SysQlow server URL
- configure API key
- command: SysQlow: Ask Project Memory
- command: SysQlow: Before Editing This File
- command: SysQlow: Open Context Pack
- command: SysQlow: Save Selection As Memory
- command: SysQlow: Save Selection As Decision

The extension should:
- capture workspace path
- capture active file path
- capture selected text
- optionally capture git diff
- call SysQlow API
- render result in a WebView/sidebar

Do not implement RAG, embeddings, or storage inside the extension.
```
