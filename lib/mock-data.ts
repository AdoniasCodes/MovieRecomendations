import { POSTERS } from "./posters";
import type { Title, User } from "./types";

export const ME: User = { id: "me", name: "Panda", emoji: "🐼", color: "#7C3AED" };
// Hermi 💞 (aka Mi Amore / LOML)
export const PARTNER: User = { id: "her", name: "Hermi", emoji: "💞", color: "#DB2777" };
export const USERS = [ME, PARTNER];

// ---- taste profiles (drive personalization) ------------------------------

// Panda: crime / psych-thriller / mystery. Fine with blood & brutal action.
export const TASTE_SEED = {
  genres: ["Crime", "Psychological Thriller", "Mystery", "Detective", "Drama", "Thriller"],
  lovedTitleIds: [
    "tv:46648", // True Detective
    "tv:67744", // Mindhunter
    "tv:1396", // Breaking Bad
    "tv:76479", // The Boys
    "tv:70523", // Dark
    "tv:95396", // Severance
    "tv:60622", // Fargo
    "movie:146233", // Prisoners
    "movie:1949", // Zodiac
    "movie:807", // Se7en
  ],
  likes: ["intelligent", "plot-twists", "characters", "dark", "writing", "tension", "must-watch"],
  doNotWant: ["generic", "bad-romance", "predictable", "bollywood"],
  maxViolence: 5, // tolerates anything
  lovesInternational: true,
};
export const TASTE_PANDA = TASTE_SEED;

// Amore: wholesome — animation / comedy / heartfelt drama. Loves international (KR/JP/TR/CN).
// HARD no on blood/gore/brutal action. Crime only if cerebral & low-violence.
export const TASTE_AMORE = {
  genres: ["Animation", "Comedy", "Drama", "Romance", "Family", "Mystery"],
  lovedTitleIds: [
    "movie:129", // Spirited Away
    "movie:372058", // Your Name
    "tv:94796", // Crash Landing on You
    "tv:64349", // Reply 1988
    "movie:619264", // Miracle in Cell No. 7
    "movie:346648", // Paddington 2
    "movie:546554", // Knives Out
    "movie:705996", // Decision to Leave
  ],
  likes: ["wholesome", "cerebral", "international", "heartfelt", "clever", "cozy", "romantic"],
  doNotWant: ["gore", "brutal-violence", "bollywood"],
  maxViolence: 3, // hard ceiling — anything above is filtered out for her & for "together"
  lovesInternational: true,
};

export const TASTES = { me: TASTE_PANDA, her: TASTE_AMORE } as const;

/** neither of us likes Bollywood / Indian cinema */
export const EXCLUDED_COUNTRIES = ["India"];

const t = (x: Title): Title => x;

