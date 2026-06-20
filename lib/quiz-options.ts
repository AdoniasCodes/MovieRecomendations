import type { Commitment, Context, Energy, Era, Feeling, Vibe } from "./types";

export const FEELINGS: { value: Feeling; label: string; emoji: string }[] = [
  { value: "bored", label: "Bored", emoji: "🥱" },
  { value: "tired", label: "Tired", emoji: "😴" },
  { value: "excited", label: "Excited", emoji: "⚡️" },
  { value: "curious", label: "Curious", emoji: "🧠" },
  { value: "sad", label: "Sad", emoji: "🌧️" },
  { value: "happy", label: "Happy", emoji: "☀️" },
  { value: "stressed", label: "Stressed", emoji: "🌀" },
  { value: "distraction", label: "Need a distraction", emoji: "🎈" },
  { value: "intense", label: "Want something intense", emoji: "🔥" },
  { value: "relaxing", label: "Want something relaxing", emoji: "🫧" },
];

export const CONTEXTS: { value: Context; label: string; emoji: string; sub: string }[] = [
  { value: "together", label: "Together", emoji: "💞", sub: "Swipe as a couple — matches fire live" },
  { value: "alone", label: "Alone", emoji: "🍿", sub: "Just for you tonight" },
];

export const VIBES: { value: Vibe; label: string; emoji: string }[] = [
  { value: "mind-blowing", label: "Mind-blowing", emoji: "🤯" },
  { value: "dark", label: "Dark", emoji: "🌑" },
  { value: "funny", label: "Funny", emoji: "😂" },
  { value: "romantic", label: "Romantic", emoji: "❤️" },
  { value: "cozy", label: "Cozy", emoji: "🛋️" },
  { value: "mysterious", label: "Mysterious", emoji: "🕵️" },
  { value: "thrilling", label: "Thrilling", emoji: "😰" },
  { value: "emotional", label: "Emotional", emoji: "🥹" },
  { value: "thought-provoking", label: "Thought-provoking", emoji: "💭" },
  { value: "action-packed", label: "Action-packed", emoji: "💥" },
  { value: "comfort", label: "Comfort watch", emoji: "🧸" },
];

export const ERAS: { value: Era; label: string }[] = [
  { value: "70s", label: "70s" },
  { value: "80s", label: "80s" },
  { value: "90s", label: "90s" },
  { value: "2000s", label: "2000s" },
  { value: "2010s", label: "2010s" },
  { value: "modern", label: "Modern" },
  { value: "any", label: "Any Era" },
];

export const COMMITMENTS: { value: Commitment; label: string; emoji: string }[] = [
  { value: "movie", label: "Movie", emoji: "🎬" },
  { value: "mini-series", label: "Mini-Series", emoji: "📺" },
  { value: "full-series", label: "Full Series", emoji: "📚" },
  { value: "single-evening", label: "Single Evening", emoji: "🌙" },
  { value: "weekend-binge", label: "Weekend Binge", emoji: "🛌" },
  { value: "long-term", label: "Long-Term Show", emoji: "♾️" },
];

export const ENERGIES: { value: Energy; label: string; emoji: string; sub: string }[] = [
  { value: "brain-off", label: "Brain-Off", emoji: "🫠", sub: "Easy entertainment" },
  { value: "moderate", label: "Moderate", emoji: "🙂", sub: "Some attention" },
  { value: "full-attention", label: "Full Attention", emoji: "🎯", sub: "Lock in, no phones" },
];
