import { describe, expect, test } from 'bun:test'
import { buildCliRequest } from '../src/commands'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'

describe('CLI commands', () => {
	test('builds memory add API request', () => {
		const request = buildCliRequest([
			'memory',
			'add',
			'Never send raw chunks.',
			'--workspace-id',
			workspaceId,
			'--project-id',
			projectId,
			'--title',
			'Context pack output',
			'--type',
			'constraint'
		], {
			apiUrl: 'http://localhost:3000',
			apiKey: 'test-key'
		})

		expect(request.url).toBe('http://localhost:3000/v1/memory')
		expect(request.init.method).toBe('POST')
		expect(request.init.headers).toEqual({
			authorization: 'Bearer test-key',
			'content-type': 'application/json'
		})
		expect(JSON.parse(String(request.init.body))).toEqual({
			workspaceId,
			projectId,
			type: 'constraint',
			title: 'Context pack output',
			content: 'Never send raw chunks.'
		})
	})

	test('builds scoped memory list search request', () => {
		const request = buildCliRequest([
			'memory',
			'list',
			'--workspace-id',
			workspaceId,
			'--project-id',
			projectId,
			'--query',
			'raw chunks'
		], {
			apiUrl: 'http://localhost:3000/',
			apiKey: 'test-key'
		})

		expect(request.url).toBe(`http://localhost:3000/v1/memory?workspaceId=${workspaceId}&projectId=${projectId}&q=raw+chunks`)
		expect(request.init.method).toBe('GET')
	})

	test('builds decision add API request', () => {
		const request = buildCliRequest([
			'decision',
			'add',
			'--workspace-id',
			workspaceId,
			'--project-id',
			projectId,
			'--title',
			'Use MCP-first architecture',
			'--decision',
			'Expose context through MCP tools.',
			'--reason',
			'Multiple clients can consume the same context engine.'
		], {
			apiUrl: 'http://localhost:3000',
			apiKey: 'test-key'
		})

		expect(request.url).toBe('http://localhost:3000/v1/decisions')
		expect(request.init.method).toBe('POST')
		expect(JSON.parse(String(request.init.body))).toEqual({
			workspaceId,
			projectId,
			title: 'Use MCP-first architecture',
			decision: 'Expose context through MCP tools.',
			reason: 'Multiple clients can consume the same context engine.'
		})
	})

	test('builds ingest markdown API request', () => {
		const request = buildCliRequest([
			'ingest',
			'./docs',
			'--workspace-id',
			workspaceId,
			'--project-id',
			projectId
		], {
			apiUrl: 'http://localhost:3000',
			apiKey: 'test-key'
		})

		expect(request.url).toBe('http://localhost:3000/v1/ingest/markdown')
		expect(request.init.method).toBe('POST')
		expect(JSON.parse(String(request.init.body))).toEqual({
			workspaceId,
			projectId,
			path: './docs'
		})
	})

	test('builds retrieve API request', () => {
		const request = buildCliRequest([
			'retrieve',
			'How do context packs work?',
			'--workspace-id',
			workspaceId,
			'--project-id',
			projectId,
			'--top-k',
			'7'
		], {
			apiUrl: 'http://localhost:3000',
			apiKey: 'test-key'
		})

		expect(request.url).toBe('http://localhost:3000/v1/retrieve')
		expect(request.init.method).toBe('POST')
		expect(JSON.parse(String(request.init.body))).toEqual({
			workspaceId,
			projectId,
			query: 'How do context packs work?',
			topK: 7
		})
	})

	test('builds naive-rag ask API request', () => {
		const request = buildCliRequest([
			'ask',
			'--mode',
			'naive-rag',
			'How do context packs work?',
			'--workspace-id',
			workspaceId,
			'--project-id',
			projectId
		], {
			apiUrl: 'http://localhost:3000',
			apiKey: 'test-key'
		})

		expect(request.url).toBe('http://localhost:3000/v1/ask')
		expect(request.init.method).toBe('POST')
		expect(JSON.parse(String(request.init.body))).toEqual({
			workspaceId,
			projectId,
			query: 'How do context packs work?',
			mode: 'naive-rag'
		})
	})

	test('fails closed when CLI config is missing', () => {
		expect(() => buildCliRequest([
			'memory',
			'list',
			'--workspace-id',
			workspaceId,
			'--project-id',
			projectId
		], {
			apiUrl: 'http://localhost:3000'
		})).toThrow('SYSQLOW_API_KEY is required')
	})
})
