// 青仔 — basic street thug. Rushes the player and spams punches, with the
// occasional kick. Spawns in groups; staggers its spacing slightly so packs
// don't perfectly overlap.

import Enemy from './Enemy.js';

export default class Goon extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'goon');
    this.spacing = Phaser.Math.Between(-18, 18);
  }

  think(time) {
    this.facePlayer();
    const target = this.player.x - this.facing * (38 + this.spacing);
    const dx = target - this.x;
    const dist = this.distToPlayer();

    if (dist <= this.cfg.attackRange) {
      this.setVelocityX(0);
      const key = this.pickAttack(time, dist);
      if (key) this.startMove(key, time);
      else this.playSafe('idle');
      return;
    }

    if (Math.abs(dx) > 6) {
      const speed = dist > 200 ? this.cfg.runSpeed : this.cfg.speed;
      const dir = Math.sign(dx);
      this.setVelocityX(dir * speed);
      this.playSafe(dist > 200 ? 'run' : 'walk');
    } else {
      this.setVelocityX(0);
      this.playSafe('idle');
    }
  }

  pickAttack(time) {
    // Heavily favors punches; kick is the slower mixup.
    const punchReady = (this.cooldowns.punch || 0) <= time;
    const kickReady = (this.cooldowns.kick || 0) <= time;
    if (punchReady && (!kickReady || Math.random() < 0.7)) return 'punch';
    if (kickReady) return 'kick';
    return null;
  }
}
