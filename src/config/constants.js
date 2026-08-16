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
  BOSS_INTERVAL: 1000, // meters per boss spawn
  CHUNK_LENGTH: 1200,

  // Powerup durations (seconds)
  MAGNET_DURATION: 8,
  MULTIPLIER_DURATION: 20,
  SLOWMO_DURATION: 5,
  GHOST_DURATION: 10,
  NITRO_DURATION: 1.8,

  // Storage key
  STORAGE_KEY: 'neon_rush_save_v2'
});
