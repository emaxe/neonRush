import { GameState } from '../core/GameState.js';
import { SKINS } from '../config/skins.js';
import { UPGRADES, getUpgradeCost } from '../config/upgrades.js';
import { ACHIEVEMENTS } from '../config/achievements.js';
import { storageService } from '../services/StorageService.js';
import { audioService } from '../services/AudioService.js';
import { achievementService } from '../services/AchievementService.js';
import { questService } from '../services/QuestService.js';
import { eventBus } from '../core/EventBus.js';

/**
 * UIManager - Coordinates all screen states, HUD updates, modal overlays, notifications, and settings bindings.
 */
export class UIManager {
  /**
   * @param {import('../core/Game.js').Game} game 
   */
  constructor(game) {
    this.game = game;
    this.cacheDOMElements();
    this.bindEvents();
    this.setupListeners();
    this.refreshSettingsInputs();
  }

  cacheDOMElements() {
    this.screensContainer = document.getElementById('screensContainer');
    this.gameHUD = document.getElementById('gameHUD');
    this.mainMenuScreen = document.getElementById('mainMenuScreen');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.pauseScreen = document.getElementById('pauseScreen');
    this.shopScreen = document.getElementById('shopScreen');
    this.upgradesScreen = document.getElementById('upgradesScreen');
    this.achievementsScreen = document.getElementById('achievementsScreen');
    this.questsScreen = document.getElementById('questsScreen');
    this.settingsScreen = document.getElementById('settingsScreen');
    this.tutorialScreen = document.getElementById('tutorialScreen');

    // Top HUD elements
    this.hudDistance = document.getElementById('hudDistance');
    this.hudScore = document.getElementById('hudScore');
    this.hudCombo = document.getElementById('hudCombo');
    this.hudCoins = document.getElementById('hudCoins');
    this.hudBiome = document.getElementById('hudBiome');
    this.hudNitroBar = document.getElementById('hudNitroBar');
    this.hudNitroReady = document.getElementById('hudNitroReady');
    this.hudPowerups = document.getElementById('hudPowerups');
    this.bossBarContainer = document.getElementById('bossBarContainer');
    this.bossHpBar = document.getElementById('bossHpBar');
    this.bossHpText = document.getElementById('bossHpText');

    // Banners & Toasts
    this.bossWarningBanner = document.getElementById('bossWarningBanner');
    this.bossWarningSubtitle = document.getElementById('bossWarningSubtitle');
    this.biomeBanner = document.getElementById('biomeBanner');
    this.biomeBannerTitle = document.getElementById('biomeBannerTitle');
    this.toastNotification = document.getElementById('toastNotification');
    this.toastText = document.getElementById('toastText');

    // Mobile controls container
    this.mobileControls = document.getElementById('mobileControls');
  }

