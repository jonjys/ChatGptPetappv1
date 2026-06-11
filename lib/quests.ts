export type Quest = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  goal: number;
  karmaReward: number;
  xpReward: number;
  trackKey: string;
};

const POOL: Quest[] = [
  { id: "q_karma_300",  emoji: "⚡", title: "Karma Grinder",    description: "Earn 300 karma today",        goal: 300, karmaReward: 200, xpReward: 50,  trackKey: "karma_earned" },
  { id: "q_games_3",   emoji: "🎮", title: "Game Night",        description: "Complete 3 game sessions",    goal: 3,   karmaReward: 150, xpReward: 30,  trackKey: "games_played" },
  { id: "q_pet_fed_2", emoji: "🍖", title: "Good Owner",        description: "Feed your pet twice",         goal: 2,   karmaReward: 100, xpReward: 20,  trackKey: "pet_fed" },
  { id: "q_fish_2",    emoji: "🎣", title: "Fisher King",       description: "Catch 2 fish",                goal: 2,   karmaReward: 250, xpReward: 60,  trackKey: "fish_caught" },
  { id: "q_case_1",    emoji: "📦", title: "High Roller",       description: "Open 1 case",                 goal: 1,   karmaReward: 120, xpReward: 25,  trackKey: "cases_opened" },
  { id: "q_karma_800", emoji: "💰", title: "Karma Whale",       description: "Earn 800 karma today",        goal: 800, karmaReward: 400, xpReward: 100, trackKey: "karma_earned" },
  { id: "q_games_5",   emoji: "🕹️", title: "Arcade Champion",  description: "Complete 5 game sessions",    goal: 5,   karmaReward: 300, xpReward: 75,  trackKey: "games_played" },
  { id: "q_acts_5",    emoji: "📡", title: "Community Star",    description: "Generate 5 activities",       goal: 5,   karmaReward: 150, xpReward: 35,  trackKey: "activities_added" },
  { id: "q_fish_5",    emoji: "🐟", title: "Deep Sea Legend",   description: "Catch 5 fish",                goal: 5,   karmaReward: 500, xpReward: 120, trackKey: "fish_caught" },
  { id: "q_runner",    emoji: "🏃", title: "Track Star",        description: "Play Karma Runner 2 times",   goal: 2,   karmaReward: 180, xpReward: 40,  trackKey: "runner_played" },
];

export function getDailyQuests(): Quest[] {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const arr = [...POOL];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.abs((seed * (i + 1) * 2654435761) >> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 5);
}

export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
