import { z } from 'zod'

const uuidSchema = z.uuid()
const metadataSchema = z.record(z.string(), z.unknown())
const dateSchema = z.date()
const normalizedScoreSchema = z.number().min(0).max(1)

export const queryIntentSchema = z.enum([
	'before_acting',
	'decision_lookup',
	'implementation_plan',
	'risk_discovery',
	'debugging',
	'onboarding',
	'code_convention',
	'conflict_detection',
	'explain',
	'search'
])

export const knowledgeSourceTypeSchema = z.enum([
	'repo',
	'file',
	'markdown',
	'chat',
	'decision',
	'manual_memory',
	'ticket',
	'web_doc'
])

export const memoryRecordTypeSchema = z.enum([
	'fact',
	'decision',
	'constraint',
	'preference',
	'warning',
	'architecture',
	'bug_history',
	'implementation_pattern'
])

export const recordStatusSchema = z.enum([
	'active',
	'deprecated',
	'replaced'
])

export const workspaceSchema = z.object({
	id: uuidSchema,
	name: z.string().min(1),
	slug: z.string().min(1),
	metadata: metadataSchema,
	createdAt: dateSchema,
	updatedAt: dateSchema
})

export const projectSchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	name: z.string().min(1),
	slug: z.string().min(1),
	description: z.string().optional(),
	metadata: metadataSchema,
	createdAt: dateSchema,
	updatedAt: dateSchema
})

export const knowledgeSourceSchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	type: knowledgeSourceTypeSchema,
	name: z.string().min(1),
	uri: z.string().min(1).optional(),
	contentHash: z.string().min(1).optional(),
	metadata: metadataSchema,
	createdAt: dateSchema,
	updatedAt: dateSchema
})

export const knowledgeChunkSchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	sourceId: uuidSchema,
	content: z.string().min(1),
	summary: z.string().min(1).optional(),
	contentHash: z.string().min(1),
	tokenCount: z.number().int().nonnegative(),
	metadata: metadataSchema,
	createdAt: dateSchema,
	updatedAt: dateSchema
})

export const memoryRecordSchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	type: memoryRecordTypeSchema,
	title: z.string().min(1),
	content: z.string().min(1),
	status: recordStatusSchema,
	confidence: normalizedScoreSchema,
	sourceChunkIds: z.array(uuidSchema),
	validFrom: dateSchema.optional(),
	validUntil: dateSchema.optional(),
	metadata: metadataSchema.default({}),
	createdAt: dateSchema,
	updatedAt: dateSchema
})

export const decisionMemorySchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	title: z.string().min(1),
	decision: z.string().min(1),
	reason: z.string().min(1),
	tradeoffs: z.array(z.string()),
	alternatives: z.array(z.string()),
	status: recordStatusSchema,
	sourceIds: z.array(uuidSchema),
	metadata: metadataSchema.default({}),
	createdAt: dateSchema,
	updatedAt: dateSchema
})

export const retrievalScoreBreakdownSchema = z.object({
	semanticScore: normalizedScoreSchema,
	keywordScore: normalizedScoreSchema,
	metadataScore: normalizedScoreSchema,
	recencyScore: normalizedScoreSchema,
	sourcePriorityScore: normalizedScoreSchema
})

export const retrievalCandidateSchema = z.object({
	chunkId: uuidSchema.optional(),
	sourceId: uuidSchema,
	title: z.string().min(1),
	content: z.string().min(1),
	score: normalizedScoreSchema,
	scoreBreakdown: retrievalScoreBreakdownSchema,
	metadata: metadataSchema
})

export const contextPackSourceExcerptSchema = z.object({
	sourceId: uuidSchema,
	chunkId: uuidSchema.optional(),
	title: z.string().min(1),
	content: z.string().min(1),
	score: normalizedScoreSchema
})

export const contextPackSchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	query: z.string().min(1),
	intent: queryIntentSchema,
	answerGoal: z.string().min(1),
	relevantFacts: z.array(z.string()),
	relevantDecisions: z.array(z.string()),
	activeConstraints: z.array(z.string()),
	knownRisks: z.array(z.string()),
	sourceExcerpts: z.array(contextPackSourceExcerptSchema),
	suggestedAnswerStructure: z.array(z.string()),
	tokenBudget: z.number().int().positive(),
	warnings: z.array(z.string()),
	metadata: metadataSchema.default({}),
	createdAt: dateSchema
})

