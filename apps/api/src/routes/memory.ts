import type { Hono } from 'hono'
import {
	MemoryNotFoundError,
	type MemoryService
} from '@sysqlow/memory'
import {
	memoryRecordTypeSchema,
	type MemoryRecordType
} from '@sysqlow/shared'
import { z } from 'zod'
import { ApiError } from '../http/errors'

const uuidSchema = z.uuid()
const scopeSchema = z.object({
	workspaceId: uuidSchema,
	projectId: uuidSchema
})

const createMemoryRecordSchema = scopeSchema.extend({
	type: memoryRecordTypeSchema,
	title: z.string().min(1),
	content: z.string().min(1),
	confidence: z.number().min(0).max(1).optional(),
	sourceChunkIds: z.array(uuidSchema).optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})

const createDecisionMemorySchema = scopeSchema.extend({
	title: z.string().min(1),
	decision: z.string().min(1),
	reason: z.string().min(1),
	tradeoffs: z.array(z.string()).optional(),
	alternatives: z.array(z.string()).optional(),
	sourceIds: z.array(uuidSchema).optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})

export function registerMemoryRoutes(router: Hono, memoryService: MemoryService) {
	router.post('/memory', async (context) => {
		const input = await context.req.validatedJson(createMemoryRecordSchema)
		const record = await memoryService.createMemoryRecord({
			...input,
			type: input.type as MemoryRecordType
		})

		return context.json(record, 201)
	})

	router.get('/memory', async (context) => {
		const scope = parseScope(context.req.query())
		const query = context.req.query('q')
		const records = query
			? await memoryService.searchMemoryRecords({
				...scope,
				query
			})
			: await memoryService.listMemoryRecords(scope)

		return context.json(records)
	})

	router.patch('/memory/:memoryId/deprecate', async (context) => {
		const scope = await context.req.validatedJson(scopeSchema)
		const record = await translateNotFound(() => {
			return memoryService.deprecateMemoryRecord({
				...scope,
				memoryId: context.req.param('memoryId')
			})
		})

		return context.json(record)
	})

	router.post('/decisions', async (context) => {
		const input = await context.req.validatedJson(createDecisionMemorySchema)
		const decision = await memoryService.createDecisionMemory(input)

		return context.json(decision, 201)
	})

	router.get('/decisions', async (context) => {
		const scope = parseScope(context.req.query())
		const query = context.req.query('q')
		const decisions = query
			? await memoryService.searchDecisionMemories({
				...scope,
				query
			})
			: await memoryService.listDecisionMemories(scope)

		return context.json(decisions)
	})

	router.patch('/decisions/:decisionId/deprecate', async (context) => {
		const scope = await context.req.validatedJson(scopeSchema)
		const decision = await translateNotFound(() => {
			return memoryService.deprecateDecisionMemory({
				...scope,
				decisionId: context.req.param('decisionId')
			})
		})

		return context.json(decision)
	})
}

async function translateNotFound<T>(operation: () => Promise<T>) {
	try {
		return await operation()
	} catch (error) {
		if (error instanceof MemoryNotFoundError) {
			throw new ApiError({
				code: 'NOT_FOUND',
				message: error.message,
				status: 404
			})
		}

		throw error
	}
}

function parseScope(query: Record<string, string>) {
	const result = scopeSchema.safeParse({
		workspaceId: query.workspaceId,
		projectId: query.projectId
	})

	if (!result.success) {
		throw new ApiError({
			code: 'VALIDATION_ERROR',
			message: 'Invalid query parameters',
			status: 400,
			details: result.error.issues.map((issue) => ({
				code: issue.code,
				message: issue.message,
				path: issue.path
			}))
		})
	}

	return result.data
}
