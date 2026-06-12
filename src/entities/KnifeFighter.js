// 刀手 — knife fighter. Maintains poking distance, lunges with the blade,
// and hops backward (briefly invulnerable) when the player starts an attack
// nearby.

import { FRAME_MS } from '../constants.js';
import Enemy from './Enemy.js';

export default class KnifeFighter extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'knife');
    this.nextDodgeAt = 0;
  }

  think(time) {
    this.facePlayer();
    const p = this.player;
    const dist = this.distToPlayer();
    const [keepMin, keepMax] = this.cfg.keepDistance;

    // Dodge backward when the player commits to an attack in range.
    if (p.state === 'attack' && p.currentMove
        && p.moveT < (p.currentMove.startup + 2) * FRAME_MS
        && dist < 150 && time >= this.nextDodgeAt && Math.random() < 0.55) {
      this.nextDodgeAt = time + 1500;
      this.state = 'flee';
      this.fleeUntil = time + 360;
      this.invulnUntil = time + 320;
      this.setVelocity(-this.facing * 320, -200);
      this.onGround = false;
      this.play('knife-jump', true);
      return;
    }

    if (dist < keepMin) {
      // Too close: back off.
      this.setVelocityX(-this.facing * this.cfg.speed);
      this.playSafe('walk');
    } else if (dist > keepMax) {
      this.setVelocityX(this.facing * this.cfg.runSpeed);
      this.playSafe('run');
    } else {
      this.setVelocityX(0);
      if ((this.cooldowns.poke || 0) <= time) {
        this.startMove('poke', time);
      } else {
        this.playSafe('idle');
      }
    }
  }
}
