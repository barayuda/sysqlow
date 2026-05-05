import { describe, expect, test } from 'bun:test'
import {
	createInMemoryMemoryRepository,
	createMemoryService
} from '@sysqlow/memory'
import { createApp } from '../src/app'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
const otherProjectId = '0cf08a6c-71f6-4fa1-a4dd-e3a45168a4f9'
const authHeaders = {
	authorization: 'Bearer test-key',
	'content-type': 'application/json'
}

describe('memory routes', () => {
	test('creates, lists, searches, and deprecates memory records', async () => {
		const app = createApp({
			apiKey: 'test-key',
			memoryService: createMemoryService({
				repository: createInMemoryMemoryRepository()
			})
		})

		const createResponse = await app.request('/v1/memory', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				type: 'constraint',
				title: 'Context pack output',
				content: 'Never send raw chunks as final output.',
				confidence: 0.95
			})
		})
		const created = await createResponse.json()

		expect(createResponse.status).toBe(201)
		expect(created.status).toBe('active')

		await app.request('/v1/memory', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId: otherProjectId,
				type: 'fact',
				title: 'Other project',
				content: 'Should not appear in scoped list.'
			})
		})

		const listResponse = await app.request(`/v1/memory?workspaceId=${workspaceId}&projectId=${projectId}`, {
			headers: {
				authorization: 'Bearer test-key'
			}
		})
		const list = await listResponse.json()

		expect(list).toHaveLength(1)
		expect(list[0].id).toBe(created.id)

		const searchResponse = await app.request(`/v1/memory?workspaceId=${workspaceId}&projectId=${projectId}&q=raw%20chunks`, {
			headers: {
				authorization: 'Bearer test-key'
			}
		})
		const search = await searchResponse.json()

		expect(search).toHaveLength(1)

		const deprecateResponse = await app.request(`/v1/memory/${created.id}/deprecate`, {
			method: 'PATCH',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId
			})
		})
		const deprecated = await deprecateResponse.json()

		expect(deprecateResponse.status).toBe(200)
		expect(deprecated.status).toBe('deprecated')
	})

	test('creates, lists, searches, and deprecates decision memories', async () => {
		const app = createApp({
			apiKey: 'test-key',
			memoryService: createMemoryService({
				repository: createInMemoryMemoryRepository()
			})
		})

		const createResponse = await app.request('/v1/decisions', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				title: 'Use MCP-first architecture',
				decision: 'Expose project context through MCP tools.',
				reason: 'Multiple clients can consume the same context engine.',
				tradeoffs: ['More protocol surface area'],
				alternatives: ['API-only integration']
			})
		})
		const created = await createResponse.json()

		expect(createResponse.status).toBe(201)
		expect(created.status).toBe('active')

		const searchResponse = await app.request(`/v1/decisions?workspaceId=${workspaceId}&projectId=${projectId}&q=MCP`, {
			headers: {
				authorization: 'Bearer test-key'
			}
		})
		const search = await searchResponse.json()

		expect(search).toHaveLength(1)

		const deprecateResponse = await app.request(`/v1/decisions/${created.id}/deprecate`, {
			method: 'PATCH',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId
			})
		})
		const deprecated = await deprecateResponse.json()

		expect(deprecateResponse.status).toBe(200)
		expect(deprecated.status).toBe('deprecated')
	})

	test('audits memory and decision writes', async () => {
		const events: Array<unknown> = []
		const app = createApp({
			apiKey: 'test-key',
			memoryService: createMemoryService({
				repository: createInMemoryMemoryRepository()
			}),
			auditLogger: {
				async record(event) {
					events.push(event)
				}
			}
		})

		await app.request('/v1/memory', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				type: 'fact',
				title: 'Manual fact',
				content: 'Manual facts can be saved.'
			})
		})

		await app.request('/v1/decisions', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				title: 'Use tests',
				decision: 'Write tests for memory behavior.',
				reason: 'Prevent regressions.'
			})
		})

		expect(events).toEqual([
			expect.objectContaining({
				action: 'POST /v1/memory',
				status: 201
			}),
			expect.objectContaining({
				action: 'POST /v1/decisions',
				status: 201
			})
		])
	})

	test('returns 404 and audits missing deprecations', async () => {
		const events: Array<unknown> = []
		const app = createApp({
			apiKey: 'test-key',
			memoryService: createMemoryService({
				repository: createInMemoryMemoryRepository()
			}),
			auditLogger: {
				async record(event) {
					events.push(event)
				}
			}
		})

		const response = await app.request('/v1/memory/29b78407-6db8-4109-9c1a-a3c73357e8dd/deprecate', {
			method: 'PATCH',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId
			})
		})

		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({
			error: {
				code: 'NOT_FOUND',
				message: 'Memory record not found'
			}
		})
		expect(events).toEqual([{
			action: 'PATCH /v1/memory/29b78407-6db8-4109-9c1a-a3c73357e8dd/deprecate',
			method: 'PATCH',
			path: '/v1/memory/29b78407-6db8-4109-9c1a-a3c73357e8dd/deprecate',
			status: 404
		}])
	})
})
