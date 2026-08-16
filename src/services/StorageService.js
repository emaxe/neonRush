import { CONFIG } from '../config/constants.js';
import { generateDailyQuests } from '../config/quests.js';

/**
 * StorageService - LocalStorage persistence layer with schema migrations and defaults.
 */
export class StorageService {
  constructor(storageKey = CONFIG.STORAGE_KEY) {
    this.storageKey = storageKey;
    this.data = this.load();
  }

  getDefaults() {
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      version: 2,
      coins: 100, // starting bonus
      highScore: 0,
      maxDistance: 0,
      totalRuns: 0,
      bossesDefeated: 0,
      gravityFlips: 0,
      nitroUses: 0,
      totalCoinsCollected: 0,
      selectedSkin: 'classic',
      unlockedSkins: ['classic'],
      upgrades: { magnet: 0, shield: 0, nitro: 0, multiplier: 0, coinBonus: 0 },
      unlockedAchievements: [],
      claimedAchievements: [],
      questDate: todayStr,
      quests: generateDailyQuests(todayStr),
      settings: {
        sfxVol: 0.8,
        musicVol: 0.5,
        mobileControls: false,
        highGlow: true,
        screenShake: true,
        tutorialDone: false
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const defaults = this.getDefaults();
        const merged = {
          ...defaults,
          ...parsed,
          upgrades: { ...defaults.upgrades, ...(parsed.upgrades || {}) },
          settings: { ...defaults.settings, ...(parsed.settings || {}) }
        };

        // Daily quest rollover check
        const todayStr = new Date().toISOString().slice(0, 10);
        if (merged.questDate !== todayStr) {
          merged.questDate = todayStr;
          merged.quests = generateDailyQuests(todayStr);
        }

        return merged;
      }
    } catch (e) {
      console.warn('StorageService: failed to load save data, resetting to defaults.', e);
    }
    return this.getDefaults();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('StorageService: failed to write to localStorage', e);
    }
  }

  reset() {
    this.data = this.getDefaults();
    this.save();
    return this.data;
  }
}

export const storageService = new StorageService();
