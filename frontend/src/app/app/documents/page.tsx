import Link from 'next/link';

export default function DocumentsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-10">
      <div className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Documents</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">Document management lives inside chat</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Upload a PDF in a chat thread, wait for processing, and then ask focused questions from the main workspace.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex rounded-md border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-muted)]"
        >
          Back to workspace
        </Link>
      </div>
    </div>
  );
}
