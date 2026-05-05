import type { MiddlewareHandler } from 'hono'
import { ApiError } from './errors'

export function apiKeyAuth(apiKey?: string): MiddlewareHandler {
	return async (context, next) => {
		if (!apiKey) {
			throw new ApiError({
				code: 'CONFIGURATION_ERROR',
				message: 'API key is not configured',
				status: 500
			})
		}

		const authorization = context.req.header('authorization')
		const bearerToken = authorization?.startsWith('Bearer ')
			? authorization.slice('Bearer '.length)
			: null
		const headerApiKey = context.req.header('x-api-key')
		const providedApiKey = bearerToken ?? headerApiKey

		if (providedApiKey !== apiKey) {
			throw new ApiError({
				code: 'UNAUTHORIZED',
				message: 'Missing or invalid API key',
				status: 401
			})
		}

		await next()
	}
}
