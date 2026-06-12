// Title screen: flickering sign over the drifting Admiralty skyline,
// high-score table, controls reference.

import { GAME_W, GAME_H, GROUND_Y, STORAGE } from '../constants.js';
import { Sfx } from '../systems/Sfx.js';
import { midiPlayer } from '../systems/MidiPlayer.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.far = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'admiralty_far').setOrigin(0);
    this.mid = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'admiralty_mid').setOrigin(0).setAlpha(0.8);
    this.add.tileSprite(0, GROUND_Y - 8, GAME_W, 80, 'admiralty_ground').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0a0a, 0.45).setOrigin(0);

    // Title
    this.title = this.add.text(GAME_W / 2, 150, '香港自由戰士', {
      fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
      fontSize: '88px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.title.setShadow(0, 0, '#FFD700', 24, true, true);

    const sub = this.add.text(GAME_W / 2, 222, 'HK FREEDOM FIGHTER', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '26px',
      color: '#ffffff', fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5);
    sub.setShadow(0, 0, '#ffffff', 14, true, true);

    // Neon flicker
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        const a = Math.random() < 0.08 ? 0.35 : 1;
        this.title.setAlpha(a);
      },
    });

    this.start = this.add.text(GAME_W / 2, 300, '按 Z 開始 — PRESS Z TO START', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffe14d', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: this.start, alpha: 0.25, duration: 600, yoyo: true, repeat: -1,
    });

    // High scores
    const scores = this.loadScores();
    const sx = GAME_W / 2 - 290;
    this.add.text(sx, 350, '龍虎榜 HIGH SCORES', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ff8a65', fontStyle: 'bold',
    });
    if (scores.length === 0) {
      this.add.text(sx, 378, '— no champions yet —', {
        fontFamily: 'monospace', fontSize: '13px', color: '#9e9e9e',
      });
    }
    scores.slice(0, 5).forEach((s, i) => {
      this.add.text(sx, 378 + i * 20,
        `${i + 1}. ${s.initials.padEnd(3)}  ${String(s.score).padStart(7, ' ')}`, {
          fontFamily: 'monospace', fontSize: '14px',
          color: i === 0 ? '#ffd54f' : '#e0e0e0',
        });
    });

    // Move list panel
    const cx = GAME_W / 2 + 52;
    const panelW = GAME_W / 2 - 68;
    const panelH = 198;
    const panelY = 344;
    const panel = this.add.rectangle(cx + panelW / 2 - 4, panelY + panelH / 2, panelW, panelH, 0x0a0a1a, 0.82)
      .setOrigin(0.5).setStrokeStyle(1.5, 0xffcc00, 0.7);
    this.tweens.add({ targets: panel, strokeAlpha: 0.2, duration: 900, yoyo: true, repeat: -1 });

    this.add.text(cx, panelY + 8, '必殺技 MOVE LIST', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffcc00', fontStyle: 'bold',
    });

    const moves = [
      ['移動', 'WASD / ARROWS  (double-tap → run)', '#9e9eb8'],
      ['跳',   'W / ↑ / SPACE  (again mid-air = 2x)', '#9e9eb8'],
      ['蹲',   'S / ↓  (dodges high attacks)', '#9e9eb8'],
      ['拳',   'Z — chain: Z Z Z · Z→X launcher', '#ffe14d'],
      ['腳',   'X — X→Z sweep · ↑+Z uppercut', '#ffe14d'],
      ['龍拳', 'Z+X (1 SP) — dash punch knockdown', '#ff8a65'],
      ['旋風腿','↓+Z+X (2 SP) — 360° AOE spin', '#ff8a65'],
      ['氣功彈','F / hold Z+X 600ms (1 SP) — full screen', '#4dd9ff'],
      ['擋',   'L / 🛡 hold — blocks all damage, 50% spd', '#4dd9ff'],
    ];

    moves.forEach(([zh, en, col], i) => {
      this.add.text(cx, panelY + 28 + i * 19,
        `${zh.padEnd(4)} ${en}`, {
          fontFamily: 'monospace', fontSize: '12px', color: col,
        });
    });

    this.add.text(GAME_W / 2, GAME_H - 18, '香港 2019 · 2D 橫向格鬥 · Phaser 3', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7a7a8c',
    }).setOrigin(0.5);

    // Start music on first interaction (browser autoplay policy requires user gesture).
    const startMusic = () => { Sfx.ensure(); midiPlayer.play(); };
    this.input.keyboard.once('keydown', startMusic);
    this.input.once('pointerdown', startMusic);

    this.input.keyboard.on('keydown-Z', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.on('pointerdown', () => this.startGame()); // tap to start (mobile)
  }

  loadScores() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.SCORES)) || [];
    } catch {
      return [];
    }
  }

  startGame() {
    Sfx.ensure();
    Sfx.play('select');
    // Fresh game opens with the Dragon-origin cutscene; checkpoint
    // continues (GameOverScene) still go straight to StageIntro.
    this.scene.start('Prelude', {
      zoneIndex: 0, score: 0, lives: 3, continues: 0, fresh: true,
    });
  }

  update(_, delta) {
    this.far.tilePositionX += delta * 0.004;
    this.mid.tilePositionX += delta * 0.012;
  }
}
