const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service_key';
process.env.GEMINI_API_KEY = 'test_key';
process.env.JWT_SECRET = '12345678901234567890123456789012';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.RESEND_API_KEY = 're_test_key';
process.env.RESEND_FROM = 'DocAnalyzer <onboarding@resend.dev>';

const app = require('../src/app');
const { AppError } = require('../src/utils/errors');
const chatController = require('../src/controllers/chatController');
const chatService = require('../src/services/chatService');
const documentService = require('../src/services/documentService');
const ragService = require('../src/services/ragService');
const quotaService = require('../src/services/quotaService');
const db = require('../src/database/client');
const env = require('../src/config/env');
const storageService = require('../src/services/storageService');
const geminiService = require('../src/services/geminiService');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CHAT_ID = '22222222-2222-4222-8222-222222222222';
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333';
const USER_MESSAGE_ID = '44444444-4444-4444-8444-444444444444';
const ASSISTANT_MESSAGE_ID = '55555555-5555-4555-8555-555555555555';

function authHeader() {
  return {
    Authorization: `Bearer ${jwt.sign(
      { sub: USER_ID, email: 'user@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    )}`,
  };
}

function sseParser(res, callback) {
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => callback(null, data));
}

function createMockResponse() {
  let closed = false;
  const chunks = [];

  return {
    chunks,
    res: {
      writableEnded: false,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      flushHeaders() {},
      write(chunk) {
        chunks.push(chunk);
      },
      end() {
        this.writableEnded = true;
        closed = true;
      },
      get ended() {
        return closed;
      },
    },
  };
}

test('stream endpoint emits chat.meta, assistant.delta, and assistant.completed events', async (t) => {
  t.mock.method(chatService, 'getOwnedChat', async () => ({ id: CHAT_ID, user_id: USER_ID, title: 'Chat' }));
  t.mock.method(quotaService, 'assertUserChatQuotaAvailable', async () => ({
    used: 0,
    remaining: 20,
    limit: 20,
  }));
  t.mock.method(documentService, 'listChatDocuments', async () => [
    { id: DOCUMENT_ID, file_name: 'plan.pdf', status: 'indexed' },
  ]);
  t.mock.method(chatService, 'getRecentChatMessages', async () => [
    { role: 'user', content: 'What did the plan say?' },
    { role: 'assistant', content: 'It focused on growth.' },
  ]);
  t.mock.method(chatService, 'createUserMessage', async () => ({
    id: USER_MESSAGE_ID,
    chat_id: CHAT_ID,
    role: 'user',
    content: 'Follow up',
    created_at: new Date().toISOString(),
  }));
  t.mock.method(ragService, 'streamAssistantReply', async ({ history, indexedDocuments, onToken }) => {
    assert.equal(history.length, 2);
    assert.equal(indexedDocuments.length, 1);
    onToken('Hello ');
    onToken('world');
    return {
      answer: 'Hello world',
      retrievedChunkCount: 1,
    };
  });
  t.mock.method(chatService, 'saveAssistantMessageAndConsumeQuota', async () => ({
    message: {
      id: ASSISTANT_MESSAGE_ID,
      chat_id: CHAT_ID,
      role: 'assistant',
      content: 'Hello world',
      created_at: new Date().toISOString(),
    },
    quota: {
      used: 1,
      remaining: 19,
      limit: 20,
    },
  }));

  const response = await request(app)
    .post(`/api/v1/chats/${CHAT_ID}/messages/stream`)
    .set(authHeader())
    .send({
      content: 'Follow up',
      clientMessageId: 'client-1',
    })
    .buffer(true)
    .parse(sseParser);

  assert.equal(response.status, 200);
  assert.match(response.body, /event: chat\.meta/);
  assert.match(response.body, /event: assistant\.delta/);
  assert.match(response.body, /Hello world/);
  assert.match(response.body, /event: assistant\.completed/);
});

