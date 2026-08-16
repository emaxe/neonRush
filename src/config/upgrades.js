/**
 * Cybernetic Lab upgrades configuration
 */
export const UPGRADES = Object.freeze([
  { id: 'magnet', name: 'MAGNET RADIUS', desc: 'Increases coin attractor field reach', maxLvl: 5, baseCost: 150, mult: 1.8 },
  { id: 'shield', name: 'REACTIVE SHIELD', desc: 'Allows absorbing 1 fatal obstacle impact', maxLvl: 3, baseCost: 300, mult: 2.2 },
  { id: 'nitro', name: 'NITRO EFFICIENCY', desc: 'Faster nitro charge and longer hyper-dash duration', maxLvl: 5, baseCost: 200, mult: 1.7 },
  { id: 'multiplier', name: 'OVERCLOCK SCORE', desc: 'Extends score multipliers & combo window', maxLvl: 5, baseCost: 250, mult: 1.8 },
  { id: 'coinBonus', name: 'GREED PROTOCOL', desc: 'Permanently increases value of collected coins', maxLvl: 5, baseCost: 300, mult: 2.0 }
]);

/**
 * Calculates the cost for a given upgrade level
 * @param {Object} upgrade 
 * @param {number} currentLevel 
 * @returns {number}
 */
export function getUpgradeCost(upgrade, currentLevel) {
  if (currentLevel >= upgrade.maxLvl) return Infinity;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.mult, currentLevel));
}
