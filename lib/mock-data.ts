import type { Pet } from "@/types/pet";
import type { User } from "@/types/user";
import type { Bounty } from "@/types/bounty";
import type { Post } from "@/types/post";
import type { Story, Friend, Follower, BattleEnemy, GameMeta } from "@/types/game";

export const CURRENT_USER: User = {
  id: "u1",
  username: "karmasonic",
  displayName: "Karma Sonic",
  avatarEmoji: "🦊",
  level: 12,
  xp: 2840,
  karma: 1250,
  streak: 7,
  rank: 42,
  bio: "Grinding for a better world, one bounty at a time ⚡",
  petClass: "Grinder Beast",
  bountiesCompleted: 38,
  joinedAt: "2024-01-15",
  badges: [
    { id: "b1", name: "Early Adopter", icon: "🌱", description: "Joined in the first month", earnedAt: "2024-01-15" },
    { id: "b2", name: "Streak Master", icon: "🔥", description: "7-day streak", earnedAt: "2024-06-01" },
    { id: "b3", name: "Bounty Hunter", icon: "🎯", description: "Completed 25 bounties", earnedAt: "2024-04-10" },
    { id: "b4", name: "Community Hero", icon: "🏆", description: "Top 50 leaderboard", earnedAt: "2024-05-20" },
    { id: "b5", name: "Speed Runner", icon: "⚡", description: "Bounty in under 1h", earnedAt: "2024-03-08" },
    { id: "b6", name: "Gamer", icon: "🎮", description: "Won 10 mini-games", earnedAt: "2024-05-15" },
  ],
};

export const MY_PET: Pet = {
  id: "p1",
  name: "Ryuu",
  level: 12,
  xp: 2840,
  xpToNext: 3500,
  evolution: "adult",
  class: "Grinder Beast",
  stats: { action: 78, social: 45, commerce: 32 },
  mood: "excited",
  needs: { hunger: 72, happiness: 85, energy: 60 },
  lastFed: new Date(Date.now() - 3600000).toISOString(),
  streak: 7,
  totalBountiesCompleted: 38,
  unlockedAbilities: ["Double XP Rush", "Bounty Radar", "Karma Boost", "Iron Will"],
  skinId: "default",
};

export const BOUNTIES: Bounty[] = [
  { id: "bnt1", title: "Pick up 5 pieces of trash at the park", description: "Help keep our local park clean. Bring a bag and collect litter around the main walking path.", xpReward: 50, karmaReward: 25, difficulty: "easy", category: "eco", categoryEmoji: "♻️", expiresAt: "2026-06-10", location: "City Park", distance: "0.3 km", completions: 8, maxCompletions: 20, createdBy: "u3", isActive: true },
  { id: "bnt2", title: "Teach someone a skill you have", description: "Share your knowledge! Teach a friend, family member, or stranger something you're good at.", xpReward: 150, karmaReward: 80, difficulty: "medium", category: "social", categoryEmoji: "🧠", expiresAt: "2026-06-14", distance: "Anywhere", completions: 3, maxCompletions: 50, createdBy: "u2", isActive: true },
  { id: "bnt3", title: "Complete a 5K run", description: "Lace up and run 5 kilometers. Track it with any fitness app and post your result.", xpReward: 120, karmaReward: 60, difficulty: "medium", category: "fitness", categoryEmoji: "🏃", expiresAt: "2026-06-08", distance: "0.8 km", completions: 15, maxCompletions: 100, createdBy: "u5", isActive: true },
  { id: "bnt4", title: "Organize a community cleanup event", description: "Coordinate with at least 5 people for a neighborhood cleanup.", xpReward: 400, karmaReward: 250, difficulty: "legendary", category: "community", categoryEmoji: "🌍", expiresAt: "2026-06-20", location: "Your Neighborhood", distance: "1.2 km", completions: 1, maxCompletions: 5, createdBy: "u4", isActive: true },
  { id: "bnt5", title: "Donate books to a local library", description: "Gather at least 10 books you no longer need and donate them.", xpReward: 100, karmaReward: 55, difficulty: "easy", category: "community", categoryEmoji: "📚", expiresAt: "2026-06-12", location: "Main Library", distance: "0.6 km", completions: 12, maxCompletions: 30, createdBy: "u3", isActive: true },
  { id: "bnt6", title: "Help someone carry groceries", description: "Offer to help an elderly neighbor or stranger carry their groceries home.", xpReward: 80, karmaReward: 40, difficulty: "easy", category: "social", categoryEmoji: "🛒", expiresAt: "2026-06-09", distance: "Nearby", completions: 22, maxCompletions: 50, createdBy: "u2", isActive: true },
  { id: "bnt7", title: "Plant a tree or flower", description: "Make your environment greener.", xpReward: 200, karmaReward: 100, difficulty: "medium", category: "eco", categoryEmoji: "🌱", expiresAt: "2026-06-16", distance: "2.1 km", completions: 6, maxCompletions: 25, createdBy: "u1", isActive: true },
  { id: "bnt8", title: "Volunteer at a food bank (2h)", description: "Spend two hours helping sort and distribute food.", xpReward: 280, karmaReward: 150, difficulty: "hard", category: "community", categoryEmoji: "🤝", expiresAt: "2026-06-11", location: "Community Center", distance: "1.5 km", completions: 4, maxCompletions: 10, createdBy: "u4", isActive: true },
  { id: "bnt9", title: "Learn 10 words in a new language", description: "Pick any language. Use Duolingo or a book.", xpReward: 90, karmaReward: 45, difficulty: "easy", category: "learning", categoryEmoji: "🗣️", expiresAt: "2026-06-15", distance: "Anywhere", completions: 31, maxCompletions: 200, createdBy: "u5", isActive: true },
  { id: "bnt10", title: "Do 100 push-ups today", description: "Can be split into sets. Prove it with a video.", xpReward: 110, karmaReward: 55, difficulty: "medium", category: "fitness", categoryEmoji: "💪", expiresAt: "2026-06-07", distance: "Anywhere", completions: 9, maxCompletions: 50, createdBy: "u3", isActive: true },
];