test('stream endpoint surfaces explicit retrieval errors and skips assistant persistence', async (t) => {
  t.mock.method(chatService, 'getOwnedChat', async () => ({ id: CHAT_ID, user_id: USER_ID, title: 'Chat' }));
  t.mock.method(quotaService, 'assertUserChatQuotaAvailable', async () => ({
    used: 0,
    remaining: 20,
    limit: 20,
  }));
  t.mock.method(documentService, 'listChatDocuments', async () => [
    { id: DOCUMENT_ID, file_name: 'plan.pdf', status: 'indexed' },
  ]);
  t.mock.method(chatService, 'getRecentChatMessages', async () => []);
  t.mock.method(chatService, 'createUserMessage', async () => ({
    id: USER_MESSAGE_ID,
    chat_id: CHAT_ID,
    role: 'user',
    content: 'Follow up',
    created_at: new Date().toISOString(),
  }));
  t.mock.method(ragService, 'streamAssistantReply', async () => {
    throw new AppError(503, 'RETRIEVAL_FAILED', 'Failed to retrieve document context.');
  });
  const saveMock = t.mock.method(chatService, 'saveAssistantMessageAndConsumeQuota', async () => {
    throw new Error('should not be called');
  });

  const response = await request(app)
    .post(`/api/v1/chats/${CHAT_ID}/messages/stream`)
    .set(authHeader())
    .send({
      content: 'Follow up',
      clientMessageId: 'client-2',
    })
    .buffer(true)
    .parse(sseParser);

  assert.equal(response.status, 200);
  assert.match(response.body, /event: error/);
  assert.match(response.body, /RETRIEVAL_FAILED/);
  assert.equal(saveMock.mock.callCount(), 0);
});

test('upload endpoint returns ATTACHMENT_LIMIT_REACHED when a fourth file is attached', async (t) => {
  t.mock.method(documentService, 'attachDocumentToChat', async () => {
    throw new AppError(409, 'ATTACHMENT_LIMIT_REACHED', 'Each chat can include up to 3 documents.');
  });

  const response = await request(app)
    .post(`/api/v1/chats/${CHAT_ID}/documents`)
    .set(authHeader())
    .attach('file', Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'), 'notes.pdf');

  assert.equal(response.status, 409);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error.code, 'ATTACHMENT_LIMIT_REACHED');
});

test('rag prompt uses both history and retrieved context for follow-up questions', async (t) => {
  let capturedPrompt = '';

  t.mock.method(db, 'query', async () => ({
    rowCount: 1,
    rows: [
      {
        document_id: DOCUMENT_ID,
        file_name: 'strategy.pdf',
        chunk_index: 3,
        content: 'The strategy emphasizes product-led growth and margin expansion.',
      },
    ],
  }));
  t.mock.method(geminiService, 'streamGeneration', async function* (prompt) {
    capturedPrompt = prompt;
    yield 'Grounded response';
  });

  const result = await ragService.streamAssistantReply({
    userId: USER_ID,
    chatId: CHAT_ID,
    history: [
      { role: 'user', content: 'Summarize the strategy doc.' },
      { role: 'assistant', content: 'It focuses on product-led growth.' },
    ],
    indexedDocuments: [{ id: DOCUMENT_ID }],
    userMessage: 'How does that compare with our roadmap discussion?',
  });

  assert.equal(result.answer, 'Grounded response');
  assert.match(capturedPrompt, /Summarize the strategy doc/);
  assert.match(capturedPrompt, /product-led growth/);
  assert.match(capturedPrompt, /strategy\.pdf/);
  assert.match(capturedPrompt, /How does that compare with our roadmap discussion/);
});

test('rag prompt supports chat without attached documents', async (t) => {
  let capturedPrompt = '';

  t.mock.method(geminiService, 'streamGeneration', async function* (prompt) {
    capturedPrompt = prompt;
    yield 'General answer';
  });

  const result = await ragService.streamAssistantReply({
    userId: USER_ID,
    chatId: CHAT_ID,
    history: [{ role: 'user', content: 'Help me draft a reply.' }],
    indexedDocuments: [],
    userMessage: 'Make it more concise.',
  });

  assert.equal(result.answer, 'General answer');
  assert.match(capturedPrompt, /Help me draft a reply/);
  assert.match(capturedPrompt, /No uploaded document context attached to this chat/);
});

test('retrieval failures are raised explicitly as RETRIEVAL_FAILED', async (t) => {
  t.mock.method(db, 'query', async () => {
    throw new Error('fts exploded');
  });

  await assert.rejects(
    () =>
      ragService.retrieveRelevantChunks({
        userId: USER_ID,
        chatId: CHAT_ID,
        query: 'What changed?',
      }),
    (error) => {
      assert.equal(error.code, 'RETRIEVAL_FAILED');
      return true;
    },
  );
});

