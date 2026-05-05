import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getTableName } from 'drizzle-orm'
import {
	apiKeys,
	auditLogs,
	contextPacks,
	decisionMemories,
	embeddings,
	evaluationCases,
	evaluationRuns,
	knowledgeChunks,
	knowledgeSources,
	memoryRecords,
	projects,
	schemaTables,
	workspaces
} from '../src/schema'

describe('database schema', () => {
	test('exports all required tables', () => {
		expect(schemaTables.map((table) => getTableName(table)).sort()).toEqual([
			'api_keys',
			'audit_logs',
			'context_packs',
			'decision_memories',
			'embeddings',
			'evaluation_cases',
			'evaluation_runs',
			'knowledge_chunks',
			'knowledge_sources',
			'memory_records',
			'projects',
			'workspaces'
		])
	})

	test('scopes records by workspace and project where relevant', () => {
		expect(workspaces.id).toBeDefined()
		expect(projects.workspaceId).toBeDefined()
		expect(knowledgeSources.workspaceId).toBeDefined()
		expect(knowledgeSources.projectId).toBeDefined()
		expect(knowledgeChunks.workspaceId).toBeDefined()
		expect(knowledgeChunks.projectId).toBeDefined()
		expect(memoryRecords.workspaceId).toBeDefined()
		expect(memoryRecords.projectId).toBeDefined()
		expect(decisionMemories.workspaceId).toBeDefined()
		expect(decisionMemories.projectId).toBeDefined()
		expect(embeddings.workspaceId).toBeDefined()
		expect(embeddings.projectId).toBeDefined()
		expect(contextPacks.workspaceId).toBeDefined()
		expect(contextPacks.projectId).toBeDefined()
		expect(evaluationCases.workspaceId).toBeDefined()
		expect(evaluationCases.projectId).toBeDefined()
		expect(evaluationRuns.workspaceId).toBeDefined()
		expect(evaluationRuns.projectId).toBeDefined()
		expect(auditLogs.workspaceId).toBeDefined()
		expect(apiKeys.workspaceId).toBeDefined()
	})

	test('defines pgvector migration support and important indexes', () => {
		const migrationPath = join(import.meta.dir, '..', 'drizzle', '0000_groovy_ben_grimm.sql')
		const journalPath = join(import.meta.dir, '..', 'drizzle', 'meta', '_journal.json')
		const migration = readFileSync(migrationPath, 'utf8')

		expect(existsSync(journalPath)).toBe(true)
		expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS vector')
		expect(migration).toContain('vector(1536)')
		expect(migration).toContain('USING hnsw')
		expect(migration).toContain('knowledge_chunks_project_id_idx')
		expect(migration).toContain('memory_records_status_idx')
		expect(migration).toContain('api_keys_key_hash_idx')
		expect(migration).toContain('FOREIGN KEY ("project_id","workspace_id")')
		expect(migration).toContain('FOREIGN KEY ("source_id","project_id","workspace_id")')
		expect(migration.indexOf('projects_id_workspace_id_idx')).toBeLessThan(
			migration.indexOf('api_keys_project_scope_fk')
		)
		expect(migration.indexOf('knowledge_sources_id_project_workspace_idx')).toBeLessThan(
			migration.indexOf('knowledge_chunks_source_scope_fk')
		)
	})
})
