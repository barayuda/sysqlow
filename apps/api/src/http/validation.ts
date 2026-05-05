import type { MiddlewareHandler } from 'hono'
import type { ZodType } from 'zod'
import { ApiError } from './errors'

declare module 'hono' {
	interface HonoRequest {
		validatedJson<T>(schema: ZodType<T>): Promise<T>
	}
}

export const validationMiddleware: MiddlewareHandler = async (context, next) => {
	context.req.validatedJson = async function validatedJson<T>(schema: ZodType<T>) {
		let body: unknown

		try {
			body = await context.req.json()
		} catch {
			throw new ApiError({
				code: 'VALIDATION_ERROR',
				message: 'Invalid request body',
				status: 400
			})
		}

		const result = schema.safeParse(body)

		if (!result.success) {
			throw new ApiError({
				code: 'VALIDATION_ERROR',
				message: 'Invalid request body',
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

	await next()
}
