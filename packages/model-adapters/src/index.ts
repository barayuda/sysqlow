import type { EmbeddingProvider } from '@sysqlow/shared'

type FetchLike = (request: Request) => Promise<Response>

export type OllamaEmbeddingProviderOptions = {
	baseUrl?: string
	endpoint?: string
	model: string
	dimensions: number
	fetch?: FetchLike
}

export function createOllamaEmbeddingProvider(options: OllamaEmbeddingProviderOptions): EmbeddingProvider {
	const baseUrl = options.baseUrl ?? 'http://localhost:11434'
	const endpoint = options.endpoint ?? '/api/embeddings'
	const fetchImplementation = options.fetch ?? fetch

	return {
		provider: 'ollama',
		model: options.model,
		dimensions: options.dimensions,
		async embedText(text) {
			const request = new Request(`${baseUrl.replace(/\/$/, '')}${endpoint}`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					model: options.model,
					prompt: text
				})
			})

			const response = await fetchImplementation(request)

			if (!response.ok) {
				throw new Error(`Embedding provider request failed with status ${response.status}`)
			}

			const body = await response.json()
			const embedding = parseEmbedding(body)

			if (embedding.length !== options.dimensions) {
				throw new Error(`Embedding dimension mismatch: expected ${options.dimensions}, received ${embedding.length}`)
			}

			return embedding
		}
	}
}

function parseEmbedding(body: unknown) {
	if (!body || typeof body !== 'object') {
		throw new Error('Embedding provider returned an invalid response')
	}

	const record = body as {
		embedding?: unknown
		embeddings?: unknown
	}
	const embedding = Array.isArray(record.embedding)
		? record.embedding
		: Array.isArray(record.embeddings) && Array.isArray(record.embeddings[0])
			? record.embeddings[0]
			: null

	if (!embedding || !embedding.every((value) => typeof value === 'number')) {
		throw new Error('Embedding provider returned an invalid embedding')
	}

	return embedding
}
