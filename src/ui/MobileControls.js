// Virtual touch controls, shown only on touch devices. Lives in the HUD
// scene (which renders above gameplay) and writes to the shared TouchState /
// TouchPresses consumed by Player.
//
// Layout: d-pad bottom-left, action buttons bottom-right:
//   跳 jump · 拳 punch (Z) · 腳 kick (X) · 殺 special (Z+X together)
// Hold ↓ on the d-pad with 殺 for the 2-bar special, exactly like Down+Z+X.

import { GAME_W, GAME_H } from '../constants.js';
import { TouchState, TouchPresses } from './touch.js';
import { Sfx } from '../systems/Sfx.js';
import { isTouchDevice } from './touch.js';

const PAD_CX = 110;
const PAD_CY = GAME_H - 100;
const DEAD = 14; // px of slop around the d-pad center

export default class MobileControls {
  constructor(scene) {
    this.scene = scene;
    this.padPointerId = null;

    this.buildDpad();
    this.buildButton(GAME_W - 200, GAME_H - 56, '跳', 0x4dd9ff, () => {
      TouchPresses.jump = true;
    });
    this.buildButton(GAME_W - 124, GAME_H - 96, '拳', 0xffe14d, () => {
      TouchPresses.z = true;
    });
    this.buildButton(GAME_W - 52, GAME_H - 140, '腳', 0xff8a65, () => {
      TouchPresses.x = true;
    });
    this.buildButton(GAME_W - 60, GAME_H - 52, '殺', 0xff3d7f, () => {
      // Both presses in the same frame reads as the simultaneous Z+X special.
      TouchPresses.z = true;
      TouchPresses.x = true;
    }, 30);
    this.buildHoldButton(GAME_W - 152, GAME_H - 140, '擋', 0x4dd9ff);

    scene.input.on('pointerdown', this.onPadDown, this);
    scene.input.on('pointermove', this.onPadMove, this);
    scene.input.on('pointerup', this.onPadUp, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onPadDown, this);
      scene.input.off('pointermove', this.onPadMove, this);
      scene.input.off('pointerup', this.onPadUp, this);
      this.releasePad();
    });
  }

  /* ---------------- d-pad ---------------- */

  buildDpad() {
    const g = this.scene.add.graphics().setDepth(50).setAlpha(0.55);
    g.fillStyle(0x10101c, 0.7);
    g.fillCircle(PAD_CX, PAD_CY, 84);
    g.lineStyle(2, 0x4a4a66, 1);
    g.strokeCircle(PAD_CX, PAD_CY, 84);
    // arrows
    g.fillStyle(0x9e9eb8, 1);
    const tri = (cx, cy, rot) => {
      const pts = [[0, -14], [12, 8], [-12, 8]].map(([x, y]) => {
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        return { x: cx + x * c - y * s, y: cy + x * s + y * c };
      });
      g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    };
    tri(PAD_CX, PAD_CY - 52, 0);
    tri(PAD_CX + 52, PAD_CY, Math.PI / 2);
    tri(PAD_CX, PAD_CY + 52, Math.PI);
    tri(PAD_CX - 52, PAD_CY, -Math.PI / 2);

    this.thumb = this.scene.add.circle(PAD_CX, PAD_CY, 26, 0x9e9eb8, 0.5)
      .setDepth(51).setVisible(false);
  }

  // The d-pad tracks any pointer that lands on its half of the screen, so
  // thumbs can slide between directions without lifting.
  onPadDown(pointer) {
    if (pointer.x > GAME_W * 0.45 || this.padPointerId !== null) return;
    Sfx.ensure();
    this.padPointerId = pointer.id;
    this.thumb.setVisible(true);
    this.applyPad(pointer);
  }

  onPadMove(pointer) {
    if (pointer.id !== this.padPointerId) return;
    this.applyPad(pointer);
  }

  onPadUp(pointer) {
    if (pointer.id !== this.padPointerId) return;
    this.padPointerId = null;
    this.releasePad();
  }

  applyPad(pointer) {
    const dx = pointer.x - PAD_CX;
    const dy = pointer.y - PAD_CY;
    const wasLeft = TouchState.left;
    const wasRight = TouchState.right;
    TouchState.left = dx < -DEAD;
    TouchState.right = dx > DEAD;
    TouchState.up = dy < -34;
    TouchState.down = dy > 34;
    // A fresh horizontal press feeds the double-tap-run detector.
    const player = this.scene.scene.get('Game')?.player;
    if (player) {
      if (TouchState.left && !wasLeft) player.pressed.leftTap = true;
      if (TouchState.right && !wasRight) player.pressed.rightTap = true;
    }
    const r = Math.min(56, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx);
    this.thumb.setPosition(PAD_CX + Math.cos(a) * r, PAD_CY + Math.sin(a) * r);
  }

  releasePad() {
    TouchState.left = false;
    TouchState.right = false;
    TouchState.up = false;
    TouchState.down = false;
    this.thumb?.setVisible(false).setPosition(PAD_CX, PAD_CY);
  }

  /* ---------------- action buttons ---------------- */

  // Hold-type button: sets a TouchState flag while finger is down.
  buildHoldButton(x, y, label, color, radius = 32) {
    const zone = this.scene.add.circle(x, y, radius + 8, color, 0.18)
      .setDepth(50).setStrokeStyle(2, color, 0.8)
      .setInteractive({ useHandCursor: false });
    this.scene.add.text(x, y, label, {
      fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
      fontSize: `${radius * 0.8}px`, color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51).setAlpha(0.85);

    zone.on('pointerdown', () => {
      Sfx.ensure();
      zone.setFillStyle(color, 0.45);
      TouchState.block = true;
    });
    const release = () => {
      zone.setFillStyle(color, 0.18);
      TouchState.block = false;
    };
    zone.on('pointerup', release);
    zone.on('pointerout', release);
  }

  buildButton(x, y, label, color, onPress, radius = 36) {
    const zone = this.scene.add.circle(x, y, radius + 8, color, 0.18)
      .setDepth(50).setStrokeStyle(2, color, 0.8)
      .setInteractive({ useHandCursor: false });
    this.scene.add.text(x, y, label, {
      fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
      fontSize: `${radius * 0.8}px`, color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51).setAlpha(0.85);

    zone.on('pointerdown', () => {
      Sfx.ensure();
      zone.setFillStyle(color, 0.45);
      onPress();
    });
    const release = () => zone.setFillStyle(color, 0.18);
    zone.on('pointerup', release);
    zone.on('pointerout', release);
  }
}
