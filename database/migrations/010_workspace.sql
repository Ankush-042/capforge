CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(startup_id)
);

CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'TODO',
  priority TEXT DEFAULT 'MEDIUM',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_discussions_workspace_id ON discussions(workspace_id);
