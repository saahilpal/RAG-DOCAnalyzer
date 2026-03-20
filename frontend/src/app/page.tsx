'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Linkedin, MessagesSquare, ScanSearch, Zap } from 'lucide-react';
import { LogoMark } from '@/components/common/logo-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const features = [
  {
    title: 'Conversational RAG',
    description: 'Ask follow-up questions naturally and keep answers grounded in your files.',
    icon: MessagesSquare,
  },
  {
    title: 'Multi-document context',
    description: 'Attach multiple documents to one thread and reason across them quickly.',
    icon: ScanSearch,
  },
  {
    title: 'Fast streaming answers',
    description: 'Responses arrive smoothly with stable layout and focused reading flow.',
    icon: Zap,
  },
];

const howItWorks = [
  'Upload your documents',
  'Ask questions in plain language',
  'Get grounded answers with context',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1400px] flex-col rounded-[32px] border border-[color:var(--line)] bg-[var(--panel)] shadow-[var(--shadow-soft)]">
        <header className="flex items-center justify-between px-6 py-5 sm:px-8">
          <LogoMark />

          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]">
              Login
            </Link>
            <Link href="/signup">
              <Button size="lg">Sign up</Button>
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
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                AI Document Workspace
              </div>
              <h1 className="font-display text-5xl font-semibold leading-[0.96] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                Chat with your documents.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
                A production-ready RAG experience for focused conversations, grounded answers, and clean workflow.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup">
                  <Button size="lg">
                    Start chatting
                    <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="secondary">
                    Login
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.08 }}
              className="relative"
            >
              <Card className="overflow-hidden rounded-[30px]">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <div className="bg-[var(--sidebar)] px-4 py-5 text-[var(--sidebar-foreground)]">
                    <Button className="w-full justify-start border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.1)] text-[var(--sidebar-foreground)] hover:bg-[rgba(255,255,255,0.14)]">
                      New chat
                    </Button>

                    <div className="mt-6 space-y-2">
                      <div className="rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-3 py-3">
                        <p className="truncate text-sm font-semibold">Strategy review</p>
                        <p className="mt-1 text-xs text-[var(--sidebar-muted)]">2 files attached</p>
                      </div>
                      <div className="rounded-[18px] px-3 py-3 text-sm text-[var(--sidebar-muted)]">Policy notes</div>
                      <div className="rounded-[18px] px-3 py-3 text-sm text-[var(--sidebar-muted)]">Roadmap</div>
                    </div>
                  </div>

                  <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(245,245,245,0.95))] px-5 py-5">
                    <div className="flex justify-end">
                      <div className="max-w-[78%] rounded-[20px] bg-[var(--foreground)] px-4 py-3 text-sm text-[var(--background-strong)] shadow-[0_18px_36px_rgba(24,24,27,0.16)]">
                        Compare these two documents and summarize what changed in the launch plan.
                      </div>
                    </div>

                    <div className="mt-5 max-w-[86%] rounded-[20px] border border-[color:var(--line)] bg-[var(--panel-strong)] px-5 py-4 shadow-[var(--shadow-panel)]">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Assistant</p>
                      <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                        The latest revision delays onboarding by two weeks, shifts ownership, and adds measurable
                        rollout checkpoints.
                      </p>
                    </div>

                    <div className="mt-6 rounded-[20px] border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4 shadow-[var(--shadow-panel)]">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[color:var(--line)] bg-[var(--background-strong)] px-3 py-2 text-xs text-[var(--foreground)]">
                          roadmap.pdf
                        </span>
                        <span className="rounded-full border border-[color:var(--line)] bg-[var(--background-strong)] px-3 py-2 text-xs text-[var(--foreground)]">
                          launch-plan.pdf
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                        <span>Message your documents</span>
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
                  <Card className="h-full rounded-[24px] bg-[var(--panel-strong)] p-6">
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

          <section className="py-2">
            <Card className="rounded-[24px] p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">How it works</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {howItWorks.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-xl border border-[color:var(--line)] bg-[var(--background-strong)] px-4 py-3 text-sm text-[var(--foreground)]"
                  >
                    <span className="mr-2 text-[var(--muted)]">{index + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-auto border-t border-[color:var(--line)] px-1 pt-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">About me</p>
                <h3 className="font-display mt-3 text-3xl font-semibold text-[var(--foreground)]">Built by Sahil Pal</h3>
                <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">
                  This project delivers a clean chat-first RAG product with resilient backend foundations and polished
                  user experience.
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