export const FEED_POSTS: Post[] = [
  { id: "post1", authorId: "u2", authorUsername: "lunavibes", authorEmoji: "🌙", authorLevel: 8, type: "bounty_complete", content: "Just helped an elderly neighbour carry 6 bags of groceries up 4 flights of stairs! 💪 The look on her face was worth more than any XP.", xpEarned: 80, likes: 47, comments: 12, liked: false, location: "Old Town District", createdAt: "2026-06-06T09:15:00Z" },
  { id: "post2", authorId: "u5", authorUsername: "neonmiku", authorEmoji: "✨", authorLevel: 10, type: "level_up", content: "LEVEL 10 UNLOCKED! 🎉 Hit the double-digits! My Influencer Spirit just evolved to Adult stage. Pet Battle grind was REAL 🦋", xpEarned: 500, likes: 134, comments: 28, liked: true, createdAt: "2026-06-06T08:00:00Z", badge: "Level 10 Pioneer" },
  { id: "post3", authorId: "u3", authorUsername: "tradeknight", authorEmoji: "⚔️", authorLevel: 15, type: "achievement", content: "Day 21 of my cleanup streak! Small actions compound into massive karma. My Merchant King pet hit a new record score in Karma Runner today 🏆", xpEarned: 50, bounty: BOUNTIES[0], likes: 89, comments: 19, liked: false, location: "Riverside Park", createdAt: "2026-06-06T07:30:00Z" },
  { id: "post4", authorId: "u4", authorUsername: "pixelrush", authorEmoji: "🎮", authorLevel: 5, type: "bounty_complete", content: "Finished my first 5K run! 28:45 — not the fastest but I actually did it 😅🏃 Also hit 847 on Karma Runner this morning. Double win!", xpEarned: 120, bounty: BOUNTIES[2], likes: 63, comments: 15, liked: false, location: "West Park Trail", createdAt: "2026-06-05T18:45:00Z" },
  { id: "post5", authorId: "u2", authorUsername: "lunavibes", authorEmoji: "🌙", authorLevel: 8, type: "story", content: "Organized a mini skill-sharing session at the library. Taught 3 people basic Photoshop. One lady is starting a craft business! 🙌", xpEarned: 150, bounty: BOUNTIES[1], likes: 201, comments: 34, liked: false, location: "Main Library", createdAt: "2026-06-05T14:20:00Z" },
  { id: "post6", authorId: "u6", authorUsername: "voltfox", authorEmoji: "🦊", authorLevel: 7, type: "achievement", content: "JACKPOT on Karma Slots!! Hit 🌟🌟🌟 for 500 karma 😱 Used it all to buy the legendary pet habitat. Ryuu-type pets are SO overpowered", xpEarned: 30, likes: 98, comments: 21, liked: false, createdAt: "2026-06-05T11:00:00Z" },
];

