// 飛賊 — acrobat. Periodically vaults over the player to attack from behind,
// dive-kicks on the way down, and uses quick kicks on the ground.

import Enemy from './Enemy.js';

export default class Acrobat extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'acrobat');
    this.nextHopAt = 0;
    this.airAttacked = false;
  }

  think(time) {
    const p = this.player;
    const dist = this.distToPlayer();

    if (!this.onGround) {
      // Mid-vault: dive kick once we're past the apex and near the player.
      if (!this.airAttacked && this.body.velocity.y > -100 && dist < 90
          && (this.cooldowns.jumpkick || 0) <= time) {
        this.airAttacked = true;
        this.startMove('jumpkick', time);
      }
      return;
    }

    this.facePlayer();
    this.airAttacked = false;

    // Vault over the player.
    if (time >= this.nextHopAt && dist < 220 && dist > 40) {
      this.nextHopAt = time + Phaser.Math.Between(1700, 2600);
      const dir = Math.sign(p.x - this.x) || 1;
      this.setVelocity(dir * 360, -760);
      this.onGround = false;
      this.play('acrobat-jump', true);
      return;
    }

    if (dist <= this.cfg.attackRange) {
      this.setVelocityX(0);
      if ((this.cooldowns.kick || 0) <= time) this.startMove('kick', time);
      else this.playSafe('idle');
    } else {
      this.setVelocityX(this.facing * this.cfg.runSpeed);
      this.playSafe('run');
    }
  }
}
