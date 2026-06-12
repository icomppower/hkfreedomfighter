// 龍仔 (Dragon) — the player character.
//
// States: idle | walk | run | jump | crouch | attack | hurt | fall | down |
//         getup | grabbed | dead
// Attack timing is data-driven from data/moves.js (frames at 60fps); chains,
// specials (Z+X / Down+Z+X), double jump, double-tap run, juggle-friendly
// launchers and crouch dodges are all handled here.

import { GROUND_Y, FRAME_MS, CHAR_SCALE } from '../constants.js';
import { PLAYER_MOVES } from '../data/moves.js';
import { WEAPONS, weaponMove } from '../data/weapons.js';
import { TouchState, TouchPresses } from '../ui/touch.js';
import { Sfx } from '../systems/Sfx.js';

const WALK_SPEED = 175;
const RUN_SPEED = 300;
const JUMP_VEL = -820;
const DOUBLE_JUMP_VEL = -740;
const SIMUL_WINDOW = 100; // ms window for Z+X simultaneous press
const TAP_WINDOW = 280;   // ms window for double-tap run

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, opts = {}) {
    super(scene, x, GROUND_Y, 'keung_idle', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setScale(CHAR_SCALE);
    this.setDepth(7);
    this.body.setSize(22, 52);
    this.body.setOffset(13, 12);
    this.body.setAllowGravity(true);

    this.maxHp = 100;
    this.hp = opts.hp ?? 100;
    this.sp = opts.sp ?? 0;
    this.maxSp = 3;

    this.state = 'idle';
    this.facing = 1;
    this.onGround = true;
    this.jumps = 0;
    this.isDead = false;

    this.currentMove = null;
    this.moveT = 0;
    this.bufferedChain = null;
    this.hitRegistry = new Set();
    this.lastRehit = 0;

    this.invulnUntil = 0;
    this.freezeUntil = 0;
    this.hurtUntil = 0;
    this.downUntil = 0;
    this.grabbedUntil = 0;
    this.grabber = null;

    this.lastZ = -9999;
    this.lastX = -9999;
    this.lastTapLeft = -9999;
    this.lastTapRight = -9999;
    this.running = false;

    this.heldWeapon = null;
    this.weaponHitLanded = false;
    this.weaponHitCount = 0;
    this.weaponIcon = scene.add.image(x, GROUND_Y - 100, 'wpn_bottle')
      .setDepth(8).setScale(1.2).setVisible(false);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D,
      z: K.Z, x: K.X, j: K.J, k: K.K, space: K.SPACE, f: K.F, l: K.L,
    });

    this.kiBlastCooldownUntil = 0;
    this.zxBothHeldSince = 0;
    this.blocking = false;

    // Press events are buffered rather than polled with JustDown: Phaser's
    // Key.onUp clears the pending justDown flag, so a tap whose keyup lands
    // in the same frame as the keydown would be eaten entirely.
    this.pressed = { z: false, x: false, jump: false, leftTap: false, rightTap: false, f: false };
    this.frameInput = { z: false, x: false, jump: false, leftTap: false, rightTap: false, f: false };
    const press = (flag) => (event) => {
      if (!event.repeat) this.pressed[flag] = true;
    };
    this.keyHandlers = {
      'keydown-Z': press('z'),
      'keydown-J': press('z'),
      'keydown-X': press('x'),
      'keydown-K': press('x'),
      'keydown-UP': press('jump'),
      'keydown-W': press('jump'),
      'keydown-SPACE': press('jump'),
      'keydown-LEFT': press('leftTap'),
      'keydown-A': press('leftTap'),
      'keydown-RIGHT': press('rightTap'),
      'keydown-D': press('rightTap'),
      'keydown-F': press('f'),
    };
    for (const [ev, fn] of Object.entries(this.keyHandlers)) {
      scene.input.keyboard.on(ev, fn);
    }

    scene.input.mouse?.disableContextMenu();
    this.pointerHandler = (pointer) => {
      if (pointer.rightButtonDown()) {
        this.pressed.x = true;
      } else {
        this.pressed.z = true;
      }
    };
    scene.input.on('pointerdown', this.pointerHandler);

    scene.events.once('shutdown', () => {
      for (const [ev, fn] of Object.entries(this.keyHandlers)) {
        scene.input.keyboard?.off(ev, fn);
      }
      scene.input.off('pointerdown', this.pointerHandler);
    });

    this.play('keung-idle');
  }

  // Latch buffered presses for this frame and clear the buffer.
  // Touch button presses (MobileControls) merge in alongside key presses.
  consumeInput() {
    this.frameInput = {
      z: this.pressed.z || TouchPresses.z,
      x: this.pressed.x || TouchPresses.x,
      jump: this.pressed.jump || TouchPresses.jump,
      leftTap: this.pressed.leftTap,
      rightTap: this.pressed.rightTap,
      f: this.pressed.f,
    };
    this.pressed.z = false;
    this.pressed.x = false;
    this.pressed.jump = false;
    this.pressed.leftTap = false;
    this.pressed.rightTap = false;
    this.pressed.f = false;
    TouchPresses.z = false;
    TouchPresses.x = false;
    TouchPresses.jump = false;
  }

  /* ---------------- input helpers ---------------- */

  leftHeld() { return this.keys.left.isDown || this.keys.a.isDown || TouchState.left; }
  rightHeld() { return this.keys.right.isDown || this.keys.d.isDown || TouchState.right; }
  upHeld() { return this.keys.up.isDown || this.keys.w.isDown || TouchState.up; }
  downHeld() { return this.keys.down.isDown || this.keys.s.isDown || TouchState.down; }
  blockHeld() { return this.keys.l.isDown || TouchState.block; }

  /* ---------------- main update ---------------- */

  update(time, delta) {
    // Held weapon indicator floats above the character.
    this.weaponIcon.setVisible(!!this.heldWeapon && !this.isDead);
    if (this.heldWeapon) {
      this.weaponIcon.setPosition(this.x, this.y - 108 - Math.sin(time / 240) * 4);
    }

    if (this.isDead) {
      this.groundCheck();
      return;
    }

    // invulnerability blink
    if (time < this.invulnUntil) {
      this.setAlpha(Math.floor(time / 80) % 2 ? 0.4 : 0.9);
    } else if (this.alpha !== 1) {
      this.setAlpha(1);
    }

    if (time < this.freezeUntil) return; // hitstop

    this.consumeInput();
    this.groundCheck();
    this.pollTapRun(time);

    // Block state — transitions in from any non-locked state when L is held on ground.
    const canBlock = this.onGround
      && !['hurt', 'fall', 'down', 'getup', 'grabbed'].includes(this.state);
    if (this.blockHeld() && canBlock) {
      if (!this.blocking) {
        this.blocking = true;
        this.setTint(0x4dd9ff);
        if (this.state === 'attack') this.setState_('idle');
        this.state = 'block';
      }
    } else if (this.blocking) {
      this.blocking = false;
      this.clearTint();
      if (this.state === 'block') this.setState_('idle');
    }

    switch (this.state) {
      case 'hurt':
        if (time >= this.hurtUntil) this.setState_('idle');
        break;
      case 'fall':
        // airborne knockdown — resolved by land()
        break;
      case 'down':
        if (time >= this.downUntil) {
          this.setState_('getup');
          this.play('keung-getup');
          this.invulnUntil = time + 900;
          this.once('animationcomplete-keung-getup', () => {
            if (this.state === 'getup') this.setState_('idle');
          });
        }
        break;
      case 'getup':
        break;
      case 'grabbed':
        if (this.grabber && this.grabber.active) {
          this.x = this.grabber.x + this.grabber.facing * 30;
          this.setVelocity(0, 0);
        }
        if (time >= this.grabbedUntil) this.setState_('idle');
        break;
      case 'attack':
        this.handleAttackInput(time);
        this.progressAttack(time, delta);
        break;
      case 'block':
        this.handleBlockMovement();
        break;
      default:
        this.handleMovement(time);
        this.handleAttackInput(time);
        break;
    }
  }

  setState_(s) {
    this.state = s;
    if (s === 'idle') {
      this.currentMove = null;
      this.restoreBody();
    }
  }

  groundCheck() {
    const grounded = this.y >= GROUND_Y - 0.5 && this.body.velocity.y >= 0;
    if (grounded) {
      this.y = GROUND_Y;
      if (this.body.velocity.y > 0) this.setVelocityY(0);
      if (!this.onGround) this.land();
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  land() {
    const time = this.scene.time.now;
    this.jumps = 0;
    this.scene.spawnDust(this.x, GROUND_Y);
    Sfx.play('land');

    if (this.isDead) {
      this.setVelocityX(0);
      this.play('keung-down');
      return;
    }
    if (this.state === 'fall') {
      this.setVelocityX(0);
      this.setState_('down');
      this.play('keung-down');
      this.downUntil = time + 650;
      return;
    }
    if (this.state === 'attack' && this.currentMove?.activeUntilLand) {
      // dive kick recovery starts on touchdown
      this.currentMove.activeUntilLand = false;
      this.moveT = (this.currentMove.startup + this.currentMove.active) * FRAME_MS;
      this.setVelocityX(0);
    }
  }

  /* ---------------- movement ---------------- */

  pollTapRun(time) {
    const leftTap = this.frameInput.leftTap;
    const rightTap = this.frameInput.rightTap;
    if (leftTap) {
      if (time - this.lastTapLeft < TAP_WINDOW) this.running = true;
      this.lastTapLeft = time;
    }
    if (rightTap) {
      if (time - this.lastTapRight < TAP_WINDOW) this.running = true;
      this.lastTapRight = time;
    }
    if (!this.leftHeld() && !this.rightHeld()) this.running = false;
  }

  handleMovement(time) {
    const jumpPressed = this.frameInput.jump;

    // crouch
    if (this.downHeld() && this.onGround) {
      this.setVelocityX(0);
      if (this.state !== 'crouch') {
        this.state = 'crouch';
        this.play('keung-crouch', true);
        this.body.setSize(22, 36);
        this.body.setOffset(13, 28);
      }
      return;
    }
    if (this.state === 'crouch') this.restoreBody();

    const dir = (this.rightHeld() ? 1 : 0) - (this.leftHeld() ? 1 : 0);
    if (dir !== 0) {
      this.facing = dir;
      this.setFlipX(dir < 0);
      const speed = this.running ? RUN_SPEED : WALK_SPEED;
      this.setVelocityX(dir * speed);
      if (this.onGround) {
        this.state = this.running ? 'run' : 'walk';
        this.play(this.running ? 'keung-run' : 'keung-walk', true);
      }
    } else {
      this.setVelocityX(0);
      if (this.onGround) {
        this.state = 'idle';
        this.play('keung-idle', true);
      }
    }

    if (jumpPressed) {
      if (this.onGround) {
        this.setVelocityY(JUMP_VEL);
        this.jumps = 1;
        this.onGround = false;
        Sfx.play('jump');
        this.play('keung-jump', true);
      } else if (this.jumps < 2) {
        this.setVelocityY(DOUBLE_JUMP_VEL);
        this.jumps = 2;
        Sfx.play('jump');
        this.play('keung-jump', true);
        this.scene.spawnDust(this.x, this.y);
      }
    }

    if (!this.onGround) {
      this.state = 'jump';
      if (this.anims.currentAnim?.key !== 'keung-jump') this.play('keung-jump', true);
    }
  }

  restoreBody() {
    this.body.setSize(22, 52);
    this.body.setOffset(13, 12);
  }

  handleBlockMovement() {
    const dir = (this.rightHeld() ? 1 : 0) - (this.leftHeld() ? 1 : 0);
    if (dir !== 0) {
      this.facing = dir;
      this.setFlipX(dir < 0);
      this.setVelocityX(dir * WALK_SPEED * 0.5);
      this.play('keung-walk', true);
    } else {
      this.setVelocityX(0);
      this.play('keung-idle', true);
    }
  }

  onBlock(fromX, time) {
    const dir = this.x >= fromX ? 1 : -1;
    this.setVelocityX(dir * 90);
    this.invulnUntil = Math.max(this.invulnUntil, time + 180);
    this.scene.popText(this.x, this.y - 90, '格!', '#4dd9ff', 22);
    Sfx.play('block');
    this.scene.cameras.main.shake(35, 0.0018);
    this.setAlpha(0.25);
    this.scene.time.delayedCall(75, () => { if (this.active) this.setAlpha(1); });
  }

  /* ---------------- attacks ---------------- */

  handleAttackInput(time) {
    const zNow = this.frameInput.z;
    const xNow = this.frameInput.x;
    if (zNow) this.lastZ = time;
    if (xNow) this.lastX = time;

    // --- ki blast: F key (instant) or hold Z+X 600ms then release ---
    if (this.frameInput.f) {
      this.fireKiBlast(time);
    }
    const zxHeld = (this.keys.z.isDown || this.keys.j.isDown)
      && (this.keys.x.isDown || this.keys.k.isDown);
    if (zxHeld) {
      if (!this.zxBothHeldSince) this.zxBothHeldSince = time;
    } else {
      if (this.zxBothHeldSince && time - this.zxBothHeldSince >= 600) {
        this.fireKiBlast(time);
      }
      this.zxBothHeldSince = 0;
    }

    // --- specials: Z+X (Dragon Fist) / Down+Z+X (Hurricane) ---
    const both = (zNow && time - this.lastX <= SIMUL_WINDOW)
      || (xNow && time - this.lastZ <= SIMUL_WINDOW);
    if (both) {
      const inCancelWindow = this.state !== 'attack'
        || (this.currentMove && this.moveT <= this.currentMove.startup * FRAME_MS + 30);
      if (inCancelWindow && this.onGround) {
        if (this.downHeld() && this.sp >= 2) return this.startMove('hurricane', time);
        if (!this.downHeld() && this.sp >= 1) return this.startMove('dragonFist', time);
      }
    }

    // --- chains while attacking ---
    if (this.state === 'attack') {
      const btn = zNow ? 'Z' : xNow ? 'X' : null;
      if (btn && this.currentMove?.chains?.[btn]) {
        this.bufferedChain = this.currentMove.chains[btn];
      }
      return;
    }

    if (!zNow && !xNow) return;

    // --- air attacks ---
    if (!this.onGround) {
      return this.startMove(zNow ? 'airpunch' : 'divekick', time);
    }
    // --- uppercut ---
    if (zNow && this.upHeld()) return this.startMove('uppercut', time);
    // --- weapon swing replaces the grounded punch while armed ---
    if (zNow && this.heldWeapon) return this.startMove('weaponSwing', time);
    // --- grounded normals ---
    return this.startMove(zNow ? 'punch1' : 'kick', time);
  }

  fireKiBlast(time) {
    if (this.isDead) return;
    if (time < this.kiBlastCooldownUntil) return;
    if (this.sp < 1) {
      this.scene.popText(this.x, this.y - 100, 'SP不足!', '#ff6b6b', 13);
      return;
    }
    this.sp -= 1;
    this.scene.game.events.emit('hud:sp', { sp: this.sp });
    this.kiBlastCooldownUntil = time + 500;
    this.scene.spawnKiBlast(this.x + this.facing * 32, this.y - 52, this.facing);
    this.scene.popText(this.x, this.y - 110, '氣功彈!', '#7df0ff', 15);
    Sfx.play('kiblast');
  }

  startMove(key, time) {
    const def = key === 'weaponSwing' ? weaponMove(this.heldWeapon) : PLAYER_MOVES[key];
    if (!def) return;
    if (def.weapon) {
      this.weaponHitLanded = false;
      this.weaponHitCount = 0;
    }
    if (def.cost) {
      if (this.sp < def.cost) return;
      this.sp -= def.cost;
      this.scene.game.events.emit('hud:sp', { sp: this.sp });
      Sfx.play('special');
      this.scene.popText(this.x, this.y - 110, def.label, '#7df0ff', 16);
      this.invulnUntil = Math.max(this.invulnUntil, time + def.startup * FRAME_MS + 60);
    }

    if (this.state === 'crouch') this.restoreBody();
    this.state = 'attack';
    this.currentMove = { ...def, key };
    this.moveT = 0;
    this.bufferedChain = null;
    this.hitRegistry = new Set();
    this.lastRehit = 0;

    if (this.onGround && !def.keepMomentum) this.setVelocityX(0);
    if (key === 'divekick') {
      this.setVelocity(this.facing * 300, 620);
    }
    if (def.aura) this.scene.spawnSpecialGlow(this);

    this.play(`keung-${def.anim}`, true);
  }

  progressAttack(time, delta) {
    const mv = this.currentMove;
    if (!mv) {
      this.setState_('idle');
      return;
    }
    this.moveT += delta;

    const startupMs = mv.startup * FRAME_MS;
    const activeEndMs = (mv.startup + mv.active) * FRAME_MS;
    const totalMs = (mv.startup + mv.active + mv.recovery) * FRAME_MS;

    if (mv.dash) {
      if (this.moveT >= startupMs && this.moveT < activeEndMs) {
        this.setVelocityX(this.facing * mv.dash);
      } else if (this.moveT >= activeEndMs) {
        this.setVelocityX(0);
      }
    }

    if (mv.rehit && this.moveT >= startupMs
        && this.moveT - this.lastRehit > mv.rehit * FRAME_MS) {
      this.hitRegistry.clear();
      this.lastRehit = this.moveT;
    }

    if (mv.activeUntilLand) return; // resolved in land()

    const chainAt = (mv.chainFrom ?? (mv.startup + mv.active)) * FRAME_MS;
    if (this.bufferedChain && this.moveT >= chainAt) {
      return this.startMove(this.bufferedChain, time);
    }

    if (this.moveT >= totalMs) {
      if (mv.weapon && this.weaponHitLanded) this.breakWeapon();
      this.setState_('idle');
      this.play('keung-idle', true);
    }
  }

  /* ---------------- weapons ---------------- */

  holdWeapon(type) {
    this.heldWeapon = type;
    this.weaponIcon.setTexture(WEAPONS[type].tex);
    this.scene.game.events.emit('hud:weapon', { type });
  }

  clearWeapon() {
    this.heldWeapon = null;
    this.scene.game.events.emit('hud:weapon', null);
  }

  breakWeapon() {
    const def = WEAPONS[this.heldWeapon];
    this.scene.popText(this.x, this.y - 110, `${def.zh} 爛咗!`, '#ff8a65', 13);
    Sfx.play('break');
    this.clearWeapon();
  }

  // 50% chance to lose the held weapon when hit — it clatters to the ground.
  maybeDropWeapon(dir) {
    if (!this.heldWeapon || Math.random() >= 0.5) return;
    const type = this.heldWeapon;
    this.clearWeapon();
    this.scene.spawnWeapon(this.x - dir * 30, type, this.y - 70);
  }

  getActiveHitbox() {
    if (this.state !== 'attack' || !this.currentMove) return null;
    const mv = this.currentMove;
    const startupMs = mv.startup * FRAME_MS;
    if (mv.activeUntilLand) {
      if (this.moveT < startupMs || this.onGround) return null;
    } else {
      const activeEndMs = (mv.startup + mv.active) * FRAME_MS;
      if (this.moveT < startupMs || this.moveT > activeEndMs) return null;
    }
    const s = CHAR_SCALE;
    const hb = mv.hitbox;
    const cx = this.x + this.facing * hb.fx * s;
    const cy = this.y - hb.fy * s;
    return new Phaser.Geom.Rectangle(
      cx - (hb.w * s) / 2, cy - (hb.h * s) / 2, hb.w * s, hb.h * s,
    );
  }

  getHurtbox() {
    const s = CHAR_SCALE;
    const h = this.state === 'crouch' ? 36 * s : 52 * s;
    return new Phaser.Geom.Rectangle(this.x - 12 * s, this.y - h, 24 * s, h);
  }

  /* ---------------- damage ---------------- */

  canBeGrabbed(time) {
    return !this.isDead
      && time >= this.invulnUntil
      && !['fall', 'down', 'getup', 'grabbed'].includes(this.state);
  }

  takeHit(mv, fromX, time) {
    if (this.isDead || time < this.invulnUntil) return false;
    if (['down', 'getup', 'grabbed'].includes(this.state)) return false;

    if (this.blocking) {
      this.onBlock(fromX, time);
      return false;
    }

    if (this.state === 'crouch' && mv.crouchDodgeable) {
      this.scene.popText(this.x, this.y - 100, 'DODGE!', '#9be8ff', 14);
      return false;
    }

    return this.applyDamage(mv, fromX, time);
  }

  // Used by grabs/throws — bypasses the dodge/invuln gate (the grab already connected).
  applyDamage(mv, fromX, time) {
    const dir = this.x >= fromX ? 1 : -1;

    this.hp = Math.max(0, this.hp - mv.damage);
    this.scene.game.events.emit('hud:hp', { hp: this.hp, max: this.maxHp });
    this.gainSP(0.15);
    this.scene.spawner?.notePlayerHit();
    this.scene.combat?.resetCombo();
    this.maybeDropWeapon(dir);

    this.bufferedChain = null;

    if (this.hp <= 0) {
      this.die(dir);
      return true;
    }

    if (mv.stun) {
      // Stunned (chili powder): rooted in the stagger pose, no mercy invuln
      // until the stun ends.
      this.state = 'hurt';
      this.currentMove = null;
      this.restoreBody();
      this.hurtUntil = time + mv.stun;
      this.invulnUntil = Math.max(this.invulnUntil, time + mv.stun + 500);
      this.setVelocityX(0);
      this.play('keung-hurt', true);
      this.scene.popText(this.x, this.y - 100, '辣眼!!', '#ff5d4d', 14);
      return true;
    }

    if (mv.knockdown || mv.launcher) {
      this.state = 'fall';
      this.currentMove = null;
      this.restoreBody();
      this.setVelocity(dir * Math.abs(mv.knockback.x), mv.knockback.y || -380);
      this.onGround = false;
      this.play('keung-fall', true);
      this.invulnUntil = time + 400;
    } else {
      this.state = 'hurt';
      this.currentMove = null;
      this.restoreBody();
      this.hurtUntil = time + 340;
      // Mercy invulnerability past the stagger so enemy gangs can't stun-lock.
      this.invulnUntil = Math.max(this.invulnUntil, time + 750);
      this.setVelocityX(dir * Math.abs(mv.knockback.x) * 0.6);
      this.play('keung-hurt', true);
    }
    return true;
  }

  getGrabbed(enemy, holdMs, time) {
    this.state = 'grabbed';
    this.currentMove = null;
    this.restoreBody();
    this.grabber = enemy;
    // Released slightly after the grabber's throw timing so the throw
    // always connects (the self-release is only a safety net).
    this.grabbedUntil = time + holdMs + 250;
    this.setVelocity(0, 0);
    this.play('keung-hurt', true);
  }

  thrownBy(enemy, mv, time) {
    this.grabber = null;
    if (this.state !== 'grabbed') return;
    this.state = 'idle'; // applyDamage will transition to fall
    this.applyDamage(mv, enemy.x, time);
  }

  gainSP(amount) {
    const before = this.sp;
    this.sp = Phaser.Math.Clamp(this.sp + amount, 0, this.maxSp);
    if (this.sp !== before) {
      this.scene.game.events.emit('hud:sp', { sp: this.sp });
    }
  }

  heal(amount) {
    this.hp = Phaser.Math.Clamp(this.hp + amount, 0, this.maxHp);
    this.scene.game.events.emit('hud:hp', { hp: this.hp, max: this.maxHp });
  }

  die(dir) {
    this.isDead = true;
    this.state = 'dead';
    this.currentMove = null;
    if (this.heldWeapon) this.clearWeapon();
    this.setVelocity(dir * 240, -420);
    this.onGround = false;
    this.play('keung-fall', true);
    Sfx.play('ko');
    this.scene.onPlayerDeath();
  }

  respawn(x, time) {
    this.isDead = false;
    this.hp = this.maxHp;
    this.x = x;
    this.y = GROUND_Y;
    this.setVelocity(0, 0);
    this.state = 'idle';
    this.invulnUntil = time + 2500;
    this.play('keung-idle', true);
    this.scene.game.events.emit('hud:hp', { hp: this.hp, max: this.maxHp });
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
