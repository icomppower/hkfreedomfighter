// Cinematic boss name card: letterbox bars slide in, the boss name slams
// onto the screen, then gameplay resumes and the boss spawns.

import { GAME_W, GAME_H } from '../constants.js';

const BAR_H = 90;

export default class BossIntroScene extends Phaser.Scene {
  constructor() {
    super('BossIntro');
  }

  create(data) {
    const topBar = this.add.rectangle(0, -BAR_H, GAME_W, BAR_H, 0x000000).setOrigin(0);
    const botBar = this.add.rectangle(0, GAME_H, GAME_W, BAR_H, 0x000000).setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0510, 0.45).setOrigin(0);

    this.tweens.add({ targets: topBar, y: 0, duration: 350, ease: 'Cubic.Out' });
    this.tweens.add({ targets: botBar, y: GAME_H - BAR_H, duration: 350, ease: 'Cubic.Out' });

    const name = this.add.text(GAME_W / 2, GAME_H / 2 - 24, data.name || '???', {
      fontFamily: '"PingFang HK", "Hiragino Sans", sans-serif',
      fontSize: '72px', color: '#ff3d3d', fontStyle: 'bold',
    }).setOrigin(0.5).setScale(2.6).setAlpha(0);
    name.setShadow(0, 0, '#ff3d3d', 26, true, true);

    const title = this.add.text(GAME_W / 2, GAME_H / 2 + 42, data.title || '', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffd54f', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: name, scale: 1, alpha: 1, duration: 420, delay: 300, ease: 'Back.In',
      onComplete: () => this.cameras.main.shake(150, 0.01),
    });
    this.tweens.add({ targets: title, alpha: 1, duration: 300, delay: 800 });

    this.time.delayedCall(2400, () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(260, () => {
        this.scene.stop();
        this.scene.resume('Game');
        this.game.events.emit('bossintro:done');
      });
    });
  }
}
