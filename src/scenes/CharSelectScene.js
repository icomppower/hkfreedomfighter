// Character select — 龍仔 Dragon vs 小美 Amy. A cosmetic choice only: both
// share identical stats, moves and weapon mechanics. Sits between the title
// screen and the opening cutscene. The pick is stored in the global registry
// so it survives stage transitions, continues and restarts within a session.

import { GAME_W, GAME_H, GROUND_Y } from '../constants.js';
import { CHARACTERS } from '../data/characters.js';
import { Sfx } from '../systems/Sfx.js';
import { midiPlayer } from '../systems/MidiPlayer.js';

export default class CharSelectScene extends Phaser.Scene {
  constructor() {
    super('CharSelect');
  }

  init(data) {
    this.payload = data || {};
    this.index = 0;
    this.leaving = false;
  }

  create() {
    this.far = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'admiralty_far').setOrigin(0);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'admiralty_mid').setOrigin(0).setAlpha(0.7);
    this.add.tileSprite(0, GROUND_Y - 8, GAME_W, 80, 'admiralty_ground').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0a0a, 0.55).setOrigin(0);

    this.add.text(GAME_W / 2, 66, '選擇角色', {
      fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
      fontSize: '52px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 0, '#FFD700', 18, true, true);
    this.add.text(GAME_W / 2, 112, 'CHOOSE YOUR FIGHTER', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '18px',
      color: '#ffffff', fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5);

    // One card per character: a big idle sprite over a panel, names + blurb.
    const spread = 280;
    const cardY = 300;
    this.cards = CHARACTERS.map((c, i) => {
      const x = GAME_W / 2 + (i - (CHARACTERS.length - 1) / 2) * spread;

      const ring = this.add.rectangle(x, cardY, 210, 300, 0x000000, 0.35)
        .setStrokeStyle(3, 0xffd700, 1);

      const sprite = this.add.sprite(x, cardY + 104, `${c.key}_idle`)
        .setOrigin(0.5, 1).setScale(3.6);
      sprite.play(`${c.key}-idle`);

      const zh = this.add.text(x, cardY - 116, c.zh, {
        fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
        fontSize: '34px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(x, cardY - 82, c.en, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffd54f', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(x, cardY + 134, c.blurb, {
        fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
        fontSize: '15px', color: '#bdbdbd',
      }).setOrigin(0.5);

      // Tap / click a card to pick it directly (mobile + mouse).
      ring.setInteractive({ useHandCursor: true });
      ring.on('pointerdown', () => { this.index = i; this.refresh(); this.confirm(); });

      return { ring, sprite, zh };
    });

    this.hint = this.add.text(GAME_W / 2, GAME_H - 34,
      '← → 選擇 · Z / ENTER 確認 — MOVE & CONFIRM', {
        fontFamily: 'monospace', fontSize: '15px', color: '#FFD700', fontStyle: 'bold',
      }).setOrigin(0.5);
    this.tweens.add({ targets: this.hint, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.refresh();

    const move = (dir) => {
      this.index = (this.index + dir + CHARACTERS.length) % CHARACTERS.length;
      Sfx.play('select');
      this.refresh();
    };
    this.input.keyboard.on('keydown-LEFT', () => move(-1));
    this.input.keyboard.on('keydown-A', () => move(-1));
    this.input.keyboard.on('keydown-RIGHT', () => move(1));
    this.input.keyboard.on('keydown-D', () => move(1));
    this.input.keyboard.on('keydown-Z', () => this.confirm());
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());

    // Music may already be running from the title screen; this is a no-op then.
    midiPlayer.play();
  }

  refresh() {
    this.cards.forEach((card, i) => {
      const on = i === this.index;
      card.ring.setStrokeStyle(on ? 4 : 2, on ? 0xffd700 : 0x555555, on ? 1 : 0.6);
      card.ring.setFillStyle(0x000000, on ? 0.15 : 0.45);
      card.sprite.setAlpha(on ? 1 : 0.4);
      card.zh.setColor(on ? '#ffffff' : '#9e9e9e');
    });
  }

  confirm() {
    if (this.leaving) return;
    this.leaving = true;
    const char = CHARACTERS[this.index].key;
    this.registry.set('char', char);
    Sfx.ensure();
    Sfx.play('select');
    this.cameras.main.fadeOut(350, 10, 10, 10);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Prelude', { ...this.payload, char });
    });
  }

  update(_, delta) {
    this.far.tilePositionX += delta * 0.004;
  }
}
