import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DocumentsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-10">
      <Card className="w-full rounded-[28px] bg-[rgba(255,255,255,0.84)] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Documents</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">Document management lives inside chat</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Upload a PDF in the main workspace, wait for the assistant to confirm it is ready, then continue with
          focused questions.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">1</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Upload in chat</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">2</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Wait for processing</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">3</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Ask questions</p>
          </div>
        </div>
        <Link href="/app" className="mt-6 inline-flex">
          <Button variant="secondary">Back to workspace</Button>
        </Link>
      </Card>
    </div>
  );
}
