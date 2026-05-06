import { createHash } from 'node:crypto'
import {
	lstat,
	readdir,
	readFile,
} from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type {
	KnowledgeChunk,
	KnowledgeSource
} from '@sysqlow/shared'

export type MarkdownChunk = {
	content: string
	headingPath: Array<string>
	startLine: number
	endLine: number
}

export type IngestionScope = {
	workspaceId: string
	projectId: string
}

export type IngestMarkdownPathInput = IngestionScope & {
	path: string
}

export type IngestMarkdownResult = {
	sources: Array<KnowledgeSource>
	chunks: Array<KnowledgeChunk>
}

export type MarkdownIngestionService = ReturnType<typeof createMarkdownIngestionService>

export type KnowledgeRepository = {
	upsertSource(source: KnowledgeSource): Promise<KnowledgeSource>
	replaceChunksForSource(input: IngestionScope & {
		sourceId: string
		chunks: Array<KnowledgeChunk>
	}): Promise<Array<KnowledgeChunk>>
	removeSourcesNotInUris(input: IngestionScope & {
		rootPath: string
		currentUris: Array<string>
	}): Promise<void>
	listSources(scope: IngestionScope): Promise<Array<KnowledgeSource>>
	listChunks(scope: IngestionScope): Promise<Array<KnowledgeChunk>>
}

const ignoredSegments = new Set([
	'node_modules',
	'dist',
	'build',
	'coverage',
	'.git',
	'.next',
	'.nuxt',
	'.cache'
])

const ignoredExtensions = new Set([
	'.pem',
	'.key',
	'.p12',
	'.pfx'
])

export function chunkMarkdown(content: string): Array<MarkdownChunk> {
	const lines = content.split(/\r?\n/)
	const chunks: Array<MarkdownChunk> = []
	const headingStack: Array<string> = []
	let currentStartLine = 1
	let currentHeadingPath: Array<string> = []
	let currentLines: Array<string> = []
	let inFence = false

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]
		const lineNumber = index + 1

		if (line.trim().startsWith('```')) {
			inFence = !inFence
		}

		const heading = inFence ? null : parseHeading(line)

		if (heading) {
			pushChunk()
			headingStack.length = heading.level - 1
			headingStack[heading.level - 1] = heading.title
			currentHeadingPath = headingStack.filter(Boolean)
			currentStartLine = lineNumber
			currentLines = []
			continue
		}

		currentLines.push(line)
	}

	pushChunk()

	return chunks

	function pushChunk() {
		const firstContentIndex = currentLines.findIndex((line) => line.trim())
		const lastContentIndex = currentLines.findLastIndex((line) => line.trim())

		if (firstContentIndex === -1 || lastContentIndex === -1) {
			return
		}

		const trimmedContent = currentLines
			.slice(firstContentIndex, lastContentIndex + 1)
			.join('\n')
			.trim()

		chunks.push({
			content: trimmedContent,
			headingPath: [...currentHeadingPath],
			startLine: currentHeadingPath.length ? currentStartLine : currentStartLine + firstContentIndex,
			endLine: currentHeadingPath.length ? currentStartLine + lastContentIndex + 1 : currentStartLine + lastContentIndex
		})
	}
}

export function isIgnoredPath(path: string) {
	const segments = path.split(/[\\/]+/)
	const fileName = segments.at(-1) ?? ''
	const extension = extname(fileName)

	return segments.some((segment) => ignoredSegments.has(segment))
		|| fileName === '.env'
		|| fileName.startsWith('.env.')
		|| ignoredExtensions.has(extension)
}

export async function scanMarkdownFiles(path: string): Promise<Array<string>> {
	if (isIgnoredPath(path)) {
		return []
	}

	const pathStat = await lstat(path)

	if (pathStat.isSymbolicLink()) {
		return []
	}

	if (pathStat.isFile()) {
		return isMarkdownPath(path) ? [path] : []
	}

	const entries = await readdir(path, {
		withFileTypes: true
	})
	const files: Array<string> = []

	for (const entry of entries) {
		const childPath = join(path, entry.name)

		if (isIgnoredPath(childPath)) {
			continue
		}

		if (entry.isDirectory()) {
			files.push(...await scanMarkdownFiles(childPath))
			continue
		}

		if (entry.isFile() && isMarkdownPath(childPath)) {
			files.push(childPath)
		}
	}

	return files.sort()
}

