'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DocumentRecord } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { UploadDropzone } from '@/components/documents/upload-dropzone';
import { DocumentTable } from '@/components/documents/document-table';
import { useAppData } from '@/hooks/use-app-data';
import { PageTransition } from '@/components/common/page-transition';

export default function DocumentsPage() {
  const router = useRouter();
  const {
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    setActiveSessionId,
    uploadDocumentFile,
    removeDocument,
    demoLimits,
    demoMessage,
  } = useAppData();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);

  async function onUpload(file: File) {
    setError('');
    setUploading(true);
    setProgress(0);

    try {
      await uploadDocumentFile(file, (value) => setProgress(value));
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        setError(uploadError.message);
      } else {
        setError('Upload failed.');
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="mx-auto min-h-full max-w-6xl space-y-4 md:space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Document Manager</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Upload, organize, and manage every indexed document in your workspace.
            </p>
          </div>

          <Button variant="secondary" onClick={() => router.push('/app')}>
            Back to Chat
          </Button>
        </header>

        <Card className="border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
          {demoMessage}{' '}
          {demoLimits ? (
            <span className="font-medium">
              {demoLimits.maxFileSizeMb}MB max file • {demoLimits.maxPagesPerDoc} pages/document • {demoLimits.maxDocsPerUser}{' '}
              docs/user
            </span>
          ) : null}
        </Card>

        {error ? (
          <Card className="border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">{error}</Card>
        ) : null}

        <UploadDropzone
          onUpload={onUpload}
          uploading={uploading}
          progress={progress}
          maxFileSizeMb={demoLimits?.maxFileSizeMb || 10}
          onError={(message) => setError(message)}
        />

        <DocumentTable
          documents={documents}
          onOpenInChat={(documentId) => {
            setSelectedDocumentId(documentId);
            setActiveSessionId(null);
            router.push('/app');
          }}
          onDelete={(document) => setDeleteTarget(document)}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete document"
          description="This action permanently removes indexed chunks and linked chat sessions."
          confirmLabel="Delete"
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }
            await removeDocument(deleteTarget.id);
            if (selectedDocumentId === deleteTarget.id) {
              setActiveSessionId(null);
            }
            setDeleteTarget(null);
          }}
        />
      </div>
  );
}
