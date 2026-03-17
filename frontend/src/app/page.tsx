'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Github,
  MessageSquare,
  Shield,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DeveloperCard } from '@/components/common/developer-card';
import { LogoMark } from '@/components/common/logo-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getDemoLimits, type DemoLimits } from '@/lib/api';

const features = [
  {
    title: 'Reliable retrieval-first workflow',
    description: 'FTS-first retrieval ensures dependable behavior even when AI capacity is constrained.',
    icon: FileSearch,
  },
  {
    title: 'Strict demo guardrails',
    description: 'Hard limits protect free-tier APIs from abuse and keep the public demo stable.',
    icon: Shield,
  },
  {
    title: 'Fast question-answer loop',
    description: 'Upload once, ask naturally, and get context-grounded responses in a focused interface.',
    icon: MessageSquare,
  },
];

const steps = [
  {
    title: 'Upload document',
    description: 'The backend validates size and page limits before indexing.',
    icon: Upload,
  },
  {
    title: 'Retrieve context',
    description: 'Chunks are ranked with PostgreSQL Full Text Search for predictable retrieval.',
    icon: Sparkles,
  },
  {
    title: 'Generate answer',
    description: 'Gemini is used when available, with automatic fallback extractive responses.',
    icon: CheckCircle2,
  },
];

const DEFAULT_LIMITS: DemoLimits = {
  maxFileSizeMb: 10,
  maxPagesPerDoc: 40,
  maxChunksPerDoc: 200,
  maxContextChunks: 4,
  maxChatRequestsPerDay: 20,
  maxDocsPerUser: 3,
  cacheTtlSeconds: 600,
};

const DEFAULT_GITHUB = 'https://github.com/saahilpal/document-analyzer-rag-showcase';

export default function LandingPage() {
  const [limits, setLimits] = useState<DemoLimits>(DEFAULT_LIMITS);
  const [githubUrl, setGithubUrl] = useState(DEFAULT_GITHUB);
  const [runGuideUrl, setRunGuideUrl] = useState(`${DEFAULT_GITHUB}#run-locally`);
  const [notice, setNotice] = useState('This public demo runs on free-tier AI APIs, so usage limits apply.');

  useEffect(() => {
    getDemoLimits()
      .then((data) => {
        setLimits(data.limits);
        setGithubUrl(data.links.githubRepositoryUrl || DEFAULT_GITHUB);
        setRunGuideUrl(data.links.runLocallyGuideUrl || `${DEFAULT_GITHUB}#run-locally`);
        setNotice(data.philosophy);
      })
      .catch(() => {
        setLimits(DEFAULT_LIMITS);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
          <LogoMark />

          <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
            <a href="#features" className="hover:text-neutral-900">
              Features
            </a>
            <a href="#how" className="hover:text-neutral-900">
              How it works
            </a>
            <a href="#source" className="hover:text-neutral-900">
              Source Code
            </a>
            <a href="#developer" className="hover:text-neutral-900">
              Developer
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden text-sm font-medium text-neutral-700 hover:text-neutral-900 md:block">
              Sign In
            </Link>
            <Link href="/app">
              <Button size="sm">Try Demo</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-12 md:px-8 md:pt-20">
          <div className="mb-6 rounded-2xl border border-neutral-200 bg-white/95 px-4 py-3 text-sm text-neutral-700 backdrop-blur">
            {notice}{' '}
            <span className="font-medium">
              {limits.maxFileSizeMb}MB max document • {limits.maxChatRequestsPerDay} questions/day •{' '}
              {limits.maxDocsPerUser} documents/user
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-4 inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.1em] text-neutral-600">
              Document Analyzer RAG
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 md:text-6xl">Document Analyzer RAG</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
              A production-style Retrieval Augmented Generation system designed for reliability on free-tier
              infrastructure.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/app">
                <Button size="lg">
                  Try Demo
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href={githubUrl} target="_blank">
                <Button variant="secondary" size="lg">
                  View Source Code
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
              <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                </div>
              </div>
              <div className="grid gap-0 md:grid-cols-[240px_1fr_280px]">
                <div className="bg-white p-4 md:border-r md:border-neutral-200">
                  <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">Sessions</p>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm text-white">
                      System Design Primer
                    </div>
                    <div className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                      Scalability Q&A
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t border-neutral-200 bg-neutral-50 p-5 md:border-t-0">
                  <div className="ml-auto max-w-md rounded-2xl border border-neutral-300 bg-neutral-200 px-4 py-3 text-sm text-neutral-900">
                    What are the key scaling recommendations?
                  </div>
                  <div className="max-w-md rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
                    Use load balancers, cache hot reads, and queue burst workloads. The sample document is preloaded
                    so anyone can test immediately.
                  </div>
                </div>

                <div className="border-t border-neutral-200 bg-white p-4 md:border-l md:border-t-0 md:border-neutral-200">
                  <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">Document context</p>
                  <p className="mt-2 text-sm font-medium text-neutral-900">system_design_primer.pdf</p>
                  <p className="mt-3 text-sm text-neutral-600">Preloaded demo document with indexed chunks.</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">Built for demo reliability</h2>
            <p className="mt-3 text-neutral-600">Intentional limits, clear failure modes, and transparent system behavior.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-6">
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700">
                    <Icon size={18} />
                  </span>
                  <h3 className="text-lg font-semibold text-neutral-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">How it works</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="p-6">
                  <p className="text-xs uppercase tracking-[0.1em] text-neutral-500">Step {index + 1}</p>
                  <div className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{step.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="source" className="mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
          <Card className="p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.1em] text-neutral-500">Source Code</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">Open source and reproducible</h3>
            <p className="mt-3 max-w-2xl text-neutral-600">
              This project is open source. For unlimited usage you can run it locally with your own API key.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={githubUrl} target="_blank">
                <Button variant="secondary">
                  <Github size={16} />
                  View GitHub Repository
                </Button>
              </Link>
              <Link href={runGuideUrl} target="_blank">
                <Button>Run Locally Guide</Button>
              </Link>
            </div>
          </Card>
        </section>

        <section id="developer" className="mx-auto w-full max-w-6xl px-5 pb-8 md:px-8">
          <DeveloperCard />
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
          <Card className="p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.1em] text-neutral-500">Run Locally</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">Remove demo limits locally</h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              <li>Clone repository</li>
              <li>Add Gemini API key to <code>.env</code></li>
              <li>Run backend</li>
              <li>Run frontend</li>
            </ol>
            <p className="mt-4 text-sm text-neutral-600">
              Local usage is intended for unlimited experimentation with your own API quota.
            </p>
          </Card>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-5 py-8 text-sm text-neutral-500 md:flex-row md:items-center md:px-8">
        <p>© {new Date().getFullYear()} Document Analyzer RAG</p>
        <p>Free-tier demo reliability first</p>
      </footer>
    </div>
  );
}
