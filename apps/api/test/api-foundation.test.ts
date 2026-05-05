import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { createApp } from '../src/app'

describe('API foundation', () => {
	test('requires API key auth for v1 routes', async () => {
		const app = createApp({
			apiKey: 'test-key'
		})

		const missingResponse = await app.request('/v1/health')
		const invalidResponse = await app.request('/v1/health', {
			headers: {
				authorization: 'Bearer wrong-key'
			}
		})

		expect(missingResponse.status).toBe(401)
		expect(await missingResponse.json()).toEqual({
			error: {
				code: 'UNAUTHORIZED',
				message: 'Missing or invalid API key'
			}
		})
		expect(invalidResponse.status).toBe(401)
	})

	test('accepts valid API keys for v1 routes', async () => {
		const app = createApp({
			apiKey: 'test-key'
		})

		const response = await app.request('/v1/health', {
			headers: {
				authorization: 'Bearer test-key'
			}
		})

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			status: 'ok'
		})
	})

	test('fails closed when no API key is configured', async () => {
		const app = createApp()

		const response = await app.request('/v1/health', {
			headers: {
				authorization: 'Bearer change-me'
			}
		})

		expect(response.status).toBe(500)
		expect(await response.json()).toEqual({
			error: {
				code: 'CONFIGURATION_ERROR',
				message: 'API key is not configured'
			}
		})
	})

	test('accepts x-api-key header for local clients', async () => {
		const app = createApp({
			apiKey: 'test-key'
		})

		const response = await app.request('/v1/health', {
			headers: {
				'x-api-key': 'test-key'
			}
		})

		expect(response.status).toBe(200)
	})

	test('returns consistent validation errors', async () => {
		const app = createApp({
			apiKey: 'test-key',
			registerV1Routes(router) {
				router.post('/echo', async (context) => {
					const input = await context.req.validatedJson(z.object({
						name: z.string().min(1)
					}))

					return context.json(input)
				})
			}
		})

		const response = await app.request('/v1/echo', {
			method: 'POST',
			headers: {
				authorization: 'Bearer test-key',
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				name: ''
			})
		})

		expect(response.status).toBe(400)
		const body = await response.json()

		expect(body).toEqual({
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid request body',
				details: expect.any(Array)
			}
		})
		expect(body.error.details).toEqual([
			expect.objectContaining({
				path: ['name']
			})
		])
	})

	test('returns consistent not found errors', async () => {
		const app = createApp({
			apiKey: 'test-key'
		})

		const response = await app.request('/v1/missing', {
			headers: {
				authorization: 'Bearer test-key'
			}
		})

		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({
			error: {
				code: 'NOT_FOUND',
				message: 'Route not found'
			}
		})
	})

	test('records audit events for v1 write routes', async () => {
		const events: Array<unknown> = []
		const app = createApp({
			apiKey: 'test-key',
			auditLogger: {
				async record(event) {
					events.push(event)
				}
			},
			registerV1Routes(router) {
				router.post('/echo', (context) => {
					return context.json({
						status: 'created'
					}, 201)
				})
			}
		})

		const response = await app.request('/v1/echo', {
			method: 'POST',
			headers: {
				authorization: 'Bearer test-key'
			}
		})

		expect(response.status).toBe(201)
		expect(events).toEqual([{
			action: 'POST /v1/echo',
			method: 'POST',
			path: '/v1/echo',
			status: 201
		}])
	})

	test('records audit events for failed authenticated write routes', async () => {
		const events: Array<unknown> = []
		const app = createApp({
			apiKey: 'test-key',
			auditLogger: {
				async record(event) {
					events.push(event)
				}
			},
			registerV1Routes(router) {
				router.post('/echo', async (context) => {
					await context.req.validatedJson(z.object({
						name: z.string().min(1)
					}))

					return context.json({
						status: 'created'
					}, 201)
				})
			}
		})

		const response = await app.request('/v1/echo', {
			method: 'POST',
			headers: {
				authorization: 'Bearer test-key',
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				name: ''
			})
		})

		expect(response.status).toBe(400)
		expect(events).toEqual([{
			action: 'POST /v1/echo',
			method: 'POST',
			path: '/v1/echo',
			status: 400
		}])
	})
})
