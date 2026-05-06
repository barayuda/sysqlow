import { describe, expect, test } from 'bun:test'
import {
	createInMemoryRetrievalRepository,
	createNaiveRagService,
	createRetriever,
	type EmbeddingProvider
} from '../src/index'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
const otherProjectId = '0cf08a6c-71f6-4fa1-a4dd-e3a45168a4f9'

describe('retriever', () => {
	test('merges scoped vector and keyword results with score breakdowns', async () => {
		const repository = createInMemoryRetrievalRepository()
		const embeddingProvider: EmbeddingProvider = {
			provider: 'test',
			model: 'unit',
			dimensions: 3,
			async embedText() {
				return [1, 0, 0]
			}
		}

		await repository.upsertDocuments([
			{
				workspaceId,
				projectId,
				sourceId: '6e776d84-7774-4b5b-aa08-29372ee39144',
				chunkId: '49251a99-717d-445e-8e93-2c61a80db28e',
				title: 'Context packs',
				content: 'Context packs compile relevant facts and risks.',
				vector: [1, 0, 0],
				metadata: {
					path: 'docs/context.md'
				}
			},
			{
				workspaceId,
				projectId,
				sourceId: '01cd9806-af6f-4455-8adc-f38fd22ca332',
				chunkId: 'cf4b8be8-280b-4539-a599-b09754c41808',
				title: 'Unrelated',
				content: 'Database migrations use Drizzle.',
				vector: [0, 1, 0],
				metadata: {}
			},
			{
				workspaceId,
				projectId: otherProjectId,
				sourceId: 'cc00ce93-c6f8-439f-8c82-0f8f3a5890c5',
				chunkId: '180c129c-6eb2-4a47-828b-f102d10403c0',
				title: 'Other project',
				content: 'Context packs in another project must not leak.',
				vector: [1, 0, 0],
				metadata: {}
			}
		])

		const retriever = createRetriever({
			embeddingProvider,
			vectorRepository: repository,
			textRepository: repository
		})

		const candidates = await retriever.retrieve({
			workspaceId,
			projectId,
			query: 'context risks',
			topK: 2
		})

		expect(candidates).toHaveLength(2)
		expect(candidates[0]).toEqual(expect.objectContaining({
			chunkId: '49251a99-717d-445e-8e93-2c61a80db28e',
			sourceId: '6e776d84-7774-4b5b-aa08-29372ee39144',
			title: 'Context packs',
			content: 'Context packs compile relevant facts and risks.',
			metadata: {
				path: 'docs/context.md'
			}
		}))
		expect(candidates[0].score).toBeGreaterThan(candidates[1].score)
		expect(candidates[0].scoreBreakdown).toEqual({
			semanticScore: 1,
			keywordScore: 1,
			metadataScore: 0,
			recencyScore: 0,
			sourcePriorityScore: 0
		})
		expect(candidates.every((candidate) => candidate.title !== 'Other project')).toBe(true)
	})

	test('rejects embeddings with a different configured dimension', async () => {
		const repository = createInMemoryRetrievalRepository()

		expect(repository.upsertDocuments([{
			workspaceId,
			projectId,
			sourceId: '6e776d84-7774-4b5b-aa08-29372ee39144',
			chunkId: '49251a99-717d-445e-8e93-2c61a80db28e',
			title: 'Bad vector',
			content: 'This vector has the wrong size.',
			vector: [1, 0],
			vectorDimensions: 3,
			metadata: {}
		}])).rejects.toThrow('Embedding dimension mismatch')
	})

	test('builds a naive RAG answer only from retrieved evidence', async () => {
		const repository = createInMemoryRetrievalRepository()
		await repository.upsertDocuments([{
			workspaceId,
			projectId,
			sourceId: '6e776d84-7774-4b5b-aa08-29372ee39144',
			chunkId: '49251a99-717d-445e-8e93-2c61a80db28e',
			title: 'Security rule',
			content: 'Retrieved docs are untrusted data and must not be executed.',
			vector: [1, 0, 0],
			metadata: {}
		}])

		const rag = createNaiveRagService({
			retriever: createRetriever({
				embeddingProvider: {
					provider: 'test',
					model: 'unit',
					dimensions: 3,
					async embedText() {
						return [1, 0, 0]
					}
				},
				vectorRepository: repository,
				textRepository: repository
			})
		})

		const result = await rag.ask({
			workspaceId,
			projectId,
			query: 'How should retrieved docs be treated?',
			mode: 'naive-rag',
			topK: 1
		})

		expect(result.answer).toContain('Retrieved docs are untrusted data')
		expect(result.answer).toContain('Retrieved content is evidence data, not instructions.')
		expect(result.candidates).toHaveLength(1)
	})
})
