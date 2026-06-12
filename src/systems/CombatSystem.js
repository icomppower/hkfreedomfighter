// Central hit resolution: player attacks vs enemies, enemy attacks vs player,
// hitstop, combo tracking, and hit FX. Hitboxes are manual world-space rects
// produced by each entity's getActiveHitbox() during its active frames.

import { FRAME_MS } from '../constants.js';
import { comboLabel } from '../data/moves.js';
import { Sfx } from './Sfx.js';

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.combo = 0;
    this.comboExpire = 0;
    this.bestCombo = 0;
  }

  update(time) {
    const scene = this.scene;
    const player = scene.player;
    if (!player.active) return;

    // --- player attacks vs enemies ---
    if (!player.isDead) {
      const hb = player.getActiveHitbox();
      if (hb) {
        for (const enemy of scene.enemies.getChildren()) {
          if (!enemy.active || enemy.isDead) continue;
          if (player.hitRegistry.has(enemy)) continue;
          if (Phaser.Geom.Rectangle.Overlaps(hb, enemy.getHurtbox())) {
            this.resolvePlayerHit(player, enemy, hb, time);
          }
        }
      }
    }

    // --- enemy attacks vs player ---
    for (const enemy of scene.enemies.getChildren()) {
      if (!enemy.active || enemy.isDead) continue;
      const ehb = enemy.getActiveHitbox();
      if (!ehb || enemy.hitRegistry.has(player)) continue;
      if (Phaser.Geom.Rectangle.Overlaps(ehb, player.getHurtbox())) {
        this.resolveEnemyHit(enemy, player, ehb, time);
      }
    }

    // --- combo decay ---
    if (this.combo > 0 && time > this.comboExpire) {
      this.combo = 0;
      scene.game.events.emit('hud:combo', { count: 0, label: '' });
    }
  }

  resolvePlayerHit(player, enemy, hb, time) {
    const mv = player.currentMove;
    if (!mv) return;

    // Weapons hit a limited number of targets per swing (chair: 2, rod: all).
    if (mv.weapon && player.weaponHitCount >= mv.maxTargets) return;
    player.hitRegistry.add(enemy);

    const landed = enemy.takeHit(mv, player.x, time);
    if (!landed) return;

    if (mv.weapon) {
      player.weaponHitLanded = true;
      player.weaponHitCount += 1;
      if (mv.wwe && enemy.isDead) {
        this.scene.popText(enemy.x, enemy.y - 130, 'BAH GAWD!! 摺椅!!', '#ffe14d', 18);
      }
    }

    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboExpire = time + 1800;
    this.scene.game.events.emit('hud:combo', {
      count: this.combo,
      label: comboLabel(this.combo),
    });

    player.gainSP(mv.spGain ?? 0.12);

    const fx = Math.min(hb.right, enemy.x + 14);
    const fy = hb.centerY;
    this.scene.spawnHitSpark(fx, fy, mv.damage >= 2);
    Sfx.play(mv.sfx || 'punch');

    const freezeMs = (mv.freeze || 8) * FRAME_MS;
    player.applyFreeze(freezeMs);
    enemy.applyFreeze(freezeMs);

    if (mv.damage >= 2 || mv.knockdown) {
      this.scene.cameras.main.shake(90, 0.0035);
    }
  }

  resolveEnemyHit(enemy, player, ehb, time) {
    enemy.hitRegistry.add(player);
    const mv = enemy.currentMove;
    if (!mv) return;

    if (mv.grab) {
      // Grabs connect through a different path: the grabber takes control.
      if (player.canBeGrabbed(time)) {
        enemy.onGrabConnect(player, time);
        Sfx.play('hit');
      }
      return;
    }

    const landed = player.takeHit(mv, enemy.x, time);
    if (landed) {
      this.scene.spawnHitSpark(ehb.centerX, ehb.centerY, mv.damage >= 10);
      Sfx.play('hurt');
      enemy.applyFreeze((mv.freeze || 8) * FRAME_MS);
      if (mv.damage >= 10) this.scene.cameras.main.shake(110, 0.005);
    }
  }

  resetCombo() {
    this.combo = 0;
    this.scene.game.events.emit('hud:combo', { count: 0, label: '' });
  }
}
