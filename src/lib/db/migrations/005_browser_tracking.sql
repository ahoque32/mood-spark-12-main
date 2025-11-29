-- Browser Sessions Table
CREATE TABLE IF NOT EXISTS browser_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL,
  metrics TEXT, -- JSON with aggregated metrics
  activity_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Browser Activities Table
CREATE TABLE IF NOT EXISTS browser_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  data TEXT, -- JSON data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES browser_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_browser_sessions_user_id ON browser_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_last_activity ON browser_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_browser_activities_session_id ON browser_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_browser_activities_user_id ON browser_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_activities_timestamp ON browser_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_browser_activities_type ON browser_activities(activity_type);

-- Feature Store Table (if not exists)
CREATE TABLE IF NOT EXISTS feature_store (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  source TEXT NOT NULL, -- 'BROWSER', 'SYSTEM', 'CALENDAR', etc.
  features TEXT NOT NULL, -- JSON with extracted features
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_store_user_id ON feature_store(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_store_timestamp ON feature_store(timestamp);
CREATE INDEX IF NOT EXISTS idx_feature_store_source ON feature_store(source);