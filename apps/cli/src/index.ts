import { buildCliRequest } from './commands'

export async function runCli(argv = process.argv.slice(2)) {
	const request = buildCliRequest(argv, {})
	const response = await fetch(request.url, request.init)
	const body = await response.text()

	if (!response.ok) {
		throw new Error(body)
	}

	console.log(body)
}

if (import.meta.main) {
	runCli().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error))
		process.exit(1)
	})
}
