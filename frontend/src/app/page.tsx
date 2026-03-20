'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Linkedin, MessagesSquare, ScanSearch, Zap } from 'lucide-react';
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

const features = [
  {
    title: 'Conversational RAG',
    description: 'Ask follow-up questions like you would in ChatGPT.',
    icon: MessagesSquare,
  },
  {
    title: 'Multi-document context',
    description: 'Attach multiple PDFs to one chat and keep answers grounded.',
    icon: ScanSearch,
  },
  {
    title: 'Fast streaming answers',
    description: 'Watch responses arrive naturally while your thread stays clean.',
    icon: Zap,
  },
];

export default function LandingPage() {
  const [limits, setLimits] = useState(DEFAULT_LIMITS);

  useEffect(() => {
    getWorkspaceLimits()
      .then((data) => {
        setLimits(data.limits);
      })
      .catch(() => {
        setLimits(DEFAULT_LIMITS);
      });
  }, []);

  return (
    <div className="min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1400px] flex-col rounded-[36px] border border-[color:var(--line)] bg-[rgba(255,250,244,0.72)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <header className="flex items-center justify-between px-6 py-5 sm:px-8">
          <LogoMark />

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] md:block">
              Sign in
            </Link>
            <Link href="/app">
              <Button size="lg">Start Chatting</Button>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-6 pb-6 pt-4 sm:px-8 lg:px-12">
          <section className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32 }}
              className="max-w-2xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.86)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Chat-first document AI
              </div>
              <h1 className="font-display text-5xl font-semibold leading-[0.96] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                Chat with your documents. Like ChatGPT, but smarter.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
                Bring PDFs into one thread, ask natural follow-ups, and get grounded answers that stream back instantly.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/app">
                  <Button size="lg">
                    Start Chatting
                    <ArrowRight size={16} />
                  </Button>
                </Link>
                <div className="rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.82)] px-4 py-2 text-sm text-[var(--muted)]">
                  {limits.maxDocsPerChat} docs per chat • {limits.maxChatRequestsPerDay} hosted replies daily
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.08 }}
              className="relative"
            >
              <div className="absolute -left-8 top-8 hidden h-28 w-28 rounded-full bg-[var(--accent-soft)] blur-3xl lg:block" />
              <div className="absolute -right-6 bottom-4 hidden h-24 w-24 rounded-full bg-[rgba(19,16,14,0.12)] blur-3xl lg:block" />

              <Card className="overflow-hidden rounded-[32px] border-[rgba(255,255,255,0.7)] bg-[rgba(255,251,246,0.88)]">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <div className="bg-[var(--sidebar)] px-4 py-5 text-[var(--sidebar-foreground)]">
                    <Button className="w-full justify-start border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.08)] text-[var(--sidebar-foreground)] hover:bg-[rgba(255,255,255,0.14)]">
                      New chat
                    </Button>

                    <div className="mt-6 space-y-2">
                      <div className="rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.1)] px-3 py-3">
                        <p className="truncate text-sm font-semibold">Product strategy review</p>
                        <p className="mt-1 text-xs text-[var(--sidebar-muted)]">2 files attached</p>
                      </div>
                      <div className="rounded-[22px] px-3 py-3 text-sm text-[var(--sidebar-muted)]">Hiring packet</div>
                      <div className="rounded-[22px] px-3 py-3 text-sm text-[var(--sidebar-muted)]">Board prep</div>
                    </div>
                  </div>

                  <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,248,241,0.85))] px-5 py-5">
                    <div className="flex justify-end">
                      <div className="max-w-[78%] rounded-[24px] bg-[var(--foreground)] px-4 py-3 text-sm text-[var(--background-strong)] shadow-[0_18px_36px_rgba(17,14,11,0.16)]">
                        Compare these two documents and tell me what changed in the rollout plan.
                      </div>
                    </div>

                    <div className="mt-5 max-w-[86%] rounded-[26px] border border-[color:var(--line)] bg-[rgba(255,252,247,0.92)] px-5 py-4 shadow-[0_10px_28px_rgba(18,14,10,0.08)]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Assistant</p>
                      <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                        The newer rollout delays enterprise onboarding by two weeks, adds owner-level metrics, and shifts the launch target from self-serve growth to retention.
                      </p>
                    </div>

                    <div className="mt-6 rounded-[26px] border border-[rgba(255,255,255,0.8)] bg-[rgba(255,251,246,0.9)] px-4 py-4 shadow-[0_20px_40px_rgba(18,14,10,0.1)]">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.94)] px-3 py-2 text-xs text-[var(--foreground)]">
                          q4-roadmap.pdf
                        </span>
                        <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.94)] px-3 py-2 text-xs text-[var(--foreground)]">
                          launch-plan.pdf
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                        <span>Ask anything about your documents</span>
                        <span className="rounded-full bg-[var(--foreground)] px-3 py-1 text-xs text-[var(--background-strong)]">
                          Send
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </section>

          <section className="grid gap-4 py-6 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.1 + index * 0.05 }}
                >
                  <Card className="h-full rounded-[28px] bg-[rgba(255,252,247,0.8)] p-6">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <Icon size={18} />
                    </div>
                    <h2 className="mt-5 font-display text-2xl font-semibold text-[var(--foreground)]">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </section>

          <section className="mt-auto border-t border-[color:var(--line)] px-1 pt-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">About me</p>
                <h3 className="font-display mt-3 text-3xl font-semibold text-[var(--foreground)]">Built by Sahil Pal</h3>
                <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">
                  Backend-heavy engineer focused on resilient systems, product execution, and interfaces that feel calm under pressure.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="https://github.com/saahilpal" target="_blank">
                  <Button variant="secondary">
                    <Github size={16} />
                    GitHub
                  </Button>
                </Link>
                <Link href="https://www.linkedin.com/in/sahiilpal" target="_blank">
                  <Button variant="secondary">
                    <Linkedin size={16} />
                    LinkedIn
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
