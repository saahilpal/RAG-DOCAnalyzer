const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('documents'),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(384),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(12_000),

  RETRIEVAL_MODE: z.enum(['fts', 'vector']).default('fts'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AUTH_COOKIE_NAME: z.string().default('doc_analyzer_token'),

  CORS_ORIGIN: z.string().min(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  CHAT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

  MAX_REQUEST_BODY_SIZE: z.string().default('1mb'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  MAX_UPLOAD_FILE_SIZE_BYTES: z.coerce.number().int().positive().optional(),
  MAX_PAGES_PER_DOC: z.coerce.number().int().positive().default(40),
  MAX_CHUNKS_PER_DOC: z.coerce.number().int().positive().default(200),
  MAX_CONTEXT_CHUNKS: z.coerce.number().int().positive().default(4),
  MAX_CHAT_REQUESTS_PER_DAY: z.coerce.number().int().positive().default(20),
  MAX_DOCS_PER_USER: z.coerce.number().int().positive().default(3),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),

  CHUNK_SIZE_TOKENS: z.coerce.number().int().positive().default(450),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().int().nonnegative().default(80),

  GITHUB_REPOSITORY_URL: z.string().url().default('https://github.com/saahilpal/document-analyzer-rag-showcase'),
  RUN_LOCALLY_GUIDE_URL: z.string().url().default('https://github.com/saahilpal/document-analyzer-rag-showcase#quick-start'),

  SAMPLE_DOC_PATH: z.string().default('sample_docs/system_design_primer.pdf'),
  ENABLE_SAMPLE_DOC_SEED: z
    .string()
    .optional()
    .transform((value) => (value == null ? true : value.toLowerCase() === 'true')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const env = parsed.data;

const maxUploadFileSizeBytes = env.MAX_UPLOAD_FILE_SIZE_BYTES || env.MAX_FILE_SIZE_MB * 1024 * 1024;

module.exports = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',

  host: env.HOST,
  port: env.PORT,

  databaseUrl: env.DATABASE_URL,
  supabaseUrl: env.SUPABASE_URL,
  supabaseServiceKey: env.SUPABASE_SERVICE_KEY,
  supabaseStorageBucket: env.SUPABASE_STORAGE_BUCKET,

  geminiApiKey: env.GEMINI_API_KEY,
  geminiModel: env.GEMINI_MODEL,
  geminiEmbeddingModel: env.GEMINI_EMBEDDING_MODEL,
  embeddingDimension: env.EMBEDDING_DIMENSION,
  aiTimeoutMs: env.AI_TIMEOUT_MS,

  retrievalMode: env.RETRIEVAL_MODE,

  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  authCookieName: env.AUTH_COOKIE_NAME,

  corsOrigin: env.CORS_ORIGIN,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
  authRateLimitMax: env.AUTH_RATE_LIMIT_MAX,
  uploadRateLimitMax: env.UPLOAD_RATE_LIMIT_MAX,
  chatRateLimitMax: env.CHAT_RATE_LIMIT_MAX,

  maxRequestBodySize: env.MAX_REQUEST_BODY_SIZE,
  maxFileSizeMb: env.MAX_FILE_SIZE_MB,
  maxUploadFileSizeBytes,
  maxPagesPerDoc: env.MAX_PAGES_PER_DOC,
  maxChunksPerDoc: env.MAX_CHUNKS_PER_DOC,
  maxContextChunks: env.MAX_CONTEXT_CHUNKS,
  maxChatRequestsPerDay: env.MAX_CHAT_REQUESTS_PER_DAY,
  maxDocsPerUser: env.MAX_DOCS_PER_USER,
  cacheTtlSeconds: env.CACHE_TTL_SECONDS,

  chunkSizeTokens: env.CHUNK_SIZE_TOKENS,
  chunkOverlapTokens: env.CHUNK_OVERLAP_TOKENS,

  githubRepositoryUrl: env.GITHUB_REPOSITORY_URL,
  runLocallyGuideUrl: env.RUN_LOCALLY_GUIDE_URL,

  sampleDocPath: env.SAMPLE_DOC_PATH,
  enableSampleDocSeed: env.ENABLE_SAMPLE_DOC_SEED,
};
