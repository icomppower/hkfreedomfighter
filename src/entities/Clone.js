// 分身 — The Bear's clone. Fragile, fast, uses the base chase-and-poke brain.

import Enemy from './Enemy.js';

export default class Clone extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'clone');
    this.setAlpha(0.55);
  }

  die(dir, mv) {
    super.die(dir, mv);
    // Clones dissipate instead of lying around.
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 250 });
  }
}
