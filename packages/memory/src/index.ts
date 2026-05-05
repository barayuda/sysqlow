import type {
	DecisionMemory,
	MemoryRecord,
	MemoryRecordType
} from '@sysqlow/shared'

export type MemoryScope = {
	workspaceId: string
	projectId: string
}

export type CreateMemoryRecordInput = MemoryScope & {
	type: MemoryRecordType
	title: string
	content: string
	confidence?: number
	sourceChunkIds?: Array<string>
	validFrom?: Date
	validUntil?: Date
	metadata?: Record<string, unknown>
}

export type CreateDecisionMemoryInput = MemoryScope & {
	title: string
	decision: string
	reason: string
	tradeoffs?: Array<string>
	alternatives?: Array<string>
	sourceIds?: Array<string>
	metadata?: Record<string, unknown>
}

export type SearchInput = MemoryScope & {
	query: string
}

export type DeprecateMemoryRecordInput = MemoryScope & {
	memoryId: string
}

export type DeprecateDecisionMemoryInput = MemoryScope & {
	decisionId: string
}

export type MemoryRepository = {
	createMemoryRecord(record: MemoryRecord): Promise<MemoryRecord>
	listMemoryRecords(scope: MemoryScope): Promise<Array<MemoryRecord>>
	updateMemoryRecord(record: MemoryRecord): Promise<MemoryRecord>
	findMemoryRecord(input: DeprecateMemoryRecordInput): Promise<MemoryRecord | null>
	createDecisionMemory(decision: DecisionMemory): Promise<DecisionMemory>
	listDecisionMemories(scope: MemoryScope): Promise<Array<DecisionMemory>>
	updateDecisionMemory(decision: DecisionMemory): Promise<DecisionMemory>
	findDecisionMemory(input: DeprecateDecisionMemoryInput): Promise<DecisionMemory | null>
}

export type MemoryService = ReturnType<typeof createMemoryService>

export class MemoryNotFoundError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'MemoryNotFoundError'
	}
}

export function createMemoryService(input: {
	repository: MemoryRepository
	now?: () => Date
	createId?: () => string
}) {
	const now = input.now ?? (() => new Date())
	const createId = input.createId ?? (() => crypto.randomUUID())

	return {
		async createMemoryRecord(recordInput: CreateMemoryRecordInput) {
			const createdAt = now()
			const record: MemoryRecord = {
				id: createId(),
				workspaceId: recordInput.workspaceId,
				projectId: recordInput.projectId,
				type: recordInput.type,
				title: recordInput.title,
				content: recordInput.content,
				status: 'active',
				confidence: recordInput.confidence ?? 1,
				sourceChunkIds: recordInput.sourceChunkIds ?? [],
				validFrom: recordInput.validFrom,
				validUntil: recordInput.validUntil,
				metadata: recordInput.metadata ?? {},
				createdAt,
				updatedAt: createdAt
			}

			return input.repository.createMemoryRecord(record)
		},

		async listMemoryRecords(scope: MemoryScope) {
			return input.repository.listMemoryRecords(scope)
		},

		async searchMemoryRecords(searchInput: SearchInput) {
			const query = normalizeSearch(searchInput.query)
			const records = await input.repository.listMemoryRecords(searchInput)

			return records.filter((record) => {
				return record.status === 'active' && includesQuery([
					record.title,
					record.content,
					record.type
				], query)
			})
		},

		async deprecateMemoryRecord(deprecateInput: DeprecateMemoryRecordInput) {
			const record = await input.repository.findMemoryRecord(deprecateInput)

			if (!record) {
				throw new MemoryNotFoundError('Memory record not found')
			}

			return input.repository.updateMemoryRecord({
				...record,
				status: 'deprecated',
				updatedAt: now()
			})
		},

		async createDecisionMemory(decisionInput: CreateDecisionMemoryInput) {
			const createdAt = now()
			const decision: DecisionMemory = {
				id: createId(),
				workspaceId: decisionInput.workspaceId,
				projectId: decisionInput.projectId,
				title: decisionInput.title,
				decision: decisionInput.decision,
				reason: decisionInput.reason,
				tradeoffs: decisionInput.tradeoffs ?? [],
				alternatives: decisionInput.alternatives ?? [],
				status: 'active',
				sourceIds: decisionInput.sourceIds ?? [],
				metadata: decisionInput.metadata ?? {},
				createdAt,
				updatedAt: createdAt
			}

			return input.repository.createDecisionMemory(decision)
		},

		async listDecisionMemories(scope: MemoryScope) {
			return input.repository.listDecisionMemories(scope)
		},

		async searchDecisionMemories(searchInput: SearchInput) {
			const query = normalizeSearch(searchInput.query)
			const decisions = await input.repository.listDecisionMemories(searchInput)

			return decisions.filter((decision) => {
				return decision.status === 'active' && includesQuery([
					decision.title,
					decision.decision,
					decision.reason,
					...decision.tradeoffs,
					...decision.alternatives
				], query)
			})
		},

		async deprecateDecisionMemory(deprecateInput: DeprecateDecisionMemoryInput) {
			const decision = await input.repository.findDecisionMemory(deprecateInput)

			if (!decision) {
				throw new MemoryNotFoundError('Decision memory not found')
			}

			return input.repository.updateDecisionMemory({
				...decision,
				status: 'deprecated',
				updatedAt: now()
			})
		}
	}
}

export function createInMemoryMemoryRepository(): MemoryRepository {
	const memoryRecords = new Map<string, MemoryRecord>()
	const decisionMemories = new Map<string, DecisionMemory>()

	return {
		async createMemoryRecord(record) {
			memoryRecords.set(record.id, record)
			return record
		},

		async listMemoryRecords(scope) {
			return Array.from(memoryRecords.values()).filter((record) => {
				return isInScope(record, scope)
			})
		},

		async updateMemoryRecord(record) {
			memoryRecords.set(record.id, record)
			return record
		},

		async findMemoryRecord(input) {
			const record = memoryRecords.get(input.memoryId)

			return record && isInScope(record, input) ? record : null
		},

		async createDecisionMemory(decision) {
			decisionMemories.set(decision.id, decision)
			return decision
		},

		async listDecisionMemories(scope) {
			return Array.from(decisionMemories.values()).filter((decision) => {
				return isInScope(decision, scope)
			})
		},

		async updateDecisionMemory(decision) {
			decisionMemories.set(decision.id, decision)
			return decision
		},

		async findDecisionMemory(input) {
			const decision = decisionMemories.get(input.decisionId)

			return decision && isInScope(decision, input) ? decision : null
		}
	}
}

function normalizeSearch(query: string) {
	return query.trim().toLowerCase()
}

function includesQuery(values: Array<string>, query: string) {
	return values.some((value) => {
		return value.toLowerCase().includes(query)
	})
}

function isInScope(
	record: MemoryScope,
	scope: MemoryScope
) {
	return record.workspaceId === scope.workspaceId
		&& record.projectId === scope.projectId
}
