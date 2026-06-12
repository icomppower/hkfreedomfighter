// Opening cutscene before stage 1 — 龍仔 Dragon origin (GDD: 📖 Story &
// Content). Six panels on a black screen: a faint stage-direction line, then
// the English dialogue and Cantonese below, revealed by the slow typewriter
// at ~40ms/char. Each panel holds a beat before the next; the cutscene ends
// straight into the stage 1 intro — no "Press Start". A key/tap finishes the
// current panel's typing, and once a panel is fully shown, skips ahead.

import { GAME_W, GAME_H } from '../constants.js';
import { PRELUDE } from '../data/story.js';

const CJK_FONT = '"PingFang HK", "Hiragino Sans", "Microsoft YaHei", sans-serif';
const TYPE_MS = 40;
const HOLD_MS = 1400;

export default class PreludeScene extends Phaser.Scene {
  constructor() {
    super('Prelude');
  }

  init(data) {
    this.payload = data; // forwarded untouched to StageIntro
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.fadeIn(400, 10, 10, 10);

    this.blocks = [];
    this.typeTimer = null;
    this.holdTimer = null;
    this.panelIndex = -1;
    this.leaving = false;
    this.nextPanel();

    const advance = () => {
      if (this.typeTimer) { this.finishPanel(); return; }
      this.nextPanel();
    };
    this.input.keyboard.on('keydown', advance);
    this.input.on('pointerdown', advance);
  }

  nextPanel() {
    if (this.leaving) return;
    if (this.holdTimer) { this.holdTimer.remove(); this.holdTimer = null; }
    this.panelIndex += 1;
    if (this.panelIndex >= PRELUDE.length) { this.begin(); return; }

    this.blocks.forEach((t) => t.destroy());
    const panel = PRELUDE[this.panelIndex];
    const defs = [
      { text: panel.dir, font: 'monospace', size: 14, color: '#707070', style: 'italic', gap: 30 },
      { text: panel.en, font: 'monospace', size: 20, color: '#ffffff', style: 'bold', gap: 22 },
      { text: panel.zh, font: CJK_FONT, size: 20, color: '#FFD700', style: 'normal', gap: 0 },
    ];

    // Lay the blocks out centred as one group, then empty them for typing.
    // Left-anchored at the centred full-text position so the typewriter
    // reveal doesn't shift characters around.
    this.blocks = defs.map((d) => {
      const t = this.add.text(0, 0, d.text, {
        fontFamily: d.font, fontSize: `${d.size}px`, color: d.color,
        fontStyle: d.style, lineSpacing: 8,
      });
      t.full = d.text;
      t.gap = d.gap;
      t.setX(Math.round((GAME_W - t.width) / 2));
      return t;
    });
    const totalH = this.blocks.reduce((h, t) => h + t.height + t.gap, 0);
    let y = Math.round((GAME_H - totalH) / 2);
    this.blocks.forEach((t) => {
      t.setY(y);
      y += t.height + t.gap;
      t.setText('');
    });

    this.blockIndex = 0;
    this.charIndex = 0;
    this.typeTimer = this.time.addEvent({
      delay: TYPE_MS, loop: true, callback: () => this.typeTick(),
    });
  }

  typeTick() {
    const block = this.blocks[this.blockIndex];
    if (!block) { this.finishPanel(); return; }
    this.charIndex += 1;
    block.setText(block.full.slice(0, this.charIndex));
    if (this.charIndex >= block.full.length) {
      this.blockIndex += 1;
      this.charIndex = 0;
    }
  }

  finishPanel() {
    if (this.typeTimer) { this.typeTimer.remove(); this.typeTimer = null; }
    this.blocks.forEach((t) => t.setText(t.full));
    this.holdTimer = this.time.delayedCall(HOLD_MS, () => this.nextPanel());
  }

  begin() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(500, 10, 10, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('StageIntro', this.payload);
    });
  }
}
