// 777 THE RUBBER STAMP — Admiralty boss.
//   P1: heavy punches + grab-and-slam
//   P2: adds the shoulder bash from mid-range
//   P3: ground pound berserk — faster everything, wide low shockwave (jump it)

import Boss from './Boss.js';

export default class Dragon extends Boss {
  onPhase(n, time) {
    if (n === 3) this.speedMult = 1.6;
    if (n === 3) this.nextPoundAt = time + 1500;
  }

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

    // Mid-range options unlocked by phase.
    if (dist > 150) {
      if (this.phase >= 3 && (this.cooldowns.pound || 0) <= time && Math.random() < 0.4) {
        this.scene.popText(this.x, this.y - 150, '!! 跳呀 !!', '#ff5252', 20);
        this.scene.cameras.main.flash(160, 255, 40, 40);
        return this.startMove('pound', time);
      }
      if (this.phase >= 2 && (this.cooldowns.bash || 0) <= time && Math.random() < 0.5) {
        return this.startMove('bash', time);
      }
    }

    const speed = (dist > 220 ? this.cfg.runSpeed : this.cfg.speed) * this.speedMult;
    this.setVelocityX(this.facing * speed);
    this.playSafe(dist > 220 ? 'run' : 'walk');
  }

  pickAttack(time, dist) {
    const pool = [];
    const ready = (k) => (this.cooldowns[k] || 0) <= time;
    if (ready('jab')) pool.push('jab', 'jab');
    if (ready('heavy')) pool.push('heavy');
    if (ready('slam') && dist < this.cfg.attackRange) pool.push('slam', 'slam');
    if (this.phase >= 3 && ready('pound') && Math.random() < 0.25) pool.push('pound');
    if (!pool.length) return null;
    return Phaser.Utils.Array.GetRandom(pool);
  }
}
