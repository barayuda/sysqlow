export type CliConfig = {
	apiUrl?: string
	apiKey?: string
}

export type CliRequest = {
	url: string
	init: RequestInit
}

export function buildCliRequest(argv: Array<string>, config: CliConfig): CliRequest {
	const apiUrl = config.apiUrl ?? process.env.SYSQLOW_API_URL ?? 'http://localhost:3000'
	const apiKey = config.apiKey ?? process.env.SYSQLOW_API_KEY ?? process.env.API_KEY

	if (!apiKey) {
		throw new Error('SYSQLOW_API_KEY is required')
	}

	const [resource, action, ...rest] = argv
	const flags = parseFlags(rest)
	const baseUrl = apiUrl.replace(/\/$/, '')
	const headers = {
		authorization: `Bearer ${apiKey}`,
		'content-type': 'application/json'
	}

	if (resource === 'memory' && action === 'add') {
		const content = flags.positionals[0]
		const title = requiredFlag(flags, 'title')

		return {
			url: `${baseUrl}/v1/memory`,
			init: {
				method: 'POST',
				headers,
				body: JSON.stringify({
					workspaceId: requiredFlag(flags, 'workspace-id'),
					projectId: requiredFlag(flags, 'project-id'),
					type: flags.values.type ?? 'fact',
					title,
					content
				})
			}
		}
	}

	if (resource === 'memory' && action === 'list') {
		return {
			url: buildListUrl(`${baseUrl}/v1/memory`, flags),
			init: {
				method: 'GET',
				headers
			}
		}
	}

	if (resource === 'decision' && action === 'add') {
		return {
			url: `${baseUrl}/v1/decisions`,
			init: {
				method: 'POST',
				headers,
				body: JSON.stringify({
					workspaceId: requiredFlag(flags, 'workspace-id'),
					projectId: requiredFlag(flags, 'project-id'),
					title: requiredFlag(flags, 'title'),
					decision: requiredFlag(flags, 'decision'),
					reason: requiredFlag(flags, 'reason')
				})
			}
		}
	}

	if (resource === 'decision' && action === 'list') {
		return {
			url: buildListUrl(`${baseUrl}/v1/decisions`, flags),
			init: {
				method: 'GET',
				headers
			}
		}
	}

	throw new Error(`Unsupported command: ${argv.join(' ')}`)
}

function buildListUrl(baseUrl: string, flags: ParsedFlags) {
	const url = new URL(baseUrl)
	url.searchParams.set('workspaceId', requiredFlag(flags, 'workspace-id'))
	url.searchParams.set('projectId', requiredFlag(flags, 'project-id'))

	if (flags.values.query) {
		url.searchParams.set('q', flags.values.query)
	}

	return url.toString()
}

type ParsedFlags = {
	positionals: Array<string>
	values: Record<string, string>
}

function parseFlags(args: Array<string>): ParsedFlags {
	const positionals: Array<string> = []
	const values: Record<string, string> = {}

	for (let index = 0; index < args.length; index++) {
		const arg = args[index]

		if (!arg.startsWith('--')) {
			positionals.push(arg)
			continue
		}

		const key = arg.slice(2)
		const value = args[index + 1]

		if (!value || value.startsWith('--')) {
			throw new Error(`Missing value for --${key}`)
		}

		values[key] = value
		index++
	}

	return {
		positionals,
		values
	}
}

function requiredFlag(flags: ParsedFlags, key: string) {
	const value = flags.values[key]

	if (!value) {
		throw new Error(`--${key} is required`)
	}

	return value
}
