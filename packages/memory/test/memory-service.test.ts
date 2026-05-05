import { describe, expect, test } from 'bun:test'
import {
	createInMemoryMemoryRepository,
	createMemoryService
} from '../src/index'

const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const otherWorkspaceId = '76f7e3d9-e343-46fd-b482-d094d54595be'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
const otherProjectId = '0cf08a6c-71f6-4fa1-a4dd-e3a45168a4f9'

describe('memory service', () => {
	test('creates, lists, searches, and deprecates memory records by scope', async () => {
		const service = createMemoryService({
			repository: createInMemoryMemoryRepository()
		})

		const record = await service.createMemoryRecord({
			workspaceId,
			projectId,
			type: 'constraint',
			title: 'Context pack output',
			content: 'Never send raw chunks as final output.',
			confidence: 0.95,
			sourceChunkIds: []
		})

		await service.createMemoryRecord({
			workspaceId: otherWorkspaceId,
			projectId: otherProjectId,
			type: 'fact',
			title: 'Unrelated',
			content: 'Different workspace.',
			confidence: 0.8,
			sourceChunkIds: []
		})

		expect(record.status).toBe('active')
		expect(await service.listMemoryRecords({
			workspaceId,
			projectId
		})).toHaveLength(1)
		expect(await service.searchMemoryRecords({
			workspaceId,
			projectId,
			query: 'raw chunks'
		})).toHaveLength(1)

		const deprecated = await service.deprecateMemoryRecord({
			workspaceId,
			projectId,
			memoryId: record.id
		})

		expect(deprecated.status).toBe('deprecated')
		expect(await service.searchMemoryRecords({
			workspaceId,
			projectId,
			query: 'raw chunks'
		})).toHaveLength(0)
	})

	test('creates, lists, searches, and deprecates decision memories by scope', async () => {
		const service = createMemoryService({
			repository: createInMemoryMemoryRepository()
		})

		const decision = await service.createDecisionMemory({
			workspaceId,
			projectId,
			title: 'Use MCP-first architecture',
			decision: 'Expose project context through MCP tools.',
			reason: 'Multiple clients can consume the same context engine.',
			tradeoffs: ['More protocol surface area'],
			alternatives: ['API-only integration'],
			sourceIds: []
		})

		await service.createDecisionMemory({
			workspaceId,
			projectId: otherProjectId,
			title: 'Other project',
			decision: 'Keep separate.',
			reason: 'Scope isolation.',
			tradeoffs: [],
			alternatives: [],
			sourceIds: []
		})

		expect(await service.listDecisionMemories({
			workspaceId,
			projectId
		})).toHaveLength(1)
		expect(await service.searchDecisionMemories({
			workspaceId,
			projectId,
			query: 'MCP'
		})).toHaveLength(1)

		const deprecated = await service.deprecateDecisionMemory({
			workspaceId,
			projectId,
			decisionId: decision.id
		})

		expect(deprecated.status).toBe('deprecated')
		expect(await service.searchDecisionMemories({
			workspaceId,
			projectId,
			query: 'MCP'
		})).toHaveLength(0)
	})
})
