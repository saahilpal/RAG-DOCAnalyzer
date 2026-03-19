'use client';

import Link from 'next/link';
import { Github, Shield, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/common/page-transition';
import { useAuth } from '@/hooks/use-auth';
import { useChatWorkspace } from '@/hooks/use-chat-workspace';

export default function SettingsPage() {
  const { user } = useAuth();
  const {
    workspaceLimits,
    retrievalMode,
    readyStatus,
    repositoryUrl,
    runLocallyGuideUrl,
    workspaceMessage,
    chatQuota,
  } =
    useChatWorkspace();

  return (
    <PageTransition>
      <div className="mx-auto min-h-full max-w-4xl space-y-4 md:space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Workspace settings</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Chat-first limits, system health, and deployment details for this environment.
          </p>
        </header>

        <Card className="p-5">
          <p className="text-sm text-neutral-700">{workspaceMessage}</p>
          {workspaceLimits ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="muted">{workspaceLimits.maxFileSizeMb}MB max file</Badge>
              <Badge tone="muted">{workspaceLimits.maxDocsPerChat} files/chat</Badge>
              <Badge tone="muted">{workspaceLimits.maxChatRequestsPerDay} replies/day</Badge>
              <Badge tone="muted">History window {workspaceLimits.chatHistoryLimit}</Badge>
            </div>
          ) : null}
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-neutral-600" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">Account</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-700">Signed in as {user?.email}</p>
            <p className="mt-1 text-sm text-neutral-500">Authentication uses httpOnly JWT cookies.</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-neutral-600" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">System health</h2>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge tone={readyStatus.database ? 'default' : 'muted'}>
                  DB {readyStatus.database ? 'Ready' : 'Unavailable'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={readyStatus.ai ? 'default' : 'muted'}>
                  AI {readyStatus.ai ? 'Ready' : 'Unavailable'}
                </Badge>
              </div>
              <p className="text-neutral-500">Retrieval mode: {retrievalMode || 'fts'}</p>
              {chatQuota ? (
                <p className="text-neutral-500">
                  {chatQuota.used} used, {chatQuota.remaining} remaining today
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Github size={16} className="text-neutral-600" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">Open source</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href={repositoryUrl} target="_blank" className="text-neutral-800 underline underline-offset-4">
              View GitHub repository
            </Link>
            <Link href={runLocallyGuideUrl} target="_blank" className="text-neutral-800 underline underline-offset-4">
              Run locally
            </Link>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
