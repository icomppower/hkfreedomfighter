// Base enemy class. State machine:
//   patrol -> detect -> engage -> attack -> recover -> engage ...
//   plus reaction states: hurt, fall (airborne knockdown), down, getup, flee, dead
//
// Subclasses implement think(time, dt) — called while in 'engage' — and may
// override pickAttack / onGrabConnect. Attack execution and damage handling
// are shared here and data-driven from data/enemies.js.

import { GROUND_Y, FRAME_MS } from '../constants.js';
import { ENEMIES } from '../data/enemies.js';
import { Sfx } from '../systems/Sfx.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    const cfg = ENEMIES[type];
    super(scene, x, y, `${type}_idle`, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.type = type;
    this.cfg = cfg;
    this.charScale = cfg.scale;

    this.setOrigin(0.5, 1);
    this.setScale(cfg.scale);
    this.setDepth(6);
    this.body.setSize(22, 52);
    this.body.setOffset(13, 12);

    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.state = 'patrol';
    this.facing = -1;
    this.onGround = true;
    this.isDead = false;

    this.currentMove = null;
    this.moveT = 0;
    this.hitRegistry = new Set();
    this.cooldowns = {};

    this.freezeUntil = 0;
    this.hurtUntil = 0;
    this.downUntil = 0;
    this.recoverUntil = 0;
    this.fleeUntil = 0;
    this.invulnUntil = 0;
    this.detectUntil = 0;

    this.juggleCount = 0;
    this.comboHitsTaken = 0;
    this.lastHitAt = 0;

    this.alertMark = null;
    this.play(`${type}-idle`);
  }

  get player() {
    return this.scene.player;
  }

  distToPlayer() {
    return Math.abs(this.player.x - this.x);
  }

  facePlayer() {
    this.facing = this.player.x >= this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  /* ---------------- update ---------------- */

  update(time, delta) {
    if (this.isDead) {
      this.groundCheck(time);
      return;
    }
    if (time < this.freezeUntil) return;

    this.groundCheck(time);

    // combo-hit tracking decays when left alone
    if (this.comboHitsTaken > 0 && time - this.lastHitAt > 1200) {
      this.comboHitsTaken = 0;
    }

    switch (this.state) {
      case 'patrol':
        this.setVelocityX(0);
        this.playSafe('idle');
        if (this.distToPlayer() < this.cfg.detect) {
          this.state = 'detect';
          this.detectUntil = time + 420;
          this.showAlert();
        }
        break;
      case 'detect':
        this.setVelocityX(0);
        this.facePlayer();
        if (time >= this.detectUntil) this.state = 'engage';
        break;
      case 'engage':
        if (this.player.isDead) {
          this.setVelocityX(0);
          this.playSafe('idle');
          break;
        }
        this.think(time, delta);
        break;
      case 'attack':
        this.progressAttack(time, delta);
        break;
      case 'recover':
        this.setVelocityX(0);
        if (time >= this.recoverUntil) this.state = 'engage';
        break;
      case 'hurt':
        if (time >= this.hurtUntil) this.state = 'engage';
        break;
      case 'fall':
        break; // resolved by land()
      case 'down':
        if (time >= this.downUntil) {
          this.state = 'getup';
          this.invulnUntil = time + 700;
          this.play(`${this.type}-getup`, true);
          this.once(`animationcomplete-${this.type}-getup`, () => {
            if (this.state === 'getup') this.state = 'engage';
          });
        }
        break;
      case 'getup':
        break;
      case 'flee':
        if (time >= this.fleeUntil) {
          this.setVelocityX(0);
          this.state = 'engage';
        }
        break;
      case 'hold':
        this.progressHold(time);
        break;
      default:
        break;
    }
  }

  // Default engage behavior: run at the player, attack in range.
  think(time) {
    this.facePlayer();
    const dist = this.distToPlayer();
    if (dist <= this.cfg.attackRange) {
      this.setVelocityX(0);
      const key = this.pickAttack(time, dist);
      if (key) this.startMove(key, time);
      else this.playSafe('idle');
    } else {
      const speed = dist > 180 ? this.cfg.runSpeed : this.cfg.speed;
      this.setVelocityX(this.facing * speed);
      this.playSafe(dist > 180 ? 'run' : 'walk');
    }
  }

  pickAttack(time) {
    const ready = Object.entries(this.cfg.moves)
      .filter(([k, m]) => (this.cooldowns[k] || 0) <= time && !m.activeUntilLand);
    if (!ready.length) return null;
    return Phaser.Utils.Array.GetRandom(ready)[0];
  }

  playSafe(anim) {
    const key = `${this.type}-${anim}`;
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
  }

  groundCheck(time) {
    const grounded = this.y >= GROUND_Y - 0.5 && this.body.velocity.y >= 0;
    if (grounded) {
      this.y = GROUND_Y;
      if (this.body.velocity.y > 0) this.setVelocityY(0);
      if (!this.onGround) this.land(time);
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  land(time) {
    this.scene.spawnDust(this.x, GROUND_Y);
    if (this.isDead) {
      this.setVelocityX(0);
      this.play(`${this.type}-down`, true);
      return;
    }
    if (this.state === 'fall') {
      this.setVelocityX(0);
      this.juggleCount = 0;
      this.state = 'down';
      this.downUntil = (time ?? this.scene.time.now) + 750;
      this.play(`${this.type}-down`, true);
      return;
    }
    if (this.state === 'attack' && this.currentMove?.activeUntilLand) {
      this.currentMove.activeUntilLand = false;
      this.moveT = (this.currentMove.startup + this.currentMove.active) * FRAME_MS;
      this.setVelocityX(0);
    }
  }

  // Wave spawns skip the patrol/proximity gate: flash the alert and close in.
  alertAndEngage(time) {
    if (this.isDead) return;
    this.state = 'detect';
    this.detectUntil = time + 400;
    this.showAlert();
  }

  showAlert() {
    const t = this.scene.add.text(this.x, this.y - 105, '!', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffe14d', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(8);
    this.scene.tweens.add({
      targets: t, y: t.y - 18, alpha: 0, duration: 500,
      onComplete: () => t.destroy(),
    });
  }

  /* ---------------- attacks ---------------- */

  startMove(key, time) {
    const def = this.cfg.moves[key];
    if (!def) return;
    this.cooldowns[key] = time + def.cooldown + Phaser.Math.Between(0, 400);
    this.state = 'attack';
    this.currentMove = { ...def, key };
    this.moveT = 0;
    this.hitRegistry = new Set();
    this.facePlayer();
    if (!def.keepMomentum && this.onGround) this.setVelocityX(0);
    if (def.lunge) this.lungePending = true;
    this.play(`${this.type}-${def.anim}`, true);
  }

  progressAttack(time, delta) {
    const mv = this.currentMove;
    if (!mv) {
      this.state = 'engage';
      return;
    }
    this.moveT += delta;

    const startupMs = mv.startup * FRAME_MS;
    const activeEndMs = (mv.startup + mv.active) * FRAME_MS;
    const totalMs = (mv.startup + mv.active + mv.recovery) * FRAME_MS;

    if (mv.lunge && this.moveT >= startupMs * 0.5 && this.moveT < activeEndMs) {
      this.setVelocityX(this.facing * mv.lunge);
    } else if (mv.lunge && this.moveT >= activeEndMs) {
      this.setVelocityX(0);
    }
    if (mv.dash) {
      if (this.moveT >= startupMs && this.moveT < activeEndMs) {
        this.setVelocityX(this.facing * mv.dash);
      } else if (this.moveT >= activeEndMs) {
        this.setVelocityX(0);
      }
    }

    if (mv.activeUntilLand) return;

    if (this.moveT >= totalMs) {
      this.currentMove = null;
      this.state = 'recover';
      this.recoverUntil = time + 250 + Phaser.Math.Between(0, 250);
      this.playSafe('idle');
    }
  }

  getActiveHitbox() {
    if (this.state !== 'attack' || !this.currentMove || this.isDead) return null;
    const mv = this.currentMove;
    const startupMs = mv.startup * FRAME_MS;
    if (mv.activeUntilLand) {
      if (this.moveT < startupMs || this.onGround) return null;
    } else {
      const activeEndMs = (mv.startup + mv.active) * FRAME_MS;
      if (this.moveT < startupMs || this.moveT > activeEndMs) return null;
    }
    const s = this.charScale;
    const hb = mv.hitbox;
    const cx = this.x + this.facing * hb.fx * s;
    const cy = this.y - hb.fy * s;
    return new Phaser.Geom.Rectangle(
      cx - (hb.w * s) / 2, cy - (hb.h * s) / 2, hb.w * s, hb.h * s,
    );
  }

  getHurtbox() {
    const s = this.charScale;
    if (this.state === 'fall' || (!this.onGround && this.state !== 'attack')) {
      return new Phaser.Geom.Rectangle(this.x - 15 * s, this.y - 42 * s, 30 * s, 40 * s);
    }
    return new Phaser.Geom.Rectangle(this.x - 13 * s, this.y - 54 * s, 26 * s, 54 * s);
  }

  /* ---------------- grabs (Enforcer / Boss slam) ---------------- */

  onGrabConnect(player, time) {
    const mv = this.currentMove;
    if (!mv) return;
    this.state = 'hold';
    this.holdUntil = time + 650;
    this.holdMove = mv;
    this.currentMove = null;
    this.setVelocityX(0);
    player.getGrabbed(this, 650, time);
  }

  progressHold(time) {
    if (time >= this.holdUntil) {
      this.player.thrownBy(this, this.holdMove, time);
      this.scene.cameras.main.shake(110, 0.005);
      Sfx.play('hit');
      this.state = 'recover';
      this.recoverUntil = time + 600;
    }
  }

  /* ---------------- damage ---------------- */

  takeHit(mv, fromX, time) {
    if (this.isDead || time < this.invulnUntil) return false;
    if (this.state === 'down' || this.state === 'getup') return false;

    // Combo breaker: low-HP enemies can escape long strings.
    if (this.hp < this.maxHp * 0.2 && this.comboHitsTaken >= 4 && Math.random() < 0.45) {
      this.breakCombo(fromX, time);
      return false;
    }

    const dir = this.x >= fromX ? 1 : -1;
    const airborne = !this.onGround;

    // Juggle damage scaling after 3 air hits.
    if (airborne) this.juggleCount += 1;
    else this.juggleCount = 0;
    const scale = this.juggleCount > 3 ? 0.4 : 1;

    this.hp -= mv.damage * scale;
    this.comboHitsTaken += 1;
    this.lastHitAt = time;

    if (this.cfg.boss) {
      this.scene.game.events.emit('hud:bossbar', {
        hp: Math.max(0, this.hp), max: this.maxHp,
        name: `${this.cfg.name} ${this.cfg.title}`,
      });
    }

    if (this.hp <= 0) {
      this.die(dir, mv);
      return true;
    }

    this.currentMove = null;

    if (mv.launcher || mv.knockdown || airborne) {
      this.state = 'fall';
      const kbx = dir * Math.abs(mv.knockback.x);
      let kby = mv.knockback.y;
      if (airborne && kby >= 0) kby = -320; // keep juggles afloat
      this.setVelocity(kbx, kby || -360);
      this.onGround = false;
      this.play(`${this.type}-fall`, true);
    } else {
      this.state = 'hurt';
      // Stun weapons (bottle) pin the victim far longer than normal hitstun.
      this.hurtUntil = time + (mv.stun || (mv.hitstun || 16) * FRAME_MS);
      if (mv.stun) this.scene.popText(this.x, this.y - 100, '暈!', '#ffe14d', 14);
      this.setVelocityX(dir * Math.abs(mv.knockback.x) * 0.5);
      this.play(`${this.type}-hurt`, true);
    }
    this.onTookHit?.(time);
    return true;
  }

  breakCombo(fromX, time) {
    const dir = this.x >= fromX ? 1 : -1;
    this.state = 'flee';
    this.fleeUntil = time + 420;
    this.invulnUntil = time + 700;
    this.setVelocity(dir * 360, -260);
    this.onGround = false;
    this.scene.popText(this.x, this.y - 100, 'BREAK!', '#ff8a65', 16);
    Sfx.play('break');
  }

  die(dir, mv) {
    this.isDead = true;
    this.state = 'dead';
    this.currentMove = null;
    this.setVelocity(dir * (mv ? Math.abs(mv.knockback.x) : 200) + dir * 120, -380);
    this.onGround = false;
    this.play(`${this.type}-fall`, true);
    if (this.cfg.boss) {
      this.scene.game.events.emit('hud:bossbar', null);
      this.scene.cameras.main.shake(400, 0.008);
      Sfx.play('ko');
    }
    this.scene.events.emit('enemy:died', this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }

  // Instant removal (e.g. minions when the boss falls).
  forceKill() {
    if (this.isDead) return;
    this.hp = 0;
    this.die(this.facing * -1, null);
  }

  applyFreeze(ms) {
    this.freezeUntil = this.scene.time.now + ms;
    this.anims.pause();
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    this.body.moves = false;
    this.scene.time.delayedCall(ms, () => {
      if (!this.active) return;
      this.body.moves = true;
      this.body.setVelocity(vx, vy);
      this.anims.resume();
    });
  }
}
