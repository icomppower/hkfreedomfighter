// Main gameplay scene. One instance per zone — zone transitions restart the
// scene with the next zoneIndex and save a checkpoint. Owns the player,
// enemies, items, parallax layers and all gameplay systems; the HUD runs as
// a parallel scene fed via game-level events.

import {
  GAME_W, GAME_H, GROUND_Y, DEPTH, STORAGE,
} from '../constants.js';
import { ZONES } from '../data/levels.js';
import { ITEM_TYPES } from '../data/enemies.js';
import { WEAPONS } from '../data/weapons.js';
import { comboMultiplier } from '../data/moves.js';
import Player from '../entities/Player.js';
import CombatSystem from '../systems/CombatSystem.js';
import SpawnerSystem from '../systems/SpawnerSystem.js';
import CameraSystem from '../systems/CameraSystem.js';
import { Sfx } from '../systems/Sfx.js';
import { midiPlayer } from '../systems/MidiPlayer.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.zoneIndex = data.zoneIndex ?? 0;
    this.score = data.score ?? 0;
    this.lives = data.lives ?? 3;
    this.continues = data.continues ?? 0;
    this.zone = ZONES[this.zoneIndex];
    this.boss = null;
    this.ending = false;
  }

  create() {
    const zone = this.zone;
    this.physics.world.setBounds(0, 0, zone.width, GAME_H);
    this.cameras.main.setBounds(0, 0, zone.width, GAME_H);

    this.buildBackground();

    this.player = new Player(this, 120);
    this.enemies = this.add.group();
    this.items = this.add.group();
    this.weapons = this.add.group();
    this.projectiles = this.add.group();
    this.playerProjectiles = this.add.group();

    this.combat = new CombatSystem(this);
    this.spawner = new SpawnerSystem(this, zone);
    this.cameraSystem = new CameraSystem(this, zone.width);

    this.shadowGfx = this.add.graphics().setDepth(DEPTH.SHADOW);
    this.barrierGfx = this.add.graphics().setDepth(DEPTH.FX);

    this.buildParticles();
    if (zone.rain) this.buildRain();

    // Full-screen darkness overlay (The Shadow's phase 3).
    this.darkOverlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000004, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.RAIN + 1);

    this.events.on('enemy:died', this.onEnemyDied, this);
    this.events.on('darkness:on', this.setDarkness, this);
    this.events.on('darkness:off', this.clearDarkness, this);
    this.events.once('shutdown', () => {
      this.events.off('enemy:died', this.onEnemyDied, this);
      this.events.off('darkness:on', this.setDarkness, this);
      this.events.off('darkness:off', this.clearDarkness, this);
    });

    // M key — mute / unmute music.
    this.input.keyboard.on('keydown-M', () => {
      const muted = midiPlayer.toggle();
      this.popText(this.player.x, this.player.y - 80, muted ? '🔇 音樂靜音' : '🔊 音樂開啟', '#ffe14d', 18);
    });

    // HUD scene runs in parallel.
    if (this.scene.isActive('HUD')) {
      this.game.events.emit('hud:reset');
    } else {
      this.scene.launch('HUD');
    }
    this.game.events.emit('hud:hp', { hp: this.player.hp, max: this.player.maxHp });
    this.game.events.emit('hud:sp', { sp: this.player.sp });
    this.game.events.emit('hud:lives', { lives: this.lives });
    this.game.events.emit('hud:score', { score: this.score });
    this.game.events.emit('hud:banner', { text: `${zone.name}`, sub: zone.nameEn });

    this.saveCheckpoint();
  }

  buildBackground() {
    const bg = this.zone.bg;
    this.bgFar = this.add.tileSprite(0, 0, GAME_W, GAME_H, `${bg}_far`)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.BG_FAR);
    this.bgMid = this.add.tileSprite(0, 0, GAME_W, GAME_H, `${bg}_mid`)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.BG_MID);
    this.bgNear = this.add.tileSprite(0, 0, GAME_W, GAME_H, `${bg}_near`)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.BG_NEAR);
    this.bgGround = this.add.tileSprite(0, GROUND_Y - 8, GAME_W, GAME_H - GROUND_Y + 8, `${bg}_ground`)
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.GROUND);
  }

  buildParticles() {
    this.sparkEmitter = this.add.particles(0, 0, 'fx_spark', {
      speed: { min: 120, max: 320 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.1, end: 0 },
      lifespan: 280,
      gravityY: 300,
      emitting: false,
    }).setDepth(DEPTH.FX);

    this.dustEmitter = this.add.particles(0, 0, 'fx_dust', {
      speedX: { min: -60, max: 60 },
      speedY: { min: -40, max: -10 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 350,
      emitting: false,
    }).setDepth(DEPTH.FX);

    this.orbEmitter = this.add.particles(0, 0, 'fx_orb', {
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 420,
      emitting: false,
    }).setDepth(DEPTH.FX);
  }

  buildRain() {
    this.add.particles(0, 0, 'fx_rain', {
      x: { min: -60, max: GAME_W + 60 },
      y: -20,
      speedY: { min: 760, max: 980 },
      speedX: { min: -150, max: -110 },
      lifespan: 800,
      quantity: 2,
      frequency: 14,
      alpha: { min: 0.25, max: 0.6 },
    }).setDepth(DEPTH.RAIN).setScrollFactor(0);
  }

  /* ---------------- FX helpers (used by systems/entities) ---------------- */

  spawnHitSpark(x, y, heavy = false) {
    this.sparkEmitter.explode(heavy ? 14 : 7, x, y);
  }

  spawnDust(x, y) {
    this.dustEmitter.explode(5, x, y - 4);
  }

  spawnSpecialGlow(target) {
    this.orbEmitter.explode(16, target.x, target.y - 50);
  }

  setDarkness() {
    this.tweens.add({ targets: this.darkOverlay, fillAlpha: 0.72, duration: 900 });
  }

  clearDarkness() {
    this.tweens.add({ targets: this.darkOverlay, fillAlpha: 0, duration: 600 });
  }

  popText(x, y, str, color = '#ffffff', size = 14) {
    const t = this.add.text(x, y, str, {
      fontFamily: 'Arial Black, sans-serif', fontSize: `${size}px`,
      color, stroke: '#000000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.FX);
    this.tweens.add({
      targets: t, y: y - 36, alpha: 0, duration: 900, ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
  }

  /* ---------------- scoring / items ---------------- */

  addScore(points) {
    this.score += points;
    this.game.events.emit('hud:score', { score: this.score });
  }

  onEnemyDied(enemy) {
    const mult = comboMultiplier(this.combat.combo);
    const points = enemy.cfg.points * mult;
    this.addScore(points);
    this.popText(enemy.x, enemy.y - 90,
      mult > 1 ? `+${points} (x${mult})` : `+${points}`, '#ffe14d', 15);
    this.spawnHitSpark(enemy.x, enemy.y - 50, true);

    // Independent drop chances per item type on regular kills.
    if (!enemy.cfg.boss) {
      const r = Math.random();
      if (r < 0.08) this.spawnItem(enemy.x, enemy.y - 60, 'claypot');
      else if (r < 0.18) this.spawnItem(enemy.x, enemy.y - 60, 'drink');
      else if (r < 0.33) this.spawnItem(enemy.x, enemy.y - 60, 'hongbao');
      else if (r < 0.58) this.spawnItem(enemy.x, enemy.y - 60, 'bun');
    }

    if (enemy.cfg.boss) {
      this.onBossDefeated(enemy);
    }
  }

  onBossDefeated(boss) {
    this.popText(boss.x, boss.y - 130, 'K.O.!!', '#ffd700', 40);

    // Defeat quote (see GDD bosses table).
    if (boss.cfg.quote) {
      this.time.delayedCall(900, () => {
        this.popText(boss.x, boss.y - 130, boss.cfg.quote, '#ffffff', 18);
      });
    }

    // Full HP restore.
    const hpGained = this.player.maxHp - this.player.hp;
    if (hpGained > 0) {
      this.player.heal(hpGained);
      this.time.delayedCall(400, () => {
        this.popText(boss.x, boss.y - 160, '體力全回復!', '#6dff6d', 18);
      });
    }

    // +1 life (cap 9).
    if (this.lives < 9) {
      this.lives += 1;
      this.game.events.emit('hud:lives', { lives: this.lives });
      this.time.delayedCall(700, () => {
        this.popText(boss.x, boss.y - 190, '獲得1條命!', '#ffd54f', 18);
      });
    }

    // Gold coin burst.
    this.orbEmitter.explode(28, boss.x, boss.y - 60);

    this.time.delayedCall(2200, () => this.completeZone());
  }

  spawnItem(x, y, type) {
    const def = ITEM_TYPES[type];
    const item = this.physics.add.sprite(x, y, def.texture)
      .setDepth(DEPTH.ITEM).setScale(1.6);
    item.itemType = type;
    item.setVelocity(Phaser.Math.Between(-80, 80), -340);
    this.items.add(item);
    return item;
  }

  /* ---------------- weapons ---------------- */

  spawnWeapon(x, type, fromY = GROUND_Y - 200) {
    const def = WEAPONS[type];
    const wpn = this.physics.add.sprite(x, fromY, def.tex)
      .setDepth(DEPTH.ITEM).setScale(1.7);
    wpn.weaponType = type;
    wpn.setVelocity(Phaser.Math.Between(-40, 40), -200);
    // Idle shimmer so drops read as pickups.
    this.tweens.add({
      targets: wpn, alpha: 0.55, duration: 420, yoyo: true, repeat: -1,
    });
    this.weapons.add(wpn);
    return wpn;
  }

  pickupWeapon(wpn) {
    const def = WEAPONS[wpn.weaponType];
    this.player.holdWeapon(wpn.weaponType);
    this.popText(wpn.x, wpn.y - 24, `${def.zh} ${def.en}`, '#7df0ff', 13);
    Sfx.play('pickup');
    wpn.destroy();
  }

  /* ---------------- boss projectiles ---------------- */

  spawnKiBlast(x, y, facing) {
    const vx = facing * 400;
    const proj = this.physics.add.sprite(x, y, 'proj_kiblast')
      .setDepth(DEPTH.FX).setScale(1.9);
    proj.setFlipX(vx < 0);
    proj.body.setAllowGravity(false);
    proj.setVelocity(vx, 0);
    this.playerProjectiles.add(proj);

    // Pulsing glow trail via tween on alpha.
    this.tweens.add({ targets: proj, alpha: 0.65, duration: 140, yoyo: true, repeat: -1 });
    return proj;
  }

  updatePlayerProjectiles(time) {
    for (const proj of this.playerProjectiles.getChildren()) {
      if (!proj.active) continue;
      if (proj.x < -80 || proj.x > this.zone.width + 80) {
        proj.destroy();
        continue;
      }
      const s = 1.9;
      const w = 26 * s;
      const h = 26 * s;
      const rect = new Phaser.Geom.Rectangle(proj.x - w / 2, proj.y - h / 2, w, h);
      for (const enemy of this.enemies.getChildren()) {
        if (!enemy.active || enemy.isDead) continue;
        if (Phaser.Geom.Rectangle.Overlaps(rect, enemy.getHurtbox())) {
          const landed = enemy.takeHit({
            damage: 20, freeze: 10,
            knockback: { x: 300, y: -240 }, knockdown: true,
          }, proj.x - (proj.body.velocity.x > 0 ? 10 : -10), time);
          if (landed) {
            this.spawnHitSpark(proj.x, proj.y, true);
            Sfx.play('special');
            this.cameras.main.shake(80, 0.003);
            proj.destroy();
            break;
          }
        }
      }
    }
  }

  spawnProjectile(x, y, vx, vy, spec, owner) {
    const proj = this.physics.add.sprite(x, y, spec.tex)
      .setDepth(DEPTH.FX).setScale(1.6);
    proj.setFlipX(vx < 0);
    proj.spec = spec;
    proj.owner = owner;
    proj.diesAt = this.time.now + (spec.lifetime || 4000);
    proj.setVelocity(vx, vy);
    // Arcade body gravity stacks on world gravity — offset to hit spec.gravity.
    if (spec.gravity > 0) proj.body.setGravityY(spec.gravity - 2200);
    else proj.body.setAllowGravity(false);
    this.projectiles.add(proj);
    return proj;
  }

  updateProjectiles(time) {
    const p = this.player;
    for (const proj of this.projectiles.getChildren()) {
      if (!proj.active) continue;
      const spec = proj.spec;
      if (spec.spin) proj.rotation += 0.28;

      const grounded = proj.y >= GROUND_Y - 4 && proj.body.velocity.y >= 0;
      if (time >= proj.diesAt || (spec.groundDies && grounded)
          || proj.x < -60 || proj.x > this.zone.width + 60) {
        this.spawnDust(proj.x, Math.min(proj.y, GROUND_Y));
        proj.destroy();
        continue;
      }

      const w = spec.w * 1.6;
      const h = spec.h * 1.6;
      const rect = new Phaser.Geom.Rectangle(proj.x - w / 2, proj.y - h / 2, w, h);
      if (!p.isDead && Phaser.Geom.Rectangle.Overlaps(rect, p.getHurtbox())) {
        const landed = p.takeHit({
          damage: spec.damage,
          knockback: spec.knockback,
          knockdown: spec.knockdown || false,
          stun: spec.stun,
          crouchDodgeable: false,
        }, proj.owner?.x ?? proj.x - Math.sign(proj.body.velocity.x || 1), time);
        if (landed) {
          this.spawnHitSpark(proj.x, proj.y, spec.damage >= 10);
          Sfx.play('hurt');
          proj.destroy();
        }
      }
    }
  }

  collectItem(item) {
    const p = this.player;
    const def = ITEM_TYPES[item.itemType];
    switch (item.itemType) {
      case 'bun':
        p.heal(25);
        break;
      case 'hongbao':
        this.addScore(500);
        break;
      case 'drink':
        p.gainSP(1);
        break;
      case 'coin':
        this.addScore(100);
        break;
      case 'claypot':
        p.heal(p.maxHp - p.hp);
        break;
      default:
        break;
    }
    this.popText(item.x, item.y - 24, def.label, '#9bffb0', 13);
    Sfx.play('pickup');
    item.destroy();
  }

  /* ---------------- player death / zone flow ---------------- */

  onPlayerDeath() {
    this.lives -= 1;
    this.game.events.emit('hud:lives', { lives: this.lives });
    this.combat.resetCombo();

    if (this.lives > 0) {
      this.time.delayedCall(1600, () => {
        if (!this.scene.isActive()) return;
        this.player.respawn(this.cameras.main.scrollX + 120, this.time.now);
        this.game.events.emit('hud:sp', { sp: this.player.sp });
      });
    } else {
      this.time.delayedCall(1800, () => this.gameOver(false));
    }
  }

  completeZone() {
    if (this.ending) return;
    this.ending = true;

    if (this.zoneIndex >= ZONES.length - 1) {
      this.gameOver(true);
      return;
    }

    const next = this.zoneIndex + 1;
    this.popText(this.cameras.main.scrollX + GAME_W / 2, 220, '前進! NEXT STAGE', '#6dff6d', 26);
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('HUD');
      // Educational inter-scene screen for the stage just cleared, then on
      // to the next stage's intro.
      this.scene.start('Story', {
        zoneIndex: this.zoneIndex,
        next: {
          scene: 'StageIntro',
          data: { zoneIndex: next, score: this.score, lives: this.lives, continues: this.continues },
        },
      });
    });
  }

  gameOver(win) {
    this.ending = true;
    midiPlayer.stop();
    this.scene.stop('HUD');
    const data = {
      win,
      score: this.score,
      zoneIndex: this.zoneIndex,
      bestCombo: this.combat.bestCombo,
    };
    if (win) {
      // Final stage cleared — show the PolyU story screen before the results.
      this.scene.start('Story', {
        zoneIndex: this.zoneIndex,
        next: { scene: 'GameOver', data },
      });
    } else {
      this.scene.start('GameOver', data);
    }
  }

  saveCheckpoint() {
    try {
      localStorage.setItem(STORAGE.CHECKPOINT, JSON.stringify({
        zoneIndex: this.zoneIndex,
        score: this.score,
        continues: this.continues,
      }));
    } catch { /* storage unavailable — checkpoints just won't persist */ }
  }

  /* ---------------- update loop ---------------- */

  update(time, delta) {
    const p = this.player;

    p.update(time, delta);
    for (const e of this.enemies.getChildren()) {
      if (e.active) e.update(time, delta);
    }

    this.combat.update(time);
    this.spawner.update();
    this.cameraSystem.update();

    // Clamp player to the walkable region (camera edge / arena lock / zone end).
    const bounds = this.cameraSystem.playerBounds();
    p.x = Phaser.Math.Clamp(p.x, bounds.left, bounds.right);

    // Keep enemies inside the zone.
    for (const e of this.enemies.getChildren()) {
      if (e.active) e.x = Phaser.Math.Clamp(e.x, 14, this.zone.width - 14);
    }

    this.updateParallax();
    this.updateItems();
    this.updateWeaponPickups();
    this.updateProjectiles(time);
    this.updatePlayerProjectiles(time);
    this.drawShadows();
    this.drawBarriers(time);
    this.checkZoneExit();
  }

  updateWeaponPickups() {
    const p = this.player;
    for (const wpn of this.weapons.getChildren()) {
      if (!wpn.active) continue;
      if (wpn.y >= GROUND_Y) {
        wpn.y = GROUND_Y;
        if (wpn.body.velocity.y > 0) wpn.setVelocity(0, 0);
      }
      // One weapon at a time: walk over a drop while holding and it stays.
      if (!p.isDead && !p.heldWeapon
          && Math.abs(wpn.x - p.x) < 42
          && Math.abs(wpn.y - (p.y - 40)) < 70) {
        this.pickupWeapon(wpn);
      }
    }
  }

  updateParallax() {
    const sx = this.cameras.main.scrollX;
    this.bgFar.tilePositionX = sx * 0.12;
    this.bgMid.tilePositionX = sx * 0.45;
    this.bgNear.tilePositionX = sx * 1.0;
    this.bgGround.tilePositionX = sx;
  }

  updateItems() {
    const p = this.player;
    for (const item of this.items.getChildren()) {
      if (!item.active) continue;
      if (item.y >= GROUND_Y) {
        item.y = GROUND_Y;
        if (item.body.velocity.y > 0) {
          item.setVelocityY(item.body.velocity.y * -0.4);
          item.setVelocityX(item.body.velocity.x * 0.6);
          if (Math.abs(item.body.velocity.y) < 60) item.setVelocity(0, 0);
        }
      }
      if (!p.isDead
          && Math.abs(item.x - p.x) < 42
          && Math.abs(item.y - (p.y - 40)) < 70) {
        this.collectItem(item);
      }
    }
  }

  drawShadows() {
    const g = this.shadowGfx;
    g.clear();
    g.fillStyle(0x000000, 0.32);
    const drawFor = (ent, baseW) => {
      if (!ent.active || ent.isDead && ent.alpha < 0.5) return;
      const height = Math.max(0, GROUND_Y - ent.y);
      const shrink = Phaser.Math.Clamp(1 - height / 480, 0.4, 1);
      g.fillEllipse(ent.x, GROUND_Y + 6, baseW * shrink, 10 * shrink);
    };
    drawFor(this.player, 52);
    for (const e of this.enemies.getChildren()) drawFor(e, 52 * (e.charScale || 1.5) / 1.5);
  }

  drawBarriers(time) {
    const g = this.barrierGfx;
    g.clear();
    const lock = this.cameraSystem.lock;
    if (!lock) return;
    const pulse = 0.18 + 0.1 * Math.sin(time / 120);
    g.fillStyle(0xff3d5e, pulse);
    g.fillRect(lock.left, 80, 10, GAME_H - 80);
    g.fillRect(lock.right - 10, 80, 10, GAME_H - 80);
  }

  checkZoneExit() {
    if (this.ending) return;
    if (this.zone.waves[this.zone.waves.length - 1].boss) return; // boss zones end via K.O.
    if (this.spawner.allCleared && this.player.x > this.zone.width - 160) {
      this.completeZone();
    }
  }
}
