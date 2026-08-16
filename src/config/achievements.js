/**
 * Neo Awards / Achievements configuration
 */
export const ACHIEVEMENTS = Object.freeze([
  { id: 'first_run', title: 'First Steps', desc: 'Complete your first run', reward: 50, check: (s) => s.totalRuns >= 1 },
  { id: 'dist_500', title: 'Speedster', desc: 'Reach 500 meters in a single run', reward: 100, check: (s, r) => r.distance >= 500 },
  { id: 'dist_1500', title: 'Sector Hopper', desc: 'Reach 1,500 meters and cross a biome', reward: 250, check: (s, r) => r.distance >= 1500 },
  { id: 'dist_3000', title: 'Neon Legend', desc: 'Survive beyond 3,000 meters', reward: 600, check: (s, r) => r.distance >= 3000 },
  { id: 'coins_100', title: 'Data Harvester', desc: 'Collect 100 coins in one run', reward: 150, check: (s, r) => r.coins >= 100 },
  { id: 'coins_500', title: 'Crypto Tycoon', desc: 'Collect 500 coins in one run', reward: 400, check: (s, r) => r.coins >= 500 },
  { id: 'combo_5', title: 'Flow State', desc: 'Achieve a x5 combo multiplier', reward: 200, check: (s, r) => r.maxCombo >= 5 },
  { id: 'combo_10', title: 'Hyperfocus', desc: 'Reach the maximum x10 combo', reward: 500, check: (s, r) => r.maxCombo >= 10 },
  { id: 'boss_1', title: 'Drone Slayer', desc: 'Defeat your first Cyber-Boss', reward: 300, check: (s) => s.bossesDefeated >= 1 },
  { id: 'boss_5', title: 'Megacity Guardian', desc: 'Defeat 5 Cyber-Bosses in total', reward: 800, check: (s) => s.bossesDefeated >= 5 },
  { id: 'gravity_50', title: 'Acrobat', desc: 'Flip gravity 50 times across all runs', reward: 150, check: (s) => s.gravityFlips >= 50 },
  { id: 'nitro_20', title: 'Hyperdrive', desc: 'Trigger Nitro 20 times', reward: 200, check: (s) => s.nitroUses >= 20 }
]);
