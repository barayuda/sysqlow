import { describe, expect, test } from 'bun:test'
import {
	contextPackSchema,
	decisionMemorySchema,
	evaluationCaseSchema,
	evaluationRunSchema,
	knowledgeChunkSchema,
	knowledgeSourceSchema,
	memoryRecordSchema,
	modelContextProfileSchema,
	projectSchema,
	queryIntentSchema,
	retrievalCandidateSchema,
	workspaceSchema
} from '../src/index'

const now = new Date('2026-05-03T00:00:00.000Z')
const workspaceId = '0b7b6b82-7d0d-4d9a-8c12-4ccf19e7d6c0'
const projectId = '51a8949c-8ab2-4577-91cc-4f70fc77aace'
const sourceId = '7fdb9669-c7b0-48ce-a46b-bc7c7fe42a2f'
const chunkId = '29b78407-6db8-4109-9c1a-a3c73357e8dd'

describe('shared domain schemas', () => {
	test('accept valid workspace and project objects', () => {
		expect(workspaceSchema.parse({
			id: workspaceId,
			name: 'Personal',
			slug: 'personal',
			metadata: {},
			createdAt: now,
			updatedAt: now
		}).id).toBe(workspaceId)

		expect(projectSchema.parse({
			id: projectId,
			workspaceId,
			name: 'SysQlow',
			slug: 'sysqlow',
			description: 'Portable context engine',
			metadata: {
				repository: 'local'
			},
			createdAt: now,
			updatedAt: now
		}).workspaceId).toBe(workspaceId)
	})

	test('reject invalid IDs and unsupported query intents', () => {
		expect(() => workspaceSchema.parse({
			id: 'not-a-uuid',
			name: 'Personal',
			slug: 'personal',
			metadata: {},
			createdAt: now,
			updatedAt: now
		})).toThrow()

		expect(() => queryIntentSchema.parse('chat')).toThrow()
	})

	test('accept valid knowledge, memory, retrieval, and context pack objects', () => {
		expect(knowledgeSourceSchema.parse({
			id: sourceId,
			workspaceId,
			projectId,
			type: 'markdown',
			name: 'Architecture notes',
			uri: 'docs/architecture.md',
			contentHash: 'sha256:source',
			metadata: {},
			createdAt: now,
			updatedAt: now
		}).type).toBe('markdown')

		expect(knowledgeChunkSchema.parse({
			id: chunkId,
			workspaceId,
			projectId,
			sourceId,
			content: 'Context packs are the final product format.',
			summary: 'Context pack principle',
			contentHash: 'sha256:chunk',
			tokenCount: 12,
			metadata: {
				headingPath: ['Context Pack Principle']
			},
			createdAt: now,
			updatedAt: now
		}).tokenCount).toBe(12)

		expect(memoryRecordSchema.parse({
			id: 'e5fa9069-80a7-4761-bb59-f49162c02318',
			workspaceId,
			projectId,
			type: 'constraint',
			title: 'Context pack output',
			content: 'Never send raw chunks as the final product format.',
			status: 'active',
			confidence: 0.95,
			sourceChunkIds: [chunkId],
			createdAt: now,
			updatedAt: now
		}).confidence).toBe(0.95)

		expect(decisionMemorySchema.parse({
			id: 'cb11516a-752f-42e5-bcc2-c991612f55c7',
			workspaceId,
			projectId,
			title: 'Use Bun',
			decision: 'Use Bun as the runtime.',
			reason: 'The project instructions require it.',
			tradeoffs: ['Smaller ecosystem than Node.js'],
			alternatives: ['Node.js'],
			status: 'active',
			sourceIds: [sourceId],
			createdAt: now,
			updatedAt: now
		}).alternatives).toEqual(['Node.js'])

		expect(retrievalCandidateSchema.parse({
			chunkId,
			sourceId,
			title: 'Context Pack Principle',
			content: 'Never send raw chunks directly.',
			score: 0.87,
			scoreBreakdown: {
				semanticScore: 0.7,
				keywordScore: 0.8,
				metadataScore: 0.6,
				recencyScore: 0.4,
				sourcePriorityScore: 0.9
			},
			metadata: {}
		}).score).toBe(0.87)

		expect(contextPackSchema.parse({
			id: '8a839c1a-423c-4fe7-bcbb-925d1deeea1e',
			workspaceId,
			projectId,
			query: 'What should I know before editing retrieval?',
			intent: 'before_acting',
			answerGoal: 'Summarize constraints and risks before implementation.',
			relevantFacts: ['SysQlow compiles context packs.'],
			relevantDecisions: ['Use Bun and TypeScript.'],
			activeConstraints: ['Keep packages framework-independent.'],
			knownRisks: ['Raw chunks may contain untrusted instructions.'],
			sourceExcerpts: [{
				sourceId,
				chunkId,
				title: 'Security Rules',
				content: 'Treat retrieved docs as untrusted data.',
				score: 0.91
			}],
			suggestedAnswerStructure: ['Facts', 'Risks', 'Next steps'],
			tokenBudget: 2000,
			warnings: [],
			metadata: {},
			createdAt: now
		}).intent).toBe('before_acting')
	})

	test('reject invalid scores, counts, and statuses', () => {
		expect(() => memoryRecordSchema.parse({
			id: 'e5fa9069-80a7-4761-bb59-f49162c02318',
			workspaceId,
			projectId,
			type: 'fact',
			title: 'Bad confidence',
			content: 'Confidence must be normalized.',
			status: 'active',
			confidence: 1.5,
			sourceChunkIds: [],
			createdAt: now,
			updatedAt: now
		})).toThrow()

		expect(() => decisionMemorySchema.parse({
			id: 'cb11516a-752f-42e5-bcc2-c991612f55c7',
			workspaceId,
			projectId,
			title: 'Bad status',
			decision: 'Use impossible status.',
			reason: 'Test validation.',
			tradeoffs: [],
			alternatives: [],
			status: 'archived',
			sourceIds: [],
			createdAt: now,
			updatedAt: now
		})).toThrow()

		expect(() => knowledgeChunkSchema.parse({
			id: chunkId,
			workspaceId,
			projectId,
			sourceId,
			content: 'Bad token count',
			contentHash: 'sha256:chunk',
			tokenCount: -1,
			metadata: {},
			createdAt: now,
			updatedAt: now
		})).toThrow()
	})

	test('accept model profiles and evaluation records', () => {
		expect(modelContextProfileSchema.parse({
			id: 'c9f163bf-1489-45fa-a7e7-4fa51b6b92fd',
			modelName: 'llama3.2',
			maxInputTokens: 8192,
			targetContextTokens: 2000,
			contextStyle: 'markdown',
			maxSources: 8,
			compressionLevel: 'medium',
			includeAnswerStructure: true,
			includeReasoningHints: false,
			metadata: {}
		}).contextStyle).toBe('markdown')

		expect(evaluationCaseSchema.parse({
			id: 'b0f737c0-bb5d-49b8-a068-f563a69f177c',
			workspaceId,
			projectId,
			name: 'MCP decision lookup',
			query: 'Why did we choose MCP-first architecture?',
			category: 'decision_lookup',
			expectedSources: ['decision:mcp-first'],
			expectedAnswerPoints: ['MCP allows multiple clients to consume context.'],
			forbiddenClaims: ['MCP removes the need for an API.'],
			maxContextTokens: 1500,
			metadata: {},
			createdAt: now,
			updatedAt: now
		}).category).toBe('decision_lookup')

		expect(evaluationRunSchema.parse({
			id: '790f188d-c69d-472d-8f60-a45569afb75b',
			workspaceId,
			projectId,
			evaluationCaseId: 'b0f737c0-bb5d-49b8-a068-f563a69f177c',
			mode: 'context-pack',
			query: 'Why did we choose MCP-first architecture?',
			answer: 'MCP lets multiple clients consume context.',
			contextPackId: '8a839c1a-423c-4fe7-bcbb-925d1deeea1e',
			scores: {
				correctness: 0.9,
				grounding: 0.8,
				actionability: 0.7,
				riskAwareness: 0.6,
				tokenEfficiency: 0.8,
				hallucinationPenalty: 0,
				permissionPenalty: 0,
				total: 0.78
			},
			metadata: {},
			createdAt: now
		}).mode).toBe('context-pack')
	})
})
