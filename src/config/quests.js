/**
 * Daily Directives / Quests pool & generation
 */
export const QUEST_POOL = Object.freeze([
  { id: 'q_dist_1000', desc: 'Sprint 1,000 meters in a single run', target: 1000, type: 'single_dist', progress: 0, reward: 200, done: false },
  { id: 'q_coins_150', desc: 'Gather 150 coins today', target: 150, type: 'acc_coins', progress: 0, reward: 150, done: false },
  { id: 'q_jumps_40', desc: 'Perform 40 jumps', target: 40, type: 'acc_jumps', progress: 0, reward: 100, done: false },
  { id: 'q_flips_15', desc: 'Execute 15 Gravity Flips', target: 15, type: 'acc_flips', progress: 0, reward: 120, done: false },
  { id: 'q_boss_1', desc: 'Defeat 1 Cyber-Drone Boss', target: 1, type: 'boss_kill', progress: 0, reward: 250, done: false },
  { id: 'q_combo_6', desc: 'Achieve a x6 Combo streak', target: 6, type: 'max_combo', progress: 0, reward: 180, done: false }
]);

/**
 * Generates 3 deterministic daily quests based on the date string
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {Array<Object>}
 */
export function generateDailyQuests(dateStr) {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed += dateStr.charCodeAt(i);
  }

  const quests = [];
  const used = new Set();

  while (quests.length < 3) {
    seed = (seed * 9301 + 49297) % 233280;
    const idx = Math.floor((seed / 233280) * QUEST_POOL.length);
    if (!used.has(idx)) {
      used.add(idx);
      quests.push({ ...QUEST_POOL[idx] });
    }
  }

  return quests;
}
