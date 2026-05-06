import type { RetrievalCandidate } from '@sysqlow/shared'
import postgres from 'postgres'

export const pgVectorDimensions = 1536

type SqlExecutor = {
	unsafe(
		query: string,
		parameters?: Array<unknown>
	): Promise<Array<Record<string, unknown>>>
}

export type PgVectorSearchRepositoryOptions = {
	sql: SqlExecutor
	provider: string
	model: string
	dimensions: number
}

export function createPostgresSql(databaseUrl: string): SqlExecutor {
	return postgres(databaseUrl) as unknown as SqlExecutor
}

export type UpsertEmbeddingInput = {
	workspaceId: string
	projectId: string
	chunkId: string
	vector: Array<number>
	metadata?: Record<string, unknown>
}

export type PgVectorSearchInput = {
	workspaceId: string
	projectId: string
	vector: Array<number>
	topK: number
}

export function createPgVectorSearchRepository(options: PgVectorSearchRepositoryOptions) {
	assertConfiguredDimensions(options.dimensions)

	return {
		async upsertEmbedding(input: UpsertEmbeddingInput) {
			assertDimensions(input.vector, options.dimensions)

			await options.sql.unsafe(`
				INSERT INTO embeddings (
					workspace_id,
					project_id,
					chunk_id,
					provider,
					model,
					dimensions,
					vector,
					metadata
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8::jsonb)
				ON CONFLICT (workspace_id, project_id, chunk_id, provider, model)
				DO UPDATE SET
					vector = EXCLUDED.vector,
					dimensions = EXCLUDED.dimensions,
					metadata = EXCLUDED.metadata,
					updated_at = now()
				WHERE embeddings.workspace_id = EXCLUDED.workspace_id
					AND embeddings.project_id = EXCLUDED.project_id
			`, [
				input.workspaceId,
				input.projectId,
				input.chunkId,
				options.provider,
				options.model,
				options.dimensions,
				toVectorLiteral(input.vector),
				JSON.stringify(input.metadata ?? {})
			])
		},

		async searchByVector(input: PgVectorSearchInput): Promise<Array<RetrievalCandidate>> {
			assertDimensions(input.vector, options.dimensions)

			const rows = await options.sql.unsafe(`
				SELECT
					kc.id AS chunk_id,
					kc.source_id AS source_id,
					COALESCE(ks.name, 'Knowledge chunk') AS title,
					kc.content AS content,
					GREATEST(0, LEAST(1, 1 - (e.vector <=> $6::vector))) AS score,
					kc.metadata AS metadata
				FROM embeddings e
				INNER JOIN knowledge_chunks kc
					ON kc.id = e.chunk_id
					AND kc.workspace_id = e.workspace_id
					AND kc.project_id = e.project_id
				INNER JOIN knowledge_sources ks
					ON ks.id = kc.source_id
					AND ks.workspace_id = kc.workspace_id
					AND ks.project_id = kc.project_id
				WHERE e.workspace_id = $1
					AND e.project_id = $2
					AND e.provider = $3
					AND e.model = $4
					AND e.dimensions = $5
				ORDER BY e.vector <=> $6::vector
				LIMIT $7
			`, [
				input.workspaceId,
				input.projectId,
				options.provider,
				options.model,
				options.dimensions,
				toVectorLiteral(input.vector),
				input.topK
			])

			return rows.map(toCandidate)
		},

		async searchByText(input: {
			workspaceId: string
			projectId: string
			query: string
			topK: number
		}): Promise<Array<RetrievalCandidate>> {
			const rows = await options.sql.unsafe(`
				SELECT
					kc.id AS chunk_id,
					kc.source_id AS source_id,
					COALESCE(ks.name, 'Knowledge chunk') AS title,
					kc.content AS content,
					ts_rank_cd(
						to_tsvector('simple', COALESCE(ks.name, '') || ' ' || kc.content),
						plainto_tsquery('simple', $3)
					) AS raw_score,
					kc.metadata AS metadata
				FROM knowledge_chunks kc
				INNER JOIN knowledge_sources ks
					ON ks.id = kc.source_id
					AND ks.workspace_id = kc.workspace_id
					AND ks.project_id = kc.project_id
				WHERE kc.workspace_id = $1
					AND kc.project_id = $2
					AND to_tsvector('simple', COALESCE(ks.name, '') || ' ' || kc.content)
						@@ plainto_tsquery('simple', $3)
				ORDER BY raw_score DESC
				LIMIT $4
			`, [
				input.workspaceId,
				input.projectId,
				input.query,
				input.topK
			])

			return rows.map(toTextCandidate)
		}
	}
}

function toCandidate(row: Record<string, unknown>): RetrievalCandidate {
	const score = normalizeScore(Number(row.score))

	return {
		chunkId: String(row.chunk_id),
		sourceId: String(row.source_id),
		title: String(row.title),
		content: String(row.content),
		score,
		scoreBreakdown: {
			semanticScore: score,
			keywordScore: 0,
			metadataScore: 0,
			recencyScore: 0,
			sourcePriorityScore: 0
		},
		metadata: isRecord(row.metadata) ? row.metadata : {}
	}
}

function toTextCandidate(row: Record<string, unknown>): RetrievalCandidate {
	const keywordScore = normalizeScore(Number(row.raw_score))

	return {
		chunkId: String(row.chunk_id),
		sourceId: String(row.source_id),
		title: String(row.title),
		content: String(row.content),
		score: keywordScore,
		scoreBreakdown: {
			semanticScore: 0,
			keywordScore,
			metadataScore: 0,
			recencyScore: 0,
			sourcePriorityScore: 0
		},
		metadata: isRecord(row.metadata) ? row.metadata : {}
	}
}

function assertConfiguredDimensions(dimensions: number) {
	if (dimensions !== pgVectorDimensions) {
		throw new Error(`pgvector schema supports ${pgVectorDimensions} dimensions, received ${dimensions}`)
	}
}

function assertDimensions(vector: Array<number>, dimensions: number) {
	if (vector.length !== dimensions) {
		throw new Error(`Embedding dimension mismatch: expected ${dimensions}, received ${vector.length}`)
	}
}

function toVectorLiteral(vector: Array<number>) {
	return `[${vector.join(',')}]`
}

function normalizeScore(score: number) {
	if (!Number.isFinite(score)) {
		return 0
	}

	return Math.max(0, Math.min(1, score))
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
