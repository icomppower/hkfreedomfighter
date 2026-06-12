// Headless smoke test: boots the game, checks the ink-brush stage intro,
// fights the first wave, then fast-forwards to the final boss to verify the
// intro cinematic, all four phase transitions, projectiles/clones and the
// victory flow. Not part of the game build.
import { chromium } from 'playwright-core';

const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(2500);

console.log('boot:', JSON.stringify(await page.evaluate(() => ({
  scenes: window.__game.scene.scenes.filter((s) => s.scene.isActive()).map((s) => s.scene.key),
  textures: window.__game.textures.getTextureKeys().length,
  anims: window.__game.anims.anims.size,
}))));

// --- Stage intro cutscene ---
await page.keyboard.press('z');
await page.waitForTimeout(900);
const intro1 = await page.evaluate(() => ({
  scenes: window.__game.scene.scenes.filter((s) => s.scene.isActive()).map((s) => s.scene.key),
}));
console.log('stage intro:', JSON.stringify(intro1));
await page.screenshot({ path: 'smoke-intro.png' });
await page.keyboard.press('Enter'); // skip into the stage
await page.waitForTimeout(900);

// --- Phase A: walk into wave 1 and fight for real ---
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(2600);
await page.keyboard.up('ArrowRight');

// wait until an enemy is in punching range
let near = false;
for (let i = 0; i < 40 && !near; i++) {
  await page.waitForTimeout(250);
  near = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    return gs.enemies.getChildren().some(
      (e) => e.active && !e.isDead && Math.abs(e.x - gs.player.x) < 55,
    );
  });
}
console.log('enemy in range:', near);

for (let i = 0; i < 24; i++) {
  await page.keyboard.press(i % 4 === 3 ? 'x' : 'z');
  await page.waitForTimeout(160);
}
await page.waitForTimeout(800);

const fight = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  return {
    zone: gs.zone.key,
    playerHp: gs.player.hp,
    sp: +gs.player.sp.toFixed(2),
    score: gs.score,
    bestCombo: gs.combat.bestCombo,
    enemiesLeft: gs.enemies.getChildren().filter((e) => e.active && !e.isDead).length,
    waveActive: !!gs.spawner.activeWave,
  };
});
console.log('after fight:', JSON.stringify(fight));
await page.screenshot({ path: 'smoke-fight.png' });

// --- Phase B: jump to the final stage and trigger The Shadow ---
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  gs.scene.restart({ zoneIndex: 3, score: 12345, lives: 3 });
});
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  // clear the pre-boss waves and move up to the boss trigger
  gs.spawner.waves.forEach((w) => { if (!w.boss) w.state = 'cleared'; });
  gs.player.x = 4200;
  gs.cameraSystem.minScrollX = 3900;
});
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1500);
await page.keyboard.up('ArrowRight');

const intro = await page.evaluate(() => ({
  scenes: window.__game.scene.scenes.filter((s) => s.scene.isActive()).map((s) => s.scene.key),
  gamePaused: window.__game.scene.isPaused('Game'),
}));
console.log('boss intro:', JSON.stringify(intro));

await page.waitForTimeout(3200); // intro plays out
const bossUp = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('Game');
  const boss = gs.enemies.getChildren().find((e) => e.cfg?.boss);
  return {
    resumed: !window.__game.scene.isPaused('Game'),
    bossExists: !!boss,
    bossType: boss?.type,
    bossHp: boss?.hp,
    bossState: boss?.state,
    weaponsOnGround: gs.weapons.getChildren().filter((w) => w.active).length,
  };
});
console.log('boss spawned:', JSON.stringify(bossUp));
await page.screenshot({ path: 'smoke-boss.png' });

// hammer the boss through its phases via the real damage API
const phases = await page.evaluate(async () => {
  const gs = window.__game.scene.getScene('Game');
  const boss = gs.enemies.getChildren().find((e) => e.cfg?.boss);
  const hit = { damage: 9, freeze: 8, hitstun: 16, knockback: { x: 60, y: 0 } };
  const seen = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 14 && !boss.isDead; i++) {
    boss.invulnUntil = 0;
    boss.comboHitsTaken = 0; // bypass combo breaker for the test
    boss.takeHit(hit, boss.x - 50, gs.time.now);
    seen.push(boss.phase);
    await wait(350);
  }
  return {
    phasesSeen: [...new Set(seen)],
    bossDead: boss.isDead,
    clones: gs.enemies.getChildren().filter((e) => e.active && !e.isDead && e.type === 'clone').length,
    projectiles: gs.projectiles.getChildren().filter((p) => p.active).length,
    darkness: +gs.darkOverlay.fillAlpha.toFixed(2),
  };
});
console.log('boss phases:', JSON.stringify(phases));

await page.waitForTimeout(3500); // K.O. -> victory transition
const end = await page.evaluate(() => ({
  scenes: window.__game.scene.scenes.filter((s) => s.scene.isActive()).map((s) => s.scene.key),
}));
console.log('after boss death:', JSON.stringify(end));
await page.screenshot({ path: 'smoke-end.png' });

if (errors.length) {
  console.log('\nERRORS:');
  errors.slice(0, 12).forEach((e) => console.log(' -', e));
  process.exitCode = 1;
} else {
  console.log('\nNo console or page errors.');
}
await browser.close();
