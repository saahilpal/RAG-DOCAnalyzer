const { ok } = require('../utils/apiResponse');
const { uploadAndIndexDocument, listDocuments, deleteDocument } = require('../services/documentService');

async function upload(req, res) {
  const result = await uploadAndIndexDocument({
    userId: req.auth.userId,
    file: req.file,
  });

  return ok(
    res,
    {
      document: result.document,
      chunkCount: result.chunkCount,
      deduplicated: Boolean(result.deduplicated),
      reusedChunks: Boolean(result.reusedChunks),
    },
    201,
  );
}

async function list(req, res) {
  const documents = await listDocuments({
    userId: req.auth.userId,
    limit: req.query.limit || 50,
  });

  return ok(res, { documents });
}

async function remove(req, res) {
  const deleted = await deleteDocument({
    userId: req.auth.userId,
    documentId: req.params.id,
  });

  return ok(res, { deleted });
}

module.exports = {
  upload,
  list,
  remove,
};
