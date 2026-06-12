// Heads-up display — runs as a parallel scene over GameScene and reacts to
// `hud:*` events emitted on the global game event bus.

import { GAME_W, GAME_H } from '../constants.js';
import { WEAPONS } from '../data/weapons.js';
import HealthBar from '../ui/HealthBar.js';
import SPBar from '../ui/SPBar.js';
import ComboDisplay from '../ui/ComboDisplay.js';
import MobileControls from '../ui/MobileControls.js';
import { isTouchDevice } from '../ui/touch.js';

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    this.hpBar = new HealthBar(this, 20, 34, 240, 18, { label: '龍仔 DRAGON' });
    this.spBar = new SPBar(this, 20, 58);
    this.livesText = this.add.text(20, 76, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff8a65', fontStyle: 'bold',
    });
    this.scoreText = this.add.text(GAME_W - 20, 18, 'SCORE 0', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffe14d', fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.combo = new ComboDisplay(this, GAME_W - 130, 160);

    // Held weapon indicator.
    this.weaponIcon = this.add.image(30, 106, 'wpn_bottle').setScale(1.4).setVisible(false);
    this.weaponText = this.add.text(46, 106, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    if (isTouchDevice()) this.mobileControls = new MobileControls(this);

    this.bossBar = new HealthBar(this, GAME_W / 2 - 210, GAME_H - 46, 420, 16, {
      label: '', colors: [0xb04dff, 0x4a148c],
    });
    this.bossName = this.add.text(GAME_W / 2, GAME_H - 60, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ff5252', fontStyle: 'bold',
    }).setOrigin(0.5, 1);
    this.bossBar.setVisible(false);
    this.bossName.setVisible(false);

    this.warnText = this.add.text(GAME_W / 2, 130, '! 警告 !', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '44px',
      color: '#ff3d3d', stroke: '#2a0000', strokeThickness: 8, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.banner = this.add.text(GAME_W / 2, 200, '', {
      fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
      fontSize: '46px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.banner.setShadow(0, 0, '#ffd700', 18, true, true);
    this.bannerSub = this.add.text(GAME_W / 2, 240, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // --- event wiring ---
    const ev = this.game.events;
    this.handlers = {
      'hud:hp': ({ hp, max }) => this.hpBar.set(hp, max),
      'hud:sp': ({ sp }) => this.spBar.set(sp),
      'hud:lives': ({ lives }) => {
        this.livesText.setText(`LIVES ${'♥'.repeat(Math.max(0, lives))}`);
      },
      'hud:score': ({ score }) => this.scoreText.setText(`SCORE ${score}`),
      'hud:combo': ({ count, label }) => this.combo.show(count, label),
      'hud:warn': () => this.flashWarn(),
      'hud:banner': ({ text, sub }) => this.showBanner(text, sub),
      'hud:bossbar': (data) => this.updateBossBar(data),
      'hud:weapon': (data) => {
        if (!data) {
          this.weaponIcon.setVisible(false);
          this.weaponText.setText('');
          return;
        }
        const def = WEAPONS[data.type];
        this.weaponIcon.setTexture(def.tex).setVisible(true);
        this.weaponText.setText(`${def.zh} ${def.en}`);
      },
      'hud:reset': () => {
        this.bossBar.setVisible(false);
        this.bossName.setVisible(false);
        this.weaponIcon.setVisible(false);
        this.weaponText.setText('');
      },
    };
    for (const [name, fn] of Object.entries(this.handlers)) ev.on(name, fn);
    this.events.once('shutdown', () => {
      for (const [name, fn] of Object.entries(this.handlers)) ev.off(name, fn);
    });

    // The HUD is launched from GameScene.create, so its initial hud:* emits
    // fire before this scene exists — pull the starting state directly.
    const gs = this.scene.get('Game');
    if (gs && gs.player) {
      this.hpBar.set(gs.player.hp, gs.player.maxHp);
      this.spBar.set(gs.player.sp);
      this.handlers['hud:lives']({ lives: gs.lives });
      this.handlers['hud:score']({ score: gs.score });
      if (gs.zone) this.showBanner(gs.zone.name, gs.zone.nameEn);
    }
  }

  flashWarn() {
    this.warnText.setAlpha(1);
    this.tweens.add({
      targets: this.warnText, alpha: 0, duration: 320,
      yoyo: true, repeat: 3, ease: 'Sine.InOut',
      onComplete: () => this.warnText.setAlpha(0),
    });
  }

  showBanner(text, sub) {
    this.banner.setText(text).setAlpha(0);
    this.bannerSub.setText(sub || '').setAlpha(0);
    this.tweens.add({
      targets: [this.banner, this.bannerSub], alpha: 1, duration: 500,
      hold: 1400, yoyo: true,
    });
  }

  updateBossBar(data) {
    if (!data) {
      this.bossBar.setVisible(false);
      this.bossName.setVisible(false);
      return;
    }
    this.bossBar.setVisible(true);
    this.bossName.setVisible(true).setText(data.name || '');
    this.bossBar.set(data.hp, data.max);
  }

  update(time) {
    this.hpBar.update();
    this.spBar.update(time);
    this.bossBar.update();
  }
}
