// Results screen: victory or defeat, high-score entry (3 initials), top-5
// leaderboard, and continue-from-checkpoint / menu prompts.

import { GAME_W, GAME_H, STORAGE } from '../constants.js';
import { ZONES } from '../data/levels.js';
import { Sfx } from '../systems/Sfx.js';
import { midiPlayer } from '../systems/MidiPlayer.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.win = data.win;
    this.score = data.score ?? 0;
    this.zoneIndex = data.zoneIndex ?? 0;
    this.bestCombo = data.bestCombo ?? 0;
  }

  create() {
    midiPlayer.stop();

    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'admiralty_far').setOrigin(0).setAlpha(0.5);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0a0a, 0.7).setOrigin(0);

    const titleStr = this.win ? '勝利!' : '遊戲結束';
    const subStr = this.win ? 'VICTORY — GLORY TO HONG KONG' : 'GAME OVER';
    const color = this.win ? '#FFD700' : '#ff3d3d';

    const title = this.add.text(GAME_W / 2, 90, titleStr, {
      fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
      fontSize: '76px', color, fontStyle: 'bold',
    }).setOrigin(0.5);
    title.setShadow(0, 0, color, 22, true, true);
    this.add.text(GAME_W / 2, 148, subStr, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '22px', color: '#e0e0e0',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 196, `SCORE ${this.score}    BEST COMBO ${this.bestCombo}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#4dd9ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.scores = this.loadScores();
    this.entering = this.isHighScore();

    if (this.entering) {
      this.buildInitialsEntry();
    } else {
      this.showLeaderboardAndPrompts();
    }
  }

  /* ---------------- score persistence ---------------- */

  loadScores() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.SCORES)) || [];
    } catch {
      return [];
    }
  }

  isHighScore() {
    if (this.score <= 0) return false;
    if (this.scores.length < 5) return true;
    return this.score > Math.min(...this.scores.map((s) => s.score));
  }

  saveScore(initials) {
    this.scores.push({ initials, score: this.score });
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 5);
    try {
      localStorage.setItem(STORAGE.SCORES, JSON.stringify(this.scores));
      localStorage.setItem(STORAGE.INITIALS, initials);
    } catch { /* storage unavailable */ }
  }

  /* ---------------- initials entry ---------------- */

  buildInitialsEntry() {
    this.add.text(GAME_W / 2, 250, '新紀錄! ENTER YOUR INITIALS', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffe14d', fontStyle: 'bold',
    }).setOrigin(0.5);

    let saved = 'AHK';
    try {
      saved = localStorage.getItem(STORAGE.INITIALS) || 'AHK';
    } catch { /* default */ }
    this.initials = saved.padEnd(3, 'A').slice(0, 3).split('');
    this.slot = 0;

    this.slotTexts = this.initials.map((ch, i) => this.add.text(GAME_W / 2 + (i - 1) * 60, 310, ch, {
      fontFamily: 'monospace', fontSize: '52px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    this.cursor = this.add.rectangle(GAME_W / 2 - 60, 344, 44, 5, 0xffe14d);
    this.add.text(GAME_W / 2, 386, '← → move · ↑ ↓ change · type letters · Z / ENTER confirm', {
      fontFamily: 'monospace', fontSize: '13px', color: '#9e9e9e',
    }).setOrigin(0.5);

    this.keyHandler = (event) => this.handleEntryKey(event);
    this.input.keyboard.on('keydown', this.keyHandler);
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown', this.keyHandler);
    });

    // Touch devices have no keyboard: a tap accepts the initials as shown.
    this.input.once('pointerdown', () => {
      if (!this.entering) return;
      this.entering = false;
      this.saveScore(this.initials.join(''));
      Sfx.play('pickup');
      this.cursor.setVisible(false);
      this.showLeaderboardAndPrompts();
    });
  }

  handleEntryKey(event) {
    if (!this.entering) return;
    const key = event.key;
    if (key === 'ArrowLeft') this.slot = (this.slot + 2) % 3;
    else if (key === 'ArrowRight') this.slot = (this.slot + 1) % 3;
    else if (key === 'ArrowUp' || key === 'ArrowDown') {
      const dir = key === 'ArrowUp' ? 1 : -1;
      const idx = GLYPHS.indexOf(this.initials[this.slot]);
      const next = (idx + dir + GLYPHS.length) % GLYPHS.length;
      this.initials[this.slot] = GLYPHS[next];
      Sfx.play('select');
    } else if (/^[a-zA-Z0-9]$/.test(key)) {
      this.initials[this.slot] = key.toUpperCase();
      this.slot = Math.min(2, this.slot + 1);
      Sfx.play('select');
    } else if (key === 'Backspace') {
      this.slot = Math.max(0, this.slot - 1);
    } else if (key === 'Enter' || key === 'z' || key === 'Z') {
      this.entering = false;
      this.saveScore(this.initials.join(''));
      Sfx.play('pickup');
      this.cursor.setVisible(false);
      this.showLeaderboardAndPrompts();
      return;
    }
    this.slotTexts.forEach((t, i) => {
      t.setText(this.initials[i]);
      t.setColor(i === this.slot ? '#ffe14d' : '#ffffff');
    });
    this.cursor.x = GAME_W / 2 + (this.slot - 1) * 60;
  }

  /* ---------------- leaderboard + prompts ---------------- */

  showLeaderboardAndPrompts() {
    const baseY = this.entering === false && this.slotTexts ? 420 : 260;

    this.add.text(GAME_W / 2, baseY, '龍虎榜 HIGH SCORES', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ff8a65', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scores.slice(0, 5).forEach((s, i) => {
      this.add.text(GAME_W / 2, baseY + 26 + i * 20,
        `${i + 1}. ${s.initials.padEnd(3)}  ${String(s.score).padStart(7, ' ')}`, {
          fontFamily: 'monospace', fontSize: '14px',
          color: i === 0 ? '#ffd54f' : '#e0e0e0',
        }).setOrigin(0.5);
    });

    // Continues: 3 max, each costs 1000 score.
    const checkpoint = this.loadCheckpoint();
    const used = checkpoint?.continues ?? 0;
    const canContinue = !this.win && checkpoint && used < 3;
    const prompts = [];
    if (canContinue) {
      prompts.push(`[C] CONTINUE (-1000分 · ${3 - used}次) — ${ZONES[checkpoint.zoneIndex].nameEn}`);
    }
    prompts.push('[M] MENU', '[R] RESTART');

    this.add.text(GAME_W / 2, GAME_H - 60, prompts.join('    '), {
      fontFamily: 'monospace', fontSize: '14px', color: '#6dff6d', fontStyle: 'bold',
    }).setOrigin(0.5);

    const doContinue = () => {
      Sfx.play('select');
      this.scene.start('StageIntro', {
        zoneIndex: checkpoint.zoneIndex,
        score: Math.max(0, checkpoint.score - 1000),
        lives: 3,
        continues: used + 1,
      });
    };
    const doRestart = () => {
      Sfx.play('select');
      this.scene.start('StageIntro', {
        zoneIndex: 0, score: 0, lives: 3, continues: 0, fresh: true,
      });
    };

    if (canContinue) this.input.keyboard.on('keydown-C', doContinue);
    this.input.keyboard.on('keydown-M', () => {
      Sfx.play('select');
      this.scene.start('Menu');
    });
    this.input.keyboard.on('keydown-R', doRestart);
    // Tap continues from the checkpoint (or restarts) on touch devices.
    this.input.on('pointerdown', () => (canContinue ? doContinue() : doRestart()));
  }

  loadCheckpoint() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.CHECKPOINT));
    } catch {
      return null;
    }
  }
}
