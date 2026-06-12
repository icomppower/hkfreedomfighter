// Shared boss base. Phase transitions are keyed off cfg.phases (HP fractions);
// crossing one flashes, roars (cfg.roars[n]), grants brief invulnerability and
// calls onPhase(n) for boss-specific behavior. Moves that carry a `projectile`
// spec fire it automatically at the end of startup (see fireProjectile).

import { FRAME_MS } from '../constants.js';
import Enemy from './Enemy.js';
import { Sfx } from '../systems/Sfx.js';

export default class Boss extends Enemy {
  constructor(scene, x, y, type) {
    super(scene, x, y, type);
    this.phase = 1;
    this.speedMult = 1;
    this.state = 'engage'; // bosses skip patrol — the intro already played
  }

  get hpFrac() {
    return Math.max(0, this.hp) / this.maxHp;
  }

  onTookHit(time) {
    const thresholds = this.cfg.phases || [];
    let target = 1;
    for (const frac of thresholds) {
      if (this.hpFrac <= frac) target += 1;
    }
    if (target > this.phase) this.enterPhase(target, time);
  }

  enterPhase(n, time) {
    this.phase = n;
    this.speedMult = 1 + (n - 1) * 0.25;
    this.invulnUntil = time + 1100;
    this.state = 'recover';
    this.recoverUntil = time + 900;
    this.setVelocity(0, 0);
    this.playSafe('idle');

    Sfx.play('boss');
    this.scene.cameras.main.shake(300, 0.006);
    this.scene.cameras.main.flash(200, 255, 60, 60);
    const roar = this.cfg.roars?.[n];
    if (roar) this.scene.popText(this.x, this.y - 150, roar, '#ff5252', 24);

    this.onPhase(n, time);
  }

  // Boss-specific phase behavior (summons, darkness, enrage...).
  onPhase() {}

  minionCount() {
    return this.scene.enemies.getChildren()
      .filter((e) => e.active && !e.isDead && e !== this).length;
  }

  progressAttack(time, delta) {
    const mv = this.currentMove;
    if (mv?.projectile && !mv.fired && this.moveT + delta >= mv.startup * FRAME_MS) {
      mv.fired = true;
      this.fireProjectile(mv.projectile);
    }
    super.progressAttack(time, delta);
  }

  fireProjectile(spec) {
    const x = this.x + this.facing * 20 * this.charScale;
    const y = this.y - spec.fy * this.charScale;
    const count = spec.count || 1;
    for (let i = 0; i < count; i++) {
      // Fan multi-shots by varying launch speed so arcs land staggered.
      const vx = this.facing * (spec.vx + (count > 1 ? (i - (count - 1) / 2) * (spec.spread || 0) : 0));
      this.scene.spawnProjectile(x, y, vx, spec.vy, spec, this);
    }
  }

  startMove(key, time) {
    super.startMove(key, time);
    // Faster phases shave the cooldowns set by the base class.
    if (this.cooldowns[key]) {
      this.cooldowns[key] = time + (this.cooldowns[key] - time) / this.speedMult;
    }
  }
}
