import { storageService } from './StorageService.js';
import { eventBus } from '../core/EventBus.js';
import { generateDailyQuests } from '../config/quests.js';

/**
 * QuestService - Manages daily directives / quests lifecycle, progress tracking, and reward disbursement.
 */
export class QuestService {
  constructor() {
    this.ensureDailyRollover();
  }

  ensureDailyRollover() {
    const data = storageService.data;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (data.questDate !== todayStr) {
      data.questDate = todayStr;
      data.quests = generateDailyQuests(todayStr);
      storageService.save();
    }
  }

  /**
   * Update quest progress for a specific quest type
   * @param {string} type - 'single_dist' | 'acc_coins' | 'acc_jumps' | 'acc_flips' | 'boss_kill' | 'max_combo'
   * @param {number} value 
   */
  updateProgress(type, value) {
    this.ensureDailyRollover();
    const data = storageService.data;
    let anyCompleted = false;

    data.quests.forEach(quest => {
      if (quest.type === type && !quest.done) {
        if (type === 'single_dist' || type === 'max_combo') {
          if (value > quest.progress) {
            quest.progress = value;
          }
        } else {
          quest.progress += value;
        }

        if (quest.progress >= quest.target) {
          quest.done = true;
          data.coins += quest.reward;
          anyCompleted = true;
          eventBus.emit('quest_completed', quest);
        }
      }
    });

    if (anyCompleted) {
      storageService.save();
    }
  }

  getQuests() {
    this.ensureDailyRollover();
    return storageService.data.quests;
  }
}

export const questService = new QuestService();
