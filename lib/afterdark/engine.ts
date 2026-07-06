// After Dark — pure game engine. No React, no storage, no network.
// The deck (deck.ts) declares WHAT can happen; this file decides what is
// VALID right now, so consecutive cards never contradict each other
// (no "take off her shirt" when she is already down to nothing).

export type Heat = 1 | 2 | 3 | 4;

export const HEAT_NAMES: Record<Heat, string> = {
  1: "Spark",
  2: "Tease",
  3: "Fire",
  4: "Ember",
};

export const HEAT_TAGLINES: Record<Heat, string> = {
  1: "Flirt like you just met",
  2: "Hands, lips, and fewer clothes",
  3: "All the way romantic",
  4: "Rough around the edges",
};

export type Player = "roller" | "partner";

// Clothing scale: 3 fully dressed, 2 one layer down, 1 underwear only, 0 nothing.
export type Clothing = 0 | 1 | 2 | 3;

export interface PlayerState {
  clothing: Clothing;
  blindfolded: boolean;
  restrained: boolean;
  skipsLeft: number;
}

export interface GameState {
  heat: Heat;
  /** Semantic id of whoever rolls next: "me" | "her" (matches the app's ids). */
  turn: "me" | "her";
  players: Record<"me" | "her", PlayerState>;
  /** Last drawn card ids, newest last. Used to avoid repeats. */
  history: string[];
  rolls: number;
  paused: boolean;
}

export interface CardRequire {
  /** Card only valid if that player's clothing is >= min / <= max. */
  minClothing?: Partial<Record<Player, Clothing>>;
  maxClothing?: Partial<Record<Player, Clothing>>;
  /** true = must be blindfolded, false = must NOT be. Omit = don't care. */
  blindfolded?: Partial<Record<Player, boolean>>;
  restrained?: Partial<Record<Player, boolean>>;
}

export type CardEffect =
  | "partner-strips-one" // partner removes one item -> clothing - 1
  | "roller-strips-one"
  | "both-strip-one"
  | "blindfold-partner"
  | "unblindfold-partner"
  | "restrain-partner"
  | "release-partner";

export interface Card {
  id: string;
  heat: Heat;
  /**
   * Second person = the roller. "{P}" = partner's display name.
   * Written so the ROLLER performs or directs the action.
   */
  text: string;
  /** Optional countdown, seconds. */
  timerSec?: number;
  require?: CardRequire;
  effects?: CardEffect[];
  /** Draw weight. Default 10. Rare/wild cards use less. */
  weight?: number;
  /** "wild" cards get special styling. */
  wild?: boolean;
}

export const SKIPS_PER_PLAYER = 3;
const NO_REPEAT_WINDOW = 10;
/** Chance a draw dips one heat level below the current one, to keep variety. */
const LOWER_HEAT_MIX = 0.18;

export function freshPlayer(): PlayerState {
  return { clothing: 3, blindfolded: false, restrained: false, skipsLeft: SKIPS_PER_PLAYER };
}

export function freshGame(first: "me" | "her" = "me"): GameState {
  return {
    heat: 1,
    turn: first,
    players: { me: freshPlayer(), her: freshPlayer() },
    history: [],
    rolls: 0,
    paused: false,
  };
}

function other(id: "me" | "her"): "me" | "her" {
  return id === "me" ? "her" : "me";
}

function resolve(state: GameState, who: Player): PlayerState {
  return who === "roller" ? state.players[state.turn] : state.players[other(state.turn)];
}

export function cardValid(card: Card, state: GameState): boolean {
  const r = card.require;
  if (!r) return true;
  for (const who of ["roller", "partner"] as Player[]) {
    const p = resolve(state, who);
    const min = r.minClothing?.[who];
    if (min !== undefined && p.clothing < min) return false;
    const max = r.maxClothing?.[who];
    if (max !== undefined && p.clothing > max) return false;
    const bf = r.blindfolded?.[who];
    if (bf !== undefined && p.blindfolded !== bf) return false;
    const re = r.restrained?.[who];
    if (re !== undefined && p.restrained !== re) return false;
  }
  return true;
}

