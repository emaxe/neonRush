import { ACHIEVEMENTS } from '../config/achievements.js';
import { storageService } from './StorageService.js';
import { eventBus } from '../core/EventBus.js';

/**
 * AchievementService - Evaluates and awards achievements.
 */
export class AchievementService {
  constructor() {
    this.achievements = ACHIEVEMENTS;
  }

  /**
   * Check if any achievements are unlocked based on current run & persistent stats
   * @param {{ distance: number, coins: number, maxCombo: number }} runStats 
   * @returns {Array<Object>} Newly unlocked achievements
   */
  check(runStats) {
    const data = storageService.data;
    const newlyUnlocked = [];

    for (const ach of this.achievements) {
      if (!data.unlockedAchievements.includes(ach.id)) {
        if (ach.check(data, runStats)) {
          data.unlockedAchievements.push(ach.id);
          newlyUnlocked.push(ach);
          eventBus.emit('achievement_unlocked', ach);
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      storageService.save();
    }

    return newlyUnlocked;
  }

  /**
   * Claim reward for an achievement
   * @param {string} achId 
   * @returns {boolean}
   */
  claim(achId) {
    const data = storageService.data;
    const ach = this.achievements.find(a => a.id === achId);
    if (!ach) return false;

    if (data.unlockedAchievements.includes(achId) && !data.claimedAchievements.includes(achId)) {
      data.claimedAchievements.push(achId);
      data.coins += ach.reward;
      storageService.save();
      eventBus.emit('achievement_claimed', ach);
      return true;
    }
    return false;
  }

  getUnlockedCount() {
    return storageService.data.unlockedAchievements.length;
  }

  getTotalCount() {
    return this.achievements.length;
  }
}

export const achievementService = new AchievementService();
