import { Hono } from 'hono'
import { apiKeyAuth } from './http/auth'
import { auditMiddleware, noopAuditLogger, type AuditLogger } from './http/audit'
import { ApiError, jsonError } from './http/errors'
import { validationMiddleware } from './http/validation'

export type CreateAppOptions = {
	apiKey?: string
	auditLogger?: AuditLogger
	registerV1Routes?: (router: Hono) => void
}

export function createApp(options: CreateAppOptions = {}) {
	const app = new Hono()
	const apiKey = options.apiKey ?? process.env.API_KEY
	const auditLogger = options.auditLogger ?? noopAuditLogger

	app.get('/health', (context) => {
		return context.json({
			status: 'ok'
		})
	})

	const v1 = new Hono()

	v1.use('*', apiKeyAuth(apiKey))
	v1.use('*', validationMiddleware)
	v1.use('*', auditMiddleware(auditLogger))
	v1.get('/health', (context) => {
		return context.json({
			status: 'ok'
		})
	})

	options.registerV1Routes?.(v1)
	app.route('/v1', v1)

	app.onError((error, context) => {
		if (error instanceof ApiError) {
			return jsonError(context, error)
		}

		return jsonError(context, new ApiError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Internal server error',
			status: 500
		}))
	})

	app.notFound((context) => {
		return jsonError(context, new ApiError({
			code: 'NOT_FOUND',
			message: 'Route not found',
			status: 404
		}))
	})

	return app
}
