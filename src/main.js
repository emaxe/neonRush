import './styles/main.css';
import { Game } from './core/Game.js';
import { GameState } from './core/GameState.js';

/**
 * Neon Rush - Application Bootstrap
 */
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.gameInstance = game;

  // Auto-pause when the tab loses focus so the player doesn't die
  // while switching windows (visibilitychange fires on tab switch/minimize).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === GameState.PLAYING) {
      game.togglePause();
    }
  });
});
