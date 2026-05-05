import type { MiddlewareHandler } from 'hono'

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
		await next()

		if (!writeMethods.has(context.req.method)) {
			return
		}

		await auditLogger.record({
			action: `${context.req.method} ${context.req.path}`,
			method: context.req.method,
			path: context.req.path,
			status: context.res.status
		})
	}
}
