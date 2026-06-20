"use client";

import { Poster } from "@/components/ui/Poster";
import { cn } from "@/lib/cn";
import { openTitleSheet } from "@/lib/title-sheet";
import type { Title, WatchStatus } from "@/lib/types";

export function PosterCard({
  title,
  className,
  status,
  badge,
}: {
  title: Title;
  className?: string;
  status?: WatchStatus;
  badge?: string;
}) {
  return (
    <button
      onClick={() => openTitleSheet(title.id)}
      className={cn("group relative block text-left transition active:scale-[0.97]", className)}
    >
      <div className="overflow-hidden rounded-2xl ring-1 ring-white/5 transition group-hover:ring-accent/40">
        <Poster title={title} />
      </div>
      {badge && (
        <span className="absolute left-2 top-2 rounded-full bg-accent-gradient px-2 py-0.5 text-[10px] font-bold shadow-glow">
          {badge}
        </span>
      )}
      {status && (
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium capitalize text-white/80 backdrop-blur">
          {status}
        </span>
      )}
    </button>
  );
}
