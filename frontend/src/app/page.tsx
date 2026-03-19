'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, MessageSquare, Shield, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/common/logo-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getWorkspaceLimits, type WorkspaceLimits } from '@/lib/api';

const DEFAULT_LIMITS: WorkspaceLimits = {
  maxFileSizeMb: 10,
  maxPagesPerDoc: 40,
  maxChunksPerDoc: 200,
  maxDocsPerChat: 3,
  maxChatRequestsPerDay: 20,
  chatHistoryLimit: 8,
  chatMessageListLimit: 200,
  ragTopK: 6,
  workerPollIntervalMs: 1000,
};

const DEFAULT_GITHUB = 'https://github.com/saahilpal/RAG-DOCAnalyzer';

const features = [
  {
    title: 'Chat-first, not dashboard-first',
    description: 'Every conversation lives in a clean sidebar-and-thread workspace with attachments as lightweight context.',
    icon: MessageSquare,
  },
  {
    title: 'Async document processing',
    description: 'Files upload fast, index in the background, and move through clear states until they are ready.',
    icon: FileText,
  },
  {
    title: 'Grounded answers with continuity',
    description: 'The assistant uses recent conversation plus retrieved document context when it is available.',
    icon: Sparkles,
  },
];

export default function LandingPage() {
  const [limits, setLimits] = useState<WorkspaceLimits>(DEFAULT_LIMITS);
  const [githubUrl, setGithubUrl] = useState(DEFAULT_GITHUB);
  const [runGuideUrl, setRunGuideUrl] = useState(`${DEFAULT_GITHUB}#quick-start`);
  const [notice, setNotice] = useState(
    'Chat-first RAG workspace with lightweight attachments and predictable operating limits.',
  );

  useEffect(() => {
    getWorkspaceLimits()
      .then((data) => {
        setLimits(data.limits);
        setGithubUrl(data.links.githubRepositoryUrl || DEFAULT_GITHUB);
        setRunGuideUrl(data.links.runLocallyGuideUrl || `${DEFAULT_GITHUB}#quick-start`);
        setNotice(data.philosophy);
      })
      .catch(() => {
        setLimits(DEFAULT_LIMITS);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
          <LogoMark />

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden text-sm font-medium text-neutral-700 hover:text-neutral-900 md:block">
              Sign in
            </Link>
            <Link href="/app">
              <Button size="sm">Open workspace</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-12 md:px-8 md:pt-20">
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
          {notice}{' '}
          <span className="font-medium">
            {limits.maxFileSizeMb}MB max file • {limits.maxDocsPerChat} files/chat • {limits.maxChatRequestsPerDay} replies/day
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.1em] text-neutral-600">
            Chat-First RAG
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">
            Ask naturally. Attach documents only when you need grounded context.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            A clean ChatGPT-style workspace where follow-up questions keep their context and uploaded PDFs stay in the background.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app">
              <Button size="lg">
                Launch workspace
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href={githubUrl} target="_blank">
              <Button variant="secondary" size="lg">
                View source
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.08 }}
          className="mx-auto mt-14 max-w-5xl"
        >
          <Card className="overflow-hidden border-neutral-200">
            <div className="grid gap-0 md:grid-cols-[240px_1fr]">
              <div className="border-b border-neutral-200 bg-white p-4 md:border-b-0 md:border-r">
                <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">Chats</p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm text-white">
                    Product strategy notes
                  </div>
                  <div className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                    Hiring loop recap
                  </div>
                </div>
              </div>

              <div className="bg-[linear-gradient(180deg,rgba(248,248,248,0.9),rgba(255,255,255,1))] p-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
                    strategy.pdf • Ready
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
                    roadmap.pdf • Processing
                  </span>
                </div>

                <div className="ml-auto max-w-md rounded-2xl border border-neutral-300 bg-neutral-200 px-4 py-3 text-sm text-neutral-900">
                  Summarize the strategy doc, and compare it with our last roadmap discussion.
                </div>
                <div className="mt-4 max-w-md rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
                  The strategy document emphasizes margin expansion and self-serve onboarding. Compared with your earlier roadmap chat, the main gap is measurement: the doc proposes goals, but the roadmap thread never defined owner-level success metrics.
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="p-6">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700">
                  <Icon size={18} />
                </span>
                <h2 className="text-lg font-semibold text-neutral-900">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{feature.description}</p>
              </Card>
            );
          })}
        </section>

        <Card className="mt-16 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-neutral-500">Run it yourself</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                Open source and easy to run locally
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={githubUrl} target="_blank">
                <Button variant="secondary">GitHub</Button>
              </Link>
              <Link href={runGuideUrl} target="_blank">
                <Button>Quick start</Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            <Shield size={14} />
            Runtime limits stay intentionally bounded for predictable performance and cost control.
          </div>
        </Card>
      </main>
    </div>
  );
}