export function createMarkdownIngestionService(input: {
	repository: KnowledgeRepository
	now?: () => Date
	createId?: () => string
}) {
	const now = input.now ?? (() => new Date())
	const createId = input.createId ?? (() => crypto.randomUUID())

	return {
		async ingestMarkdownPath(ingestInput: IngestMarkdownPathInput): Promise<IngestMarkdownResult> {
			const files = await scanMarkdownFiles(ingestInput.path)
			const sources: Array<KnowledgeSource> = []
			const chunks: Array<KnowledgeChunk> = []
			await input.repository.removeSourcesNotInUris({
				workspaceId: ingestInput.workspaceId,
				projectId: ingestInput.projectId,
				rootPath: ingestInput.path,
				currentUris: files
			})

			for (const filePath of files) {
				const content = await readFile(filePath, 'utf8')
				const createdAt = now()
				const source = await input.repository.upsertSource({
					id: createId(),
					workspaceId: ingestInput.workspaceId,
					projectId: ingestInput.projectId,
					type: 'markdown',
					name: basename(filePath),
					uri: filePath,
					contentHash: hashContent(content),
					metadata: {
						filePath
					},
					createdAt,
					updatedAt: createdAt
				})

				if (containsSecretMaterial(content)) {
					await input.repository.replaceChunksForSource({
						workspaceId: ingestInput.workspaceId,
						projectId: ingestInput.projectId,
						sourceId: source.id,
						chunks: []
					})
					continue
				}

				const fileChunks = chunkMarkdown(content)
				const nextChunks: Array<KnowledgeChunk> = []

				sources.push(source)

				for (const chunk of fileChunks) {
					const chunkCreatedAt = now()
					nextChunks.push({
						id: createId(),
						workspaceId: ingestInput.workspaceId,
						projectId: ingestInput.projectId,
						sourceId: source.id,
						content: chunk.content,
						contentHash: hashContent(chunk.content),
						tokenCount: countTokens(chunk.content),
						metadata: {
							filePath,
							headingPath: chunk.headingPath,
							startLine: chunk.startLine,
							endLine: chunk.endLine
						},
						createdAt: chunkCreatedAt,
						updatedAt: chunkCreatedAt
					})
				}

				chunks.push(...await input.repository.replaceChunksForSource({
					workspaceId: ingestInput.workspaceId,
					projectId: ingestInput.projectId,
					sourceId: source.id,
					chunks: nextChunks
				}))
			}

			return {
				sources,
				chunks
			}
		}
	}
}

export function createInMemoryKnowledgeRepository(): KnowledgeRepository {
	const sourcesByKey = new Map<string, KnowledgeSource>()
	const chunksByKey = new Map<string, KnowledgeChunk>()

	return {
		async upsertSource(source) {
			const key = sourceKey(source)
			const existing = sourcesByKey.get(key)
			const nextSource = existing
				? {
					...existing,
					name: source.name,
					contentHash: source.contentHash,
					metadata: source.metadata,
					updatedAt: source.updatedAt
				}
				: source

			sourcesByKey.set(key, nextSource)

			return nextSource
		},

		async replaceChunksForSource(input) {
			const nextKeys = new Set(input.chunks.map(chunkKey))

			for (const [key, chunk] of chunksByKey.entries()) {
				if (isInScope(chunk, input) && chunk.sourceId === input.sourceId && !nextKeys.has(key)) {
					chunksByKey.delete(key)
				}
			}

			return input.chunks.map((chunk) => {
				const key = chunkKey(chunk)
				const existing = chunksByKey.get(key)
				const nextChunk = existing
					? {
						...existing,
						content: chunk.content,
						tokenCount: chunk.tokenCount,
						metadata: chunk.metadata,
						updatedAt: chunk.updatedAt
					}
					: chunk

				chunksByKey.set(key, nextChunk)

				return nextChunk
			})
		},

		async removeSourcesNotInUris(input) {
			const currentUris = new Set(input.currentUris)

			for (const [sourceMapKey, source] of sourcesByKey.entries()) {
				if (!isInScope(source, input) || !source.uri || !isInsideRoot(source.uri, input.rootPath) || currentUris.has(source.uri)) {
					continue
				}

				sourcesByKey.delete(sourceMapKey)

				for (const [chunkMapKey, chunk] of chunksByKey.entries()) {
					if (isInScope(chunk, input) && chunk.sourceId === source.id) {
						chunksByKey.delete(chunkMapKey)
					}
				}
			}
		},

		async listSources(scope) {
			return Array.from(sourcesByKey.values()).filter((source) => {
				return isInScope(source, scope)
			})
		},

		async listChunks(scope) {
			return Array.from(chunksByKey.values()).filter((chunk) => {
				return isInScope(chunk, scope)
			})
		}
	}
}

function parseHeading(line: string) {
	const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line.trim())

	if (!match) {
		return null
	}

	return {
		level: match[1].length,
		title: match[2].trim()
	}
}

function isMarkdownPath(path: string) {
	return ['.md', '.mdx'].includes(extname(path).toLowerCase())
}

function containsSecretMaterial(content: string) {
	return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)
		|| /\b(api[_-]?key|token|secret)\b\s*[:=]\s*['"]?[A-Za-z0-9_\-.]{20,}/i.test(content)
}

function hashContent(content: string) {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

function countTokens(content: string) {
	return content.trim().split(/\s+/).filter(Boolean).length
}

function sourceKey(source: KnowledgeSource) {
	return [
		source.workspaceId,
		source.projectId,
		source.uri
	].join(':')
}

function chunkKey(chunk: KnowledgeChunk) {
	const headingPath = Array.isArray(chunk.metadata.headingPath)
		? chunk.metadata.headingPath.join('/')
		: ''
	const startLine = typeof chunk.metadata.startLine === 'number'
		? String(chunk.metadata.startLine)
		: ''

	return [
		chunk.workspaceId,
		chunk.projectId,
		chunk.sourceId,
		headingPath,
		startLine,
		chunk.contentHash
	].join(':')
}

function isInsideRoot(path: string, rootPath: string) {
	return path === rootPath || path.startsWith(`${rootPath}/`)
}

function isInScope(
	record: IngestionScope,
	scope: IngestionScope
) {
	return record.workspaceId === scope.workspaceId
		&& record.projectId === scope.projectId
}
