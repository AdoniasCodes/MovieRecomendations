import { cn } from "@/lib/cn";
import type { Title } from "@/lib/types";
import { Star } from "lucide-react";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export function Poster({
  title,
  className,
  showMeta = true,
  rounded = "rounded-2xl",
}: {
  title: Title;
  className?: string;
  showMeta?: boolean;
  rounded?: string;
}) {
  const initials = title.title
    .split(" ")
    .filter((w) => !["the", "of", "a", "for"].includes(w.toLowerCase()))
    .slice(0, 3)
    .map((w) => w[0])
    .join("");

  return (
    <div
      className={cn("relative aspect-[2/3] w-full overflow-hidden", rounded, className)}
      style={{
        background: `linear-gradient(150deg, ${title.colorA} 0%, ${title.colorB} 95%)`,
      }}
    >
      {title.posterPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${TMDB_IMG}${title.posterPath}`}
          alt={title.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0">
          {/* film-grain-ish dots + accent flare */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 45%)",
            }}
          />
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="flex h-full flex-col justify-between p-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              {title.mediaType === "tv" ? "Series" : "Film"} · {title.year}
            </span>
            <div>
              <div className="text-3xl font-black leading-none text-white/85 drop-shadow">
                {initials.toUpperCase()}
              </div>
              <div className="mt-2 text-sm font-semibold leading-tight text-white/90">
                {title.title}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* bottom gradient + meta */}
      {showMeta && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-white">
                {title.title}
              </p>
              <p className="text-[11px] text-white/55">
                {title.year} · {title.genres[0]}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300 backdrop-blur">
              <Star className="h-3 w-3 fill-amber-300" />
              {title.voteAverage.toFixed(1)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
