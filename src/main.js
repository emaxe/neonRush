import './styles/main.css';
import { Game } from './core/Game.js';

/**
 * Neon Rush - Application Bootstrap
 */
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.gameInstance = game;
});
