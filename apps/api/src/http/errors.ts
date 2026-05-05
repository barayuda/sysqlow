import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ApiErrorResponse = {
	error: {
		code: string
		message: string
		details?: unknown
	}
}

export class ApiError extends Error {
	readonly code: string
	readonly status: ContentfulStatusCode
	readonly details?: unknown

	constructor(input: {
		code: string
		message: string
		status: ContentfulStatusCode
		details?: unknown
	}) {
		super(input.message)
		this.name = 'ApiError'
		this.code = input.code
		this.status = input.status
		this.details = input.details
	}
}

export function jsonError(context: Context, error: ApiError) {
	const response: ApiErrorResponse = {
		error: {
			code: error.code,
			message: error.message,
			...(error.details ? {
				details: error.details
			} : {})
		}
	}

	return context.json(response, error.status)
}
