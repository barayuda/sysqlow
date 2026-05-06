import { describe, expect, test } from 'bun:test'
import {
	createPgVectorSearchRepository,
	pgVectorDimensions
} from '../src/retrieval'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
const chunkId = '49251a99-717d-445e-8e93-2c61a80db28e'

describe('pgvector retrieval repository', () => {
	test('upserts scoped chunk embeddings with provider and model identity', async () => {
		const calls: Array<{
			query: string
			parameters?: Array<unknown>
		}> = []
		const repository = createPgVectorSearchRepository({
			sql: {
				async unsafe(query, parameters) {
					calls.push({
						query,
						parameters
					})

					return []
				}
			},
			provider: 'ollama',
			model: 'nomic-embed-text',
			dimensions: pgVectorDimensions
		})
		const vector = createVector()

		await repository.upsertEmbedding({
			workspaceId,
			projectId,
			chunkId,
			vector,
			metadata: {
				source: 'test'
			}
		})

		expect(calls[0].query).toContain('INSERT INTO embeddings')
		expect(calls[0].query).toContain('ON CONFLICT (workspace_id, project_id, chunk_id, provider, model)')
		expect(calls[0].query).toContain('WHERE embeddings.workspace_id = EXCLUDED.workspace_id')
		expect(calls[0].parameters).toEqual([
			workspaceId,
			projectId,
			chunkId,
			'ollama',
			'nomic-embed-text',
			pgVectorDimensions,
			toVectorLiteral(vector),
			JSON.stringify({
				source: 'test'
			})
		])
	})

	test('searches scoped vectors and maps rows to retrieval candidates', async () => {
		const calls: Array<{
			query: string
			parameters?: Array<unknown>
		}> = []
		const repository = createPgVectorSearchRepository({
			sql: {
				async unsafe(query, parameters) {
					calls.push({
						query,
						parameters
					})

					return [{
						chunk_id: chunkId,
						source_id: '6e776d84-7774-4b5b-aa08-29372ee39144',
						title: 'Context packs',
						content: 'Context packs compile evidence.',
						score: 0.87,
						metadata: {
							path: 'docs/context.md'
						}
					}]
				}
			},
			provider: 'ollama',
			model: 'nomic-embed-text',
			dimensions: pgVectorDimensions
		})
		const vector = createVector()

		const candidates = await repository.searchByVector({
			workspaceId,
			projectId,
			vector,
			topK: 5
		})

		expect(calls[0].query).toContain('WHERE e.workspace_id = $1')
		expect(calls[0].query).toContain('AND e.project_id = $2')
		expect(calls[0].query).toContain('AND e.provider = $3')
		expect(calls[0].query).toContain('ORDER BY e.vector <=> $6::vector')
		expect(calls[0].parameters).toEqual([
			workspaceId,
			projectId,
			'ollama',
			'nomic-embed-text',
			pgVectorDimensions,
			toVectorLiteral(vector),
			5
		])
		expect(candidates).toEqual([{
			chunkId,
			sourceId: '6e776d84-7774-4b5b-aa08-29372ee39144',
			title: 'Context packs',
			content: 'Context packs compile evidence.',
			score: 0.87,
			scoreBreakdown: {
				semanticScore: 0.87,
				keywordScore: 0,
				metadataScore: 0,
				recencyScore: 0,
				sourcePriorityScore: 0
			},
			metadata: {
				path: 'docs/context.md'
			}
		}])
	})

	test('searches scoped keyword matches from database chunks', async () => {
		const calls: Array<{
			query: string
			parameters?: Array<unknown>
		}> = []
		const repository = createPgVectorSearchRepository({
			sql: {
				async unsafe(query, parameters) {
					calls.push({
						query,
						parameters
					})

					return [{
						chunk_id: chunkId,
						source_id: '6e776d84-7774-4b5b-aa08-29372ee39144',
						title: 'Context packs',
						content: 'Context packs compile evidence.',
						raw_score: 0.42,
						metadata: {}
					}]
				}
			},
			provider: 'ollama',
			model: 'nomic-embed-text',
			dimensions: pgVectorDimensions
		})

		const candidates = await repository.searchByText({
			workspaceId,
			projectId,
			query: 'context evidence',
			topK: 3
		})

		expect(calls[0].query).toContain('WHERE kc.workspace_id = $1')
		expect(calls[0].query).toContain('AND kc.project_id = $2')
		expect(calls[0].parameters).toEqual([
			workspaceId,
			projectId,
			'context evidence',
			3
		])
		expect(candidates[0].scoreBreakdown.keywordScore).toBe(0.42)
		expect(candidates[0].scoreBreakdown.semanticScore).toBe(0)
	})

	test('rejects vectors that do not match configured dimensions', async () => {
		const repository = createPgVectorSearchRepository({
			sql: {
				async unsafe() {
					return []
				}
			},
			provider: 'ollama',
			model: 'nomic-embed-text',
			dimensions: pgVectorDimensions
		})

		expect(repository.searchByVector({
			workspaceId,
			projectId,
			vector: [0.1, 0.2],
			topK: 5
		})).rejects.toThrow('Embedding dimension mismatch')
	})

	test('rejects unsupported pgvector schema dimensions at construction', () => {
		expect(() => createPgVectorSearchRepository({
			sql: {
				async unsafe() {
					return []
				}
			},
			provider: 'ollama',
			model: 'nomic-embed-text',
			dimensions: 768
		})).toThrow('pgvector schema supports 1536 dimensions')
	})
})

function createVector() {
	return Array.from({
		length: pgVectorDimensions
	}, (_, index) => index === 0 ? 0.1 : 0)
}

function toVectorLiteral(vector: Array<number>) {
	return `[${vector.join(',')}]`
}
