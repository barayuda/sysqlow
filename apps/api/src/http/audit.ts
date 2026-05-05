import type { MiddlewareHandler } from 'hono'
import { ApiError } from './errors'

export type AuditEvent = {
	action: string
	method: string
	path: string
	status: number
}

export type AuditLogger = {
	record(event: AuditEvent): Promise<void>
}

export const noopAuditLogger: AuditLogger = {
	async record() {}
}

const writeMethods = new Set([
	'POST',
	'PUT',
	'PATCH',
	'DELETE'
])

export function auditMiddleware(auditLogger: AuditLogger): MiddlewareHandler {
	return async (context, next) => {
		let thrownError: unknown

		try {
			await next()
		} catch (error) {
			thrownError = error
			throw error
		} finally {
			if (!writeMethods.has(context.req.method)) {
				return
			}

			const status = thrownError instanceof ApiError
				? thrownError.status
				: context.res.status

			await auditLogger.record({
				action: `${context.req.method} ${context.req.path}`,
				method: context.req.method,
				path: context.req.path,
				status
			})
		}
	}
}