test('vector retrieval falls back to fts when Gemini embeddings fail', async (t) => {
  const originalRetrievalMode = env.retrievalMode;
  env.retrievalMode = 'vector';

  t.mock.method(geminiService, 'embedTexts', async () => {
    throw new AppError(503, 'AI_TEMPORARILY_UNAVAILABLE', 'Embedding failed.');
  });
  t.mock.method(db, 'query', async () => ({
    rowCount: 1,
    rows: [
      {
        document_id: DOCUMENT_ID,
        file_name: 'strategy.pdf',
        chunk_index: 1,
        content: 'Fallback fts chunk.',
      },
    ],
  }));

  try {
    const result = await ragService.retrieveRelevantChunks({
      userId: USER_ID,
      chatId: CHAT_ID,
      query: 'What changed?',
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].content, 'Fallback fts chunk.');
  } finally {
    env.retrievalMode = originalRetrievalMode;
  }
});

test('disconnect during stream does not save an assistant message or consume quota', async (t) => {
  t.mock.method(chatService, 'getOwnedChat', async () => ({ id: CHAT_ID, user_id: USER_ID, title: 'Chat' }));
  t.mock.method(quotaService, 'assertUserChatQuotaAvailable', async () => ({
    used: 0,
    remaining: 20,
    limit: 20,
  }));
  t.mock.method(documentService, 'listChatDocuments', async () => []);
  t.mock.method(chatService, 'getRecentChatMessages', async () => []);
  t.mock.method(chatService, 'createUserMessage', async () => ({
    id: USER_MESSAGE_ID,
    chat_id: CHAT_ID,
    role: 'user',
    content: 'Follow up',
    created_at: new Date().toISOString(),
  }));
  t.mock.method(ragService, 'streamAssistantReply', async () => {
    throw new AppError(499, 'CLIENT_DISCONNECTED', 'Client disconnected before response completed.');
  });
  const saveMock = t.mock.method(chatService, 'saveAssistantMessageAndConsumeQuota', async () => {
    throw new Error('should not be called');
  });

  const req = {
    auth: { userId: USER_ID },
    params: { chatId: CHAT_ID },
    body: { content: 'Follow up', clientMessageId: 'client-9' },
    on() {},
  };
  const { res } = createMockResponse();
  let nextError = null;

  await chatController.streamMessage(req, res, (error) => {
    nextError = error;
  });

  assert.equal(nextError, null);
  assert.equal(saveMock.mock.callCount(), 0);
});

test('worker moves a processing document to indexed with chunks', async (t) => {
  const pdfParsePath = require.resolve('pdf-parse');
  const workerPath = require.resolve('../src/services/documentWorkerService');
  const originalPdfModule = require.cache[pdfParsePath];

  require.cache[pdfParsePath] = {
    id: pdfParsePath,
    filename: pdfParsePath,
    loaded: true,
    exports: async () => ({
      text: 'alpha beta gamma delta epsilon zeta eta theta iota kappa',
      numpages: 2,
    }),
  };

  delete require.cache[workerPath];
  const workerService = require('../src/services/documentWorkerService');

  let transactionCount = 0;
  const queries = [];

  t.mock.method(storageService, 'downloadDocumentBuffer', async () => Buffer.from('pdf'));
  t.mock.method(db, 'withTransaction', async (callback) => {
    transactionCount += 1;
    const client = {
      query: async (sql, params = []) => {
        queries.push({ transactionCount, sql, params });

        if (transactionCount === 1 && sql.includes('SELECT id,')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: DOCUMENT_ID,
                user_id: USER_ID,
                file_name: 'strategy.pdf',
                storage_path: `${USER_ID}/strategy.pdf`,
              },
            ],
          };
        }

        if (transactionCount === 1 && sql.includes('SET processing_started_at = NOW()')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: DOCUMENT_ID,
                user_id: USER_ID,
                file_name: 'strategy.pdf',
                storage_path: `${USER_ID}/strategy.pdf`,
              },
            ],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return callback(client);
  });

  const processed = await workerService.processNextPendingDocument();

  if (originalPdfModule) {
    require.cache[pdfParsePath] = originalPdfModule;
  } else {
    delete require.cache[pdfParsePath];
  }
  delete require.cache[workerPath];

  assert.equal(processed, true);
  assert.ok(queries.some((entry) => entry.sql.includes("SET status = 'indexed'")));
  assert.ok(queries.some((entry) => entry.sql.includes('INSERT INTO chunks')));
});
