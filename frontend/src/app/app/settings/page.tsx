'use client';

import Link from 'next/link';
import { Bell, Github, KeyRound, Shield } from 'lucide-react';
import { DeveloperCard } from '@/components/common/developer-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/common/page-transition';
import { useAuth } from '@/hooks/use-auth';
import { useAppData } from '@/hooks/use-app-data';

export default function SettingsPage() {
  const { user } = useAuth();
  const { demoLimits, retrievalMode, readyStatus, repositoryUrl, runLocallyGuideUrl, demoMessage } = useAppData();

  return (
    <PageTransition>
      <div className="mx-auto min-h-full max-w-5xl space-y-4 md:space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Settings</h1>
          <p className="mt-1 text-sm text-neutral-600">Demo environment details, limits, and operational status.</p>
        </header>

        <Card className="p-5">
          <p className="text-sm text-neutral-700">{demoMessage}</p>
          {demoLimits ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="muted">{demoLimits.maxFileSizeMb}MB max file</Badge>
              <Badge tone="muted">{demoLimits.maxDocsPerUser} docs/user</Badge>
              <Badge tone="muted">{demoLimits.maxChatRequestsPerDay} questions/day</Badge>
              <Badge tone="muted">Top {demoLimits.maxContextChunks} context chunks</Badge>
            </div>
          ) : null}
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-neutral-600" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">Account</h2>
            </div>
            <p className="mt-3 text-sm text-neutral-700">Signed in as {user?.email}</p>
            <p className="mt-1 text-sm text-neutral-500">Authentication uses httpOnly JWT cookies.</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-neutral-600" />
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
                  AI {readyStatus.ai ? 'Ready' : 'Fallback mode likely'}
                </Badge>
              </div>
              <p className="text-neutral-500">Retrieval mode: {retrievalMode || 'fts'}</p>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Github size={16} className="text-neutral-600" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">Open source</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href={repositoryUrl} target="_blank" className="underline underline-offset-4 text-neutral-800">
              View GitHub Repository
            </Link>
            <Link href={runLocallyGuideUrl} target="_blank" className="underline underline-offset-4 text-neutral-800">
              Run Locally Guide
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-neutral-600" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">Notes</h2>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            This project intentionally enforces strict free-tier limits for reliability and cost safety in public demo
            mode. Run locally with your own API key for unlimited experimentation.
          </p>
        </Card>

        <DeveloperCard compact />
      </div>
    </PageTransition>
  );
}
