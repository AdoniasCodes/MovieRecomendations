// After Dark — persistent recap stats. Tiny localStorage aggregate that
// survives across nights. All reads/writes live in these two functions so the
// component only ever touches storage from effects/handlers, never in render.

const STORAGE_KEY = "amore-movies/afterdark-stats";

export interface AfterDarkStats {
  nights: number;
  totalCards: number;
  maxHeatEver: 1 | 2 | 3 | 4;
  heatCounts: Record<"1" | "2" | "3" | "4", number>;
  legendaryPulls: number;
  longestNight: number;
  updatedAt: number;
}

function defaults(): AfterDarkStats {
  return {
    nights: 0,
    totalCards: 0,
    maxHeatEver: 1,
    heatCounts: { "1": 0, "2": 0, "3": 0, "4": 0 },
    legendaryPulls: 0,
    longestNight: 0,
    updatedAt: 0,
  };
}

/** Read persisted stats. Returns safe defaults on SSR or any parse failure. */
export function loadStats(): AfterDarkStats {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<AfterDarkStats>;
    const base = defaults();
    const heat: Partial<Record<"1" | "2" | "3" | "4", number>> = parsed.heatCounts ?? {};
    return {
      nights: Number(parsed.nights) || 0,
      totalCards: Number(parsed.totalCards) || 0,
      maxHeatEver: (([1, 2, 3, 4].includes(Number(parsed.maxHeatEver))
        ? Number(parsed.maxHeatEver)
        : 1) as 1 | 2 | 3 | 4),
      heatCounts: {
        "1": Number(heat["1"]) || 0,
        "2": Number(heat["2"]) || 0,
        "3": Number(heat["3"]) || 0,
        "4": Number(heat["4"]) || 0,
      },
      legendaryPulls: Number(parsed.legendaryPulls) || 0,
      longestNight: Number(parsed.longestNight) || 0,
      updatedAt: Number(parsed.updatedAt) || base.updatedAt,
    };
  } catch {
    return defaults();
  }
}

/** Merge one finished night into the aggregate, persist it, and return it. */
export function recordNight(night: {
  cards: number;
  maxHeat: 1 | 2 | 3 | 4;
  heatCounts: Record<"1" | "2" | "3" | "4", number>;
  legendary: number;
}): AfterDarkStats {
  const prev = loadStats();
  const merged: AfterDarkStats = {
    nights: prev.nights + 1,
    totalCards: prev.totalCards + night.cards,
    maxHeatEver: (Math.max(prev.maxHeatEver, night.maxHeat) as 1 | 2 | 3 | 4),
    heatCounts: {
      "1": prev.heatCounts["1"] + (night.heatCounts["1"] || 0),
      "2": prev.heatCounts["2"] + (night.heatCounts["2"] || 0),
      "3": prev.heatCounts["3"] + (night.heatCounts["3"] || 0),
      "4": prev.heatCounts["4"] + (night.heatCounts["4"] || 0),
    },
    legendaryPulls: prev.legendaryPulls + night.legendary,
    longestNight: Math.max(prev.longestNight, night.cards),
    updatedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  }
  return merged;
}
