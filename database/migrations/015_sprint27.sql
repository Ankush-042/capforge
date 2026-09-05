-- Migration 015: Sprint 27 — Analytics, Legal Docs, Workspace Files, Notification Prefs

-- Workspace file uploads (was flagged as a genuine audit gap — tasks/
-- discussions existed since Sprint 11, files never did)
CREATE TABLE workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Founders-agreement/NDA scaffolding (PRD §21)
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- FOUNDERS_AGREEMENT | NDA | CONTRIBUTOR_AGREEMENT
  content TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Real notification preferences, actually backed by a table this time
-- (Settings' toggles existed visually before this, with nothing persisting them)
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  connections BOOLEAN NOT NULL DEFAULT true,
  recommendations BOOLEAN NOT NULL DEFAULT true,
  team_updates BOOLEAN NOT NULL DEFAULT true,
  ai_analysis BOOLEAN NOT NULL DEFAULT false
);
