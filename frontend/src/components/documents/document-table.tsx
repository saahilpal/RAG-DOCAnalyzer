import { ArrowUpRight } from 'lucide-react';
import { Dropdown } from '@/components/ui/dropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import type { DocumentRecord } from '@/lib/api';

function getStatus(document: DocumentRecord): 'Indexed' | 'Processing' | 'Error' {
  if (document.indexing_status === 'error') {
    return 'Error';
  }

  if (document.indexing_status === 'processing') {
    return 'Processing';
  }

  return 'Indexed';
}

type DocumentTableProps = {
  documents: DocumentRecord[];
  onOpenInChat: (documentId: string) => void;
  onDelete: (document: DocumentRecord) => void;
};

export function DocumentTable({ documents, onOpenInChat, onDelete }: DocumentTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-500">
              <th className="px-5 py-3 font-medium">Document name</th>
              <th className="px-5 py-3 font-medium">Upload date</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-500">
                  No documents uploaded yet.
                </td>
              </tr>
            ) : (
              documents.map((document) => {
                const status = getStatus(document);

                return (
                  <tr key={document.id} className="border-b border-neutral-100 text-sm text-neutral-700 last:border-none">
                    <td className="px-5 py-4">
                      <p className="font-medium text-neutral-900">{document.file_name}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {document.page_count} pages • {document.chunk_count} chunks
                      </p>
                    </td>
                    <td className="px-5 py-4 text-neutral-600">{formatDate(document.created_at)}</td>
                    <td className="px-5 py-4">
                      <Badge tone={status === 'Indexed' ? 'default' : status === 'Error' ? 'danger' : 'muted'}>
                        {status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenInChat(document.id)}
                          className="text-neutral-700"
                        >
                          <ArrowUpRight size={14} />
                          Open
                        </Button>

                        <Dropdown
                          items={[
                            {
                              label: 'Delete',
                              destructive: true,
                              onSelect: () => onDelete(document),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