  bindEvents() {
    // Menu Launch
    document.getElementById('btnPlay')?.addEventListener('click', () => {
      audioService.ensureContext();
      if (!storageService.data.settings.tutorialDone) {
        this.showScreen(GameState.TUTORIAL);
      } else {
        this.game.startRun();
      }
    });

    document.getElementById('btnStartTutorial')?.addEventListener('click', () => {
      audioService.ensureContext();
      storageService.data.settings.tutorialDone = true;
      storageService.save();
      this.game.startRun();
    });

    // Sub-screens Navigation
    document.getElementById('btnOpenShop')?.addEventListener('click', () => {
      audioService.ensureContext();
      this.renderShop();
      this.showScreen(GameState.SHOP);
    });
    document.getElementById('btnCloseShop')?.addEventListener('click', () => this.showScreen(GameState.MENU));

    document.getElementById('btnOpenUpgrades')?.addEventListener('click', () => {
      audioService.ensureContext();
      this.renderUpgrades();
      this.showScreen(GameState.UPGRADES);
    });
    document.getElementById('btnCloseUpgrades')?.addEventListener('click', () => this.showScreen(GameState.MENU));

    document.getElementById('btnOpenAchievements')?.addEventListener('click', () => {
      audioService.ensureContext();
      this.renderAchievements();
      this.showScreen(GameState.ACHIEVEMENTS);
    });
    document.getElementById('btnCloseAchievements')?.addEventListener('click', () => this.showScreen(GameState.MENU));

    document.getElementById('btnOpenQuests')?.addEventListener('click', () => {
      audioService.ensureContext();
      this.renderQuests();
      this.showScreen(GameState.QUESTS);
    });
    document.getElementById('btnCloseQuests')?.addEventListener('click', () => this.showScreen(GameState.MENU));

    document.getElementById('btnOpenSettings')?.addEventListener('click', () => {
      audioService.ensureContext();
      this.refreshSettingsInputs();
      this.showScreen(GameState.SETTINGS);
    });
    document.getElementById('btnCloseSettings')?.addEventListener('click', () => {
      if (this.game.state === GameState.PAUSED) {
        this.showScreen(GameState.PAUSED);
      } else {
        this.showScreen(GameState.MENU);
      }
    });

    // In-game controls
    document.getElementById('btnPause')?.addEventListener('click', () => this.game.togglePause());
    document.getElementById('btnResume')?.addEventListener('click', () => this.game.togglePause());
    document.getElementById('btnPauseSettings')?.addEventListener('click', () => this.showScreen(GameState.SETTINGS));
    document.getElementById('btnQuitToMenu')?.addEventListener('click', () => this.game.quitToMenu());

    // Game Over actions
    document.getElementById('btnRestart')?.addEventListener('click', () => {
      audioService.ensureContext();
      this.game.startRun();
    });
    document.getElementById('btnGoMenu')?.addEventListener('click', () => this.game.quitToMenu());

    // Settings inputs
    const sliderSfx = document.getElementById('sliderSfx');
    sliderSfx?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      storageService.data.settings.sfxVol = val;
      audioService.setSfxVolume(val);
      storageService.save();
    });

    const sliderMusic = document.getElementById('sliderMusic');
    sliderMusic?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      storageService.data.settings.musicVol = val;
      audioService.setMusicVolume(val);
      storageService.save();
    });

    const toggleMobile = document.getElementById('toggleMobileControls');
    toggleMobile?.addEventListener('change', (e) => {
      storageService.data.settings.mobileControls = e.target.checked;
      this.updateMobileControlsVisibility();
      storageService.save();
    });

    const toggleHighGlow = document.getElementById('toggleHighGlow');
    toggleHighGlow?.addEventListener('change', (e) => {
      storageService.data.settings.highGlow = e.target.checked;
      document.body.classList.toggle('high-glow', e.target.checked);
      storageService.save();
    });

    const toggleScreenShake = document.getElementById('toggleScreenShake');
    toggleScreenShake?.addEventListener('change', (e) => {
      storageService.data.settings.screenShake = e.target.checked;
      storageService.save();
    });

    const btnResetSave = document.getElementById('btnResetSave');
    btnResetSave?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all high scores, coins, upgrades, and skins?')) {
        storageService.reset();
        this.updateMenuStats();
        this.refreshSettingsInputs();
        this.showToast('All progress has been reset.');
      }
    });
  }

  setupListeners() {
    eventBus.on('biome_changed', (biome) => {
      if (this.biomeBanner && this.biomeBannerTitle) {
        this.biomeBannerTitle.textContent = biome.name;
        this.biomeBanner.classList.remove('hidden');
        setTimeout(() => {
          this.biomeBanner.classList.add('hidden');
        }, 3200);
      }
    });

    eventBus.on('boss_spawned', (name) => {
      if (this.bossWarningBanner) {
        this.bossWarningBanner.classList.remove('hidden');
        if (this.bossWarningSubtitle) {
          this.bossWarningSubtitle.textContent = `TARGET: ${name} • EVADE & DESTROY`;
        }
        setTimeout(() => {
          this.bossWarningBanner.classList.add('hidden');
        }, 3500);
      }
    });

    eventBus.on('achievement_unlocked', (ach) => {
      this.showToast(`🏆 AXIOM UNLOCKED: ${ach.title}!`);
    });

    eventBus.on('quest_completed', (quest) => {
      this.showToast(`📜 DIRECTIVE COMPLETE: +${quest.reward}¢`);
    });
  }

  showScreen(state) {
    const screens = [
      this.mainMenuScreen,
      this.gameOverScreen,
      this.pauseScreen,
      this.shopScreen,
      this.upgradesScreen,
      this.achievementsScreen,
      this.questsScreen,
      this.settingsScreen,
      this.tutorialScreen
    ];

    screens.forEach(s => s?.classList.add('hidden'));

    if (state === GameState.PLAYING) {
      this.screensContainer.classList.add('hidden');
      this.gameHUD.classList.remove('hidden');
      this.updateMobileControlsVisibility();
    } else {
      this.screensContainer.classList.remove('hidden');
      if (state === GameState.PAUSED) {
        this.gameHUD.classList.remove('hidden');
        this.pauseScreen.classList.remove('hidden');
      } else {
        this.gameHUD.classList.add('hidden');
        if (state === GameState.MENU) {
          this.updateMenuStats();
          this.mainMenuScreen.classList.remove('hidden');
        } else if (state === GameState.GAME_OVER) {
          this.gameOverScreen.classList.remove('hidden');
        } else if (state === GameState.SHOP) {
          this.shopScreen.classList.remove('hidden');
        } else if (state === GameState.UPGRADES) {
          this.upgradesScreen.classList.remove('hidden');
        } else if (state === GameState.ACHIEVEMENTS) {
          this.achievementsScreen.classList.remove('hidden');
        } else if (state === GameState.QUESTS) {
          this.questsScreen.classList.remove('hidden');
        } else if (state === GameState.SETTINGS) {
          this.settingsScreen.classList.remove('hidden');
        } else if (state === GameState.TUTORIAL) {
          this.tutorialScreen.classList.remove('hidden');
        }
      }
    }
  }

  updateMenuStats() {
    const data = storageService.data;
    const menuHighScore = document.getElementById('menuHighScore');
    const menuMaxDist = document.getElementById('menuMaxDist');
    const menuTotalCoins = document.getElementById('menuTotalCoins');

    if (menuHighScore) menuHighScore.textContent = Math.floor(data.highScore).toLocaleString();
    if (menuMaxDist) menuMaxDist.textContent = `${Math.floor(data.maxDistance).toLocaleString()} m`;
    if (menuTotalCoins) menuTotalCoins.textContent = data.coins.toLocaleString();
  }

  updateHUD(stats, player, boss) {
    if (this.hudDistance) this.hudDistance.textContent = Math.floor(stats.distance).toLocaleString();
    if (this.hudScore) this.hudScore.textContent = Math.floor(stats.score).toLocaleString();
    if (this.hudCombo) this.hudCombo.textContent = `x${stats.combo.toFixed(1)}`;
    if (this.hudCoins) this.hudCoins.textContent = stats.coins.toLocaleString();
    if (this.hudBiome) this.hudBiome.textContent = `SECTOR: ${stats.biomeName}`;

    // Nitro bar
    if (this.hudNitroBar) {
      this.hudNitroBar.style.width = `${Math.min(100, player.nitroCharge)}%`;
    }
    if (this.hudNitroReady) {
      this.hudNitroReady.classList.toggle('hidden', player.nitroCharge < 99);
    }

    // Boss bar
    if (this.bossBarContainer) {
      if (boss.active) {
        this.bossBarContainer.classList.remove('hidden');
        const pct = Math.max(0, (boss.hp / boss.maxHp) * 100);
        if (this.bossHpBar) this.bossHpBar.style.width = `${pct}%`;
        if (this.bossHpText) this.bossHpText.textContent = `${Math.ceil(pct)}%`;
      } else {
        this.bossBarContainer.classList.add('hidden');
      }
    }

    // Active powerups badges
    if (this.hudPowerups) {
      this.hudPowerups.innerHTML = '';
      const buffs = [];
      if (player.magnetTimer > 0) buffs.push({ icon: '🧲', color: '#9d00ff', time: player.magnetTimer });
      if (player.hasShield) buffs.push({ icon: '🛡️', color: '#00f0ff', time: null });
      if (player.multiplierTimer > 0) buffs.push({ icon: '2X', color: '#ff007f', time: player.multiplierTimer });
      if (player.slowMoTimer > 0) buffs.push({ icon: '⏳', color: '#00ff66', time: player.slowMoTimer });
      if (player.ghostTimer > 0) buffs.push({ icon: '👻', color: '#e2e8f0', time: player.ghostTimer });

      buffs.forEach(b => {
        const badge = document.createElement('div');
        badge.className = 'px-2 py-1 rounded bg-black/70 border text-xs font-orbitron font-bold flex items-center gap-1 shadow-md';
        badge.style.borderColor = b.color;
        badge.style.color = b.color;
        badge.innerHTML = `<span>${b.icon}</span>${b.time !== null ? `<span class="text-[10px] text-white">${Math.ceil(b.time)}s</span>` : ''}`;
        this.hudPowerups.appendChild(badge);
      });
    }
  }

  showGameOver(stats) {
    const goDist = document.getElementById('goDistance');
    const goSc = document.getElementById('goScore');
    const goCo = document.getElementById('goCoins');
    const goCombo = document.getElementById('goMaxCombo');
    const goBoss = document.getElementById('goBosses');
    const deathR = document.getElementById('deathReason');

    if (goDist) goDist.textContent = `${Math.floor(stats.distance).toLocaleString()} m`;
    if (goSc) goSc.textContent = Math.floor(stats.score).toLocaleString();
    if (goCo) goCo.textContent = `+${stats.coins}`;
    if (goCombo) goCombo.textContent = `x${stats.maxCombo.toFixed(1)}`;
    if (goBoss) goBoss.textContent = stats.bossesKilled;
    if (deathR) deathR.textContent = stats.deathReason || 'FATAL IMPACT';

    this.showScreen(GameState.GAME_OVER);
  }

  renderShop() {
    const data = storageService.data;
    const shopCoins = document.getElementById('shopCoins');
    if (shopCoins) shopCoins.textContent = data.coins.toLocaleString();

    const grid = document.getElementById('skinListGrid');
    if (!grid) return;
    grid.innerHTML = '';

    SKINS.forEach(skin => {
      const isOwned = data.unlockedSkins.includes(skin.id);
      const isEquipped = data.selectedSkin === skin.id;

      const card = document.createElement('div');
      card.className = `p-3 rounded-lg border flex flex-col justify-between bg-black/60 transition-all ${
        isEquipped ? 'border-pink-400 bg-pink-950/30' : (isOwned ? 'border-cyan-500/40' : 'border-slate-800 opacity-90')
      }`;

      card.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-md" style="background:${skin.body}; border-color:${skin.head}; box-shadow:0 0 10px ${skin.head}">
            <div class="w-4 h-4 rounded-full" style="background:${skin.visor}"></div>
          </div>
          <div>
            <div class="font-orbitron font-bold text-sm text-white">${skin.name}</div>
            <div class="text-[10px] text-slate-400">${isEquipped ? '<span class="text-pink-400 font-bold">EQUIPPED</span>' : (isOwned ? 'OWNED' : `COST: ${skin.cost} ¢`)}</div>
          </div>
        </div>
        <button class="cyber-btn py-1.5 px-3 text-xs w-full cursor-pointer ${isEquipped ? 'cyber-btn-pink opacity-75 cursor-default' : (isOwned ? '' : 'cyber-btn-yellow')}" data-skin-id="${skin.id}">
          ${isEquipped ? 'ACTIVE' : (isOwned ? 'EQUIP' : `UNLOCK (${skin.cost} ¢)`)}
        </button>
      `;

      const btn = card.querySelector('button');
      btn?.addEventListener('click', () => {
        audioService.ensureContext();
        if (isEquipped) return;
        if (isOwned) {
          data.selectedSkin = skin.id;
          storageService.save();
          this.renderShop();
        } else if (data.coins >= skin.cost) {
          data.coins -= skin.cost;
          data.unlockedSkins.push(skin.id);
          data.selectedSkin = skin.id;
          storageService.save();
          audioService.playPowerUp();
          this.renderShop();
        } else {
          this.showToast('Insufficient Credits!');
        }
      });

      grid.appendChild(card);
    });
  }

  renderUpgrades() {
    const data = storageService.data;
    const upgradeCoins = document.getElementById('upgradeCoins');
    if (upgradeCoins) upgradeCoins.textContent = data.coins.toLocaleString();

    const grid = document.getElementById('upgradeListGrid');
    if (!grid) return;
    grid.innerHTML = '';

    UPGRADES.forEach(upg => {
      const curLvl = data.upgrades[upg.id] || 0;
      const cost = getUpgradeCost(upg, curLvl);
      const isMax = curLvl >= upg.maxLvl;

      const row = document.createElement('div');
      row.className = 'p-3 rounded-lg border border-yellow-500/30 bg-black/60 flex items-center justify-between gap-3';

      let pipBar = '';
      for (let i = 0; i < upg.maxLvl; i++) {
        pipBar += `<div class="w-3 h-2 rounded-sm ${i < curLvl ? 'bg-yellow-400 shadow-[0_0_6px_#ffe600]' : 'bg-slate-800'}"></div>`;
      }

      row.innerHTML = `
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-orbitron font-bold text-sm text-yellow-300">${upg.name}</span>
            <span class="text-xs text-slate-400">LVL ${curLvl}/${upg.maxLvl}</span>
          </div>
          <p class="text-[11px] text-slate-300 mt-0.5">${upg.desc}</p>
          <div class="flex gap-1 mt-1.5">${pipBar}</div>
        </div>
        <button class="cyber-btn cyber-btn-yellow py-2 px-3 text-xs whitespace-nowrap cursor-pointer ${isMax ? 'opacity-50 cursor-not-allowed' : ''}" data-upg-id="${upg.id}" ${isMax ? 'disabled' : ''}>
          ${isMax ? 'MAXED' : `UPGRADE (${cost} ¢)`}
        </button>
      `;

      const btn = row.querySelector('button');
      if (!isMax) {
        btn?.addEventListener('click', () => {
          audioService.ensureContext();
          if (data.coins >= cost) {
            data.coins -= cost;
            data.upgrades[upg.id] = curLvl + 1;
            storageService.save();
            audioService.playPowerUp();
            this.renderUpgrades();
          } else {
            this.showToast('Insufficient Credits!');
          }
        });
      }

      grid.appendChild(row);
    });
  }

  renderAchievements() {
    const data = storageService.data;
    const progressText = document.getElementById('achProgressText');
    if (progressText) {
      progressText.textContent = `${achievementService.getUnlockedCount()} / ${achievementService.getTotalCount()}`;
    }

    const list = document.getElementById('achievementsList');
    if (!list) return;
    list.innerHTML = '';

    ACHIEVEMENTS.forEach(ach => {
      const isUnlocked = data.unlockedAchievements.includes(ach.id);
      const isClaimed = data.claimedAchievements.includes(ach.id);

      const item = document.createElement('div');
      item.className = `p-3 rounded-lg border flex items-center justify-between gap-3 bg-black/60 ${
        isUnlocked ? 'border-cyan-400 bg-cyan-950/20' : 'border-slate-800 opacity-60'
      }`;

      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="text-2xl">${isUnlocked ? '🏆' : '🔒'}</div>
          <div>
            <div class="font-orbitron font-bold text-sm ${isUnlocked ? 'text-cyan-300' : 'text-slate-400'}">${ach.title}</div>
            <div class="text-[11px] text-slate-300">${ach.desc}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-orbitron text-yellow-400 font-bold">+${ach.reward} ¢</span>
          ${isUnlocked && !isClaimed ? `
            <button class="cyber-btn py-1 px-3 text-xs cyber-btn-yellow cursor-pointer" data-claim-id="${ach.id}">CLAIM</button>
          ` : (isClaimed ? '<span class="text-[10px] text-green-400 font-orbitron">CLAIMED</span>' : '')}
        </div>
      `;

      const claimBtn = item.querySelector('button');
      claimBtn?.addEventListener('click', () => {
        audioService.ensureContext();
        if (achievementService.claim(ach.id)) {
          audioService.playPowerUp();
          this.renderAchievements();
        }
      });

      list.appendChild(item);
    });
  }

  renderQuests() {
    const quests = questService.getQuests();
    const list = document.getElementById('questsList');
    if (!list) return;
    list.innerHTML = '';

    quests.forEach(q => {
      const item = document.createElement('div');
      item.className = `p-3.5 rounded-lg border flex flex-col gap-2 bg-black/60 ${
        q.done ? 'border-green-500/60 bg-green-950/20' : 'border-yellow-500/30'
      }`;

      const pct = Math.min(100, (q.progress / q.target) * 100);

      item.innerHTML = `
        <div class="flex justify-between items-center">
          <span class="font-orbitron font-bold text-sm text-white">${q.desc}</span>
          <span class="text-xs font-orbitron ${q.done ? 'text-green-400' : 'text-yellow-400'} font-bold">${q.done ? '✓ COMPLETE' : `+${q.reward} ¢`}</span>
        </div>
        <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
          <div class="h-full bg-gradient-to-r from-yellow-500 to-amber-300 transition-all duration-300" style="width:${pct}%"></div>
        </div>
        <div class="flex justify-between items-center text-[10px] text-slate-400">
          <span>PROGRESS</span>
          <span class="font-orbitron text-slate-300">${q.progress} / ${q.target}</span>
        </div>
      `;

      list.appendChild(item);
    });
  }

  refreshSettingsInputs() {
    const settings = storageService.data.settings;
    const sliderSfx = document.getElementById('sliderSfx');
    const sliderMusic = document.getElementById('sliderMusic');
    const toggleMobile = document.getElementById('toggleMobileControls');
    const toggleHighGlow = document.getElementById('toggleHighGlow');
    const toggleScreenShake = document.getElementById('toggleScreenShake');

    if (sliderSfx) sliderSfx.value = settings.sfxVol;
    if (sliderMusic) sliderMusic.value = settings.musicVol;
    if (toggleMobile) toggleMobile.checked = settings.mobileControls;
    if (toggleHighGlow) toggleHighGlow.checked = settings.highGlow;
    if (toggleScreenShake) toggleScreenShake.checked = settings.screenShake ?? true;

    this.updateMobileControlsVisibility();
  }

  updateMobileControlsVisibility() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const forceTouch = storageService.data?.settings?.mobileControls;
    if (this.mobileControls) {
      if (isTouch || forceTouch) {
        this.mobileControls.classList.remove('hidden');
      } else {
        this.mobileControls.classList.add('hidden');
      }
    }
  }

  showToast(text) {
    if (!this.toastNotification || !this.toastText) return;
    this.toastText.textContent = text;
    this.toastNotification.classList.remove('hidden');
    setTimeout(() => {
      this.toastNotification?.classList.add('hidden');
    }, 2800);
  }
}
