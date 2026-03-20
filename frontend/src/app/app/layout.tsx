'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/hooks/use-auth';
import { ChatWorkspaceProvider } from '@/hooks/use-chat-workspace';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-2 text-sm text-[var(--muted)]">
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <ChatWorkspaceProvider>
      <AppShell>{children}</AppShell>
    </ChatWorkspaceProvider>
  );
}
