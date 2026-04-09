"use client";

import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-border bg-surface/80 px-5 py-4 shadow-[0_16px_40px_-28px_rgba(51,35,22,0.45)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm">
              Skill Hub &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-dim">
            <span>Powered by Agent Skills</span>
            <span className="text-border">|</span>
            <a
              href="https://agentskills.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              agentskills.io
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
