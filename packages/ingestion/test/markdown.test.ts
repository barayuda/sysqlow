import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
	chunkMarkdown,
	createInMemoryKnowledgeRepository,
	createMarkdownIngestionService,
	isIgnoredPath,
	scanMarkdownFiles
} from '../src/index'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
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

describe('markdown ingestion', () => {
	test('chunks markdown by heading hierarchy and preserves line ranges', () => {
		const chunks = chunkMarkdown([
			'Intro before heading',
			'',
			'# Architecture',
			'Use context packs.',
			'',
			'## Risks',
			'Raw chunks are untrusted.',
			'',
			'# Operations',
			'Run tests.'
		].join('\n'))

		expect(chunks).toEqual([
			expect.objectContaining({
				content: 'Intro before heading',
				headingPath: [],
				startLine: 1,
				endLine: 1
			}),
			expect.objectContaining({
				content: 'Use context packs.',
				headingPath: ['Architecture'],
				startLine: 3,
				endLine: 4
			}),
			expect.objectContaining({
				content: 'Raw chunks are untrusted.',
				headingPath: ['Architecture', 'Risks'],
				startLine: 6,
				endLine: 7
			}),
			expect.objectContaining({
				content: 'Run tests.',
				headingPath: ['Operations'],
				startLine: 9,
				endLine: 10
			})
		])
	})

	test('ignores sensitive and build paths', () => {
		expect(isIgnoredPath('/repo/node_modules/pkg/readme.md')).toBe(true)
		expect(isIgnoredPath('/repo/.git/config')).toBe(true)
		expect(isIgnoredPath('/repo/.env.local')).toBe(true)
		expect(isIgnoredPath('/repo/private.pem')).toBe(true)
		expect(isIgnoredPath('/repo/.next/cache/page.md')).toBe(true)
		expect(isIgnoredPath('/repo/docs/readme.md')).toBe(false)
	})

	test('scans markdown and mdx files recursively while respecting ignores', async () => {
		const root = createTempDirectory()
		mkdirSync(join(root, 'docs'), {
			recursive: true
		})
		mkdirSync(join(root, 'node_modules', 'pkg'), {
			recursive: true
		})
		writeFileSync(join(root, 'docs', 'guide.md'), '# Guide\nContent')
		writeFileSync(join(root, 'docs', 'page.mdx'), '# Page\nContent')
		writeFileSync(join(root, 'docs', 'note.txt'), '# Note\nContent')
		writeFileSync(join(root, 'node_modules', 'pkg', 'ignored.md'), '# Ignored')

		const files = await scanMarkdownFiles(root)

		expect(files.map((file) => file.replace(root, '')).sort()).toEqual([
			'/docs/guide.md',
			'/docs/page.mdx'
		])
	})

	test('does not follow symlinks while scanning', async () => {
		const root = createTempDirectory()
		const outside = createTempDirectory()
		mkdirSync(join(root, 'docs'), {
			recursive: true
		})
		writeFileSync(join(outside, 'secret.md'), '# Outside\nShould not be scanned.')
		symlinkSync(outside, join(root, 'docs', 'linked'))

		const files = await scanMarkdownFiles(root)

		expect(files).toEqual([])
	})

	test('upserts sources and chunks without duplicates on repeated ingest', async () => {
		const root = createTempDirectory()
		const docs = join(root, 'docs')
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(join(docs, 'guide.md'), '# Guide\nContent\n\n## Details\nMore content')

		const repository = createInMemoryKnowledgeRepository()
		const service = createMarkdownIngestionService({
			repository
		})

		const first = await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})
		const second = await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})

		expect(first.sources).toHaveLength(1)
		expect(first.chunks).toHaveLength(2)
		expect(second.sources).toHaveLength(1)
		expect(second.chunks).toHaveLength(2)
		expect(await repository.listSources({
			workspaceId,
			projectId
		})).toHaveLength(1)
		expect(await repository.listChunks({
			workspaceId,
			projectId
		})).toHaveLength(2)
		expect(first.chunks[0].metadata).toEqual(expect.objectContaining({
			filePath: join(docs, 'guide.md'),
			headingPath: ['Guide'],
			startLine: 1,
			endLine: 2
		}))
	})

	test('skips markdown files containing secret material', async () => {
		const root = createTempDirectory()
		const docs = join(root, 'docs')
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(join(docs, 'safe.md'), '# Safe\nPublic project notes.')
		writeFileSync(join(docs, 'secret.md'), [
			'# Secret',
			'-----BEGIN PRIVATE KEY-----',
			'abc123',
			'-----END PRIVATE KEY-----'
		].join('\n'))

		const repository = createInMemoryKnowledgeRepository()
		const service = createMarkdownIngestionService({
			repository
		})
		const result = await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})

		expect(result.sources.map((source) => source.name)).toEqual(['safe.md'])
		expect(result.chunks).toHaveLength(1)
	})

	test('removes stale chunks when a source is re-ingested with changed content', async () => {
		const root = createTempDirectory()
		const docs = join(root, 'docs')
		const filePath = join(docs, 'guide.md')
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(filePath, '# Guide\nContent\n\n## Removed\nOld content')

		const repository = createInMemoryKnowledgeRepository()
		const service = createMarkdownIngestionService({
			repository
		})

		await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})
		writeFileSync(filePath, '# Guide\nContent')
		await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})

		const chunks = await repository.listChunks({
			workspaceId,
			projectId
		})

		expect(chunks).toHaveLength(1)
		expect(chunks[0].metadata).toEqual(expect.objectContaining({
			headingPath: ['Guide']
		}))
	})

	test('removes existing chunks when a source becomes secret-tainted', async () => {
		const root = createTempDirectory()
		const docs = join(root, 'docs')
		const filePath = join(docs, 'guide.md')
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(filePath, '# Guide\nContent')

		const repository = createInMemoryKnowledgeRepository()
		const service = createMarkdownIngestionService({
			repository
		})

		await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})
		writeFileSync(filePath, [
			'# Guide',
			'api_key = "abcdefghijklmnopqrstuvwxyz"'
		].join('\n'))
		await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})

		expect(await repository.listChunks({
			workspaceId,
			projectId
		})).toHaveLength(0)
	})

	test('keeps identical chunk content from distinct sections', async () => {
		const root = createTempDirectory()
		const docs = join(root, 'docs')
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(join(docs, 'guide.md'), '# First\nSame content\n\n# Second\nSame content')

		const repository = createInMemoryKnowledgeRepository()
		const service = createMarkdownIngestionService({
			repository
		})

		await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})

		const chunks = await repository.listChunks({
			workspaceId,
			projectId
		})

		expect(chunks).toHaveLength(2)
		expect(chunks.map((chunk) => chunk.metadata.headingPath)).toEqual([
			['First'],
			['Second']
		])
	})

	test('removes chunks for deleted files on directory re-ingest', async () => {
		const root = createTempDirectory()
		const docs = join(root, 'docs')
		const filePath = join(docs, 'guide.md')
		mkdirSync(docs, {
			recursive: true
		})
		writeFileSync(filePath, '# Guide\nContent')

		const repository = createInMemoryKnowledgeRepository()
		const service = createMarkdownIngestionService({
			repository
		})

		await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})
		unlinkSync(filePath)
		await service.ingestMarkdownPath({
			workspaceId,
			projectId,
			path: docs
		})

		expect(await repository.listSources({
			workspaceId,
			projectId
		})).toHaveLength(0)
		expect(await repository.listChunks({
			workspaceId,
			projectId
		})).toHaveLength(0)
	})
})

function createTempDirectory() {
	const directory = mkdtempSync(join(tmpdir(), 'sysqlow-ingestion-'))
	tempDirectories.push(directory)

	return directory
}
