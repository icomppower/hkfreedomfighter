// Full-screen inter-scene educational message, shown after each cleared
// stage (GDD: 📖 Story & Content). Black screen, yellow stage title, then
// the English body, English tribute, Chinese body and Chinese tribute are
// revealed by a slow typewriter at ~40ms/char. The "press any key" prompt
// only appears once typing has finished; a key press mid-typing reveals
// everything instead of skipping the screen.

import { GAME_W, GAME_H } from '../constants.js';
import { ZONES } from '../data/levels.js';
import { STORY } from '../data/story.js';
import { Sfx } from '../systems/Sfx.js';

const CJK_FONT = '"PingFang HK", "Hiragino Sans", "Microsoft YaHei", sans-serif';
const TYPE_MS = 40;
const WRAP_W = 840;

export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  init(data) {
    // { zoneIndex: stage just cleared, next: { scene, data } to start after }
    this.payload = data;
    this.story = STORY[data.zoneIndex ?? 0];
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.fadeIn(400, 10, 10, 10);

    const zone = ZONES[this.payload.zoneIndex ?? 0];
    const cx = GAME_W / 2;

    this.add.text(cx, 58, `${zone.name} · ${zone.nameEn}`, {
      fontFamily: CJK_FONT, fontSize: '32px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Body blocks, typed in order. Each is pre-wrapped into explicit lines so
    // words don't jump between lines while the typewriter reveals them.
    const defs = [
      { text: this.story.en, font: 'monospace', size: 17, color: '#ffffff', style: 'normal', gap: 14 },
      { text: this.story.enQuote, font: 'monospace', size: 17, color: '#ffe98a', style: 'italic', gap: 26 },
      { text: this.story.zh, font: CJK_FONT, size: 18, color: '#ffffff', style: 'normal', gap: 14 },
      { text: this.story.zhQuote, font: CJK_FONT, size: 18, color: '#ffe98a', style: 'italic', gap: 0 },
    ];

    let y = 104;
    this.blocks = defs.map((d) => {
      const t = this.add.text(cx - WRAP_W / 2, y, '', {
        fontFamily: d.font, fontSize: `${d.size}px`, color: d.color,
        // useAdvancedWrap: CJK text has no spaces — wrap per character.
        fontStyle: d.style, lineSpacing: 6,
        wordWrap: { width: WRAP_W, useAdvancedWrap: true },
      });
      t.full = t.getWrappedText(d.text).join('\n');
      t.setWordWrapWidth(null);
      t.setText(t.full);
      y += t.height + d.gap;
      t.setText('');
      return t;
    });

    this.blockIndex = 0;
    this.charIndex = 0;
    this.finished = false;
    this.leaving = false;
    this.typeTimer = this.time.addEvent({
      delay: TYPE_MS, loop: true, callback: () => this.typeTick(),
    });

    const advance = () => {
      if (!this.finished) { this.finishTyping(); return; }
      if (this.leaving) return;
      this.leaving = true;
      Sfx.play('select');
      this.cameras.main.fadeOut(400, 10, 10, 10);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(this.payload.next.scene, this.payload.next.data);
      });
    };
    this.input.keyboard.on('keydown', advance);
    this.input.on('pointerdown', advance);
  }

  typeTick() {
    const block = this.blocks[this.blockIndex];
    if (!block) { this.finishTyping(); return; }
    this.charIndex += 1;
    block.setText(block.full.slice(0, this.charIndex));
    if (this.charIndex >= block.full.length) {
      this.blockIndex += 1;
      this.charIndex = 0;
    }
  }

  finishTyping() {
    if (this.finished) return;
    this.finished = true;
    this.typeTimer.remove();
    this.blocks.forEach((t) => t.setText(t.full));

    const prompt = this.add.text(GAME_W / 2, GAME_H - 32,
      '按任意鍵繼續 · PRESS ANY KEY TO CONTINUE', {
        fontFamily: CJK_FONT, fontSize: '16px', color: '#FFD700', fontStyle: 'bold',
      }).setOrigin(0.5);
    this.tweens.add({
      targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1,
    });
  }
}
