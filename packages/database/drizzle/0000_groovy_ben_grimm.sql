CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."compression_level" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."context_style" AS ENUM('markdown', 'json', 'xml');--> statement-breakpoint
CREATE TYPE "public"."evaluation_mode" AS ENUM('no-rag', 'naive-rag', 'context-pack');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_type" AS ENUM('repo', 'file', 'markdown', 'chat', 'decision', 'manual_memory', 'ticket', 'web_doc');--> statement-breakpoint
CREATE TYPE "public"."memory_record_type" AS ENUM('fact', 'decision', 'constraint', 'preference', 'warning', 'architecture', 'bug_history', 'implementation_pattern');--> statement-breakpoint
CREATE TYPE "public"."query_intent" AS ENUM('before_acting', 'decision_lookup', 'implementation_plan', 'risk_discovery', 'debugging', 'onboarding', 'code_convention', 'conflict_detection', 'explain', 'search');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'deprecated', 'replaced');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"project_id" uuid,
	"actor_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"query" text NOT NULL,
	"intent" "query_intent" NOT NULL,
	"payload" jsonb NOT NULL,
	"token_budget" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"decision" text NOT NULL,
	"reason" text NOT NULL,
	"tradeoffs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"chunk_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"vector" vector(1536) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"query" text NOT NULL,
	"category" "query_intent" NOT NULL,
	"expected_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_answer_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_context_tokens" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"evaluation_case_id" uuid NOT NULL,
	"mode" "evaluation_mode" NOT NULL,
	"query" text NOT NULL,
	"answer" text NOT NULL,
	"context_pack_id" uuid,
	"scores" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"content_hash" text NOT NULL,
	"token_count" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "knowledge_source_type" NOT NULL,
	"name" text NOT NULL,
	"uri" text,
	"content_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "memory_record_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"confidence" real NOT NULL,
	"source_chunk_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_id_workspace_id_idx" ON "projects" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_sources_id_project_workspace_idx" ON "knowledge_sources" USING btree ("id","project_id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_id_project_workspace_idx" ON "knowledge_chunks" USING btree ("id","project_id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "context_packs_id_project_workspace_idx" ON "context_packs" USING btree ("id","project_id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_cases_id_project_workspace_idx" ON "evaluation_cases" USING btree ("id","project_id","workspace_id");--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_packs" ADD CONSTRAINT "context_packs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_packs" ADD CONSTRAINT "context_packs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_packs" ADD CONSTRAINT "context_packs_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_memories" ADD CONSTRAINT "decision_memories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_memories" ADD CONSTRAINT "decision_memories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_memories" ADD CONSTRAINT "decision_memories_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_chunk_id_knowledge_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_chunk_scope_fk" FOREIGN KEY ("chunk_id","project_id","workspace_id") REFERENCES "public"."knowledge_chunks"("id","project_id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_cases" ADD CONSTRAINT "evaluation_cases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_cases" ADD CONSTRAINT "evaluation_cases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_cases" ADD CONSTRAINT "evaluation_cases_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_evaluation_case_id_evaluation_cases_id_fk" FOREIGN KEY ("evaluation_case_id") REFERENCES "public"."evaluation_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_context_pack_id_context_packs_id_fk" FOREIGN KEY ("context_pack_id") REFERENCES "public"."context_packs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_case_scope_fk" FOREIGN KEY ("evaluation_case_id","project_id","workspace_id") REFERENCES "public"."evaluation_cases"("id","project_id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_context_pack_scope_fk" FOREIGN KEY ("context_pack_id","project_id","workspace_id") REFERENCES "public"."context_packs"("id","project_id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_scope_fk" FOREIGN KEY ("source_id","project_id","workspace_id") REFERENCES "public"."knowledge_sources"("id","project_id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_records" ADD CONSTRAINT "memory_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_records" ADD CONSTRAINT "memory_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_records" ADD CONSTRAINT "memory_records_project_scope_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_workspace_id_idx" ON "api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "api_keys_project_id_idx" ON "api_keys" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_created_at_idx" ON "api_keys" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_project_id_idx" ON "audit_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "context_packs_workspace_id_idx" ON "context_packs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "context_packs_project_id_idx" ON "context_packs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "context_packs_created_at_idx" ON "context_packs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "decision_memories_workspace_id_idx" ON "decision_memories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "decision_memories_project_id_idx" ON "decision_memories" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "decision_memories_status_idx" ON "decision_memories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "decision_memories_created_at_idx" ON "decision_memories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "embeddings_workspace_id_idx" ON "embeddings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "embeddings_project_id_idx" ON "embeddings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "embeddings_chunk_id_idx" ON "embeddings" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "embeddings_created_at_idx" ON "embeddings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "embeddings_vector_idx" ON "embeddings" USING hnsw ("vector" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "evaluation_cases_workspace_id_idx" ON "evaluation_cases" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "evaluation_cases_project_id_idx" ON "evaluation_cases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "evaluation_cases_created_at_idx" ON "evaluation_cases" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "evaluation_runs_workspace_id_idx" ON "evaluation_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "evaluation_runs_project_id_idx" ON "evaluation_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "evaluation_runs_evaluation_case_id_idx" ON "evaluation_runs" USING btree ("evaluation_case_id");--> statement-breakpoint
CREATE INDEX "evaluation_runs_created_at_idx" ON "evaluation_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_workspace_id_idx" ON "knowledge_chunks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_project_id_idx" ON "knowledge_chunks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_source_id_idx" ON "knowledge_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_content_hash_idx" ON "knowledge_chunks" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_created_at_idx" ON "knowledge_chunks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "knowledge_sources_workspace_id_idx" ON "knowledge_sources" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "knowledge_sources_project_id_idx" ON "knowledge_sources" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "knowledge_sources_content_hash_idx" ON "knowledge_sources" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "knowledge_sources_created_at_idx" ON "knowledge_sources" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "memory_records_workspace_id_idx" ON "memory_records" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "memory_records_project_id_idx" ON "memory_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memory_records_status_idx" ON "memory_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "memory_records_created_at_idx" ON "memory_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_slug_idx" ON "projects" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_created_at_idx" ON "workspaces" USING btree ("created_at");
