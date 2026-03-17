'use client';

import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type UploadDropzoneProps = {
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  progress?: number;
  maxFileSizeMb?: number;
  onError?: (message: string) => void;
};

export function UploadDropzone({
  onUpload,
  uploading = false,
  progress = 0,
  maxFileSizeMb = 10,
  onError,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  function reportError(message: string) {
    setLocalError(message);
    onError?.(message);
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    if (uploading) {
      return;
    }

    setLocalError('');

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      reportError('Only PDF files are supported.');
      return;
    }

    if (file.size > maxFileSizeBytes) {
      reportError(`File exceeds ${maxFileSizeMb}MB demo limit.`);
      return;
    }

    await onUpload(file);
  }

  return (
    <motion.div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setDragging(false);
        try {
          await handleFile(event.dataTransfer.files?.[0] || null);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload failed.';
          reportError(message);
        }
      }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.22 }}
      className={cn(
        'rounded-2xl border border-dashed bg-white p-8 text-center shadow-sm transition',
        dragging ? 'border-neutral-700 bg-neutral-100' : 'border-neutral-300',
      )}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-700">
        <UploadCloud size={20} />
      </div>
      <h3 className="text-base font-semibold text-neutral-900">Drag and drop your PDF here</h3>
      <p className="mt-1 text-sm text-neutral-500">
        or upload manually from your device ({maxFileSizeMb}MB max in demo mode)
      </p>

      <div className="mt-5 flex justify-center">
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading...' : 'Select PDF'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          try {
            await handleFile(event.target.files?.[0] || null);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Upload failed.';
            reportError(message);
          } finally {
            event.target.value = '';
          }
        }}
      />

      {uploading ? (
        <div className="mx-auto mt-5 max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full bg-neutral-900 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-neutral-500">{progress}% uploaded</p>
        </div>
      ) : null}

      {localError ? <p className="mt-3 text-sm text-neutral-700">{localError}</p> : null}
    </motion.div>
  );
}
