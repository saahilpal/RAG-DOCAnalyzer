'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FileUp,
  Github,
  Linkedin,
  MessagesSquare,
  ScanSearch,
  Zap,
} from 'lucide-react';
import { LogoMark } from '@/components/common/logo-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const features = [
  {
    title: 'Accurate answers from your documents',
    description: 'Responses stay focused on the uploaded file instead of drifting into generic chatbot mode.',
    icon: MessagesSquare,
  },
  {
    title: 'Fast processing',
    description: 'Upload a PDF, let the AI prepare it, then move straight into focused questions.',
    icon: Zap,
  },
  {
    title: 'Simple chat interface',
    description: 'One clean workspace for upload, processing, and question answering without clutter.',
    icon: ScanSearch,
  },
];

const howItWorks = [
  {
    title: 'Upload document',
    description: 'Drop in a PDF and see it appear directly in the conversation timeline.',
    icon: FileUp,
  },
  {
    title: 'AI processes it',
    description: 'The assistant shows clear processing and ready states before you can ask questions.',
    icon: Zap,
  },
  {
    title: 'Ask questions',
    description: 'Get focused answers about topics, concepts, or sections from your document.',
    icon: MessagesSquare,
  },
];

const proofPoints = ['Grounded answers', 'Responsive workspace', 'Email-secured access'];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-3 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-4rem] h-56 w-56 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute bottom-0 right-[-7rem] h-64 w-64 rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1280px] flex-col rounded-[28px] border border-[color:var(--line)] bg-[rgba(247,244,238,0.94)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-4 sm:px-6 lg:px-8">
          <LogoMark />

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--muted)] transition-colors duration-200 hover:text-[var(--foreground)]"
            >
              Login
            </Link>
            <Link href="/signup">
              <Button>Try now</Button>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-4 pb-8 pt-5 sm:px-6 sm:pb-10 lg:px-10 lg:pt-8">
          <section className="grid items-center gap-8 pb-8 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:gap-12">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                AI document chat
              </div>
              <h1 className="font-display text-4xl font-semibold leading-[0.98] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                Chat with your documents using AI
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Upload a document, let the AI process it, then ask focused questions in a clean chat workspace built
                for grounded answers.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/signup">
                  <Button size="lg">
                    Try the workspace
                    <ArrowRight size={16} />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" size="lg">Sign in</Button>
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {proofPoints.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/70 px-3 py-1.5 text-sm text-[var(--muted)]"
                  >
                    <CheckCircle2 size={14} className="text-[var(--foreground)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden rounded-[28px] border-white/60 bg-[rgba(255,255,255,0.84)]">
              <div className="border-b border-[color:var(--line)] px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">How it feels</p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">A clear document chat flow</h2>
              </div>

              <div className="space-y-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(245,242,236,0.84))] p-5">
                <div className="ml-auto max-w-[88%] rounded-[22px] bg-[var(--foreground)] px-4 py-3 text-[var(--background-strong)] shadow-[var(--shadow-panel)]">
                  <p className="text-sm font-medium">Q2_Pricing_Plan.pdf</p>
                  <p className="mt-1 text-xs text-white/70">Uploaded just now</p>
                </div>

                <div className="max-w-[92%] rounded-[22px] border border-[color:var(--line)] bg-white px-4 py-3 text-[var(--foreground)] shadow-[var(--shadow-panel)]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Assistant</p>
                  <p className="mt-2 text-sm leading-6">Processing your document... this will take a few seconds.</p>
                </div>

                <div className="max-w-[92%] rounded-[22px] border border-[color:var(--line)] bg-white px-4 py-3 text-[var(--foreground)] shadow-[var(--shadow-panel)]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Assistant</p>
                  <p className="mt-2 text-sm leading-6">Your document is ready. Ask specific questions about it.</p>
                </div>

                <div className="ml-auto max-w-[88%] rounded-[22px] bg-[var(--foreground)] px-4 py-3 text-[var(--background-strong)] shadow-[var(--shadow-panel)]">
                  <p className="text-sm leading-6">What are the main pricing changes?</p>
                </div>

                <div className="max-w-[92%] rounded-[22px] border border-[color:var(--line)] bg-white px-4 py-3 text-[var(--foreground)] shadow-[var(--shadow-panel)]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Assistant</p>
                  <p className="mt-2 text-sm leading-6">
                    The document increases enterprise minimums, adds annual billing incentives, and narrows discount
                    approvals to larger deals.
                  </p>
                </div>

                <div className="rounded-[22px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.86)] px-4 py-3 text-sm text-[var(--muted)]">
                  Ask something about your document...
                </div>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 border-t border-[color:var(--line)] py-8 md:grid-cols-3">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;

              return (
                <Card key={step.title} className="rounded-[24px] bg-white/85 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[var(--panel)] text-[var(--foreground)]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Step {index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{step.title}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
                </Card>
              );
            })}
          </section>

          <section className="pb-8">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Why use it</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Built for clear document answers
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Card key={feature.title} className="h-full rounded-[24px] bg-white/85 p-5">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[var(--panel)] text-[var(--foreground)]">
                      <Icon size={18} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{feature.description}</p>
                  </Card>
                );
              })}
            </div>
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
