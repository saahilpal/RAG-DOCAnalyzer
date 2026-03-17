const test = require('node:test');
const assert = require('node:assert/strict');

// Override env vars before requiring any modules
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service_key';
process.env.GEMINI_API_KEY = 'demo_key';
process.env.JWT_SECRET = '12345678901234567890123456789012';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.MAX_UPLOAD_FILE_SIZE_BYTES = '100';

const { registerSchema, loginSchema } = require('../src/validations/authSchemas');
const { streamChatSchema } = require('../src/validations/chatSchemas');
const { uploadFileSchema } = require('../src/validations/documentSchemas');
const { chunkText } = require('../src/utils/chunkText');
const { getRemainingChatRequests } = require('../src/services/quotaService');

test('auth schema normalizes email and enforces password length', () => {
  const parsed = registerSchema.parse({
    email: '  USER@Example.COM  ',
    password: 'passw0rd!',
  });

  assert.equal(parsed.email, 'user@example.com');

  const shortPassword = loginSchema.safeParse({
    email: 'user@example.com',
    password: 'short',
  });

  assert.equal(shortPassword.success, false);
});

test('chat schema enforces query max length', () => {
  const tooLong = streamChatSchema.safeParse({
    documentId: '7bb4d4ee-1f5d-44a7-8d73-a9587db0fb4e',
    query: 'x'.repeat(4001),
  });

  assert.equal(tooLong.success, false);
});

test('upload schema enforces max file size', () => {
  const tooLarge = uploadFileSchema.safeParse({
    originalname: 'demo.pdf',
    mimetype: 'application/pdf',
    size: 101,
    buffer: Buffer.from('%PDF-1.4'),
  });

  assert.equal(tooLarge.success, false);

  const valid = uploadFileSchema.safeParse({
    originalname: 'demo.pdf',
    mimetype: 'application/pdf',
    size: 100,
    buffer: Buffer.from('%PDF-1.4'),
  });

  assert.equal(valid.success, true);
});

test('chunking keeps overlap boundaries deterministic', () => {
  const input = Array.from({ length: 30 }, (_, idx) => `token-${idx + 1}`).join(' ');
  const chunks = chunkText(input, 10, 2);

  assert.equal(chunks.length, 4);
  assert.equal(chunks[0].chunkIndex, 0);
  assert.equal(chunks[1].chunkIndex, 1);
  assert.ok(chunks[0].content.includes('token-1'));
  assert.ok(chunks[1].content.includes('token-9'));
});

test('remaining daily quota never goes negative', () => {
  assert.equal(getRemainingChatRequests(0), 20);
  assert.equal(getRemainingChatRequests(20), 0);
  assert.equal(getRemainingChatRequests(999), 0);
});
