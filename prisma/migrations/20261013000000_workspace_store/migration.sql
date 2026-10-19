
CREATE TABLE schema_versions(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);
CREATE TABLE users(
 id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,
 team TEXT NOT NULL DEFAULT '',password_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL
);
CREATE TABLE workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE memberships(
 workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('owner','member')),created_at TEXT NOT NULL,
 PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE workspace_state(
 workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision>=1),state TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE sessions(
 token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 password_version INTEGER NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE invitations(
 id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 email TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','member')),token_hash TEXT NOT NULL UNIQUE,
 expires_at TEXT NOT NULL,accepted_at TEXT,accepted_user_id TEXT REFERENCES users(id),
 creator_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL
);
CREATE INDEX invitations_workspace ON invitations(workspace_id);
CREATE TABLE rate_guards(key_hash TEXT PRIMARY KEY,window_start BIGINT NOT NULL,hits INTEGER NOT NULL);
