// 大佬 — tanky enforcer. Walks the player down slowly and goes for a grab
// when close; mixes in a heavy punch so crouching near him isn't free.

import Enemy from './Enemy.js';

export default class Enforcer extends Enemy {
  think(time) {
    this.facePlayer();
    const dist = this.distToPlayer();

    if (dist <= this.cfg.attackRange) {
      this.setVelocityX(0);
      const grabReady = (this.cooldowns.grab || 0) <= time;
      const punchReady = (this.cooldowns.punch || 0) <= time;
      if (grabReady && Math.random() < 0.65) return this.startMove('grab', time);
      if (punchReady) return this.startMove('punch', time);
      this.playSafe('idle');
      return;
    }

    // Never runs — the slow relentless walk is the threat.
    this.setVelocityX(this.facing * this.cfg.speed);
    this.playSafe('walk');
  }
}
