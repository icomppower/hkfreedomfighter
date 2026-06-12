// 比卡超 THE SHOCKER — LegCo boss.
//   P1: hook combos + lobbed gas canisters
//   P2: adds the traveling water-cannon wave (jump it)
//   P3: summons white-shirt reinforcements while keeping the bombardment up

import Boss from './Boss.js';

export default class Pirate extends Boss {
  constructor(scene, x, y, type) {
    super(scene, x, y, type);
    this.nextSummonAt = 0;
  }

  onPhase(n, time) {
    if (n === 3) {
      this.summonGoons(time);
    }
  }

  summonGoons(time) {
    const spawner = this.scene.spawner;
    if (!spawner) return;
    const cam = this.scene.cameras.main;
    spawner.spawnEnemy('goon', cam.scrollX - 40);
    spawner.spawnEnemy('goon', cam.scrollX + 1000);
    this.scene.popText(this.x, this.y - 120, '增援, 上!', '#ffe14d', 18);
    this.nextSummonAt = time + 13000;
  }

  think(time) {
    if (this.phase >= 3 && time >= this.nextSummonAt && this.minionCount() < 2) {
      this.summonGoons(time);
    }

    this.facePlayer();
    const dist = this.distToPlayer();

    if (dist <= this.cfg.attackRange) {
      this.setVelocityX(0);
      const key = this.pickAttack(time, dist);
      if (key) this.startMove(key, time);
      else this.playSafe('idle');
      return;
    }

    if (dist > 160) {
      if (this.phase >= 2 && (this.cooldowns.wave || 0) <= time && Math.random() < 0.45) {
        this.setVelocityX(0);
        return this.startMove('wave', time);
      }
      if ((this.cooldowns.cannonball || 0) <= time && Math.random() < 0.5) {
        this.setVelocityX(0);
        return this.startMove('cannonball', time);
      }
    }

    const speed = (dist > 220 ? this.cfg.runSpeed : this.cfg.speed) * this.speedMult;
    this.setVelocityX(this.facing * speed);
    this.playSafe(dist > 220 ? 'run' : 'walk');
  }

  pickAttack(time) {
    const pool = [];
    const ready = (k) => (this.cooldowns[k] || 0) <= time;
    if (ready('hook')) pool.push('hook', 'hook');
    if (ready('kick')) pool.push('kick');
    if (!pool.length) return null;
    return Phaser.Utils.Array.GetRandom(pool);
  }
}
