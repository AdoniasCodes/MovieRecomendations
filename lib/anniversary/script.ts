// THE CONTENT FILE. Everything Hermi sees on July 31 is in this one file.
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
  | "photoGuess"
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

export interface PhotoGuessModule extends Base {
  kind: "photoGuess";
  src: string;
  question: string;
  options: string[];
  answerIndex: number;
  /** what she reads once the photo is uncovered */
  reveal: string;
}

export interface NumbersModule extends Base {
  kind: "numbers";
  title: string;
  /** value "live:days" and "live:months" get replaced with real counts */
  stats: { value: string; label: string; note?: string }[];
}

export type ItineraryIcon = "gift" | "ink" | "drinks" | "smoke" | "moon";

export interface ItineraryModule extends Base {
  kind: "itinerary";
  step: number;
  /** loose by design: "around 3" beats "15:00" when the day is drifting */
  when: string;
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
  | PhotoGuessModule
  | NumbersModule
  | ItineraryModule
  | JokeModule
  | FinaleModule;

export const GROUP_LABELS: Record<ModuleGroup, string> = {
  opening: "The open",
  letters: "Letters and voice",
  photos: "Us, in pictures",
  numbers: "Numbers",
  day: "The day",
  finale: "The finale",
};

/** placeholder photo until the real folder lands */
const PLACEHOLDER = "/couple.jpg";

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
  {
    id: "letter-morning",
    kind: "message",
    group: "opening",
    label: "Letter: good morning",
    seal: "Open this first",
    title: "Good morning, my love",
    body: [
      "One year ago today, everything got better. I am not being dramatic, I am being accurate.",
      "I built this whole thing inside our app because I wanted today to start the second you opened your phone, before I even got to see your face.",
      "Today is yours. I planned all of it. You do not have to think about a single thing.",
    ],
    signoff: "Yours, always",
  },

  /* ------------------------------------------------------------- letters */
  {
    id: "letter-year",
    kind: "message",
    group: "letters",
    label: "Letter: the year we had",
    seal: "About this year",
    title: "What this year actually was",
    body: [
      "REPLACE ME with the real letter from your text file.",
      "This one is the long one. The year, the hard parts, the parts nobody else saw, and why you would do all of it again.",
    ],
    signoff: "Every word of it",
  },
  {
    id: "letter-promise",
    kind: "message",
    group: "letters",
    label: "Letter: the promise",
    seal: "Hold this one down",
    title: "Going into year two",
    body: [
      "REPLACE ME with what you want to promise her for the year ahead.",
      "Short is stronger here. Two or three lines that she will remember.",
    ],
    signoff: "I mean it",
  },
  {
    id: "voice-morning",
    kind: "voice",
    group: "letters",
    label: "Voice note: good morning",
    src: "/anniversary/audio/note-morning.m4a",
    title: "Press play, it is me",
    caption: "Recorded the night before, while you were asleep.",
  },
  {
    id: "voice-mid",
    kind: "voice",
    group: "letters",
    label: "Voice note: the middle one",
    src: "/anniversary/audio/note-mid.m4a",
    title: "One more thing I wanted to say out loud",
  },
  {
    id: "voice-night",
    kind: "voice",
    group: "letters",
    label: "Voice note: for the end of the night",
    src: "/anniversary/audio/note-night.m4a",
    title: "Save this one for later tonight",
    caption: "No peeking early.",
  },

  /* -------------------------------------------------------------- photos */
  {
    id: "photo-first",
    kind: "photo",
    group: "photos",
    label: "Photo: the first one",
    src: PLACEHOLDER,
    caption: "The very first picture of us",
    story: "REPLACE ME with the story of this photo. Where you were, what you were both thinking.",
  },
  {
    id: "photo-two",
    kind: "photo",
    group: "photos",
    label: "Photo: 2",
    src: PLACEHOLDER,
    caption: "REPLACE ME",
    story: "REPLACE ME",
  },
  {
    id: "photo-three",
    kind: "photo",
    group: "photos",
    label: "Photo: 3",
    src: PLACEHOLDER,
    caption: "REPLACE ME",
    story: "REPLACE ME",
  },
  {
    id: "photo-four",
    kind: "photo",
    group: "photos",
    label: "Photo: 4",
    src: PLACEHOLDER,
    caption: "REPLACE ME",
    story: "REPLACE ME",
  },
  {
    id: "guess-where",
    kind: "photoGuess",
    group: "photos",
    label: "Game: where were we?",
    src: PLACEHOLDER,
    question: "Where were we when this was taken?",
    options: ["REPLACE ME", "REPLACE ME", "REPLACE ME"],
    answerIndex: 0,
    reveal: "REPLACE ME with the answer and why that day mattered.",
  },
  {
    id: "guess-when",
    kind: "photoGuess",
    group: "photos",
    label: "Game: how long ago?",
    src: PLACEHOLDER,
    question: "How long ago was this?",
    options: ["REPLACE ME", "REPLACE ME", "REPLACE ME"],
    answerIndex: 1,
    reveal: "REPLACE ME",
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
      { value: "REPLACE", label: "REPLACE ME", note: "add your own real numbers here" },
      { value: "REPLACE", label: "REPLACE ME" },
      { value: "0", label: "days I regret" },
    ],
  },

  /* ----------------------------------------------------------------- day */
  {
    id: "day-room",
    kind: "itinerary",
    group: "day",
    label: "Stop 1: the room",
    step: 1,
    when: "Around 3",
    place: "Just us",
    headline: "First, nobody else exists",
    detail:
      "Cake, flowers, and wine waiting in the room. No plans in here, no phones, no rushing. This part of the day is only for us.",
    icon: "gift",
  },
  {
    id: "day-tattoo",
    kind: "itinerary",
    group: "day",
    label: "Stop 2: tattoos",
    step: 2,
    when: "Around 4:35",
    place: "The tattoo shop",
    headline: "Then we make it permanent",
    detail: "We are getting inked today. Something we both carry from here on.",
    icon: "ink",
  },
  {
    id: "day-cocktails",
    kind: "itinerary",
    group: "day",
    label: "Stop 3: cocktails and dinner",
    step: 3,
    when: "Evening",
    place: "The cocktail spot",
    headline: "Dinner and the good cocktails",
    detail: "I know a place. Excellent drinks, prices that will not ruin the night, and dinner while we are there.",
    icon: "drinks",
  },
  {
    id: "day-hookah",
    kind: "itinerary",
    group: "day",
    label: "Stop 4: hookah",
    step: 4,
    when: "Late",
    place: "The chill spot",
    headline: "Then we slow all the way down",
    detail: "Hookah, nowhere to be, and however long we feel like staying.",
    icon: "smoke",
  },
  {
    id: "day-back",
    kind: "itinerary",
    group: "day",
    label: "Stop 5: back to the room",
    step: 5,
    when: "Around 11",
    place: "Back where we started",
    headline: "And then it is just us again",
    detail: "One more thing waiting for you when we get back. You will find out.",
    icon: "moon",
  },
  {
    id: "joke-one",
    kind: "joke",
    group: "day",
    label: "Joke: filler 1",
    setup: "REPLACE ME with one of our inside jokes",
    punch: "REPLACE ME",
  },
  {
    id: "joke-two",
    kind: "joke",
    group: "day",
    label: "Joke: filler 2",
    setup: "REPLACE ME",
    punch: "REPLACE ME",
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
