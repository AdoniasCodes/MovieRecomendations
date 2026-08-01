// THE CONTENT FILE. Everything Hermi sees on the day is in this one file.
//
// How it works: the night is a flat list of MODULES. Panda's director panel
// shows all of them and he fires whichever one fits the moment, in any order,
// skipping anything that no longer makes sense. Nothing is time-gated except
// the morning banner, because a real day never runs to schedule.
//
// TO SWAP IN REAL CONTENT: edit only this file.
//   photos  ->  public/anniversary/photos/,  set `src` to "/anniversary/photos/x.jpg"
//   voice   ->  public/anniversary/audio/,   set `src` to "/anniversary/audio/x.m4a"
// Photo placeholders point at /couple.jpg so nothing 404s before the real
// pictures land. Voice notes intentionally point at their final paths, so a
// missing recording is obvious during the rehearsal instead of on the night.

export type ModuleKind =
  | "banner"
  | "message"
  | "voice"
  | "photo"
  | "questions"
  | "numbers"
  | "itinerary"
  | "joke"
  | "finale";

/** grouping for the director panel only, never shown to Hermi */
export type ModuleGroup = "opening" | "letters" | "photos" | "numbers" | "day" | "finale";

interface Base {
  id: string;
  kind: ModuleKind;
  group: ModuleGroup;
  /** short label Panda sees in his list */
  label: string;
}

export interface BannerModule extends Base {
  kind: "banner";
  headline: string;
  sub: string;
}

export interface MessageModule extends Base {
  kind: "message";
  /** what the sealed envelope says before she holds it open */
  seal: string;
  title: string;
  /** one string per paragraph */
  body: string[];
  signoff?: string;
}

export interface VoiceModule extends Base {
  kind: "voice";
  src: string;
  title: string;
  caption?: string;
}

export interface PhotoModule extends Base {
  kind: "photo";
  src: string;
  caption: string;
  story?: string;
}

/**
 * A deck of conversation prompts. There are no right answers and no scoring on
 * purpose: the guessing game did not work (blurred photos are unreadable on a
 * phone and a wrong answer just feels bad), so this replaces it with the thing
 * it was standing in for, which is having something to talk about.
 */
export interface QuestionsModule extends Base {
  kind: "questions";
  title: string;
  intro?: string;
  prompts: string[];
}

export interface NumbersModule extends Base {
  kind: "numbers";
  title: string;
  /** value "live:days" and "live:months" get replaced with real counts */
  stats: { value: string; label: string; note?: string }[];
}

export type ItineraryIcon =
  | "gift" | "ink" | "cocktails" | "dinner" | "smoke" | "moon" | "coffee"
  | "bowling" | "music" | "cinema" | "walk" | "dessert" | "arcade" | "spa"
  | "photos" | "shopping" | "drive" | "view";

/**
 * One thing they could do today. NO step number and NO time, deliberately:
 * Panda decides the order live, so the number is assigned when he sends it
 * (see the plan feed in DirectorPanel/AnniversaryStage) rather than authored
 * here. Anything not sent simply never happened.
 */
export interface ItineraryModule extends Base {
  kind: "itinerary";
  place: string;
  headline: string;
  detail: string;
  icon: ItineraryIcon;
}

export interface JokeModule extends Base {
  kind: "joke";
  setup: string;
  punch: string;
}

export interface FinaleModule extends Base {
  kind: "finale";
  headline: string;
  body: string;
}

export type AnniversaryModule =
  | BannerModule
  | MessageModule
  | VoiceModule
  | PhotoModule
  | QuestionsModule
  | NumbersModule
  | ItineraryModule
  | JokeModule
  | FinaleModule;

export const GROUP_LABELS: Record<ModuleGroup, string> = {
  opening: "The open",
  letters: "Your voice",
  photos: "Us, in pictures",
  numbers: "Numbers",
  day: "The day",
  finale: "The finale",
};

