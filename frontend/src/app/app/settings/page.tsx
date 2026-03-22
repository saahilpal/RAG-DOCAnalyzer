import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-6 py-10">
      <Card className="w-full rounded-[28px] bg-[rgba(255,255,255,0.84)] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Settings</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
          Account controls are available from the workspace panel
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Open the top-right panel to review usage, reset your password, access the project quick start, or sign out.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Usage</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">See remaining daily messages</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Security</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Reset password when needed</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Links</p>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Open the project quick start</p>
          </div>
        </div>
        <Link href="/app" className="mt-6 inline-flex">
          <Button variant="secondary">Back to workspace</Button>
        </Link>
      </Card>
    </div>
  );
}
