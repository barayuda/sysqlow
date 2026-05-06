import type { Hono } from 'hono'
import type { MarkdownIngestionService } from '@sysqlow/ingestion'
import { realpath } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { z } from 'zod'
import { ApiError } from '../http/errors'

const ingestMarkdownSchema = z.object({
	workspaceId: z.uuid(),
	projectId: z.uuid(),
	path: z.string().min(1)
})

export function registerIngestionRoutes(
	router: Hono,
	ingestionService: MarkdownIngestionService,
	options: {
		root: string
	}
) {
	router.post('/ingest/markdown', async (context) => {
		const input = await context.req.validatedJson(ingestMarkdownSchema)
		const result = await ingestionService.ingestMarkdownPath({
			...input,
			path: await resolveIngestionPath(options.root, input.path)
		})

		return context.json(result, 201)
	})
}

async function resolveIngestionPath(root: string, path: string) {
	const resolvedRoot = resolve(root)
	const resolvedPath = resolve(resolvedRoot, path)
	const relativePath = relative(resolvedRoot, resolvedPath)

	if (relativePath.startsWith('..') || relativePath === '..') {
		throw new ApiError({
			code: 'VALIDATION_ERROR',
			message: 'Ingestion path is outside the configured root',
			status: 400
		})
	}

	const realRoot = await realpath(resolvedRoot)
	let realPath: string

	try {
		realPath = await realpath(resolvedPath)
	} catch {
		throw new ApiError({
			code: 'VALIDATION_ERROR',
			message: 'Ingestion path does not exist',
			status: 400
		})
	}

	const realRelativePath = relative(realRoot, realPath)

	if (realRelativePath.startsWith('..') || realRelativePath === '..') {
		throw new ApiError({
			code: 'VALIDATION_ERROR',
			message: 'Ingestion path is outside the configured root',
			status: 400
		})
	}

	return resolvedPath
}
