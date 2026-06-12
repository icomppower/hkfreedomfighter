import { GAME_W, GAME_H } from './constants.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import StageIntroScene from './scenes/StageIntroScene.js';
import GameScene from './scenes/GameScene.js';
import HUDScene from './scenes/HUDScene.js';
import BossIntroScene from './scenes/BossIntroScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#07070f',
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 2200 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 4, // multi-touch: d-pad + buttons simultaneously
  },
  scene: [BootScene, MenuScene, StageIntroScene, GameScene, HUDScene,
    BossIntroScene, GameOverScene],
};

window.addEventListener('load', () => {
  window.__game = new Phaser.Game(config);
});
