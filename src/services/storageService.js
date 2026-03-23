const path = require('path');
const { supabase } = require('../config/supabase');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

function sanitizeFileName(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  const baseName = path.basename(fileName || 'document', ext).replace(/[^a-zA-Z0-9-_]+/g, '_');
  return `${baseName || 'document'}${ext || '.pdf'}`;
}

function buildPrivateFileReference(storagePath) {
  return storagePath;
}

async function uploadDocumentBuffer({ userId, originalName, buffer, mimeType }) {
  const safeName = sanitizeFileName(originalName);
  const storagePath = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(storagePath, buffer, {
      contentType: mimeType || 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new AppError(502, 'STORAGE_UPLOAD_FAILED', 'Failed to upload file to Supabase Storage.', {
      message: uploadError.message,
    });
  }

  return {
    storagePath,
    fileUrl: buildPrivateFileReference(storagePath),
  };
}

async function downloadDocumentBuffer(storagePath) {
  const { data, error } = await supabase.storage.from(env.supabaseStorageBucket).download(storagePath);

  if (error || !data) {
    throw new AppError(502, 'STORAGE_DOWNLOAD_FAILED', 'Failed to download file from Supabase Storage.', {
      message: error?.message || 'Missing storage object.',
    });
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function deleteDocumentObject(storagePath) {
  if (!storagePath) {
    return;
  }

  const { error } = await supabase.storage.from(env.supabaseStorageBucket).remove([storagePath]);
  if (error) {
    throw new AppError(502, 'STORAGE_DELETE_FAILED', 'Failed to delete file from Supabase Storage.', {
      message: error.message,
    });
  }
}

module.exports = {
  uploadDocumentBuffer,
  downloadDocumentBuffer,
  deleteDocumentObject,
};
