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
    this.brush = this.add.image(cx - 290, cy + 6, 'fx_brush')
      .setOrigin(0, 0.5).setScale(0, 1).setAlpha(0.96);
    this.tweens.add({
      targets: this.brush, scaleX: 1.18, duration: 300, ease: 'Cubic.Out',
    });

    // Stage number seal, top-right of the stroke.
    this.seal = this.add.text(cx + 250, cy - 78, `第${'一二三四'[this.payload.zoneIndex ?? 0]}章`, {
      fontFamily: CJK_FONT, fontSize: '22px', color: '#c62828', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.seal, alpha: 1, duration: 400, delay: 1100 });

    // Chinese name appears stroke by stroke (per character).
    const chars = [...this.zone.name];
    const totalW = chars.length * 86;
    this.charTexts = chars.map((ch, i) => {
      const t = this.add.text(cx - totalW / 2 + 43 + i * 86, cy - 4, ch, {
        fontFamily: CJK_FONT, fontSize: '76px', color: '#1c1714', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0).setScale(1.5).setAngle(-6);
      this.tweens.add({
        targets: t, alpha: 1, scale: 1, angle: 0,
        duration: 260, delay: 330 + i * 190, ease: 'Cubic.Out',
        onStart: () => Sfx.play('select'),
      });
      return t;
    });

    // English subtitle types out under the stroke at 40ms/char (GDD caption
    // spec), once the Chinese name has landed.
    this.sub = this.add.text(cx, cy + 86, '', {
      fontFamily: 'monospace', fontSize: '22px', color: '#b8af9d',
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5);
    this.subFull = this.zone.nameEn;
    this.ready = false;
    this.leaving = false;
    this.time.delayedCall(330 + chars.length * 190 + 120, () => {
      let i = 0;
      this.time.addEvent({
        delay: 40, repeat: this.subFull.length - 1,
        callback: () => {
          i += 1;
          this.sub.setText(this.subFull.slice(0, i));
          if (i >= this.subFull.length) this.showPrompt();
        },
      });
    });

    // Any key / tap: mid-animation it fast-forwards to the finished caption;
    // once the prompt is up, it starts the stage. No auto-advance.
    const advance = () => {
      if (!this.ready) { this.finishIntro(); return; }
      if (this.leaving) return;
      this.leaving = true;
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', this.payload);
      });
    };
    this.input.keyboard.on('keydown', advance);
    this.input.on('pointerdown', advance);
  }

  finishIntro() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.brush.setScale(1.18, 1);
    this.seal.setAlpha(1);
    this.charTexts.forEach((t) => t.setAlpha(1).setScale(1).setAngle(0));
    this.sub.setText(this.subFull);
    this.showPrompt();
  }

  showPrompt() {
    if (this.ready) return;
    this.ready = true;
    const prompt = this.add.text(GAME_W / 2, GAME_H - 44,
      '按任意鍵繼續 · PRESS ANY KEY TO CONTINUE', {
        fontFamily: CJK_FONT, fontSize: '16px', color: '#FFD700', fontStyle: 'bold',
      }).setOrigin(0.5);
    this.tweens.add({
      targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1,
    });
  }
}