export const STORIES: Story[] = [
  { id: "st0", userId: "u1", username: "You", avatarEmoji: "🦊", bgColor: "#c8ff00", content: "+ Add Story", seen: true },
  { id: "st1", userId: "u2", username: "lunavibes", avatarEmoji: "🌙", bgColor: "#ff2d8d", content: "Just completed my morning run 🏃‍♀️ 5K personal best!", seen: false },
  { id: "st2", userId: "u3", username: "tradeknight", avatarEmoji: "⚔️", bgColor: "#ff6b35", content: "Park cleanup crew assembling at 9am! Who's in? 🌍", seen: false },
  { id: "st3", userId: "u5", username: "neonmiku", avatarEmoji: "✨", bgColor: "#8b5cf6", content: "My pet just learned Iron Will! The grind pays off ⚡", seen: true },
  { id: "st4", userId: "u4", username: "pixelrush", avatarEmoji: "🎮", bgColor: "#00e5ff", content: "New high score in Bounty Blitz: 18 bounties! 💥", seen: false },
  { id: "st5", userId: "u6", username: "voltfox", avatarEmoji: "🦊", bgColor: "#ffde00", content: "JACKPOT 🌟🌟🌟 Check my feed post!", seen: false },
];

export const FRIENDS: Friend[] = [
  { id: "u2", username: "lunavibes", emoji: "🌙", level: 8, petEmoji: "🦋", petName: "Sora", online: true, lastActivity: "2m ago", currentGame: "Bounty Blitz" },
  { id: "u3", username: "tradeknight", emoji: "⚔️", level: 15, petEmoji: "🐲", petName: "Aura", online: true, lastActivity: "5m ago" },
  { id: "u5", username: "neonmiku", emoji: "✨", level: 10, petEmoji: "🦋", petName: "Yuki", online: false, lastActivity: "1h ago" },
  { id: "u4", username: "pixelrush", emoji: "🎮", level: 5, petEmoji: "🦊", petName: "Rex", online: true, lastActivity: "12m ago", currentGame: "Karma Runner" },
  { id: "u6", username: "voltfox", emoji: "🦊", level: 7, petEmoji: "🦁", petName: "Blaze", online: false, lastActivity: "3h ago" },
];

export const FOLLOWERS: Follower[] = [
  { id: "u2",  username: "lunavibes",   emoji: "🌙", level: 8,  class: "Influencer Spirit", followedAt: "2d ago",  isNew: true,  mutual: true,  youFollowBack: true  },
  { id: "u3",  username: "tradeknight", emoji: "⚔️", level: 15, class: "Merchant King",     followedAt: "5d ago",  isNew: false, mutual: true,  youFollowBack: true  },
  { id: "u7",  username: "wildrose88",  emoji: "🌹", level: 6,  class: "Influencer Spirit", followedAt: "6h ago",  isNew: true,  mutual: false, youFollowBack: false },
  { id: "u8",  username: "duskhunter",  emoji: "🏹", level: 19, class: "Grinder Beast",     followedAt: "1d ago",  isNew: true,  mutual: false, youFollowBack: false },
  { id: "u4",  username: "pixelrush",   emoji: "🎮", level: 5,  class: "Grinder Beast",     followedAt: "9d ago",  isNew: false, mutual: true,  youFollowBack: true  },
  { id: "u9",  username: "stardustfox", emoji: "🦊", level: 11, class: "Influencer Spirit", followedAt: "3d ago",  isNew: false, mutual: false, youFollowBack: false },
  { id: "u10", username: "ironclad99",  emoji: "🛡️", level: 31, class: "Grinder Beast",     followedAt: "14d ago", isNew: false, mutual: false, youFollowBack: false },
  { id: "u6",  username: "voltfox",     emoji: "🦊", level: 7,  class: "Merchant King",     followedAt: "20d ago", isNew: false, mutual: true,  youFollowBack: true  },
  { id: "u11", username: "mistynova",   emoji: "🌌", level: 14, class: "Influencer Spirit", followedAt: "8h ago",  isNew: true,  mutual: false, youFollowBack: false },
  { id: "u12", username: "goblincoin",  emoji: "💰", level: 22, class: "Merchant King",     followedAt: "30d ago", isNew: false, mutual: false, youFollowBack: false },
];