function pool(deck: Card[], state: GameState, heat: Heat, ignoreHistory = false): Card[] {
  const recent = new Set(state.history.slice(-NO_REPEAT_WINDOW));
  return deck.filter(
    (c) =>
      c.heat === heat &&
      (ignoreHistory || !recent.has(c.id)) &&
      cardValid(c, state)
  );
}

function weightedPick(cards: Card[], rand: () => number): Card {
  const total = cards.reduce((s, c) => s + (c.weight ?? 10), 0);
  let roll = rand() * total;
  for (const c of cards) {
    roll -= c.weight ?? 10;
    if (roll <= 0) return c;
  }
  return cards[cards.length - 1];
}

/**
 * Draw the next card. Mostly current heat, sometimes one level below for
 * variety. Falls back gracefully (allow repeats, then walk down heat levels)
 * so the dice can never come up empty.
 */
export function draw(deck: Card[], state: GameState, rand: () => number = Math.random): Card {
  const below = (state.heat - 1) as Heat;
  const wantLower = state.heat > 1 && rand() < LOWER_HEAT_MIX;
  const order: Heat[] = wantLower ? [below, state.heat] : [state.heat, below];
  for (const ignoreHistory of [false, true]) {
    for (const h of order) {
      if (h < 1) continue;
      const p = pool(deck, state, h, ignoreHistory);
      if (p.length) return weightedPick(p, rand);
    }
  }
  // Deck exhausted at these heats entirely (shouldn't happen): any valid card.
  const anything = deck.filter((c) => c.heat <= state.heat && cardValid(c, state));
  return weightedPick(anything.length ? anything : deck, rand);
}

function clampClothing(n: number): Clothing {
  return Math.max(0, Math.min(3, n)) as Clothing;
}

/** Apply a drawn card's effects and advance the turn. Returns a NEW state. */
export function applyCard(state: GameState, card: Card): GameState {
  const next: GameState = {
    ...state,
    players: {
      me: { ...state.players.me },
      her: { ...state.players.her },
    },
    history: [...state.history, card.id].slice(-40),
    rolls: state.rolls + 1,
  };
  const roller = next.players[next.turn];
  const partner = next.players[other(next.turn)];
  for (const fx of card.effects ?? []) {
    switch (fx) {
      case "partner-strips-one":
        partner.clothing = clampClothing(partner.clothing - 1);
        break;
      case "roller-strips-one":
        roller.clothing = clampClothing(roller.clothing - 1);
        break;
      case "both-strip-one":
        roller.clothing = clampClothing(roller.clothing - 1);
        partner.clothing = clampClothing(partner.clothing - 1);
        break;
      case "blindfold-partner":
        partner.blindfolded = true;
        break;
      case "unblindfold-partner":
        partner.blindfolded = false;
        break;
      case "restrain-partner":
        partner.restrained = true;
        break;
      case "release-partner":
        partner.restrained = false;
        break;
    }
  }
  next.turn = other(next.turn);
  return next;
}

/** Skip: consume one of the roller's skips, no state change otherwise. */
export function skipCard(state: GameState, cardId: string): GameState {
  const roller = state.players[state.turn];
  if (roller.skipsLeft <= 0) return state;
  return {
    ...state,
    players: {
      ...state.players,
      [state.turn]: { ...roller, skipsLeft: roller.skipsLeft - 1 },
    },
    history: [...state.history, cardId].slice(-40),
  };
}

export function turnUpHeat(state: GameState): GameState {
  if (state.heat >= 4) return state;
  return { ...state, heat: (state.heat + 1) as Heat };
}

/** Fill in the partner's name. */
export function renderCard(text: string, partnerName: string): string {
  return text.replaceAll("{P}", partnerName);
}
