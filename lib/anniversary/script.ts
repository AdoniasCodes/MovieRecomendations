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
      "A year is long enough to stop performing. You have seen me tired, broke, stubborn, wrong, and in the middle of things I did not know how to fix. You did not leave. You did not even flinch.",
      "That is the part nobody sees from the outside. Everyone sees the photos. Nobody sees the ordinary Tuesdays, the arguments we got through, the nights one of us was quiet and the other one just stayed.",
      "People talk about love like it is a feeling that happens to you. This year taught me it is a decision you make again and again, and I have made it every single day without once having to think about it.",
      "You are the best thing that has ever happened to me. I am not saying that because it is today. I am saying it because it is true, and today just gives me an excuse.",
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
      "I am not going to promise you a perfect year. Nobody can do that and you would not believe me anyway.",
      "Here is what I can promise. I will keep choosing you on the days it is easy and on the days it is not. I will keep telling you things instead of going quiet. And whatever comes, you will not be facing it on your own.",
      "Year one was us finding out. Year two is us building.",
    ],
    signoff: "I mean it",
  },
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
    story: "I took a lot of photos that evening and I kept this one closest. You were not even trying and you still looked like that.",
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
    story: "You know exactly what you are doing when you make this face. That is the worst part.",
  },
  {
    id: "photo-kiss",
    kind: "photo",
    group: "photos",
    label: "Photo: mirror, me kissing you",
    src: "/anniversary/photos/mirror-kiss.jpg",
    caption: "My favourite place to put my face",
    story: "The red sweater one. You laughed through the entire photoshoot and we got about forty of these.",
  },
  {
    id: "photo-laugh",
    kind: "photo",
    group: "photos",
    label: "Photo: you hiding, laughing",
    src: "/anniversary/photos/mirror-laugh.jpg",
    caption: "You, hiding, laughing",
    story: "You do this every single time a camera comes out and I hope you never stop.",
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
    label: "Photo: last night",
    src: "/anniversary/photos/night-drinks.jpg",
    caption: "Last night, the night before our anniversary",
    story: "Twenty four hours before all of this. You had no idea what I was building.",
  },
  {
    id: "photo-late",
    kind: "photo",
    group: "photos",
    label: "Photo: late last night",
    src: "/anniversary/photos/late-us.jpg",
    caption: "And then this, late",
    story: "Sideways, badly lit, both of us tired. Still one of the good ones.",
  },
  {
    id: "guess-when",
    kind: "photoGuess",
    group: "photos",
    label: "Game: how long ago was this?",
    src: "/anniversary/photos/her-habesha.jpg",
    question: "How long ago did you send me these?",
    options: ["About a month ago", "Last week", "Back at the start of the year"],
    answerIndex: 0,
    reveal: "End of June. I have looked at them a suspicious number of times since.",
  },
  {
    id: "guess-where",
    kind: "photoGuess",
    group: "photos",
    label: "Game: what was behind you?",
    src: "/anniversary/photos/park-her-gate.jpg",
    question: "What was right behind you in this one?",
    options: ["The river and the flower arch", "The lake", "The hotel garden"],
    answerIndex: 0,
    reveal: "The river, the arch, and the whole park lighting up behind you. Two weeks ago, and I already wanted to bring you back.",
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
