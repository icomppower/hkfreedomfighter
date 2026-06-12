// Ink brush stage intro: black screen, a dry-brush stroke sweeps across,
// the Chinese stage name appears character by character, the English
// subtitle fades in, hold, then fade into the stage itself.

import { GAME_W, GAME_H } from '../constants.js';
import { ZONES } from '../data/levels.js';
import { Sfx } from '../systems/Sfx.js';

const CJK_FONT = '"PingFang HK", "Hiragino Sans", "Microsoft YaHei", sans-serif';

export default class StageIntroScene extends Phaser.Scene {
  constructor() {
    super('StageIntro');
  }

  init(data) {
    this.payload = data;
    this.zone = ZONES[data.zoneIndex ?? 0];
  }

  create() {
    this.cameras.main.setBackgroundColor('#050505');

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    // Brush stroke sweeps left → right (anchored at its left edge).
    const brush = this.add.image(cx - 290, cy + 6, 'fx_brush')
      .setOrigin(0, 0.5).setScale(0, 1).setAlpha(0.96);
    this.tweens.add({
      targets: brush, scaleX: 1.18, duration: 300, ease: 'Cubic.Out',
    });

    // Stage number seal, top-right of the stroke.
    const seal = this.add.text(cx + 250, cy - 78, `第${'一二三四'[this.payload.zoneIndex ?? 0]}章`, {
      fontFamily: CJK_FONT, fontSize: '22px', color: '#c62828', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: seal, alpha: 1, duration: 400, delay: 1100 });

    // Chinese name appears stroke by stroke (per character).
    const chars = [...this.zone.name];
    const totalW = chars.length * 86;
    chars.forEach((ch, i) => {
      const t = this.add.text(cx - totalW / 2 + 43 + i * 86, cy - 4, ch, {
        fontFamily: CJK_FONT, fontSize: '76px', color: '#1c1714', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0).setScale(1.5).setAngle(-6);
      this.tweens.add({
        targets: t, alpha: 1, scale: 1, angle: 0,
        duration: 260, delay: 330 + i * 190, ease: 'Cubic.Out',
        onStart: () => Sfx.play('select'),
      });
    });

    // English subtitle fades in under the stroke.
    const sub = this.add.text(cx, cy + 86, this.zone.nameEn, {
      fontFamily: 'monospace', fontSize: '22px', color: '#b8af9d',
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: sub, alpha: 1, duration: 450,
      delay: 330 + chars.length * 190 + 120,
    });

    // Hold 2s after everything lands, then fade to the stage.
    const done = 330 + chars.length * 190 + 500;
    this.time.delayedCall(done + 2000, () => {
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', this.payload);
      });
    });

    // Tap / key skips straight in.
    const skip = () => {
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.scene.start('Game', this.payload);
    };
    this.input.keyboard.once('keydown', skip);
    this.input.once('pointerdown', skip);
  }
}
