import type { Hono } from 'hono'
import type { NaiveRagService, Retriever } from '@sysqlow/retrieval'
import { z } from 'zod'

const uuidSchema = z.uuid()
const retrieveSchema = z.object({
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	query: z.string().min(1),
	topK: z.number().int().positive().max(50).optional()
})
const askSchema = retrieveSchema.extend({
	mode: z.literal('naive-rag')
})

export function registerRetrievalRoutes(router: Hono, services: {
	retriever: Retriever
	naiveRagService: NaiveRagService
}) {
	router.post('/retrieve', async (context) => {
		const input = await context.req.validatedJson(retrieveSchema)
		const candidates = await services.retriever.retrieve(input)

		return context.json({
			candidates
		})
	})

	router.post('/ask', async (context) => {
		const input = await context.req.validatedJson(askSchema)
		const result = await services.naiveRagService.ask(input)

		return context.json(result)
	})
}
