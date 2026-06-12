// 維尼熊 THE BEAR — final boss at the PolyU siege. Four phases:
//   P1: dagger combos, thrown knives, teleport-style dash strikes
//   P2: spawns clones (and replaces them while the phase lasts)
//   P3: drops the campus into darkness
//   P4: mask off — darkness lifts, enraged speed, red glow

import Boss from './Boss.js';

export default class Shadow extends Boss {
  constructor(scene, x, y, type) {
    super(scene, x, y, type);
    this.nextCloneAt = 0;
  }

  onPhase(n, time) {
    if (n === 2) {
      this.spawnClones(time);
    } else if (n === 3) {
      this.scene.events.emit('darkness:on');
    } else if (n === 4) {
      this.scene.events.emit('darkness:off');
      this.speedMult = 1.7;
      this.setTint(0xff7070);
    }
  }

  spawnClones(time) {
    const spawner = this.scene.spawner;
    if (!spawner) return;
    const cam = this.scene.cameras.main;
    [cam.scrollX + 60, cam.scrollX + 900].forEach((x) => {
      const clone = spawner.spawnEnemy('clone', x);
      clone.setAlpha(0.55);
    });
    this.scene.popText(this.x, this.y - 130, '分身, 上!', '#ff7070', 18);
    this.nextCloneAt = time + 12000;
  }

  think(time) {
    // Keep clone pressure up through phases 2 and 3.
    if (this.phase >= 2 && this.phase <= 3
        && time >= this.nextCloneAt && this.minionCount() < 1) {
      this.spawnClones(time);
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

    if (dist > 150) {
      if ((this.cooldowns.dash || 0) <= time && Math.random() < 0.45) {
        // Blink before striking — reads as a teleport.
        this.setAlpha(0.25);
        this.scene.time.delayedCall(220, () => { if (this.active && !this.isDead) this.setAlpha(1); });
        return this.startMove('dash', time);
      }
      if ((this.cooldowns.knives || 0) <= time && Math.random() < 0.4) {
        this.setVelocityX(0);
        return this.startMove('knives', time);
      }
    }

    const speed = (dist > 210 ? this.cfg.runSpeed : this.cfg.speed) * this.speedMult;
    this.setVelocityX(this.facing * speed);
    this.playSafe(dist > 210 ? 'run' : 'walk');
  }

  pickAttack(time) {
    const pool = [];
    const ready = (k) => (this.cooldowns[k] || 0) <= time;
    if (ready('dagger')) pool.push('dagger', 'dagger');
    if (ready('heavy')) pool.push('heavy');
    if (!pool.length) return null;
    return Phaser.Utils.Array.GetRandom(pool);
  }

  die(dir, mv) {
    this.scene.events.emit('darkness:off');
    super.die(dir, mv);
  }
}