export const TITLES: Title[] = [
  // ===== Panda's crime / thriller / mystery core =====
  t({
    id: "tv:46648", tmdbId: 46648, mediaType: "tv", title: "True Detective", year: 2014, era: "2010s",
    runtime: 55, seasons: 4, genres: ["Crime", "Drama", "Mystery"], vibes: ["dark", "mysterious", "thought-provoking"],
    moods: ["intense", "curious"], energy: "full-attention", commitment: "full-series", voteAverage: 8.6, popularity: 88,
    hiddenGem: false, classic: false, violence: 4, cerebral: true, country: "US", language: "English",
    overview: "Two detectives chase a ritualistic killer across 17 years and their own unraveling.",
    cast: ["Matthew McConaughey", "Woody Harrelson", "Mahershala Ali"], colorA: "#1f2a44", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:67744", tmdbId: 67744, mediaType: "tv", title: "Mindhunter", year: 2017, era: "modern",
    runtime: 50, seasons: 2, genres: ["Crime", "Drama", "Detective"], vibes: ["dark", "thought-provoking", "mysterious"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "full-series", voteAverage: 8.6, popularity: 84,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "US", language: "English",
    overview: "FBI agents interview imprisoned serial killers to understand how they think.",
    cast: ["Jonathan Groff", "Holt McCallany", "Anna Torv"], colorA: "#2a2118", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:1396", tmdbId: 1396, mediaType: "tv", title: "Breaking Bad", year: 2008, era: "2000s",
    runtime: 49, seasons: 5, genres: ["Crime", "Drama", "Thriller"], vibes: ["dark", "thrilling", "mind-blowing"],
    moods: ["intense", "excited"], energy: "full-attention", commitment: "full-series", voteAverage: 8.9, popularity: 96,
    hiddenGem: false, classic: true, violence: 4, country: "US", language: "English",
    overview: "A chemistry teacher turns to making meth — and becomes something far worse.",
    cast: ["Bryan Cranston", "Aaron Paul", "Anna Gunn"], colorA: "#3a4a2a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:76479", tmdbId: 76479, mediaType: "tv", title: "The Boys", year: 2019, era: "modern",
    runtime: 60, seasons: 4, genres: ["Action", "Crime", "Comedy"], vibes: ["action-packed", "dark", "thrilling"],
    moods: ["excited", "intense"], energy: "moderate", commitment: "full-series", voteAverage: 8.4, popularity: 92,
    hiddenGem: false, classic: false, violence: 5, country: "US", language: "English",
    overview: "Vigilantes take on corrupt, celebrity superheroes in a brutal, satirical world.",
    cast: ["Karl Urban", "Jack Quaid", "Antony Starr"], colorA: "#5a1f1f", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:70523", tmdbId: 70523, mediaType: "tv", title: "Dark", year: 2017, era: "modern",
    runtime: 55, seasons: 3, genres: ["Mystery", "Sci-Fi", "Thriller"], vibes: ["mind-blowing", "dark", "mysterious"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "full-series", voteAverage: 8.7, popularity: 85,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "Germany", language: "German", international: true,
    overview: "A child's disappearance unspools a time-travel mystery binding four families.",
    cast: ["Louis Hofmann", "Lisa Vicari", "Oliver Masucci"], colorA: "#16202a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:95396", tmdbId: 95396, mediaType: "tv", title: "Severance", year: 2022, era: "modern",
    runtime: 50, seasons: 2, genres: ["Drama", "Mystery", "Sci-Fi"], vibes: ["thought-provoking", "mysterious", "mind-blowing"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "full-series", voteAverage: 8.7, popularity: 90,
    hiddenGem: false, classic: false, violence: 1, cerebral: true, country: "US", language: "English",
    overview: "Workers surgically split their memories between work and home — until the wall cracks.",
    cast: ["Adam Scott", "Britt Lower", "Patricia Arquette"], colorA: "#1a2a33", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:60622", tmdbId: 60622, mediaType: "tv", title: "Fargo", year: 2014, era: "2010s",
    runtime: 53, seasons: 5, genres: ["Crime", "Drama", "Thriller"], vibes: ["dark", "thrilling", "mysterious"],
    moods: ["curious", "intense"], energy: "moderate", commitment: "full-series", voteAverage: 8.5, popularity: 80,
    hiddenGem: false, classic: false, violence: 4, country: "US", language: "English",
    overview: "Snowbound Midwest crime stories where ordinary lies spiral into murder.",
    cast: ["Billy Bob Thornton", "Martin Freeman", "Kirsten Dunst"], colorA: "#2a3540", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:146233", tmdbId: 146233, mediaType: "movie", title: "Prisoners", year: 2013, era: "2010s",
    runtime: 153, genres: ["Crime", "Drama", "Thriller"], vibes: ["dark", "thrilling", "emotional"],
    moods: ["intense", "stressed"], energy: "full-attention", commitment: "movie", voteAverage: 8.1, popularity: 78,
    hiddenGem: false, classic: false, violence: 3, cerebral: true, country: "US", language: "English",
    overview: "A father takes the law into his own hands when his daughter vanishes.",
    cast: ["Hugh Jackman", "Jake Gyllenhaal", "Viola Davis"], colorA: "#22282a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:1949", tmdbId: 1949, mediaType: "movie", title: "Zodiac", year: 2007, era: "2000s",
    runtime: 157, genres: ["Crime", "Drama", "Mystery"], vibes: ["mysterious", "dark", "thought-provoking"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 7.7, popularity: 70,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "US", language: "English",
    overview: "Obsession consumes those hunting the Zodiac killer across decades.",
    cast: ["Jake Gyllenhaal", "Robert Downey Jr.", "Mark Ruffalo"], colorA: "#1e2730", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:807", tmdbId: 807, mediaType: "movie", title: "Se7en", year: 1995, era: "90s",
    runtime: 127, genres: ["Crime", "Mystery", "Thriller"], vibes: ["dark", "thrilling", "mind-blowing"],
    moods: ["intense", "stressed"], energy: "full-attention", commitment: "movie", voteAverage: 8.4, popularity: 82,
    hiddenGem: false, classic: true, violence: 4, country: "US", language: "English",
    overview: "Two detectives hunt a killer staging murders around the seven deadly sins.",
    cast: ["Brad Pitt", "Morgan Freeman", "Kevin Spacey"], colorA: "#23201a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:1398", tmdbId: 1398, mediaType: "tv", title: "The Sopranos", year: 1999, era: "90s",
    runtime: 55, seasons: 6, genres: ["Crime", "Drama"], vibes: ["dark", "thought-provoking", "emotional"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "long-term", voteAverage: 8.7, popularity: 79,
    hiddenGem: false, classic: true, violence: 4, country: "US", language: "English",
    overview: "A mob boss juggles family, therapy, and a crumbling criminal empire.",
    cast: ["James Gandolfini", "Edie Falco", "Lorraine Bracco"], colorA: "#3a2a2a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:1438", tmdbId: 1438, mediaType: "tv", title: "The Wire", year: 2002, era: "2000s",
    runtime: 59, seasons: 5, genres: ["Crime", "Drama", "Thriller"], vibes: ["dark", "thought-provoking", "thrilling"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "long-term", voteAverage: 8.6, popularity: 74,
    hiddenGem: false, classic: true, violence: 3, cerebral: true, country: "US", language: "English",
    overview: "Cops and dealers in Baltimore, drawn with novelistic depth across the whole city.",
    cast: ["Dominic West", "Idris Elba", "Michael K. Williams"], colorA: "#26323a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:238", tmdbId: 238, mediaType: "movie", title: "The Godfather", year: 1972, era: "70s",
    runtime: 175, genres: ["Crime", "Drama"], vibes: ["dark", "emotional", "thought-provoking"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 8.7, popularity: 85,
    hiddenGem: false, classic: true, violence: 3, country: "US", language: "English",
    overview: "A reluctant son inherits his family's crime dynasty.",
    cast: ["Marlon Brando", "Al Pacino", "James Caan"], colorA: "#2a241a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:550", tmdbId: 550, mediaType: "movie", title: "Fight Club", year: 1999, era: "90s",
    runtime: 139, genres: ["Drama", "Thriller"], vibes: ["mind-blowing", "dark", "thought-provoking"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 8.4, popularity: 88,
    hiddenGem: false, classic: true, violence: 4, country: "US", language: "English",
    overview: "An insomniac and a soap salesman start a club that spirals out of control.",
    cast: ["Edward Norton", "Brad Pitt", "Helena Bonham Carter"], colorA: "#3a2a24", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:274", tmdbId: 274, mediaType: "movie", title: "The Silence of the Lambs", year: 1991, era: "90s",
    runtime: 119, genres: ["Crime", "Thriller", "Horror"], vibes: ["dark", "thrilling", "mysterious"],
    moods: ["intense", "stressed"], energy: "full-attention", commitment: "movie", voteAverage: 8.3, popularity: 80,
    hiddenGem: false, classic: true, violence: 3, cerebral: true, country: "US", language: "English",
    overview: "A trainee enlists a cannibal genius to catch another killer.",
    cast: ["Jodie Foster", "Anthony Hopkins", "Scott Glenn"], colorA: "#2a2230", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:6977", tmdbId: 6977, mediaType: "movie", title: "No Country for Old Men", year: 2007, era: "2000s",
    runtime: 122, genres: ["Crime", "Drama", "Thriller"], vibes: ["dark", "thrilling", "thought-provoking"],
    moods: ["intense", "curious"], energy: "full-attention", commitment: "movie", voteAverage: 8.2, popularity: 75,
    hiddenGem: false, classic: true, violence: 4, country: "US", language: "English",
    overview: "A hunter takes drug money and is stalked by an unstoppable killer.",
    cast: ["Javier Bardem", "Josh Brolin", "Tommy Lee Jones"], colorA: "#3a3424", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:210577", tmdbId: 210577, mediaType: "movie", title: "Gone Girl", year: 2014, era: "2010s",
    runtime: 149, genres: ["Crime", "Drama", "Mystery"], vibes: ["dark", "mysterious", "thrilling"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 8.0, popularity: 81,
    hiddenGem: false, classic: false, violence: 3, cerebral: true, country: "US", language: "English",
    overview: "A wife vanishes and the perfect marriage turns out to be a stage.",
    cast: ["Ben Affleck", "Rosamund Pike", "Neil Patrick Harris"], colorA: "#24303a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:11324", tmdbId: 11324, mediaType: "movie", title: "Shutter Island", year: 2010, era: "2010s",
    runtime: 138, genres: ["Mystery", "Thriller", "Drama"], vibes: ["mysterious", "mind-blowing", "dark"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 8.2, popularity: 83,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "US", language: "English",
    overview: "A marshal investigates a vanished patient on an island that hides everything.",
    cast: ["Leonardo DiCaprio", "Mark Ruffalo", "Ben Kingsley"], colorA: "#1c2630", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:11423", tmdbId: 11423, mediaType: "movie", title: "Memories of Murder", year: 2003, era: "2000s",
    runtime: 132, genres: ["Crime", "Drama", "Mystery"], vibes: ["dark", "mysterious", "thought-provoking"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 8.1, popularity: 58,
    hiddenGem: true, classic: false, violence: 2, cerebral: true, country: "South Korea", language: "Korean", international: true,
    overview: "Rural detectives stumble through Korea's first serial-murder case.",
    cast: ["Song Kang-ho", "Kim Sang-kyung", "Kim Roe-ha"], colorA: "#2a2e24", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:65701", tmdbId: 65701, mediaType: "tv", title: "The Night Of", year: 2016, era: "2010s",
    runtime: 60, seasons: 1, genres: ["Crime", "Drama", "Mystery"], vibes: ["dark", "mysterious", "emotional"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "mini-series", voteAverage: 8.1, popularity: 60,
    hiddenGem: true, classic: false, violence: 2, cerebral: true, country: "US", language: "English",
    overview: "One night, one body, and a young man swallowed by the justice system.",
    cast: ["Riz Ahmed", "John Turturro", "Bill Camp"], colorA: "#2a2230", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:87108", tmdbId: 87108, mediaType: "tv", title: "Chernobyl", year: 2019, era: "modern",
    runtime: 65, seasons: 1, genres: ["Drama", "History", "Thriller"], vibes: ["dark", "emotional", "thrilling"],
    moods: ["intense", "stressed"], energy: "full-attention", commitment: "mini-series", voteAverage: 8.7, popularity: 77,
    hiddenGem: false, classic: false, violence: 2, country: "UK", language: "English",
    overview: "The 1986 disaster and the lies that made it deadlier than the blast.",
    cast: ["Jared Harris", "Stellan Skarsgård", "Emily Watson"], colorA: "#2a3024", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:273481", tmdbId: 273481, mediaType: "movie", title: "Sicario", year: 2015, era: "2010s",
    runtime: 121, genres: ["Action", "Crime", "Thriller"], vibes: ["thrilling", "dark", "action-packed"],
    moods: ["intense", "stressed"], energy: "full-attention", commitment: "movie", voteAverage: 7.6, popularity: 72,
    hiddenGem: false, classic: false, violence: 4, country: "US", language: "English",
    overview: "An idealistic agent is pulled into a brutal cartel task force.",
    cast: ["Emily Blunt", "Benicio del Toro", "Josh Brolin"], colorA: "#33291a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:670", tmdbId: 670, mediaType: "movie", title: "Oldboy", year: 2003, era: "2000s",
    runtime: 120, genres: ["Mystery", "Thriller", "Drama"], vibes: ["mind-blowing", "dark", "thrilling"],
    moods: ["intense", "curious"], energy: "full-attention", commitment: "movie", voteAverage: 8.3, popularity: 64,
    hiddenGem: true, classic: false, violence: 5, country: "South Korea", language: "Korean", international: true,
    overview: "A man imprisoned for 15 years has five days to find out why.",
    cast: ["Choi Min-sik", "Yoo Ji-tae", "Kang Hye-jung"], colorA: "#3a2230", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:493922", tmdbId: 493922, mediaType: "movie", title: "Hereditary", year: 2018, era: "modern",
    runtime: 127, genres: ["Horror", "Mystery", "Drama"], vibes: ["dark", "thrilling", "emotional"],
    moods: ["stressed", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 7.3, popularity: 68,
    hiddenGem: false, classic: false, violence: 4, country: "US", language: "English",
    overview: "Grief unearths something ancient and merciless in a family.",
    cast: ["Toni Collette", "Alex Wolff", "Milly Shapiro"], colorA: "#241a22", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:60059", tmdbId: 60059, mediaType: "tv", title: "Better Call Saul", year: 2015, era: "2010s",
    runtime: 47, seasons: 6, genres: ["Crime", "Drama"], vibes: ["dark", "emotional", "thought-provoking"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "long-term", voteAverage: 8.8, popularity: 81,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "US", language: "English",
    overview: "A small-time lawyer's slow, dazzling slide into Saul Goodman.",
    cast: ["Bob Odenkirk", "Rhea Seehorn", "Jonathan Banks"], colorA: "#33301a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:496243", tmdbId: 496243, mediaType: "movie", title: "Parasite", year: 2019, era: "modern",
    runtime: 132, genres: ["Drama", "Thriller", "Comedy"], vibes: ["thrilling", "thought-provoking", "dark"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 8.5, popularity: 89,
    hiddenGem: false, classic: false, violence: 3, cerebral: true, country: "South Korea", language: "Korean", international: true,
    overview: "A poor family schemes its way into a rich household — then the basement opens.",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"], colorA: "#243224", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:27205", tmdbId: 27205, mediaType: "movie", title: "Inception", year: 2010, era: "2010s",
    runtime: 148, genres: ["Action", "Sci-Fi", "Thriller"], vibes: ["mind-blowing", "action-packed", "thrilling"],
    moods: ["excited", "curious"], energy: "moderate", commitment: "movie", voteAverage: 8.4, popularity: 94,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "US", language: "English",
    overview: "Thieves plant an idea inside a mind through layered dreams.",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"], colorA: "#23303a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:136315", tmdbId: 136315, mediaType: "tv", title: "The Bear", year: 2022, era: "modern",
    runtime: 30, seasons: 3, genres: ["Drama", "Comedy"], vibes: ["emotional", "thrilling", "thought-provoking"],
    moods: ["stressed", "intense"], energy: "moderate", commitment: "full-series", voteAverage: 8.3, popularity: 83,
    hiddenGem: false, classic: false, violence: 1, country: "US", language: "English",
    overview: "A fine-dining chef takes over his late brother's chaotic sandwich shop.",
    cast: ["Jeremy Allen White", "Ayo Edebiri", "Ebon Moss-Bachrach"], colorA: "#332a1a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:545611", tmdbId: 545611, mediaType: "movie", title: "Everything Everywhere All at Once", year: 2022, era: "modern",
    runtime: 139, genres: ["Action", "Adventure", "Comedy"], vibes: ["mind-blowing", "emotional", "funny"],
    moods: ["excited", "happy"], energy: "moderate", commitment: "movie", voteAverage: 8.1, popularity: 87,
    hiddenGem: false, classic: false, violence: 2, country: "US", language: "English",
    overview: "A laundromat owner becomes the multiverse's unlikeliest hero.",
    cast: ["Michelle Yeoh", "Ke Huy Quan", "Stephanie Hsu"], colorA: "#3a2438", colorB: "#0a0a0a",
  }),

  // ===== Wholesome / comedy / cozy — couple-friendly =====
  t({
    id: "movie:120467", tmdbId: 120467, mediaType: "movie", title: "The Grand Budapest Hotel", year: 2014, era: "2010s",
    runtime: 99, genres: ["Comedy", "Adventure", "Drama"], vibes: ["funny", "cozy", "comfort"],
    moods: ["happy", "relaxing"], energy: "moderate", commitment: "movie", voteAverage: 8.0, popularity: 79,
    hiddenGem: false, classic: false, violence: 1, country: "US", language: "English",
    overview: "A legendary concierge and his protégé in a candy-colored caper.",
    cast: ["Ralph Fiennes", "Tony Revolori", "Saoirse Ronan"], colorA: "#5a2a44", colorB: "#1a0a14",
  }),
  t({
    id: "tv:48891", tmdbId: 48891, mediaType: "tv", title: "Brooklyn Nine-Nine", year: 2013, era: "2010s",
    runtime: 22, seasons: 8, genres: ["Comedy", "Crime"], vibes: ["funny", "comfort", "cozy"],
    moods: ["happy", "relaxing", "distraction"], energy: "brain-off", commitment: "long-term", voteAverage: 8.4, popularity: 86,
    hiddenGem: false, classic: false, violence: 1, country: "US", language: "English",
    overview: "A goofy detective and his deadpan captain run the funniest precinct in NYC.",
    cast: ["Andy Samberg", "Andre Braugher", "Melissa Fumero"], colorA: "#1a3a4a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:2316", tmdbId: 2316, mediaType: "tv", title: "The Office", year: 2005, era: "2000s",
    runtime: 22, seasons: 9, genres: ["Comedy"], vibes: ["comfort", "funny", "cozy"],
    moods: ["relaxing", "happy", "tired"], energy: "brain-off", commitment: "long-term", voteAverage: 8.6, popularity: 91,
    hiddenGem: false, classic: false, violence: 0, country: "US", language: "English",
    overview: "The everyday absurdity of a paper company, one cringe at a time.",
    cast: ["Steve Carell", "John Krasinski", "Jenna Fischer"], colorA: "#2a3a4a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:97546", tmdbId: 97546, mediaType: "tv", title: "Ted Lasso", year: 2020, era: "modern",
    runtime: 30, seasons: 3, genres: ["Comedy", "Drama"], vibes: ["comfort", "funny", "emotional"],
    moods: ["sad", "happy", "relaxing"], energy: "brain-off", commitment: "full-series", voteAverage: 8.4, popularity: 84,
    hiddenGem: false, classic: false, violence: 0, country: "UK", language: "English",
    overview: "An American coach wins over a skeptical English football club with relentless heart.",
    cast: ["Jason Sudeikis", "Hannah Waddingham", "Brett Goldstein"], colorA: "#3a341a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:313369", tmdbId: 313369, mediaType: "movie", title: "La La Land", year: 2016, era: "2010s",
    runtime: 128, genres: ["Romance", "Drama", "Music"], vibes: ["romantic", "emotional", "cozy"],
    moods: ["happy", "sad", "relaxing"], energy: "moderate", commitment: "movie", voteAverage: 7.9, popularity: 82,
    hiddenGem: false, classic: false, violence: 0, country: "US", language: "English",
    overview: "A jazz pianist and an actress chase dreams and each other in LA.",
    cast: ["Ryan Gosling", "Emma Stone", "John Legend"], colorA: "#2a2a5a", colorB: "#0a0a14",
  }),
  t({
    id: "movie:346648", tmdbId: 346648, mediaType: "movie", title: "Paddington 2", year: 2017, era: "modern",
    runtime: 103, genres: ["Comedy", "Family", "Adventure"], vibes: ["comfort", "cozy", "funny"],
    moods: ["sad", "happy", "relaxing"], energy: "brain-off", commitment: "movie", voteAverage: 8.0, popularity: 71,
    hiddenGem: true, classic: false, violence: 0, country: "UK", language: "English",
    overview: "A very polite bear clears his name with marmalade-fueled optimism.",
    cast: ["Ben Whishaw", "Hugh Grant", "Sally Hawkins"], colorA: "#4a3a1a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:546554", tmdbId: 546554, mediaType: "movie", title: "Knives Out", year: 2019, era: "modern",
    runtime: 130, genres: ["Mystery", "Comedy", "Crime"], vibes: ["mysterious", "funny", "cozy"],
    moods: ["curious", "happy"], energy: "moderate", commitment: "movie", voteAverage: 7.9, popularity: 85,
    hiddenGem: false, classic: false, violence: 1, cerebral: true, country: "US", language: "English",
    overview: "A master detective untangles a wealthy family's lies after the patriarch dies.",
    cast: ["Daniel Craig", "Ana de Armas", "Chris Evans"], colorA: "#3a2a1a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:1124", tmdbId: 1124, mediaType: "movie", title: "The Prestige", year: 2006, era: "2000s",
    runtime: 130, genres: ["Drama", "Mystery", "Sci-Fi"], vibes: ["mysterious", "mind-blowing", "thought-provoking"],
    moods: ["curious", "intense"], energy: "full-attention", commitment: "movie", voteAverage: 8.2, popularity: 80,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "US", language: "English",
    overview: "Two rival magicians push obsession past the limits of trickery.",
    cast: ["Hugh Jackman", "Christian Bale", "Scarlett Johansson"], colorA: "#1a1a26", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:19885", tmdbId: 19885, mediaType: "tv", title: "Sherlock", year: 2010, era: "2010s",
    runtime: 88, seasons: 4, genres: ["Crime", "Drama", "Mystery"], vibes: ["mysterious", "thrilling", "thought-provoking"],
    moods: ["curious", "excited"], energy: "full-attention", commitment: "mini-series", voteAverage: 8.4, popularity: 82,
    hiddenGem: false, classic: false, violence: 2, cerebral: true, country: "UK", language: "English",
    overview: "A modern, brilliant Sherlock Holmes deduces his way through London's strangest crimes.",
    cast: ["Benedict Cumberbatch", "Martin Freeman", "Una Stubbs"], colorA: "#1a2630", colorB: "#0a0a0a",
  }),

  // ===== Animation — wholesome (Amore's heartland) =====
  t({
    id: "movie:129", tmdbId: 129, mediaType: "movie", title: "Spirited Away", year: 2001, era: "2000s",
    runtime: 125, genres: ["Animation", "Family", "Fantasy"], vibes: ["cozy", "emotional", "mysterious"],
    moods: ["sad", "relaxing", "curious"], energy: "moderate", commitment: "movie", voteAverage: 8.5, popularity: 88,
    hiddenGem: false, classic: true, violence: 0, country: "Japan", language: "Japanese", international: true,
    overview: "A girl works in a spirit bathhouse to free her parents and find her way home.",
    cast: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki"], colorA: "#1a4a3a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:372058", tmdbId: 372058, mediaType: "movie", title: "Your Name", year: 2016, era: "2010s",
    runtime: 106, genres: ["Animation", "Romance", "Drama"], vibes: ["romantic", "emotional", "mysterious"],
    moods: ["happy", "sad", "curious"], energy: "moderate", commitment: "movie", voteAverage: 8.5, popularity: 86,
    hiddenGem: false, classic: false, violence: 0, country: "Japan", language: "Japanese", international: true,
    overview: "Two teenagers who keep swapping bodies set out to find each other across time.",
    cast: ["Ryunosuke Kamiki", "Mone Kamishiraishi", "Ryo Narita"], colorA: "#24305a", colorB: "#0a0a14",
  }),
  t({
    id: "movie:4935", tmdbId: 4935, mediaType: "movie", title: "Howl's Moving Castle", year: 2004, era: "2000s",
    runtime: 119, genres: ["Animation", "Fantasy", "Romance"], vibes: ["cozy", "romantic", "emotional"],
    moods: ["relaxing", "happy", "curious"], energy: "moderate", commitment: "movie", voteAverage: 8.4, popularity: 80,
    hiddenGem: false, classic: true, violence: 1, country: "Japan", language: "Japanese", international: true,
    overview: "A cursed young woman and a flighty wizard hide in a walking castle as war looms.",
    cast: ["Chieko Baisho", "Takuya Kimura", "Akihiro Miwa"], colorA: "#2a4a4a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:378064", tmdbId: 378064, mediaType: "movie", title: "A Silent Voice", year: 2016, era: "2010s",
    runtime: 130, genres: ["Animation", "Drama", "Romance"], vibes: ["emotional", "cozy", "thought-provoking"],
    moods: ["sad", "relaxing"], energy: "moderate", commitment: "movie", voteAverage: 8.2, popularity: 68,
    hiddenGem: true, classic: false, violence: 1, country: "Japan", language: "Japanese", international: true,
    overview: "A former bully seeks redemption with the deaf girl he once tormented.",
    cast: ["Miyu Irino", "Saori Hayami", "Aoi Yuki"], colorA: "#2a4a52", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:354912", tmdbId: 354912, mediaType: "movie", title: "Coco", year: 2017, era: "modern",
    runtime: 105, genres: ["Animation", "Family", "Music"], vibes: ["emotional", "cozy", "funny"],
    moods: ["happy", "sad", "relaxing"], energy: "brain-off", commitment: "movie", voteAverage: 8.2, popularity: 84,
    hiddenGem: false, classic: false, violence: 0, country: "US", language: "English",
    overview: "A boy journeys to the Land of the Dead to unlock his family's musical secret.",
    cast: ["Anthony Gonzalez", "Gael García Bernal", "Benjamin Bratt"], colorA: "#5a2a44", colorB: "#1a0a14",
  }),
  t({
    id: "movie:508965", tmdbId: 508965, mediaType: "movie", title: "Klaus", year: 2019, era: "modern",
    runtime: 96, genres: ["Animation", "Comedy", "Family"], vibes: ["cozy", "funny", "emotional"],
    moods: ["happy", "relaxing"], energy: "brain-off", commitment: "movie", voteAverage: 8.2, popularity: 74,
    hiddenGem: true, classic: false, violence: 0, country: "Spain", language: "English", international: true,
    overview: "A selfish postman and a reclusive toymaker accidentally reinvent kindness.",
    cast: ["Jason Schwartzman", "J.K. Simmons", "Rashida Jones"], colorA: "#1a3a52", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:14160", tmdbId: 14160, mediaType: "movie", title: "Up", year: 2009, era: "2000s",
    runtime: 96, genres: ["Animation", "Family", "Adventure"], vibes: ["emotional", "cozy", "funny"],
    moods: ["sad", "happy", "relaxing"], energy: "brain-off", commitment: "movie", voteAverage: 8.0, popularity: 83,
    hiddenGem: false, classic: false, violence: 0, country: "US", language: "English",
    overview: "A widower and an earnest boy scout float a house to South America by balloon.",
    cast: ["Ed Asner", "Jordan Nagai", "Christopher Plummer"], colorA: "#2a5a5a", colorB: "#0a0a0a",
  }),

  // ===== International live-action — wholesome / cerebral (Amore loves these) =====
  t({
    id: "tv:94796", tmdbId: 94796, mediaType: "tv", title: "Crash Landing on You", year: 2019, era: "modern",
    runtime: 70, seasons: 1, genres: ["Romance", "Comedy", "Drama"], vibes: ["romantic", "funny", "emotional"],
    moods: ["happy", "relaxing"], energy: "brain-off", commitment: "full-series", voteAverage: 8.7, popularity: 82,
    hiddenGem: false, classic: false, violence: 1, country: "South Korea", language: "Korean", international: true,
    overview: "A paragliding heiress crash-lands in North Korea and into a soldier's heart.",
    cast: ["Hyun Bin", "Son Ye-jin", "Seo Ji-hye"], colorA: "#2a3a5a", colorB: "#0a0a14",
  }),
  t({
    id: "tv:64349", tmdbId: 64349, mediaType: "tv", title: "Reply 1988", year: 2015, era: "2010s",
    runtime: 90, seasons: 1, genres: ["Drama", "Comedy", "Family"], vibes: ["comfort", "cozy", "emotional"],
    moods: ["happy", "sad", "relaxing"], energy: "brain-off", commitment: "full-series", voteAverage: 9.0, popularity: 70,
    hiddenGem: true, classic: false, violence: 0, country: "South Korea", language: "Korean", international: true,
    overview: "Five families on one Seoul alley in 1988 — warmth, first love, and growing up.",
    cast: ["Lee Hye-ri", "Ryu Jun-yeol", "Go Kyung-pyo"], colorA: "#4a3a2a", colorB: "#0a0a0a",
  }),
  t({
    id: "tv:120511", tmdbId: 120511, mediaType: "tv", title: "Hometown Cha-Cha-Cha", year: 2021, era: "modern",
    runtime: 75, seasons: 1, genres: ["Romance", "Comedy", "Drama"], vibes: ["cozy", "romantic", "comfort"],
    moods: ["happy", "relaxing"], energy: "brain-off", commitment: "full-series", voteAverage: 8.5, popularity: 68,
    hiddenGem: true, classic: false, violence: 0, country: "South Korea", language: "Korean", international: true,
    overview: "A big-city dentist and a charming jack-of-all-trades fall for a seaside village.",
    cast: ["Shin Min-a", "Kim Seon-ho", "Lee Sang-yi"], colorA: "#1a4a5a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:705996", tmdbId: 705996, mediaType: "movie", title: "Decision to Leave", year: 2022, era: "modern",
    runtime: 139, genres: ["Romance", "Mystery", "Crime"], vibes: ["mysterious", "romantic", "thought-provoking"],
    moods: ["curious", "relaxing"], energy: "full-attention", commitment: "movie", voteAverage: 7.8, popularity: 66,
    hiddenGem: true, classic: false, violence: 2, cerebral: true, country: "South Korea", language: "Korean", international: true,
    overview: "A detective falls for the prime suspect in a death he can't stop investigating.",
    cast: ["Park Hae-il", "Tang Wei", "Lee Jung-hyun"], colorA: "#2a3a44", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:505192", tmdbId: 505192, mediaType: "movie", title: "Shoplifters", year: 2018, era: "modern",
    runtime: 121, genres: ["Drama", "Crime"], vibes: ["emotional", "thought-provoking", "cozy"],
    moods: ["sad", "curious", "relaxing"], energy: "moderate", commitment: "movie", voteAverage: 8.0, popularity: 60,
    hiddenGem: true, classic: false, violence: 1, cerebral: true, country: "Japan", language: "Japanese", international: true,
    overview: "A makeshift family scrapes by on small thefts — until a secret tests their bond.",
    cast: ["Lily Franky", "Sakura Ando", "Kirin Kiki"], colorA: "#3a3424", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:619264", tmdbId: 619264, mediaType: "movie", title: "Miracle in Cell No. 7", year: 2019, era: "modern",
    runtime: 132, genres: ["Drama", "Comedy", "Family"], vibes: ["emotional", "comfort", "cozy"],
    moods: ["sad", "happy"], energy: "moderate", commitment: "movie", voteAverage: 8.3, popularity: 72,
    hiddenGem: false, classic: false, violence: 1, country: "Turkey", language: "Turkish", international: true,
    overview: "A wrongly imprisoned father with a child's heart is reunited with his daughter behind bars.",
    cast: ["Aras Bulut İynemli", "Nisa Sofiya Aksongur", "Deniz Baysal"], colorA: "#3a2a4a", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:46738", tmdbId: 46738, mediaType: "movie", title: "My Father and My Son", year: 2005, era: "2000s",
    runtime: 112, genres: ["Drama", "Family"], vibes: ["emotional", "cozy", "comfort"],
    moods: ["sad", "relaxing"], energy: "moderate", commitment: "movie", voteAverage: 8.2, popularity: 55,
    hiddenGem: true, classic: false, violence: 1, country: "Turkey", language: "Turkish", international: true,
    overview: "A political journalist returns to his village with a son and an unhealed family rift.",
    cast: ["Çetin Tekindor", "Fikret Kuşkan", "Hümeyra"], colorA: "#4a3a24", colorB: "#0a0a0a",
  }),
  t({
    id: "movie:775996", tmdbId: 775996, mediaType: "movie", title: "Hi, Mom", year: 2021, era: "modern",
    runtime: 128, genres: ["Comedy", "Drama"], vibes: ["emotional", "funny", "comfort"],
    moods: ["happy", "sad"], energy: "brain-off", commitment: "movie", voteAverage: 7.8, popularity: 58,
    hiddenGem: true, classic: false, violence: 0, country: "China", language: "Mandarin", international: true,
    overview: "Grieving her mother, a young woman travels back to 1981 to befriend her as a girl.",
    cast: ["Jia Ling", "Zhang Xiaofei", "Shen Teng"], colorA: "#5a2a3a", colorB: "#1a0a14",
  }),
  t({
    id: "movie:600354", tmdbId: 600354, mediaType: "movie", title: "Better Days", year: 2019, era: "modern",
    runtime: 135, genres: ["Drama", "Romance", "Crime"], vibes: ["emotional", "dark", "thought-provoking"],
    moods: ["sad", "intense"], energy: "moderate", commitment: "movie", voteAverage: 7.9, popularity: 57,
    hiddenGem: true, classic: false, violence: 2, cerebral: true, country: "China", language: "Mandarin", international: true,
    overview: "A bullied student and a street kid protect each other as an exam and a death close in.",
    cast: ["Zhou Dongyu", "Jackson Yee", "Yin Fang"], colorA: "#2a3a44", colorB: "#0a0a0a",
  }),
];

// attach real TMDB poster paths (fetched by scripts/fetch-posters.mjs)
for (const ttl of TITLES) {
  const p = POSTERS[ttl.id];
  if (p) ttl.posterPath = p;
}

export const TITLE_BY_ID = new Map(TITLES.map((x) => [x.id, x]));

// --- live catalog registry -------------------------------------------------
// getTitle() is the single resolver used across the whole app. It resolves from
// three tiers so infinite scrolling never bloats storage:
//   1. STATIC  — the curated TITLES (richest data; seeds the rec engine)
//   2. pinned  — titles the user actually interacted with (saved/voted/watched/
//                noted/matched). Persisted unbounded — but this set stays small.
//   3. recent  — a capped LRU of everything just browsed. In-memory + a capped
//                slice persisted for a nice reload, evicted past RECENT_CAP.
const RECENT_KEY = "amore-movies/catalog";
const PINNED_KEY = "amore-movies/catalog-pinned";
const RECENT_CAP = 500; // ~500 browsed titles ≈ well under the localStorage budget

const recent = new Map<string, Title>(); // insertion-ordered → cheap LRU
const pinned = new Map<string, Title>();

function hydrate(key: string, into: Map<string, Title>) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) for (const t of JSON.parse(raw) as Title[]) into.set(t.id, t);
  } catch {
    /* ignore corrupt cache */
  }
}
hydrate(RECENT_KEY, recent);
hydrate(PINNED_KEY, pinned);

function persist(key: string, map: Map<string, Title>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...map.values()]));
  } catch {
    /* storage full/unavailable — registry still works in-memory */
  }
}

/** Register live TMDB titles so getTitle() can resolve them. Capped LRU so
 * endless browsing/scrolling can never blow up storage or memory. */
export function registerTitles(titles: Title[]) {
  let changed = false;
  for (const t of titles) {
    if (TITLE_BY_ID.has(t.id) || pinned.has(t.id)) continue;
    recent.delete(t.id); // re-insert at the end (most-recent)
    recent.set(t.id, t);
    changed = true;
  }
  // evict oldest beyond the cap
  while (recent.size > RECENT_CAP) recent.delete(recent.keys().next().value as string);
  if (changed) persist(RECENT_KEY, recent);
}

/** Permanently keep the titles the user has acted on, so their watchlist /
 * matches / notes always resolve even after browsing thousands of others. */
export function pinTitles(ids: Iterable<string>) {
  let changed = false;
  for (const id of ids) {
    if (TITLE_BY_ID.has(id) || pinned.has(id)) continue;
    const t = recent.get(id);
    if (t) {
      pinned.set(id, t);
      changed = true;
    }
  }
  if (changed) persist(PINNED_KEY, pinned);
}

export const getTitle = (id: string): Title | undefined =>
  TITLE_BY_ID.get(id) ?? pinned.get(id) ?? recent.get(id);