export const FOLLOWING: Follower[] = [
  { id: "u2",  username: "lunavibes",   emoji: "🌙", level: 8,  class: "Influencer Spirit", followedAt: "2d ago",  isNew: false, mutual: true, youFollowBack: true },
  { id: "u3",  username: "tradeknight", emoji: "⚔️", level: 15, class: "Merchant King",     followedAt: "10d ago", isNew: false, mutual: true, youFollowBack: true },
  { id: "u4",  username: "pixelrush",   emoji: "🎮", level: 5,  class: "Grinder Beast",     followedAt: "9d ago",  isNew: false, mutual: true, youFollowBack: true },
  { id: "u6",  username: "voltfox",     emoji: "🦊", level: 7,  class: "Merchant King",     followedAt: "20d ago", isNew: false, mutual: true, youFollowBack: true },
  { id: "u13", username: "zenmaster",   emoji: "🧘", level: 28, class: "Influencer Spirit", followedAt: "45d ago", isNew: false, mutual: false, youFollowBack: true },
  { id: "u14", username: "ironforge",   emoji: "⚒️", level: 25, class: "Grinder Beast",     followedAt: "60d ago", isNew: false, mutual: false, youFollowBack: true },
];

export const BATTLE_ENEMIES: BattleEnemy[] = [
  {
    id: "e1", name: "lunavibes", emoji: "🌙", petEmoji: "🦋", level: 8, hp: 85, petClass: "Influencer Spirit",
    abilities: [
      { name: "Charm Wave", emoji: "💫", damage: [12, 22], effect: "heal 8" },
      { name: "Social Burst", emoji: "📣", damage: [18, 28] },
      { name: "Empathy Shield", emoji: "🛡️", damage: [8, 14], effect: "block next" },
    ],
  },
  {
    id: "e2", name: "tradeknight", emoji: "⚔️", petEmoji: "🐲", level: 15, hp: 110, petClass: "Merchant King",
    abilities: [
      { name: "Trade Slash", emoji: "⚔️", damage: [20, 32] },
      { name: "Gold Strike", emoji: "💰", damage: [15, 25], effect: "steal 10 karma" },
      { name: "Market Crash", emoji: "📉", damage: [25, 38] },
    ],
  },
  {
    id: "e3", name: "pixelrush", emoji: "🎮", petEmoji: "🦊", level: 5, hp: 65, petClass: "Grinder Beast",
    abilities: [
      { name: "Rush Attack", emoji: "💨", damage: [10, 18] },
      { name: "Combo Strike", emoji: "👊", damage: [14, 22] },
      { name: "Sprint Dash", emoji: "⚡", damage: [8, 16] },
    ],
  },
  {
    id: "e4", name: "ironforge", emoji: "⚒️", petEmoji: "🌋", level: 25, hp: 140, petClass: "Grinder Beast",
    abilities: [
      { name: "Titan Smash", emoji: "🌋", damage: [28, 45] },
      { name: "Iron Will", emoji: "🛡️", damage: [18, 28], effect: "heal 15" },
      { name: "Grind Force", emoji: "⚒️", damage: [22, 35] },
    ],
  },
];

