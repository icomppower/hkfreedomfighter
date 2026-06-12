// 強哥 THE FIXER — Yuen Long boss. Fast and pushy.
//   P1: relentless cleaver slash pressure
//   P2: adds the chili powder cloud (stuns on contact)
//   P3: three-cleaver fan throws between rushes

import Boss from './Boss.js';

export default class Queen extends Boss {
  think(time) {
    this.facePlayer();
    const dist = this.distToPlayer();

    if (dist <= this.cfg.attackRange) {
      this.setVelocityX(0);
      const key = this.pickAttack(time, dist);
      if (key) this.startMove(key, time);
      else this.playSafe('idle');
      return;
    }

    if (dist > 130) {
      if (this.phase >= 3 && (this.cooldowns.throwfan || 0) <= time && Math.random() < 0.45) {
        this.setVelocityX(0);
        return this.startMove('throwfan', time);
      }
      if (this.phase >= 2 && (this.cooldowns.chili || 0) <= time && Math.random() < 0.4) {
        this.setVelocityX(0);
        return this.startMove('chili', time);
      }
    }

    const speed = (dist > 200 ? this.cfg.runSpeed : this.cfg.speed) * this.speedMult;
    this.setVelocityX(this.facing * speed);
    this.playSafe(dist > 200 ? 'run' : 'walk');
  }

  pickAttack(time) {
    const pool = [];
    const ready = (k) => (this.cooldowns[k] || 0) <= time;
    if (ready('slash')) pool.push('slash', 'slash', 'slash');
    if (ready('heavy')) pool.push('heavy');
    if (!pool.length) return null;
    return Phaser.Utils.Array.GetRandom(pool);
  }
}
