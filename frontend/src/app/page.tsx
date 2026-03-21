'use client';

import Link from 'next/link';
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
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1240px] flex-col rounded-md border border-[color:var(--line)] bg-[var(--panel)]">
        <header className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-3 sm:px-6">
          <LogoMark />

          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
              Login
            </Link>
            <Link href="/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-4 pb-5 pt-4 sm:px-6 lg:px-8">
          <section className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                AI Document Workspace
              </div>
              <h1 className="font-display text-4xl font-semibold leading-[1] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Chat with your documents.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
                A fast chat-first RAG experience with grounded answers, lightweight UI, and clean workflow.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link href="/signup">
                  <Button>
                    Start chatting
                    <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary">
                    Login
                  </Button>
                </Link>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[200px_1fr]">
                <div className="border-r border-[color:var(--line)] bg-[var(--sidebar)] px-3 py-3 text-[var(--sidebar-foreground)]">
                  <div className="rounded-md border border-[color:var(--sidebar-line)] bg-[var(--sidebar-elevated)] px-3 py-2 text-sm">
                    New chat
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm text-[var(--sidebar-muted)]">
                    <div className="rounded-md bg-[var(--sidebar-elevated)] px-2.5 py-2">Strategy review</div>
                    <div className="rounded-md px-2.5 py-2">Policy notes</div>
                    <div className="rounded-md px-2.5 py-2">Roadmap</div>
                  </div>
                </div>

                <div className="space-y-3 bg-[var(--background-strong)] px-3 py-3">
                  <div className="ml-auto max-w-[84%] rounded-md bg-[var(--foreground)] px-3 py-2 text-sm text-[var(--background-strong)]">
                    Compare these files and list what changed.
                  </div>
                  <div className="max-w-[88%] rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--foreground)]">
                    The updated revision shifts timeline ownership, adds checkpoints, and delays onboarding by two
                    weeks.
                  </div>
                  <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm text-[var(--muted)]">
                    Message your documents
                  </div>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid gap-3 py-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card key={feature.title} className="h-full bg-[var(--panel-strong)] p-4">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--line)] text-[var(--foreground)]">
                    <Icon size={16} />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{feature.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{feature.description}</p>
                </Card>
              );
            })}
          </section>

          <section className="py-1">
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">How it works</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {howItWorks.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-md border border-[color:var(--line)] bg-[var(--background-strong)] px-3 py-2 text-sm text-[var(--foreground)]"
                  >
                    <span className="mr-2 text-[var(--muted)]">{index + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-auto border-t border-[color:var(--line)] px-0.5 pt-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">About me</p>
                <h3 className="font-display mt-2 text-2xl font-semibold text-[var(--foreground)]">Built by Sahil Pal</h3>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--muted)]">
                  This project delivers a clean chat-first RAG product with resilient backend foundations and polished
                  user experience.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
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
