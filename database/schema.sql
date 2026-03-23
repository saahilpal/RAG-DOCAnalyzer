CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS query_cache CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS chat_documents CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS daily_chat_usage CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  provider TEXT,
  provider_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chats ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  client_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chat_id, client_message_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'indexed', 'failed')),
  page_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  processing_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  indexed_at TIMESTAMPTZ,
  UNIQUE (user_id, document_hash)
);

CREATE TABLE IF NOT EXISTS chat_documents (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, document_id)
);

CREATE OR REPLACE FUNCTION limit_chat_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM chat_documents
    WHERE chat_id = NEW.chat_id
  ) >= 3 THEN
    RAISE EXCEPTION 'A chat can have at most 3 documents attached';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_limit_chat_documents ON chat_documents;

CREATE TRIGGER trg_limit_chat_documents
BEFORE INSERT ON chat_documents
FOR EACH ROW
EXECUTE FUNCTION limit_chat_documents();

CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_chat_usage (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
  ON users(provider, provider_id)
  WHERE provider IS NOT NULL AND provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id_pinned_updated_at ON chats(user_id, pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_status_processing ON documents(status) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_documents_processing_started_at ON documents(processing_started_at);
CREATE INDEX IF NOT EXISTS idx_chat_documents_document_id ON chat_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_search_vector ON chunks USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_daily_chat_usage_date ON daily_chat_usage(usage_date DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_opclass
    WHERE opcname = 'vector_cosine_ops'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops)';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END
$$;
