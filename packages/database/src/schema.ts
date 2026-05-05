import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	vector
} from 'drizzle-orm/pg-core'

export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', [
	'repo',
	'file',
	'markdown',
	'chat',
	'decision',
	'manual_memory',
	'ticket',
	'web_doc'
])

export const memoryRecordTypeEnum = pgEnum('memory_record_type', [
	'fact',
	'decision',
	'constraint',
	'preference',
	'warning',
	'architecture',
	'bug_history',
	'implementation_pattern'
])

export const recordStatusEnum = pgEnum('record_status', [
	'active',
	'deprecated',
	'replaced'
])

export const queryIntentEnum = pgEnum('query_intent', [
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

export const contextStyleEnum = pgEnum('context_style', [
	'markdown',
	'json',
	'xml'
])

export const compressionLevelEnum = pgEnum('compression_level', [
	'high',
	'medium',
	'low'
])

export const evaluationModeEnum = pgEnum('evaluation_mode', [
	'no-rag',
	'naive-rag',
	'context-pack'
])

const createdAt = timestamp('created_at', {
	withTimezone: true
}).notNull().defaultNow()

const updatedAt = timestamp('updated_at', {
	withTimezone: true
}).notNull().defaultNow()

const metadata = jsonb('metadata').$type<Record<string, unknown>>().notNull().default({})

export const workspaces = pgTable('workspaces', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	uniqueIndex('workspaces_slug_idx').on(table.slug),
	index('workspaces_created_at_idx').on(table.createdAt)
])

export const projects = pgTable('projects', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	name: text('name').notNull(),
	slug: text('slug').notNull(),
	description: text('description'),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('projects_workspace_id_idx').on(table.workspaceId),
	uniqueIndex('projects_id_workspace_id_idx').on(table.id, table.workspaceId),
	uniqueIndex('projects_workspace_slug_idx').on(table.workspaceId, table.slug),
	index('projects_created_at_idx').on(table.createdAt)
])

export const knowledgeSources = pgTable('knowledge_sources', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	type: knowledgeSourceTypeEnum('type').notNull(),
	name: text('name').notNull(),
	uri: text('uri'),
	contentHash: text('content_hash'),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('knowledge_sources_workspace_id_idx').on(table.workspaceId),
	index('knowledge_sources_project_id_idx').on(table.projectId),
	uniqueIndex('knowledge_sources_id_project_workspace_idx').on(table.id, table.projectId, table.workspaceId),
	index('knowledge_sources_content_hash_idx').on(table.contentHash),
	index('knowledge_sources_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'knowledge_sources_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade')
])

export const knowledgeChunks = pgTable('knowledge_chunks', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	sourceId: uuid('source_id').notNull().references(() => knowledgeSources.id, {
		onDelete: 'cascade'
	}),
	content: text('content').notNull(),
	summary: text('summary'),
	contentHash: text('content_hash').notNull(),
	tokenCount: integer('token_count').notNull(),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('knowledge_chunks_workspace_id_idx').on(table.workspaceId),
	index('knowledge_chunks_project_id_idx').on(table.projectId),
	index('knowledge_chunks_source_id_idx').on(table.sourceId),
	uniqueIndex('knowledge_chunks_id_project_workspace_idx').on(table.id, table.projectId, table.workspaceId),
	index('knowledge_chunks_content_hash_idx').on(table.contentHash),
	index('knowledge_chunks_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'knowledge_chunks_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade'),
	foreignKey({
		name: 'knowledge_chunks_source_scope_fk',
		columns: [table.sourceId, table.projectId, table.workspaceId],
		foreignColumns: [knowledgeSources.id, knowledgeSources.projectId, knowledgeSources.workspaceId]
	}).onDelete('cascade')
])

export const memoryRecords = pgTable('memory_records', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	type: memoryRecordTypeEnum('type').notNull(),
	title: text('title').notNull(),
	content: text('content').notNull(),
	status: recordStatusEnum('status').notNull().default('active'),
	confidence: real('confidence').notNull(),
	sourceChunkIds: jsonb('source_chunk_ids').$type<Array<string>>().notNull().default([]),
	validFrom: timestamp('valid_from', {
		withTimezone: true
	}),
	validUntil: timestamp('valid_until', {
		withTimezone: true
	}),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('memory_records_workspace_id_idx').on(table.workspaceId),
	index('memory_records_project_id_idx').on(table.projectId),
	index('memory_records_status_idx').on(table.status),
	index('memory_records_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'memory_records_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade')
])

export const decisionMemories = pgTable('decision_memories', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	title: text('title').notNull(),
	decision: text('decision').notNull(),
	reason: text('reason').notNull(),
	tradeoffs: jsonb('tradeoffs').$type<Array<string>>().notNull().default([]),
	alternatives: jsonb('alternatives').$type<Array<string>>().notNull().default([]),
	status: recordStatusEnum('status').notNull().default('active'),
	sourceIds: jsonb('source_ids').$type<Array<string>>().notNull().default([]),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('decision_memories_workspace_id_idx').on(table.workspaceId),
	index('decision_memories_project_id_idx').on(table.projectId),
	index('decision_memories_status_idx').on(table.status),
	index('decision_memories_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'decision_memories_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade')
])