export const SHOP_ITEMS = [
  { id: "s1", emoji: "🍖", name: "Basic Pet Meal", description: "+30 hunger. Quick fix.", price: 50, category: "pet", rarity: "common", tag: null },
  { id: "s2", emoji: "🥩", name: "Premium Pet Feast", description: "+65 hunger, +20 happiness. Full restore.", price: 150, category: "pet", rarity: "rare", tag: "BEST" },
  { id: "s3", emoji: "⚡", name: "XP Booster", description: "2× XP from bounties for 2h.", price: 300, category: "power", rarity: "epic", tag: "HOT" },
  { id: "s4", emoji: "🎨", name: "Pet Skin: Neon", description: "Glowing neon look. Pure flex.", price: 500, category: "cosmetics", rarity: "legendary", tag: "NEW" },
  { id: "s5", emoji: "🎯", name: "Bounty Scanner", description: "Reveals 5 hidden nearby bounties.", price: 200, category: "power", rarity: "uncommon", tag: null },
  { id: "s6", emoji: "🛡️", name: "Streak Shield", description: "Protect streak for one missed day.", price: 100, category: "power", rarity: "common", tag: null },
  { id: "s7", emoji: "🏠", name: "Pet Habitat: Forest", description: "Mystical forest home for your pet.", price: 750, category: "pet", rarity: "legendary", tag: "LIMITED" },
  { id: "s8", emoji: "💊", name: "Mood Potion", description: "Instantly +50 happiness.", price: 75, category: "pet", rarity: "common", tag: null },
  { id: "s9", emoji: "🌟", name: "Karma Multiplier", description: "1.5× karma for 12h.", price: 400, category: "power", rarity: "epic", tag: null },
  { id: "s10", emoji: "🎰", name: "Lucky Charm", description: "+15% better odds in Karma Slots.", price: 180, category: "power", rarity: "uncommon", tag: "GAME" },
];

export const GAME_META: GameMeta[] = [
  { id: "runner", name: "KARMA RUNNER", emoji: "🏃", tagline: "Endless runner with your pet", accentColor: "#c8ff00", bgColor: "#0d1a0a", rewardDesc: "Up to 200 ⚡ karma" },
  { id: "slots", name: "KARMA SLOTS", emoji: "🎰", tagline: "Spin to win big karma", accentColor: "#ffde00", bgColor: "#1a1200", rewardDesc: "Jackpot: 500 ⚡", cost: 25 },
  { id: "memory", name: "MEMORY PALACE", emoji: "🧠", tagline: "Match all pairs before time runs out", accentColor: "#8b5cf6", bgColor: "#0d0a1a", rewardDesc: "Up to 150 ⚡ karma" },
  { id: "battle", name: "PET BATTLE", emoji: "⚔️", tagline: "Turn-based combat vs real pets", accentColor: "#ff6b35", bgColor: "#1a0a00", rewardDesc: "Win: 100+ ⚡ karma" },
  { id: "blitz", name: "BOUNTY BLITZ", emoji: "💥", tagline: "Race-click bounties in 30 seconds", accentColor: "#00e5ff", bgColor: "#001a1a", rewardDesc: "Up to 250 ⚡ karma" },
];

export const MAP_PINS = [
  { id: "m1", type: "bounty", emoji: "🎯", x: 20, y: 25, label: "Trash Pickup", xp: 50 },
  { id: "m2", type: "bounty", emoji: "🎯", x: 55, y: 40, label: "5K Run", xp: 120 },
  { id: "m3", type: "event", emoji: "⚡", x: 35, y: 60, label: "XP Sprint", xp: 200 },
  { id: "m4", type: "player", emoji: "👤", x: 65, y: 30, label: "tradeknight", xp: 0 },
  { id: "m5", type: "player", emoji: "👤", x: 45, y: 70, label: "lunavibes", xp: 0 },
  { id: "m6", type: "hotspot", emoji: "🔴", x: 75, y: 55, label: "Karma Zone", xp: 500 },
  { id: "m7", type: "bounty", emoji: "🎯", x: 15, y: 75, label: "Book Donation", xp: 100 },
  { id: "m8", type: "event", emoji: "⚡", x: 80, y: 20, label: "Community Day", xp: 300 },
  { id: "m9", type: "player", emoji: "👤", x: 30, y: 45, label: "neonmiku", xp: 0 },
];

export const LEADERBOARD = [
  { rank: 1, username: "zenmaster", emoji: "🧘", level: 28, karma: 8940, class: "Influencer Spirit" },
  { rank: 2, username: "ironforge", emoji: "⚒️", level: 25, karma: 7650, class: "Grinder Beast" },
  { rank: 3, username: "goldpath", emoji: "💰", level: 22, karma: 6200, class: "Merchant King" },
  { rank: 41, username: "tradeknight", emoji: "⚔️", level: 15, karma: 3500, class: "Merchant King" },
  { rank: 42, username: "karmasonic", emoji: "🦊", level: 12, karma: 1250, class: "Grinder Beast" },
  { rank: 43, username: "neonmiku", emoji: "✨", level: 10, karma: 1180, class: "Influencer Spirit" },
];
