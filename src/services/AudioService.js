import { storageService } from './StorageService.js';

/**
 * AudioService - Complete Web Audio API synthesizer for SFX and dynamic 16-step Synthwave music.
 */
export class AudioService {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMusicPlaying = false;
    this.musicTempo = 124;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerId = null;
    this.isBossMusic = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported in this environment');
        return;
      }

      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      const sfxVol = storageService.data?.settings?.sfxVol ?? 0.8;
      this.sfxGain.gain.setValueAtTime(sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      const musicVol = storageService.data?.settings?.musicVol ?? 0.5;
      this.musicGain.gain.setValueAtTime(musicVol, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API initialization failed:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setSfxVolume(vol) {
    if (!this.sfxGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.sfxGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  setMusicVolume(vol) {
    if (!this.musicGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.musicGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  // --- PROCEDURAL SFX GENERATORS ---

  playJump() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playDoubleJump() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playSlide() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    whiteNoise.start(now);
    whiteNoise.stop(now + 0.16);
  }

  playCoin(combo = 1) {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 587.33; // D5
    const noteOffset = Math.min(combo * 40, 400);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq + noteOffset, now);
    osc.frequency.setValueAtTime(baseFreq * 1.5 + noteOffset, now + 0.04);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playGravityFlip() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.22);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.22);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playNitro() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  playPowerUp() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880]; // A major
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.26);
    });
  }

  playComboMilestone(level = 3) {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const notes3  = [523.25, 659.25, 783.99];
    const notes5  = [523.25, 659.25, 783.99, 1046.5];
    const notes8  = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const notes10 = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    const notes = level === 10 ? notes10 : level === 8 ? notes8
                : level === 5 ? notes5 : notes3;
    const vol = 0.12 + level * 0.025;
    const type = level >= 8 ? 'sawtooth' : 'triangle';
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      g.gain.setValueAtTime(vol, now + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.22);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.23);
    });
    // Sub-bass impact at x10
    if (level === 10) {
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(120, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      sg.gain.setValueAtTime(0.4, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      sub.connect(sg);
      sg.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.26);
    }
  }

  playNearMissStreak(level = 2) {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const notes2  = [880, 1108.73];
    const notes5  = [880, 1108.73, 1318.5];
    const notes10 = [880, 1108.73, 1318.5, 1760];
    const notes = level === 10 ? notes10 : level === 5 ? notes5 : notes2;
    const vol = 0.1 + level * 0.02;
    const type = level >= 5 ? 'sawtooth' : 'triangle';
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + i * 0.035);
      g.gain.setValueAtTime(vol, now + i * 0.035);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.035);
      osc.stop(now + i * 0.035 + 0.2);
    });
    // Sub-bass impact at streak x10
    if (level >= 10) {
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(100, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      sg.gain.setValueAtTime(0.35, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      sub.connect(sg);
      sg.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.25);
    }
  }

  playHit() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playShoot() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playBossLaser() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playExplosion() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.46);
  }

  playDeathFlatline() {
    if (!this.initialized || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    // 1. Initial Heavy Sub Impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.6);

    // 2. Glitch Digital Noise Shatter
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.6);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.65);

    // 3. Heartbeat Flatline Tone (high-tech beep fade)
    const flatOsc = this.ctx.createOscillator();
    const flatGain = this.ctx.createGain();
    flatOsc.type = 'sine';
    flatOsc.frequency.setValueAtTime(880, now + 0.15); // A5 tone
    flatGain.gain.setValueAtTime(0.001, now);
    flatGain.gain.setValueAtTime(0.2, now + 0.15);
    flatGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    flatOsc.connect(flatGain);
    flatGain.connect(this.sfxGain);
    flatOsc.start(now + 0.15);
    flatOsc.stop(now + 1.25);
  }

  // --- PROCEDURAL SYNTHWAVE MUSIC SEQUENCER ---

  startMusic() {
    if (!this.initialized || this.isMusicPlaying) return;
    this.ensureContext();
    this.isMusicPlaying = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduleMusic();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  setBossMusic(isBoss) {
    this.isBossMusic = isBoss;
  }

  scheduleMusic() {
    if (!this.isMusicPlaying || !this.ctx) return;
    const secondsPerBeat = 60.0 / this.musicTempo;
    const stepDuration = secondsPerBeat / 4; // 16th notes

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playMusicStep(this.step, this.nextNoteTime);
      this.step = (this.step + 1) % 32;
      this.nextNoteTime += stepDuration;
    }

    this.timerId = setTimeout(() => this.scheduleMusic(), 40);
  }

  playMusicStep(step, time) {
    const normalBass = [
      110, 110, 220, 110, 110, 110, 220, 110,  // A2
      87.3, 87.3, 174.6, 87.3, 87.3, 87.3, 174.6, 87.3, // F2
      130.8, 130.8, 261.6, 130.8, 130.8, 130.8, 261.6, 130.8, // C3
      98.0, 98.0, 196.0, 98.0, 98.0, 98.0, 196.0, 98.0  // G2
    ];

    const bossBass = [
      73.4, 73.4, 146.8, 73.4, 73.4, 73.4, 146.8, 73.4, // D2
      58.27, 58.27, 116.5, 58.27, 58.27, 58.27, 116.5, 58.27, // Bb1
      98.0, 98.0, 196.0, 98.0, 98.0, 98.0, 196.0, 98.0, // G2
      110.0, 110.0, 220.0, 110.0, 110.0, 110.0, 220.0, 110.0 // A2
    ];

    const bassNotes = this.isBossMusic ? bossBass : normalBass;
    const freq = bassNotes[step % 32];

    // Bass synth
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = this.isBossMusic ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.isBossMusic ? 450 : 320, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.12);

    // Kick drum
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(130, time);
      kickOsc.frequency.exponentialRampToValueAtTime(35, time + 0.08);
      kickGain.gain.setValueAtTime(0.4, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);
      kickOsc.start(time);
      kickOsc.stop(time + 0.1);
    }

    // Snare
    if (step % 8 === 4) {
      const snareOsc = this.ctx.createOscillator();
      const snareGain = this.ctx.createGain();
      snareOsc.type = 'sawtooth';
      snareOsc.frequency.setValueAtTime(180, time);
      snareGain.gain.setValueAtTime(0.15, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      snareOsc.connect(snareGain);
      snareGain.connect(this.musicGain);
      snareOsc.start(time);
      snareOsc.stop(time + 0.09);
    }

    // Hi-hat
    if (step % 2 === 1) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hatOsc.type = 'square';
      hatOsc.frequency.setValueAtTime(3000, time);
      hatGain.gain.setValueAtTime(0.04, time);
      hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      hatOsc.connect(hatGain);
      hatGain.connect(this.musicGain);
      hatOsc.start(time);
      hatOsc.stop(time + 0.035);
    }
  }
}

export const audioService = new AudioService();
