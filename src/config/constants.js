/**
 * Game Core Configuration & Physics Constants
 */
export const CONFIG = Object.freeze({
  CANVAS_BASE_WIDTH: 1280,
  CANVAS_BASE_HEIGHT: 720,
  WORLD_GRAVITY: 1600, // px/s^2
  PLAYER_BASE_SPEED: 340, // starting horizontal speed
  PLAYER_MAX_SPEED: 850, // max speed cap
  SPEED_ACCELERATION: 1.8, // px/s increased per second of run

  // Jump mechanics
  JUMP_IMPULSE: -580,
  JUMP_HOLD_ACCEL: -700,
  MAX_JUMP_HOLD_TIME: 0.22,
  DOUBLE_JUMP_IMPULSE: -520,

  // Dimensions
  PLAYER_WIDTH: 42,
  PLAYER_HEIGHT: 68,
  PLAYER_SLIDE_HEIGHT: 34,
  PLATFORM_THICKNESS: 32,

  // Spawning & Biomes
  BIOME_DISTANCE: 1500, // meters per biome switch
  BOSS_INTERVAL: 1000, // meters per boss spawn (base, level 1)
  CHUNK_LENGTH: 1200,

  // Level progression (после каждого босса — новый уровень с усложнением)
  LEVEL_BOSS_INTERVAL_DECREASE: 60, // на сколько метров сокращается дистанция до босса за уровень
  LEVEL_MIN_BOSS_INTERVAL: 500, // минимальная дистанция до босса
  LEVEL_SPEED_BONUS: 30, // прибавка к базовой скорости за уровень
  LEVEL_MAX_SPEED_BONUS: 220, // потолок прибавки скорости
  LEVEL_OBSTACLE_DENSITY: 0.12, // прибавка плотности препятствий за уровень
  LEVEL_MAX_OBSTACLE_DENSITY: 0.6, // потолок плотности
  LEVEL_BOSS_HP_BONUS: 8, // прибавка HP босса за уровень
  LEVEL_BOSS_SPEED_BONUS: 0.06, // прибавка к скорости атак босса за уровень

  // Powerup durations (seconds)
  MAGNET_DURATION: 8,
  MULTIPLIER_DURATION: 20,
  SLOWMO_DURATION: 5,
  GHOST_DURATION: 10,
  NITRO_DURATION: 1.8,

  // Combo decay: множитель спадает, если игрок не набирает комбо
  COMBO_DECAY_TIME: 3.0,   // сек без набора до начала спада
  COMBO_DECAY_RATE: 0.5,   // скорость спада множителя в секунду

  // Storage key
  STORAGE_KEY: 'neon_rush_save_v2'
});
