const express = require('express');
const multer = require('multer');
const env = require('../config/env');
const { asyncHandler } = require('../utils/asyncHandler');
const { requireAuth } = require('../middlewares/requireAuth');
const { uploadIpLimiter } = require('../middlewares/limiters');
const { validateParams, validateQuery, validateFile } = require('../middlewares/validate');
const {
  documentIdParamsSchema,
  listDocumentsQuerySchema,
  uploadFileSchema,
} = require('../validations/documentSchemas');
const controller = require('../controllers/documentController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadFileSizeBytes,
  },
});

router.post(
  '/upload',
  uploadIpLimiter,
  requireAuth,
  upload.single('file'),
  validateFile(uploadFileSchema),
  asyncHandler(controller.upload),
);
router.get('/', requireAuth, validateQuery(listDocumentsQuerySchema), asyncHandler(controller.list));
router.delete('/:id', requireAuth, validateParams(documentIdParamsSchema), asyncHandler(controller.remove));

module.exports = router;
