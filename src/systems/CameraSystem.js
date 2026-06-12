// Right-only scrolling camera with arena-lock support.
// The camera never scrolls left of the furthest point reached; during a wave
// it is pinned to the arena. The player is clamped to the visible region.

import { GAME_W } from '../constants.js';

export default class CameraSystem {
  constructor(scene, zoneWidth) {
    this.scene = scene;
    this.zoneWidth = zoneWidth;
    this.minScrollX = 0;
    this.lock = null; // { left, right } world-space arena bounds
  }

  setLock(left) {
    const clampedLeft = Phaser.Math.Clamp(left, 0, this.zoneWidth - GAME_W);
    this.lock = { left: clampedLeft, right: clampedLeft + GAME_W };
  }

  clearLock() {
    this.lock = null;
  }

  update() {
    const cam = this.scene.cameras.main;
    const player = this.scene.player;
    let target = player.x - GAME_W * 0.4;

    target = Math.max(target, this.minScrollX);
    if (this.lock) target = Phaser.Math.Clamp(target, this.lock.left, this.lock.left);
    target = Phaser.Math.Clamp(target, 0, this.zoneWidth - GAME_W);

    cam.scrollX = Phaser.Math.Linear(cam.scrollX, target, this.lock ? 0.18 : 1);
    if (Math.abs(cam.scrollX - target) < 0.5) cam.scrollX = target;
    this.minScrollX = Math.max(this.minScrollX, cam.scrollX);
  }

  // World-space bounds the player may occupy this frame.
  playerBounds() {
    const cam = this.scene.cameras.main;
    if (this.lock) {
      return { left: this.lock.left + 26, right: this.lock.right - 26 };
    }
    return { left: cam.scrollX + 24, right: this.zoneWidth - 20 };
  }
}
