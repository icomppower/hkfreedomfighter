// Reads wave data for the current zone, spawns enemies when the player crosses
// trigger points, manages the arena lock, wave-clear rewards and the boss
// hand-off (cinematic intro before the boss spawns).

import { GAME_W, GROUND_Y } from '../constants.js';
import { ENEMIES } from '../data/enemies.js';
import { ENEMY_CLASSES } from '../entities/index.js';
import { pickWeapon } from '../data/weapons.js';
import { Sfx } from './Sfx.js';

export default class SpawnerSystem {
  constructor(scene, zone) {
    this.scene = scene;
    this.zone = zone;
    this.waves = zone.waves.map((w) => ({ ...w, state: 'pending' }));
    this.activeWave = null;
    this.aliveCount = 0;
    this.playerHitThisWave = false;
    this.bossSpawned = false;

    scene.events.on('enemy:died', this.onEnemyDied, this);
    scene.events.once('shutdown', () => {
      scene.events.off('enemy:died', this.onEnemyDied, this);
    });
  }

  get allCleared() {
    return this.waves.every((w) => w.state === 'cleared');
  }

  update() {
    if (this.activeWave) return;
    const px = this.scene.player.x;
    const next = this.waves.find((w) => w.state === 'pending');
    if (next && px >= next.triggerX) this.startWave(next);
  }

  startWave(wave) {
    wave.state = 'active';
    this.activeWave = wave;
    this.playerHitThisWave = false;

    const cam = this.scene.cameras.main;
    const lockLeft = Phaser.Math.Clamp(cam.scrollX, 0, this.zone.width - GAME_W);
    this.scene.cameraSystem.setLock(lockLeft);
    this.lockLeft = lockLeft;
    this.lockRight = lockLeft + GAME_W;

    this.scene.game.events.emit('hud:warn');
    Sfx.play('wave');

    if (wave.boss) {
      // A weapon always spawns for the boss fight.
      this.spawnWaveWeapon(1);
      this.startBossSequence(wave);
      return;
    }

    this.spawnWaveWeapon(0.4);
    this.spawnWaveEnemies(wave);
  }

  spawnWaveWeapon(chance) {
    if (Math.random() >= chance) return;
    const type = pickWeapon(this.zone.weaponWeights);
    const x = Phaser.Math.Between(this.lockLeft + 120, this.lockRight - 120);
    this.scene.spawnWeapon(x, type);
  }

  spawnWaveEnemies(wave) {
    let fromRight = 0;
    let fromLeft = 0;
    let index = 0;
    for (const group of wave.enemies) {
      for (let i = 0; i < group.n; i++) {
        // Alternate entry sides, weighted toward the right (ahead of the player).
        const side = index % 3 === 2 ? -1 : 1;
        let x;
        if (side === 1) {
          x = this.lockRight + 60 + fromRight * 70;
          fromRight += 1;
        } else {
          x = this.lockLeft - 60 - fromLeft * 70;
          fromLeft += 1;
        }
        this.spawnEnemy(group.type, x);
        index += 1;
      }
    }
  }

  spawnEnemy(type, x) {
    const Cls = ENEMY_CLASSES[type];
    const enemy = new Cls(this.scene, x, GROUND_Y, type);
    this.scene.enemies.add(enemy);
    this.aliveCount += 1;
    enemy.alertAndEngage(this.scene.time.now);
    return enemy;
  }

  startBossSequence(wave) {
    const type = wave.enemies[0].type;
    const cfg = ENEMIES[type];
    Sfx.play('boss');
    this.scene.scene.launch('BossIntro', { name: cfg.name, title: cfg.title });
    this.scene.scene.pause();
    this.scene.game.events.once('bossintro:done', () => {
      const boss = this.spawnEnemy(type, this.lockRight - 140);
      this.scene.boss = boss;
      this.bossSpawned = true;
      this.scene.game.events.emit('hud:bossbar', {
        hp: boss.hp, max: boss.maxHp, name: `${cfg.name} ${cfg.title}`,
      });
    });
  }

  onEnemyDied(enemy) {
    this.aliveCount = Math.max(0, this.aliveCount - 1);
    if (!this.activeWave) return;

    // Boss death ends the boss wave regardless of summoned minions.
    if (this.activeWave.boss && enemy.cfg.boss) {
      for (const e of this.scene.enemies.getChildren()) {
        if (e.active && !e.isDead && e !== enemy) e.forceKill();
      }
      this.aliveCount = 0;
    }

    if (this.aliveCount <= 0) this.clearWave();
  }

  notePlayerHit() {
    this.playerHitThisWave = true;
  }

  clearWave() {
    const wave = this.activeWave;
    if (!wave) return;
    wave.state = 'cleared';
    this.activeWave = null;
    this.scene.cameraSystem.clearLock();

    const cam = this.scene.cameras.main;
    const cx = cam.scrollX + GAME_W / 2;

    // Wave clear pays 1000 × stage number; an untouched wave adds 500.
    let bonus = 1000 * (this.scene.zoneIndex + 1);
    if (!this.playerHitThisWave) {
      bonus += 500;
      this.scene.popText(cx, 200, 'PERFECT! 無傷 +500', '#ffe14d', 22);
    }
    this.scene.addScore(bonus);
    this.scene.popText(cx, 240, `WAVE CLEAR +${bonus}`, '#6dff6d', 18);
    this.scene.game.events.emit('hud:wave-clear');
    Sfx.play('pickup');

    // Coin shower reward.
    const coins = Phaser.Math.Between(3, 5);
    for (let i = 0; i < coins; i++) {
      this.scene.spawnItem(cx + Phaser.Math.Between(-120, 120), GROUND_Y - 160, 'coin');
    }
  }
}
