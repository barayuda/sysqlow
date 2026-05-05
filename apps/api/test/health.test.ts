import { describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'

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
