// Generates every texture procedurally (no external files) and registers
// all character animations, then hands off to the menu.

import { GAME_W, GAME_H } from '../constants.js';
import { generateAllTextures } from '../assets/textures.js';
import { registerAllAnimations } from '../systems/AnimationSystem.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, '載入中 LOADING...', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffd54f',
    }).setOrigin(0.5);

    // Defer one frame so the loading text paints before the (synchronous)
    // canvas generation work runs.
    this.time.delayedCall(30, () => {
      generateAllTextures(this);
      registerAllAnimations(this);
      this.scene.start('Menu');
    });
  }
}