export const modelContextProfileSchema = z.object({
	id: uuidSchema,
	modelName: z.string().min(1),
	maxInputTokens: z.number().int().positive(),
	targetContextTokens: z.number().int().positive(),
	contextStyle: z.enum([
		'markdown',
		'json',
		'xml'
	]),
	maxSources: z.number().int().positive(),
	compressionLevel: z.enum([
		'high',
		'medium',
		'low'
	]),
	includeAnswerStructure: z.boolean(),
	includeReasoningHints: z.boolean(),
	metadata: metadataSchema.default({})
})

export const evaluationModeSchema = z.enum([
	'no-rag',
	'naive-rag',
	'context-pack'
])

export const evaluationCaseSchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	name: z.string().min(1),
	query: z.string().min(1),
	category: queryIntentSchema,
	expectedSources: z.array(z.string()),
	expectedAnswerPoints: z.array(z.string()),
	forbiddenClaims: z.array(z.string()),
	maxContextTokens: z.number().int().positive(),
	metadata: metadataSchema,
	createdAt: dateSchema,
	updatedAt: dateSchema
})

export const evaluationScoreSchema = z.object({
	correctness: normalizedScoreSchema,
	grounding: normalizedScoreSchema,
	actionability: normalizedScoreSchema,
	riskAwareness: normalizedScoreSchema,
	tokenEfficiency: normalizedScoreSchema,
	hallucinationPenalty: normalizedScoreSchema,
	permissionPenalty: normalizedScoreSchema,
	total: normalizedScoreSchema
})

export const evaluationRunSchema = z.object({
	id: uuidSchema,
	workspaceId: uuidSchema,
	projectId: uuidSchema,
	evaluationCaseId: uuidSchema,
	mode: evaluationModeSchema,
	query: z.string().min(1),
	answer: z.string(),
	contextPackId: uuidSchema.optional(),
	scores: evaluationScoreSchema,
	metadata: metadataSchema,
	createdAt: dateSchema
})

export type QueryIntent = z.infer<typeof queryIntentSchema>
export type KnowledgeSourceType = z.infer<typeof knowledgeSourceTypeSchema>
export type MemoryRecordType = z.infer<typeof memoryRecordTypeSchema>
export type RecordStatus = z.infer<typeof recordStatusSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type Project = z.infer<typeof projectSchema>
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>
export type KnowledgeChunk = z.infer<typeof knowledgeChunkSchema>
export type MemoryRecord = z.infer<typeof memoryRecordSchema>
export type DecisionMemory = z.infer<typeof decisionMemorySchema>
export type RetrievalScoreBreakdown = z.infer<typeof retrievalScoreBreakdownSchema>
export type RetrievalCandidate = z.infer<typeof retrievalCandidateSchema>
export type ContextPackSourceExcerpt = z.infer<typeof contextPackSourceExcerptSchema>
export type ContextPack = z.infer<typeof contextPackSchema>
export type ModelContextProfile = z.infer<typeof modelContextProfileSchema>
export type EvaluationMode = z.infer<typeof evaluationModeSchema>
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>
export type EvaluationScore = z.infer<typeof evaluationScoreSchema>
export type EvaluationRun = z.infer<typeof evaluationRunSchema>

export type EmbeddingProvider = {
	provider: string
	model: string
	dimensions: number
	embedText(text: string): Promise<Array<number>>
}

export type RetrieveContextInput = {
	workspaceId: string
	projectId: string
	query: string
	topK?: number
}

export type VectorSearchInput = {
	workspaceId: string
	projectId: string
	vector: Array<number>
	topK: number
}

export type TextSearchInput = {
	workspaceId: string
	projectId: string
	query: string
	topK: number
}

export type VectorSearchRepository = {
	searchByVector(input: VectorSearchInput): Promise<Array<RetrievalCandidate>>
}

export type TextSearchRepository = {
	searchByText(input: TextSearchInput): Promise<Array<RetrievalCandidate>>
}

export type Retriever = {
	retrieve(input: RetrieveContextInput): Promise<Array<RetrievalCandidate>>
}
