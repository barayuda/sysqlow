import { describe, expect, test } from 'bun:test'
import { createOllamaEmbeddingProvider } from '../src/index'

describe('Ollama embedding provider', () => {
	test('posts embedding request and validates response dimensions', async () => {
		const requests: Array<Request> = []
		const provider = createOllamaEmbeddingProvider({
			baseUrl: 'http://localhost:11434',
			model: 'nomic-embed-text',
			dimensions: 3,
			fetch: async (request) => {
				requests.push(request)

				return new Response(JSON.stringify({
					embedding: [0.1, 0.2, 0.3]
				}))
			}
		})

		const embedding = await provider.embedText('hello')

		expect(embedding).toEqual([0.1, 0.2, 0.3])
		expect(requests[0].url).toBe('http://localhost:11434/api/embeddings')
		expect(await requests[0].json()).toEqual({
			model: 'nomic-embed-text',
			prompt: 'hello'
		})
	})

	test('fails clearly when provider dimensions do not match config', async () => {
		const provider = createOllamaEmbeddingProvider({
			baseUrl: 'http://localhost:11434',
			model: 'nomic-embed-text',
			dimensions: 3,
			fetch: async () => {
				return new Response(JSON.stringify({
					embedding: [0.1, 0.2]
				}))
			}
		})

		expect(provider.embedText('hello')).rejects.toThrow('Embedding dimension mismatch')
	})
})
