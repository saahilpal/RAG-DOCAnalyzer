'use client';

import Link from 'next/link';
import { ArrowUpRight, Code2, Github, Linkedin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const profiles = [
  {
    label: 'GitHub',
    href: 'https://github.com/saahilpal',
    icon: Github,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/sahiilpal',
    icon: Linkedin,
  },
  {
    label: 'LeetCode',
    href: 'https://leetcode.com/u/saahiilpal/',
    icon: Code2,
  },
];

type DeveloperCardProps = {
  compact?: boolean;
  className?: string;
};

export function DeveloperCard({ compact = false, className }: DeveloperCardProps) {
  return (
    <Card className={cn('p-5 md:p-8', className)}>
      <p className="text-xs uppercase tracking-[0.1em] text-neutral-500">Developer</p>
      <h3 className={cn('mt-2 font-semibold tracking-tight text-neutral-950', compact ? 'text-xl' : 'text-3xl')}>
        Built by Sahil Pal
      </h3>
      <p className="mt-2 text-sm text-neutral-600">
        Full-stack engineer focused on resilient systems, backend architecture, and polished product execution.
      </p>

      <div className={cn('mt-5 grid gap-2', compact ? 'sm:grid-cols-1' : 'sm:grid-cols-3')}>
        {profiles.map((profile) => {
          const Icon = profile.icon;
          return (
            <Link
              key={profile.label}
              href={profile.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 transition hover:border-neutral-300 hover:bg-white"
            >
              <span className="inline-flex items-center gap-2">
                <Icon size={15} />
                {profile.label}
              </span>
              <ArrowUpRight size={14} className="opacity-55 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
