import { describe, expect, test } from 'bun:test'
import type { NaiveRagService, Retriever } from '@sysqlow/retrieval'
import { createApp } from '../src/app'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
const authHeaders = {
	authorization: 'Bearer test-key',
	'content-type': 'application/json'
}

const candidate = {
	chunkId: '49251a99-717d-445e-8e93-2c61a80db28e',
	sourceId: '6e776d84-7774-4b5b-aa08-29372ee39144',
	title: 'Context packs',
	content: 'Context packs compile evidence before answering.',
	score: 0.9,
	scoreBreakdown: {
		semanticScore: 0.8,
		keywordScore: 1,
		metadataScore: 0,
		recencyScore: 0,
		sourcePriorityScore: 0
	},
	metadata: {
		path: 'docs/context.md'
	}
}

describe('retrieval routes', () => {
	test('retrieves scoped candidates through authenticated API', async () => {
		const calls: Array<unknown> = []
		const retriever: Retriever = {
			async retrieve(input) {
				calls.push(input)

				return [candidate]
			}
		}
		const app = createApp({
			apiKey: 'test-key',
			retriever
		})

		const response = await app.request('/v1/retrieve', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				query: 'context packs',
				topK: 3
			})
		})

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			candidates: [candidate]
		})
		expect(calls).toEqual([{
			workspaceId,
			projectId,
			query: 'context packs',
			topK: 3
		}])
	})

	test('asks naive-rag through authenticated API and audits the call', async () => {
		const events: Array<unknown> = []
		const naiveRagService: NaiveRagService = {
			async ask(input) {
				return {
					query: input.query,
					mode: input.mode,
					answer: 'Use the retrieved evidence.',
					candidates: [candidate]
				}
			}
		}
		const app = createApp({
			apiKey: 'test-key',
			naiveRagService,
			auditLogger: {
				async record(event) {
					events.push(event)
				}
			}
		})

		const response = await app.request('/v1/ask', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				query: 'what should I do?',
				mode: 'naive-rag',
				topK: 2
			})
		})

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			query: 'what should I do?',
			mode: 'naive-rag',
			answer: 'Use the retrieved evidence.',
			candidates: [candidate]
		})
		expect(events).toEqual([expect.objectContaining({
			action: 'POST /v1/ask',
			status: 200
		})])
	})

	test('rejects unsupported ask modes', async () => {
		const app = createApp({
			apiKey: 'test-key'
		})

		const response = await app.request('/v1/ask', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				query: 'what should I do?',
				mode: 'no-rag'
			})
		})

		expect(response.status).toBe(400)
	})
})
