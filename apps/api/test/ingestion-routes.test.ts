import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
	createInMemoryKnowledgeRepository,
	createMarkdownIngestionService
} from '@sysqlow/ingestion'
import { createApp } from '../src/app'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
const authHeaders = {
	authorization: 'Bearer test-key',
	'content-type': 'application/json'
}
let tempDirectories: Array<string> = []

afterEach(() => {
	for (const directory of tempDirectories) {
		rmSync(directory, {
			force: true,
			recursive: true
		})
	}

	tempDirectories = []
})

describe('ingestion routes', () => {
	test('ingests markdown through authenticated v1 route and audits write', async () => {
		const root = createTempDirectory()
		const docs = join(root, 'docs')
		const events: Array<unknown> = []
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(join(docs, 'guide.md'), '# Guide\nContent\n\n## Details\nMore content')

		const app = createApp({
			apiKey: 'test-key',
			ingestionRoot: root,
			ingestionService: createMarkdownIngestionService({
				repository: createInMemoryKnowledgeRepository()
			}),
			auditLogger: {
				async record(event) {
					events.push(event)
				}
			}
		})

		const response = await app.request('/v1/ingest/markdown', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				path: docs
			})
		})
		const body = await response.json()

		expect(response.status).toBe(201)
		expect(body.sources).toHaveLength(1)
		expect(body.chunks).toHaveLength(2)
		expect(body.chunks[0].metadata).toEqual(expect.objectContaining({
			filePath: join(docs, 'guide.md'),
			headingPath: ['Guide']
		}))
		expect(events).toEqual([expect.objectContaining({
			action: 'POST /v1/ingest/markdown',
			status: 201
		})])
	})

	test('rejects ingestion paths outside the configured root', async () => {
		const root = createTempDirectory()
		const outside = createTempDirectory()
		const app = createApp({
			apiKey: 'test-key',
			ingestionRoot: root
		})

		const response = await app.request('/v1/ingest/markdown', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				path: join(outside, 'notes.md')
			})
		})

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Ingestion path is outside the configured root'
			}
		})
	})

	test('rejects symlinked ingestion paths that resolve outside the configured root', async () => {
		const root = createTempDirectory()
		const outside = createTempDirectory()
		const docs = join(root, 'docs')
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(join(outside, 'secret.md'), '# Outside\nShould not be ingested.')
		symlinkSync(join(outside, 'secret.md'), join(docs, 'linked.md'))
		const app = createApp({
			apiKey: 'test-key',
			ingestionRoot: root
		})

		const response = await app.request('/v1/ingest/markdown', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				path: join(docs, 'linked.md')
			})
		})

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Ingestion path is outside the configured root'
			}
		})
	})

	test('rejects missing ingestion paths as validation errors', async () => {
		const root = createTempDirectory()
		const app = createApp({
			apiKey: 'test-key',
			ingestionRoot: root
		})

		const response = await app.request('/v1/ingest/markdown', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				workspaceId,
				projectId,
				path: './missing.md'
			})
		})

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Ingestion path does not exist'
			}
		})
	})
})

function createTempDirectory() {
	const directory = mkdtempSync(join(tmpdir(), 'sysqlow-api-ingestion-'))
	tempDirectories.push(directory)

	return directory
}