export const MODULES: AnniversaryModule[] = [
  /* ------------------------------------------------------------- opening */
  {
    id: "banner",
    kind: "banner",
    group: "opening",
    label: "Happy Anniversary takeover",
    headline: "Happy Anniversary",
    sub: "One year of you and me.",
  },

  /* ------------------------------------------------------------- letters */
  // The three recordings, numbered rather than tied to a time of day, because
  // Panda picks the moment for each one.
  {
    id: "voice-1",
    kind: "voice",
    group: "letters",
    label: "Voice note 1 (3:06)",
    src: "/anniversary/audio/note-1.mp3",
    title: "Put this in your ear",
    caption: "Some things are better said out loud than written down.",
  },
  {
    id: "voice-2",
    kind: "voice",
    group: "letters",
    label: "Voice note 2 (1:03)",
    src: "/anniversary/audio/note-2.mp3",
    title: "One more thing",
    caption: "This one is short. I still meant every second of it.",
  },
  {
    id: "voice-3",
    kind: "voice",
    group: "letters",
    label: "Voice note 3 (3:06)",
    src: "/anniversary/audio/note-3.mp3",
    title: "The last one",
    caption: "Listen to this one somewhere quiet.",
  },

  /* -------------------------------------------------------------- photos */
  {
    id: "photo-park-us",
    kind: "photo",
    group: "photos",
    label: "Photo: us at the park",
    src: "/anniversary/photos/park-us.jpg",
    caption: "You and me, by the river",
    story: "Your hand going to your headwrap, both of us grinning like idiots. This is my favourite kind of picture of us: nothing staged, nowhere to be.",
  },
  {
    id: "photo-arch",
    kind: "photo",
    group: "photos",
    label: "Photo: her under the flowers",
    src: "/anniversary/photos/park-her-arch.jpg",
    caption: "You, under the orange flowers",
    story: "I took a lot of photos that evening and I kept this one closest. You were not even trying and you still looked beautiful.",
  },
  {
    id: "photo-gate",
    kind: "photo",
    group: "photos",
    label: "Photo: her in the archway",
    src: "/anniversary/photos/park-her-gate.jpg",
    caption: "Standing there like the whole park was built for you",
    story: "The trees, the water, the lights coming on behind you. And I was still only looking at one thing.",
  },
  {
    id: "photo-habesha",
    kind: "photo",
    group: "photos",
    label: "Photo: her in white",
    src: "/anniversary/photos/her-habesha.jpg",
    caption: "Four of you, and I could not pick a favourite",
    story: "You sent me these and I just sat there looking at my phone like a fool.",
  },
  {
    id: "photo-bandana",
    kind: "photo",
    group: "photos",
    label: "Photo: her mirror selfie",
    src: "/anniversary/photos/her-bandana.jpg",
    caption: "The look",
    story: "You know exactly what you are doing when you make this face. And it always works on me 💗🔥",
  },
  {
    id: "photo-kiss",
    kind: "photo",
    group: "photos",
    label: "Photo: mirror, me kissing you",
    src: "/anniversary/photos/mirror-kiss.jpg",
    caption: "My favourite place to put my face",
    story: "Still one of the best days of my life. We had so much fun that day, and this is easily the best photo of it.",
  },
  {
    id: "photo-laugh",
    kind: "photo",
    group: "photos",
    label: "Photo: you hiding, laughing",
    src: "/anniversary/photos/mirror-laugh.jpg",
    caption: "You, hiding, laughing",
    story: "Hiding your face and somehow still taking the whole spotlight. You do that everywhere you go.",
  },
  {
    id: "photo-cutout",
    kind: "photo",
    group: "photos",
    label: "Photo: the black and white one",
    src: "/anniversary/photos/cutout-us.png",
    caption: "Us, in black and white",
    story: "Me looking far too pleased with myself. You covering your face. A fair summary of the year, honestly.",
  },
  {
    id: "photo-story",
    kind: "photo",
    group: "photos",
    label: "Photo: the story one",
    src: "/anniversary/photos/story-us.jpg",
    caption: "The one that went up for everyone to see",
    story: "You smiling at the camera, me smiling at you. I did not mind the whole world knowing.",
  },
  {
    id: "photo-eyes",
    kind: "photo",
    group: "photos",
    label: "Photo: your eyes",
    src: "/anniversary/photos/her-eyes.jpg",
    caption: "These. Every time.",
    story: "This is the part of you I saw first and it is still the part that gets me.",
  },
  {
    id: "photo-lastnight",
    kind: "photo",
    group: "photos",
    label: "Photo: a random night out",
    src: "/anniversary/photos/night-drinks.jpg",
    caption: "Just some random night",
    story: "Nothing special planned, nowhere important to be. One of those ordinary nights with you that I would not trade for a big one.",
  },
  {
    id: "photo-late",
    kind: "photo",
    group: "photos",
    label: "Photo: the one she hates",
    src: "/anniversary/photos/late-us.jpg",
    caption: "The best photo I have of you",
    story: "I know. I know. But it is going in anyway, and you still look beautiful in it 💗",
  },

  /* ----------------------------------------------------------- questions */
  // Conversation decks, for when the talking needs a nudge. No right answers,
  // no scoring, no losing. Split into three so he can pick the temperature.
  {
    id: "questions-us",
    kind: "questions",
    group: "photos",
    label: "Questions: how we started",
    title: "How we started",
    intro: "No right answers. Both of us answer, and no skipping the awkward ones.",
    prompts: [
      "Who actually texted who first? Tell the truth.",
      "What did you genuinely think of me the first time we met?",
      "When did you know this was going somewhere?",
      "What is the first thing you noticed about me?",
      "Was there a moment early on where you nearly walked away?",
      "What did you tell your friends about me at the start?",
      "What is something you were nervous to tell me back then?",
      "Which of us fell first, and which of us fell harder?",
    ],
  },
  {
    id: "questions-year",
    kind: "questions",
    group: "photos",
    label: "Questions: this year",
    title: "The year we just had",
    intro: "A year in, we should be able to answer these honestly.",
    prompts: [
      "What is the single best moment we had this year?",
      "What is a small ordinary day you think about more than you would expect?",
      "When did you feel closest to me?",
      "What is something I do that you have never told me you love?",
      "What is something I do that drives you slightly insane?",
      "What was the hardest part of this year for you?",
      "What is something you are proud of us for getting through?",
      "What do you want more of in year two?",
      "What do you want less of?",
      "What is one thing you want us to do together before the next anniversary?",
    ],
  },
  {
    id: "questions-fun",
    kind: "questions",
    group: "photos",
    label: "Questions: the fun ones",
    title: "The lighter round",
    intro: "Lower stakes. Mostly.",
    prompts: [
      "What is a film I need to catch up on? Not your favourite, one you actually think I would like.",
      "If we could be anywhere in the world right now, where are we?",
      "What is the most ridiculous argument we have ever had?",
      "What song is ours, whether we agreed on it or not?",
      "What is your honest review of my cooking?",
      "If you had to describe me to a stranger in three words, what are they?",
      "What is something you want to try that you have never said out loud?",
      "What is the best gift I have ever given you? Be brutal.",
      "Where should we go for the next anniversary?",
    ],
  },

  /* ------------------------------------------------------------- numbers */
  {
    id: "numbers",
    kind: "numbers",
    group: "numbers",
    label: "Us in numbers",
    title: "Us, in numbers",
    stats: [
      { value: "live:days", label: "days together", note: "and counting, obviously" },
      { value: "live:months", label: "months" },
      { value: "1", label: "longest I have ever loved anyone", note: "you hold the record and it is not close" },
      { value: "0", label: "days I regret" },
      { value: "2", label: "tattoos we are getting today", note: "permanent, like the rest of this" },
      { value: "5", label: "stops on today's plan", note: "every one of them picked for you" },
    ],
  },

  /* ----------------------------------------------------------------- day */
  // No numbers and no times here on purpose. Panda picks what happens next as
  // the day goes, and the step number is stamped on when he sends it.
  {
    id: "day-room",
    kind: "itinerary",
    group: "day",
    label: "The room",
    place: "Just us",
    headline: "Nobody else exists",
    detail:
      "Cake, flowers, and wine waiting in the room. No plans in here, no phones, no rushing. This part is only for us.",
    icon: "gift",
  },
  {
    id: "day-tattoo",
    kind: "itinerary",
    group: "day",
    label: "Tattoos",
    place: "The tattoo shop",
    headline: "We make it permanent",
    detail: "We are getting inked. Something we both carry from here on.",
    icon: "ink",
  },
  {
    id: "day-cocktails",
    kind: "itinerary",
    group: "day",
    label: "Cocktails",
    place: "The cocktail spot",
    headline: "The good cocktails",
    detail: "I know a place. Excellent drinks and prices that will not ruin the night.",
    icon: "cocktails",
  },
  {
    id: "day-dinner",
    kind: "itinerary",
    group: "day",
    label: "Dinner",
    place: "Somewhere worth sitting down",
    headline: "Dinner, properly",
    detail: "No rushing it, no watching the time. Order whatever you want.",
    icon: "dinner",
  },
  {
    id: "day-hookah",
    kind: "itinerary",
    group: "day",
    label: "Hookah",
    place: "The chill spot",
    headline: "We slow all the way down",
    detail: "Hookah, nowhere to be, and however long we feel like staying.",
    icon: "smoke",
  },
  {
    id: "day-bowling",
    kind: "itinerary",
    group: "day",
    label: "Bowling",
    place: "Wherever the lanes are free",
    headline: "I am going to beat you at bowling",
    detail: "Loser buys the next round. I have thought about this a lot.",
    icon: "bowling",
  },
  {
    id: "day-coffee",
    kind: "itinerary",
    group: "day",
    label: "Coffee",
    place: "A proper coffee place",
    headline: "Coffee, the way this city does it best",
    detail: "Sit, talk, watch people go by. The most Addis thing there is.",
    icon: "coffee",
  },
  {
    id: "day-live-music",
    kind: "itinerary",
    group: "day",
    label: "Live music",
    place: "Somewhere with a band",
    headline: "Live music and no conversation needed",
    detail: "Azmari, jazz, whatever is playing. We just sit close and listen.",
    icon: "music",
  },
  {
    id: "day-cinema",
    kind: "itinerary",
    group: "day",
    label: "Cinema",
    place: "The cinema",
    headline: "A film, on the big screen",
    detail: "Fitting, given the app this is living inside.",
    icon: "cinema",
  },
  {
    id: "day-walk",
    kind: "itinerary",
    group: "day",
    label: "A walk",
    place: "Friendship Park, or wherever we end up",
    headline: "Just a walk, no destination",
    detail: "The same kind of evening as those park photos. That worked out well.",
    icon: "walk",
  },
  {
    id: "day-dessert",
    kind: "itinerary",
    group: "day",
    label: "Dessert",
    place: "Cake, ice cream, whatever you point at",
    headline: "Something sweet, purely because you want it",
    detail: "No sharing rules. You order, I pay, everyone wins.",
    icon: "dessert",
  },
  {
    id: "day-arcade",
    kind: "itinerary",
    group: "day",
    label: "Arcade or pool",
    place: "Somewhere with games",
    headline: "Pool, darts, or whatever they have",
    detail: "Competitive, petty, and fun. Our natural habitat.",
    icon: "arcade",
  },
  {
    id: "day-spa",
    kind: "itinerary",
    group: "day",
    label: "Spa or massage",
    place: "Somewhere quiet",
    headline: "An hour of doing absolutely nothing",
    detail: "You have earned this more than I have.",
    icon: "spa",
  },
  {
    id: "day-photos",
    kind: "itinerary",
    group: "day",
    label: "Take proper photos",
    place: "Anywhere with decent light",
    headline: "New photos, for next year's version of this",
    detail: "I am going to need material for the second anniversary.",
    icon: "photos",
  },
  {
    id: "day-shopping",
    kind: "itinerary",
    group: "day",
    label: "Buy you something",
    place: "Wherever you spot it",
    headline: "You point, I buy",
    detail: "No negotiating and no looking at the price first.",
    icon: "shopping",
  },
  {
    id: "day-view",
    kind: "itinerary",
    group: "day",
    label: "A view",
    place: "Somewhere high up",
    headline: "The whole city, from above",
    detail: "Entoto, a rooftop, anywhere we can see the lights come on.",
    icon: "view",
  },
  {
    id: "day-drive",
    kind: "itinerary",
    group: "day",
    label: "Night drive",
    place: "No particular direction",
    headline: "Drive around with the music up",
    detail: "No destination. That is the entire point of it.",
    icon: "drive",
  },
  {
    id: "day-back",
    kind: "itinerary",
    group: "day",
    label: "Back to the room",
    place: "Back where we started",
    headline: "And then it is just us again",
    detail: "One more thing waiting for you when we get back. You will find out.",
    icon: "moon",
  },
  /* -------------------------------------------------------------- finale */
  {
    id: "finale",
    kind: "finale",
    group: "finale",
    label: "FINALE: unlock Pulse",
    headline: "One last thing",
    body: "There is something new in After Dark tonight, and I am the one holding the remote.",
  },
];

export const moduleById = (id: string): AnniversaryModule | undefined =>
  MODULES.find((m) => m.id === id);

export const modulesInGroup = (group: ModuleGroup): AnniversaryModule[] =>
  MODULES.filter((m) => m.group === group);

/** what fires by itself when she first opens the app on the day */
export const OPENING_MODULE_ID = "banner";
