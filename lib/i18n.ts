export type Lang = "en" | "sv";

export const LANG_STORAGE_KEY = "karma_lang_v1";

export const T = {
  en: {
    feed: "Feed",
    pet: "Pet",
    games: "Games",
    social: "Social",
    me: "Me",
    profile: "PROFILE",
    arcade: "ARCADE",
    karma: "KARMA",
    settings: "Settings coming soon! 🛠️",
    yourClass: "YOUR CLASS",
    badges: "BADGES",
    leaderboard: "LEADERBOARD",
    achievements: "ACHIEVEMENTS",
    yourWorld: "YOUR WORLD",
    levelUp: "LEVEL UP!",
    newPowers: "New powers unlocked 🚀",
  },
  sv: {
    feed: "Flöde",
    pet: "Husdjur",
    games: "Spel",
    social: "Social",
    me: "Jag",
    profile: "PROFIL",
    arcade: "ARKAD",
    karma: "KARMA",
    settings: "Inställningar kommer snart! 🛠️",
    yourClass: "DIN KLASS",
    badges: "MÄRKEN",
    leaderboard: "TOPPLISTA",
    achievements: "PRESTATIONER",
    yourWorld: "DIN VÄRLD",
    levelUp: "NIVÅ UPP!",
    newPowers: "Nya krafter upplåsta 🚀",
  },
} satisfies Record<Lang, Record<string, string>>;

export function t(lang: Lang, key: keyof typeof T.en): string {
  return T[lang][key] ?? T.en[key];
}