export const embeddings = pgTable('embeddings', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	chunkId: uuid('chunk_id').notNull().references(() => knowledgeChunks.id, {
		onDelete: 'cascade'
	}),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	dimensions: integer('dimensions').notNull(),
	vector: vector('vector', {
		dimensions: 1536
	}).notNull(),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('embeddings_workspace_id_idx').on(table.workspaceId),
	index('embeddings_project_id_idx').on(table.projectId),
	index('embeddings_chunk_id_idx').on(table.chunkId),
	index('embeddings_created_at_idx').on(table.createdAt),
	index('embeddings_vector_idx').using('hnsw', table.vector.op('vector_cosine_ops')),
	foreignKey({
		name: 'embeddings_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade'),
	foreignKey({
		name: 'embeddings_chunk_scope_fk',
		columns: [table.chunkId, table.projectId, table.workspaceId],
		foreignColumns: [knowledgeChunks.id, knowledgeChunks.projectId, knowledgeChunks.workspaceId]
	}).onDelete('cascade')
])

export const contextPacks = pgTable('context_packs', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	query: text('query').notNull(),
	intent: queryIntentEnum('intent').notNull(),
	payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
	tokenBudget: integer('token_budget').notNull(),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('context_packs_workspace_id_idx').on(table.workspaceId),
	index('context_packs_project_id_idx').on(table.projectId),
	uniqueIndex('context_packs_id_project_workspace_idx').on(table.id, table.projectId, table.workspaceId),
	index('context_packs_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'context_packs_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade')
])

export const evaluationCases = pgTable('evaluation_cases', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	name: text('name').notNull(),
	query: text('query').notNull(),
	category: queryIntentEnum('category').notNull(),
	expectedSources: jsonb('expected_sources').$type<Array<string>>().notNull().default([]),
	expectedAnswerPoints: jsonb('expected_answer_points').$type<Array<string>>().notNull().default([]),
	forbiddenClaims: jsonb('forbidden_claims').$type<Array<string>>().notNull().default([]),
	maxContextTokens: integer('max_context_tokens').notNull(),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('evaluation_cases_workspace_id_idx').on(table.workspaceId),
	index('evaluation_cases_project_id_idx').on(table.projectId),
	uniqueIndex('evaluation_cases_id_project_workspace_idx').on(table.id, table.projectId, table.workspaceId),
	index('evaluation_cases_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'evaluation_cases_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade')
])

export const evaluationRuns = pgTable('evaluation_runs', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').notNull().references(() => projects.id, {
		onDelete: 'cascade'
	}),
	evaluationCaseId: uuid('evaluation_case_id').notNull().references(() => evaluationCases.id, {
		onDelete: 'cascade'
	}),
	mode: evaluationModeEnum('mode').notNull(),
	query: text('query').notNull(),
	answer: text('answer').notNull(),
	contextPackId: uuid('context_pack_id').references(() => contextPacks.id, {
		onDelete: 'set null'
	}),
	scores: jsonb('scores').$type<Record<string, number>>().notNull(),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('evaluation_runs_workspace_id_idx').on(table.workspaceId),
	index('evaluation_runs_project_id_idx').on(table.projectId),
	index('evaluation_runs_evaluation_case_id_idx').on(table.evaluationCaseId),
	index('evaluation_runs_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'evaluation_runs_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade'),
	foreignKey({
		name: 'evaluation_runs_case_scope_fk',
		columns: [table.evaluationCaseId, table.projectId, table.workspaceId],
		foreignColumns: [evaluationCases.id, evaluationCases.projectId, evaluationCases.workspaceId]
	}).onDelete('cascade'),
	foreignKey({
		name: 'evaluation_runs_context_pack_scope_fk',
		columns: [table.contextPackId, table.projectId, table.workspaceId],
		foreignColumns: [contextPacks.id, contextPacks.projectId, contextPacks.workspaceId]
	}).onDelete('set null')
])

export const auditLogs = pgTable('audit_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').references(() => workspaces.id, {
		onDelete: 'set null'
	}),
	projectId: uuid('project_id').references(() => projects.id, {
		onDelete: 'set null'
	}),
	actorId: text('actor_id'),
	action: text('action').notNull(),
	resourceType: text('resource_type').notNull(),
	resourceId: uuid('resource_id'),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('audit_logs_workspace_id_idx').on(table.workspaceId),
	index('audit_logs_project_id_idx').on(table.projectId),
	index('audit_logs_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'audit_logs_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('set null')
])

export const apiKeys = pgTable('api_keys', {
	id: uuid('id').primaryKey().defaultRandom(),
	workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, {
		onDelete: 'cascade'
	}),
	projectId: uuid('project_id').references(() => projects.id, {
		onDelete: 'cascade'
	}),
	name: text('name').notNull(),
	keyHash: text('key_hash').notNull(),
	lastUsedAt: timestamp('last_used_at', {
		withTimezone: true
	}),
	revokedAt: timestamp('revoked_at', {
		withTimezone: true
	}),
	metadata,
	createdAt,
	updatedAt
}, (table) => [
	index('api_keys_workspace_id_idx').on(table.workspaceId),
	index('api_keys_project_id_idx').on(table.projectId),
	uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
	index('api_keys_created_at_idx').on(table.createdAt),
	foreignKey({
		name: 'api_keys_project_scope_fk',
		columns: [table.projectId, table.workspaceId],
		foreignColumns: [projects.id, projects.workspaceId]
	}).onDelete('cascade')
])

export const schemaTables = [
	workspaces,
	projects,
	knowledgeSources,
	knowledgeChunks,
	memoryRecords,
	decisionMemories,
	embeddings,
	contextPacks,
	evaluationCases,
	evaluationRuns,
	auditLogs,
	apiKeys
]
