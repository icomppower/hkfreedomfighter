// Procedural asset generation. Everything the game renders is drawn into
// canvases at boot — no external image files.
//
// Fighter spritesheets are built from parametric "poses": each pose is a set
// of joint positions (head, hip, hands, feet) in a 48x64 frame, rendered by
// drawFighter() with a per-character palette. All characters share the same
// pose library, so a new enemy type only needs a palette.

import { PALETTES } from '../data/enemies.js';

const PI2 = Math.PI * 2;
export const FRAME_W = 48;
export const FRAME_H = 64;

const CJK_FONT = '"PingFang HK", "Hiragino Sans", "Microsoft YaHei", sans-serif';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Register a canvas as a texture and slice horizontal frames out of it.
// Uses addCanvas + manual frame addition (robust across Phaser versions).
function addSheet(scene, key, canvas, frameW, frameH, frameCount) {
  const tex = scene.textures.addCanvas(key, canvas);
  for (let i = 0; i < frameCount; i++) {
    tex.add(i, 0, i * frameW, 0, frameW, frameH);
  }
}

function addTex(scene, key, canvas) {
  scene.textures.addCanvas(key, canvas);
}

/* ------------------------------------------------------------------ */
/* Fighter rendering                                                   */
/* ------------------------------------------------------------------ */

// Two-segment limb: quadratic curve with the control point pushed
// perpendicular to the bone, faking an elbow/knee.
function limbSeg(ctx, x1, y1, x2, y2, bend, width, color) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ex = mx + (-dy / len) * bend;
  const ey = my + (dx / len) * bend;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(ex, ey, x2, y2);
  ctx.stroke();
}

// Pose fields: hd=head, hip, fh=front hand, bh=back hand, ff=front foot,
// bf=back foot (all [x, y]); optional: knife, aura. Characters face RIGHT.
export function drawFighter(ctx, p, pal) {
  const [hdx, hdy] = p.hd;
  const [hx, hy] = p.hip;
  const shx = hx + (hdx - hx) * 0.7;
  const shy = hy + (hdy - hy) * 0.68;

  if (p.aura) {
    ctx.shadowColor = p.aura;
    ctx.shadowBlur = 12;
  }

  // back leg + shoe
  limbSeg(ctx, hx - 1, hy, p.bf[0], p.bf[1], 3, 5, pal.pantsDark || pal.pants);
  ctx.fillStyle = pal.shoes;
  ctx.fillRect(p.bf[0] - 3, p.bf[1] - 2, 7, 3.5);
  // back arm + fist
  limbSeg(ctx, shx - 2, shy + 2, p.bh[0], p.bh[1], 3, 4, pal.sleeveDark || pal.jacket);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(p.bh[0], p.bh[1], 2.6, 0, PI2);
  ctx.fill();
  // torso
  ctx.strokeStyle = pal.jacket;
  ctx.lineWidth = pal.bulk || 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy - 2);
  ctx.lineTo(shx, shy);
  ctx.stroke();
  if (pal.belt) {
    ctx.fillStyle = pal.belt;
    ctx.fillRect(hx - 5, hy - 4, 11, 3);
  }
  if (pal.chain) {
    ctx.strokeStyle = pal.chain;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(shx, shy + 5, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  // front leg + shoe
  limbSeg(ctx, hx + 1, hy, p.ff[0], p.ff[1], -3, 5, pal.pants);
  ctx.fillStyle = pal.shoes;
  ctx.fillRect(p.ff[0] - 3, p.ff[1] - 2, 7, 3.5);
  // head + hair + eye
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(hdx, hdy, 6.5, 0, PI2);
  ctx.fill();
  ctx.fillStyle = pal.hair;
  ctx.beginPath();
  ctx.arc(hdx - 0.5, hdy - 1.8, 6.6, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  if (pal.band) {
    ctx.fillStyle = pal.band;
    ctx.fillRect(hdx - 6.5, hdy - 3.5, 13, 2.5);
  }
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(hdx + 2.5, hdy - 1, 1.8, 1.8);
  if (pal.mask) {
    // black respirator over the lower face
    ctx.fillStyle = '#161616';
    ctx.beginPath();
    ctx.arc(hdx + 1, hdy + 2.5, 4.6, -0.25 * Math.PI, 0.85 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  // front arm + fist
  limbSeg(ctx, shx + 2, shy + 2, p.fh[0], p.fh[1], -3, 4, pal.sleeve || pal.jacket);
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(p.fh[0], p.fh[1], 2.8, 0, PI2);
  ctx.fill();
  if (p.knife) {
    ctx.strokeStyle = '#e0e6ea';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(p.fh[0], p.fh[1]);
    ctx.lineTo(p.fh[0] + 9, p.fh[1] - 3);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function rng(n) {
  return Array.from({ length: n }, (_, i) => i);
}

export function buildPoses() {
  const D = { hd: [23, 13], hip: [22, 40], fh: [30, 33], bh: [15, 33], ff: [29, 61], bf: [16, 61] };
  const B = (o = {}) => ({ ...D, ...o });
  const A = {};

  A.idle = [0, 1, 2, 1].map((k) => B({
    hd: [23, 13 + k], hip: [22, 40 + k * 0.6], fh: [30, 33 + k], bh: [15, 33 + k],
  }));
  A.walk = rng(6).map((i) => {
    const ph = (i / 6) * PI2;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    return B({
      ff: [23 + 9 * c, 61 - Math.max(0, 4 * s)],
      bf: [23 - 9 * c, 61 - Math.max(0, -4 * s)],
      fh: [23 - 7 * c, 34], bh: [23 + 7 * c, 34],
      hd: [23, 13 + Math.abs(s)], hip: [22, 40 + Math.abs(s) * 0.6],
    });
  });
  A.run = rng(6).map((i) => {
    const ph = (i / 6) * PI2;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    return B({
      hd: [27, 14 + Math.abs(s)], hip: [21, 41 + Math.abs(s) * 0.5],
      ff: [24 + 12 * c, 59 - Math.max(0, 5 * s)],
      bf: [24 - 12 * c, 59 - Math.max(0, -5 * s)],
      fh: [25 - 9 * c, 31], bh: [23 + 9 * c, 31],
    });
  });
  A.jump = [
    B({ hd: [23, 11], hip: [22, 38], ff: [30, 52], bf: [14, 56], fh: [32, 22], bh: [12, 28] }),
    B({ hd: [23, 13], hip: [22, 40], ff: [31, 50], bf: [15, 50], fh: [31, 28], bh: [13, 30] }),
    B({ hd: [23, 14], hip: [22, 40], ff: [27, 58], bf: [14, 54], fh: [33, 32], bh: [11, 32] }),
  ];
  A.crouch = [
    B({ hd: [25, 29], hip: [21, 50], fh: [31, 42], bh: [13, 42], ff: [31, 61], bf: [12, 61] }),
    B({ hd: [25, 30], hip: [21, 51], fh: [31, 43], bh: [13, 43], ff: [31, 61], bf: [12, 61] }),
  ];
  A.punch1 = [
    B({ fh: [18, 35], bh: [13, 32] }),
    B({ hd: [25, 13], hip: [23, 40], fh: [45, 31], bh: [11, 34], ff: [31, 61], bf: [14, 61] }),
    B({ fh: [33, 33] }),
  ];
  A.punch2 = [
    B({ fh: [27, 34], bh: [17, 30] }),
    B({ hd: [26, 13], hip: [24, 40], bh: [45, 30], fh: [19, 35], ff: [32, 61], bf: [15, 61] }),
    B({ bh: [27, 33] }),
  ];
  A.punch3 = [
    B({ hd: [20, 14], hip: [20, 41], fh: [14, 30], bh: [18, 36] }),
    B({ hd: [28, 14], hip: [26, 40], fh: [46, 29], bh: [9, 36], ff: [35, 61], bf: [11, 61] }),
    B({ fh: [36, 31] }),
  ];
  A.kick = [
    B({ ff: [28, 46], hd: [22, 13] }),
    B({ hd: [19, 14], hip: [21, 39], ff: [46, 33], bf: [17, 61], fh: [14, 28], bh: [26, 34] }),
    B({ hd: [19, 14], hip: [21, 39], ff: [46, 36], bf: [17, 61], fh: [14, 28], bh: [26, 34] }),
    B({ ff: [33, 55] }),
  ];
  A.sweep = [
    B({ hd: [25, 29], hip: [21, 50], fh: [28, 44], bh: [12, 42], ff: [33, 59], bf: [12, 61] }),
    B({ hd: [24, 30], hip: [20, 51], fh: [24, 46], bh: [10, 44], ff: [46, 57], bf: [11, 61] }),
    B({ hd: [25, 30], hip: [21, 51], fh: [28, 45], bh: [12, 44], ff: [38, 59], bf: [12, 61] }),
  ];
  A.launcher = [
    B({ fh: [24, 46], hd: [24, 15], hip: [21, 42] }),
    B({ hd: [24, 11], hip: [23, 38], fh: [40, 17], bh: [12, 36], ff: [32, 61], bf: [14, 61] }),
    B({ fh: [35, 25] }),
  ];
  A.uppercut = [
    B({ hd: [24, 17], hip: [21, 44], fh: [20, 48], bh: [12, 40], ff: [30, 61], bf: [14, 61] }),
    B({ hd: [24, 10], hip: [23, 36], fh: [34, 8], bh: [12, 34], ff: [31, 56], bf: [14, 60] }),
    B({ hd: [24, 11], hip: [23, 37], fh: [34, 12], bh: [12, 35], ff: [31, 58], bf: [14, 61] }),
    B({ fh: [30, 28] }),
  ];
  A.airpunch = [
    B({ hd: [23, 13], hip: [22, 39], fh: [20, 34], bh: [12, 32], ff: [30, 52], bf: [15, 50] }),
    B({ hd: [25, 13], hip: [23, 39], fh: [45, 31], bh: [10, 34], ff: [31, 52], bf: [16, 50] }),
    B({ fh: [32, 33], ff: [30, 52], bf: [15, 50] }),
  ];
  A.divekick = [
    B({ hd: [15, 21], hip: [23, 33], fh: [10, 28], bh: [18, 24], ff: [42, 52], bf: [37, 47] }),
    B({ hd: [14, 22], hip: [22, 34], fh: [9, 30], bh: [17, 25], ff: [44, 54], bf: [39, 49] }),
  ];
  A.specialA = [
    B({ hd: [19, 14], hip: [19, 42], fh: [12, 32], bh: [20, 38], ff: [28, 61], bf: [13, 61] }),
    B({ hd: [29, 15], hip: [26, 42], fh: [47, 30], bh: [7, 38], ff: [37, 60], bf: [7, 61] }),
    B({ hd: [29, 15], hip: [26, 42], fh: [47, 31], bh: [7, 38], ff: [37, 60], bf: [7, 61] }),
    B({ fh: [34, 32] }),
  ];
  A.specialB = rng(6).map((i) => {
    const ph = (i / 6) * PI2;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    return B({
      hd: [23, 12], hip: [22, 38],
      ff: [23 + 20 * c, 42 - 8 * s], bf: [23 - 20 * c, 42 + 8 * s],
      fh: [23 + 14 * s, 26], bh: [23 - 14 * s, 26],
    });
  });
  A.grab = [
    B({ fh: [30, 30], bh: [28, 36] }),
    B({ hd: [26, 14], hip: [24, 40], fh: [44, 28], bh: [42, 36], ff: [33, 61], bf: [14, 61] }),
    B({ fh: [34, 31], bh: [32, 37] }),
  ];
  A.poke = [
    B({ fh: [24, 34], bh: [12, 34] }),
    B({ hd: [27, 14], hip: [25, 41], fh: [47, 32], bh: [9, 36], ff: [34, 61], bf: [12, 61] }),
    B({ fh: [30, 34] }),
  ];
  A.jumpkick = [
    B({ hd: [20, 15], hip: [22, 36], ff: [44, 46], bf: [18, 46], fh: [12, 26], bh: [26, 30] }),
    B({ hd: [19, 16], hip: [21, 37], ff: [46, 50], bf: [17, 48], fh: [11, 28], bh: [25, 32] }),
  ];
  A.hurt = [
    B({ hd: [17, 14], hip: [21, 41], fh: [27, 28], bh: [9, 31], ff: [28, 61], bf: [14, 61] }),
    B({ hd: [16, 15], hip: [20, 41], fh: [26, 29], bh: [8, 32] }),
  ];
  A.fall = [
    B({ hd: [11, 28], hip: [25, 37], fh: [5, 38], bh: [12, 44], ff: [41, 29], bf: [37, 35] }),
    B({ hd: [9, 42], hip: [25, 47], fh: [5, 50], bh: [13, 52], ff: [42, 42], bf: [38, 46] }),
  ];
  A.down = [
    B({ hd: [7, 56], hip: [24, 58], fh: [13, 60], bh: [17, 59], ff: [42, 59], bf: [38, 60] }),
  ];
  A.getup = [
    B({ hd: [12, 42], hip: [22, 54], fh: [16, 52], bh: [24, 54], ff: [36, 60], bf: [30, 61] }),
    B({ hd: [24, 28], hip: [21, 50], fh: [30, 42], bh: [12, 44], ff: [31, 61], bf: [13, 61] }),
    B({ hd: [23, 16], hip: [22, 42], fh: [29, 34], bh: [14, 34], ff: [29, 61], bf: [16, 61] }),
  ];
  return A;
}

export const POSES = buildPoses();

// [frameRate, repeat] for each animation.
export const ANIM_RATES = {
  idle: [6, -1], walk: [12, -1], run: [16, -1], jump: [10, 0], crouch: [4, -1],
  punch1: [18, 0], punch2: [18, 0], punch3: [14, 0], kick: [16, 0], sweep: [14, 0],
  launcher: [14, 0], uppercut: [16, 0], airpunch: [20, 0], divekick: [14, 0],
  specialA: [14, 0], specialB: [18, -1], grab: [10, 0], poke: [18, 0],
  jumpkick: [12, 0], hurt: [12, 0], fall: [10, 0], down: [1, 0], getup: [10, 0],
};

function generateFighters(scene) {
  for (const [charKey, pal] of Object.entries(PALETTES)) {
    for (const [anim, frames] of Object.entries(POSES)) {
      const canvas = makeCanvas(FRAME_W * frames.length, FRAME_H);
      const ctx = canvas.getContext('2d');
      frames.forEach((p, i) => {
        ctx.save();
        ctx.translate(i * FRAME_W, 0);
        const fp = { ...p };
        if (pal.knife && anim === 'poke') fp.knife = true;
        if ((anim === 'specialA' || anim === 'specialB') && pal.aura) fp.aura = pal.aura;
        drawFighter(ctx, fp, pal);
        ctx.restore();
      });
      addSheet(scene, `${charKey}_${anim}`, canvas, FRAME_W, FRAME_H, frames.length);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Items, particles, misc                                              */
/* ------------------------------------------------------------------ */

function generateItems(scene) {
  // 能量棒 yellow snack bar
  let c = makeCanvas(20, 20);
  let ctx = c.getContext('2d');
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(2, 7, 16, 7);
  ctx.fillStyle = '#f9a825';
  ctx.fillRect(2, 11, 16, 3);
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(2, 7, 16, 7);
  // wrapper twist ends
  ctx.fillStyle = '#ffe97a';
  ctx.beginPath(); ctx.moveTo(2, 10.5); ctx.lineTo(0, 7); ctx.lineTo(0, 14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, 10.5); ctx.lineTo(20, 7); ctx.lineTo(20, 14); ctx.closePath(); ctx.fill();
  addTex(scene, 'item_bun', c);

  // 連儂牆便條 yellow sticky note
  c = makeCanvas(20, 20);
  ctx = c.getContext('2d');
  ctx.save();
  ctx.translate(10, 10);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = '#f9a825';
  ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(7, 7); ctx.lineTo(3, 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3e2723';
  ctx.font = `bold 7px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('港', 0, -0.5);
  ctx.restore();
  addTex(scene, 'item_hongbao', c);

  // 生理鹽水 saline bottle
  c = makeCanvas(20, 20);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(6, 6, 8, 12);
  ctx.fillStyle = '#90a4ae';
  ctx.fillRect(7.5, 2, 5, 4);
  ctx.fillStyle = '#d32f2f';
  ctx.fillRect(9, 9, 2.4, 7);
  ctx.fillRect(6.8, 11.3, 6.8, 2.4);
  addTex(scene, 'item_drink', c);

  // coin
  c = makeCanvas(14, 14);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(7, 7, 6, 0, PI2);
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(7, 7, 4.4, 0, PI2);
  ctx.stroke();
  addTex(scene, 'item_coin', c);

  // 急救包 first aid kit
  c = makeCanvas(24, 22);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(2, 6, 20, 14);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(2, 6, 20, 3);
  // handle
  ctx.strokeStyle = '#bdbdbd';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 6); ctx.quadraticCurveTo(12, 1, 15, 6);
  ctx.stroke();
  // red cross
  ctx.fillStyle = '#d32f2f';
  ctx.fillRect(10.5, 10, 3, 8);
  ctx.fillRect(8, 12.5, 8, 3);
  addTex(scene, 'item_claypot', c);
}

function generateParticles(scene) {
  // 4-point hit star
  let c = makeCanvas(14, 14);
  let ctx = c.getContext('2d');
  ctx.fillStyle = '#fff9c4';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(9, 5); ctx.lineTo(14, 7); ctx.lineTo(9, 9);
  ctx.lineTo(7, 14); ctx.lineTo(5, 9); ctx.lineTo(0, 7); ctx.lineTo(5, 5);
  ctx.closePath();
  ctx.fill();
  addTex(scene, 'fx_spark', c);

  // soft dust puff
  c = makeCanvas(12, 12);
  ctx = c.getContext('2d');
  let g = ctx.createRadialGradient(6, 6, 1, 6, 6, 6);
  g.addColorStop(0, 'rgba(200,200,210,0.9)');
  g.addColorStop(1, 'rgba(200,200,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 12, 12);
  addTex(scene, 'fx_dust', c);

  // cyan energy orb
  c = makeCanvas(16, 16);
  ctx = c.getContext('2d');
  g = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
  g.addColorStop(0, 'rgba(190,250,255,1)');
  g.addColorStop(0.5, 'rgba(80,200,255,0.8)');
  g.addColorStop(1, 'rgba(80,200,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  addTex(scene, 'fx_orb', c);

  // ki blast projectile — larger bright cyan orb with hard white core
  c = makeCanvas(26, 26);
  ctx = c.getContext('2d');
  g = ctx.createRadialGradient(13, 13, 1, 13, 13, 13);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(160,245,255,1)');
  g.addColorStop(0.6, 'rgba(50,180,255,0.85)');
  g.addColorStop(1, 'rgba(30,100,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 26, 26);
  addTex(scene, 'proj_kiblast', c);

  // rain streak
  c = makeCanvas(3, 16);
  ctx = c.getContext('2d');
  const rg = ctx.createLinearGradient(0, 0, 0, 16);
  rg.addColorStop(0, 'rgba(170,200,255,0)');
  rg.addColorStop(1, 'rgba(170,200,255,0.7)');
  ctx.fillStyle = rg;
  ctx.fillRect(1, 0, 1.5, 16);
  addTex(scene, 'fx_rain', c);

  // 1px white (flashes, barriers)
  c = makeCanvas(2, 2);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 2, 2);
  addTex(scene, 'fx_white', c);
}

/* ------------------------------------------------------------------ */
/* Backgrounds                                                         */
/* ------------------------------------------------------------------ */

function vertNeon(ctx, x, y, text, color, size = 18) {
  ctx.save();
  const pad = size * 0.45;
  const h = text.length * (size + 6) + 10;
  ctx.fillStyle = 'rgba(8,7,16,0.92)';
  ctx.fillRect(x - size / 2 - pad, y - 7, size + pad * 2, h);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - size / 2 - pad, y - 7, size + pad * 2, h);
  ctx.globalAlpha = 1;
  ctx.font = `bold ${size}px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y + i * (size + 6));
    ctx.fillText(ch, x, y + i * (size + 6)); // double pass = stronger glow
  });
  ctx.restore();
}

function horizNeon(ctx, x, y, text, color, size = 20) {
  ctx.save();
  ctx.font = `bold ${size}px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + size;
  ctx.fillStyle = 'rgba(8,7,16,0.92)';
  ctx.fillRect(x - w / 2, y - size * 0.75, w, size * 1.5);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - size * 0.75, w, size * 1.5);
  ctx.globalAlpha = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function windows(ctx, bx, by, bw, bh, color, density = 0.5, seedStep = 7) {
  ctx.fillStyle = color;
  let seed = bx * 13 + by * 31;
  for (let wy = by + 6; wy < by + bh - 6; wy += 11) {
    for (let wx = bx + 4; wx < bx + bw - 5; wx += 9) {
      seed = (seed * seedStep + 17) % 100;
      if (seed / 100 < density) ctx.fillRect(wx, wy, 4, 6);
    }
  }
}

function skyGradient(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([off, col]) => g.addColorStop(off, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function stars(ctx, w, h, n) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < n; i++) {
    const x = (i * 97 + 31) % w;
    const y = (i * 53 + 11) % h;
    ctx.globalAlpha = 0.25 + ((i * 37) % 60) / 100;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}

function reflections(ctx, w, y0, h, colors) {
  for (let i = 0; i < 14; i++) {
    const x = (i * 41 + 13) % w;
    const cw = 6 + ((i * 29) % 18);
    const col = colors[i % colors.length];
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, col.replace('1)', '0.22)'));
    g.addColorStop(1, col.replace('1)', '0)'));
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, cw, h);
  }
}

function genYuenlong(scene) {
  // far: station back wall — pale tiles under a dark ceiling of fluorescents
  let c = makeCanvas(480, 540);
  let ctx = c.getContext('2d');
  skyGradient(ctx, 480, 540, [[0, '#0e1216'], [0.18, '#1b2228'], [0.2, '#3a4248'], [1, '#2c3338']]);
  // ceiling fluorescent tubes
  for (let x = 20; x < 480; x += 110) {
    ctx.save();
    ctx.shadowColor = '#eaf6ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#f4fbff';
    ctx.fillRect(x, 60, 70, 6);
    ctx.restore();
  }
  // wall tiles
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1.5;
  for (let y = 120; y < 540; y += 46) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(480, y); ctx.stroke();
  }
  for (let x = 0; x < 480; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, 540); ctx.stroke();
  }
  // big station name band on the wall
  ctx.fillStyle = '#1f6f8b';
  ctx.fillRect(0, 250, 480, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('元朗 YUEN LONG', 240, 278);
  addTex(scene, 'yuenlong_far', c);

  // mid: platform pillars, ad lightboxes, hanging exit signs
  c = makeCanvas(768, 540);
  ctx = c.getContext('2d');
  // hanging signage
  const hangSign = (x, text, bg) => {
    ctx.strokeStyle = '#444c52';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 20, 0); ctx.lineTo(x + 20, 90); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 140, 0); ctx.lineTo(x + 140, 90); ctx.stroke();
    ctx.fillStyle = bg;
    ctx.fillRect(x, 90, 160, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 19px ${CJK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 80, 110);
  };
  hangSign(60, '出口 Exit ➜', '#00703c');
  hangSign(540, '月台 Platform', '#1f6f8b');
  // ad lightboxes
  [[280, 200], [660, 220]].forEach(([x, y]) => {
    ctx.save();
    ctx.shadowColor = 'rgba(230,245,255,0.8)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#dfeef5';
    ctx.fillRect(x, y, 90, 130);
    ctx.restore();
    ctx.fillStyle = '#9bb3bf';
    ctx.fillRect(x + 10, y + 14, 70, 56);
    ctx.fillRect(x + 10, y + 82, 70, 8);
    ctx.fillRect(x + 10, y + 98, 50, 8);
    ctx.strokeStyle = '#54626b';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, 90, 130);
  });
  // tiled pillars with station name plates
  [40, 420, 700].forEach((x) => {
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(x, 130, 56, 344);
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(x, 130, 8, 344);
    ctx.fillStyle = '#1f6f8b';
    ctx.fillRect(x, 280, 56, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 20px ${CJK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('元', x + 28, 302);
    ctx.fillText('朗', x + 28, 328);
  });
  addTex(scene, 'yuenlong_mid', c);

  // near: benches, ticket machines, bins under fluorescent glare
  c = makeCanvas(1024, 540);
  ctx = c.getContext('2d');
  const bench = (x) => {
    ctx.fillStyle = '#8a93a8';
    ctx.fillRect(x, 420, 120, 10);
    ctx.fillStyle = '#6a7388';
    ctx.fillRect(x + 8, 430, 8, 40);
    ctx.fillRect(x + 104, 430, 8, 40);
    ctx.fillStyle = '#8a93a8';
    ctx.fillRect(x, 392, 120, 8); // backrest
  };
  bench(140);
  bench(620);
  const ticketMachine = (x) => {
    ctx.fillStyle = '#37474f';
    ctx.fillRect(x, 350, 70, 120);
    ctx.fillStyle = '#4dd9ff';
    ctx.fillRect(x + 12, 366, 46, 34); // screen
    ctx.fillStyle = '#263238';
    ctx.fillRect(x + 12, 412, 46, 10);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + 12, 430, 20, 8);
  };
  ticketMachine(380);
  ticketMachine(880);
  // rubbish bin
  ctx.fillStyle = '#e65100';
  ctx.fillRect(540, 420, 40, 50);
  ctx.fillStyle = '#bf360c';
  ctx.fillRect(536, 412, 48, 10);
  // overhead glare pools
  [200, 520, 860].forEach((x) => {
    const g = ctx.createRadialGradient(x, 200, 10, x, 200, 130);
    g.addColorStop(0, 'rgba(235,250,255,0.16)');
    g.addColorStop(1, 'rgba(235,250,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 130, 70, 260, 260);
  });
  addTex(scene, 'yuenlong_near', c);

  // ground: polished cream tile with cold fluorescent reflections
  c = makeCanvas(256, 74);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#3c4348';
  ctx.fillRect(0, 0, 256, 74);
  ctx.fillStyle = '#4a5258';
  ctx.fillRect(0, 0, 256, 5);
  reflections(ctx, 256, 5, 56, ['rgba(235,250,255,1)', 'rgba(180,220,235,1)']);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 256; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 5); ctx.lineTo(x - 10, 74); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(256, 38); ctx.stroke();
  // tactile warning strip
  ctx.fillStyle = 'rgba(255,213,79,0.5)';
  for (let x = 4; x < 256; x += 16) ctx.fillRect(x, 8, 8, 3);
  addTex(scene, 'yuenlong_ground', c);
}

function genAdmiralty(scene) {
  // far: night sky over the CBD, tear gas haze drifting low
  let c = makeCanvas(480, 540);
  let ctx = c.getContext('2d');
  skyGradient(ctx, 480, 540, [[0, '#04060c'], [0.5, '#0b1020'], [1, '#1a2336']]);
  stars(ctx, 480, 220, 50);
  // CBD towers
  ctx.fillStyle = '#0c1326';
  [[0, 180, 70, 360], [65, 120, 55, 420], [115, 210, 80, 330], [190, 90, 60, 450],
   [245, 170, 75, 370], [315, 140, 65, 400], [375, 200, 70, 340], [440, 160, 40, 380]]
    .forEach(([x, y, w, h]) => {
      ctx.fillRect(x, y, w, h);
      windows(ctx, x, y, w, h, 'rgba(255,220,130,0.4)', 0.3);
    });
  // tear gas haze
  [[90, 470, 90], [260, 480, 110], [410, 460, 80]].forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, 'rgba(190,195,200,0.30)');
    g.addColorStop(1, 'rgba(190,195,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  });
  addTex(scene, 'admiralty_far', c);

  // mid: harcourt road flyover, government offices, smoke and banners
  c = makeCanvas(768, 540);
  ctx = c.getContext('2d');
  // government office block behind the flyover
  ctx.fillStyle = '#101828';
  ctx.fillRect(80, 80, 240, 320);
  windows(ctx, 80, 80, 240, 320, 'rgba(180,210,255,0.30)', 0.25);
  ctx.fillRect(480, 110, 200, 290);
  windows(ctx, 480, 110, 200, 290, 'rgba(180,210,255,0.30)', 0.25);
  // elevated flyover deck
  ctx.fillStyle = '#1c2433';
  ctx.fillRect(0, 230, 768, 36);
  ctx.fillStyle = '#141a26';
  ctx.fillRect(0, 266, 768, 10);
  [60, 240, 420, 600].forEach((x) => {
    ctx.fillStyle = '#161e2c';
    ctx.fillRect(x, 276, 26, 198); // pillars
  });
  // banner draped off the flyover
  const banner = (x, text) => {
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, 276, 46, 150);
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold 26px ${CJK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [...text].forEach((ch, i) => ctx.fillText(ch, x + 23, 288 + i * 30));
  };
  banner(330, '香港人');
  banner(700, '加油');
  // drifting smoke
  [[180, 320, 70], [520, 350, 90], [680, 310, 60]].forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, 'rgba(200,205,210,0.22)');
    g.addColorStop(1, 'rgba(200,205,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  });
  addTex(scene, 'admiralty_mid', c);

  // near: road gantry sign, barricades, planted yellow umbrellas, cones
  c = makeCanvas(1024, 540);
  ctx = c.getContext('2d');
  // green highway gantry sign
  ctx.fillStyle = '#37474f';
  ctx.fillRect(180, 60, 8, 240);
  ctx.fillRect(560, 60, 8, 240);
  ctx.fillStyle = '#00703c';
  ctx.fillRect(140, 90, 470, 86);
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 3;
  ctx.strokeRect(146, 96, 458, 74);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('金鐘 Admiralty ➜', 375, 133);
  // mills barrier fences
  const fence = (x) => {
    ctx.strokeStyle = '#9aa4ae';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, 400, 110, 64);
    ctx.lineWidth = 2.5;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * 22, 400); ctx.lineTo(x + i * 22, 464); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x - 8, 470); ctx.lineTo(x + 16, 400); ctx.stroke();
  };
  fence(60);
  fence(330);
  fence(820);
  // planted yellow umbrellas
  const umbrella = (x, y, r) => {
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 60); ctx.stroke();
    ctx.save();
    ctx.shadowColor = 'rgba(255,215,0,0.7)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y - r * 0.9, x + r, y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = 1.5;
    [-r * 0.5, 0, r * 0.5].forEach((dx) => {
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.82); ctx.lineTo(x + dx, y); ctx.stroke();
    });
  };
  umbrella(240, 410, 34);
  umbrella(520, 396, 40);
  umbrella(580, 414, 28);
  umbrella(960, 404, 34);
  // traffic cones
  [150, 460, 700, 1000].forEach((x) => {
    ctx.fillStyle = '#ef6c00';
    ctx.beginPath();
    ctx.moveTo(x, 430); ctx.lineTo(x + 12, 466); ctx.lineTo(x - 12, 466);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(x - 7, 446, 14, 6);
  });
  addTex(scene, 'admiralty_near', c);

  // ground: rain-slick asphalt, yellow reflections, lane markings
  c = makeCanvas(256, 74);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#101218';
  ctx.fillRect(0, 0, 256, 74);
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, 256, 5);
  reflections(ctx, 256, 5, 62, ['rgba(255,215,0,1)', 'rgba(255,255,255,1)', 'rgba(180,210,255,1)']);
  // lane dashes
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let x = 8; x < 256; x += 64) ctx.fillRect(x, 38, 30, 4);
  ctx.fillStyle = 'rgba(150,180,255,0.06)';
  [[30, 30, 60, 9], [160, 56, 70, 8]].forEach(([x, y, w, h]) => {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y, w / 2, h / 2, 0, 0, PI2);
    ctx.fill();
  });
  addTex(scene, 'admiralty_ground', c);
}

function genLegco(scene) {
  // far: night sky, searchlight beams, LegCo complex silhouette
  let c = makeCanvas(480, 540);
  let ctx = c.getContext('2d');
  skyGradient(ctx, 480, 540, [[0, '#05070e'], [0.55, '#0d1322'], [1, '#1c2438']]);
  stars(ctx, 480, 220, 45);
  // searchlight beams
  [[120, -0.18], [330, 0.22]].forEach(([x, a]) => {
    ctx.save();
    ctx.translate(x, 540);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, -560);
    g.addColorStop(0, 'rgba(220,235,255,0.16)');
    g.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(-70, -560); ctx.lineTo(70, -560); ctx.lineTo(12, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });
  // office towers behind
  ctx.fillStyle = '#0c1224';
  [[0, 160, 80, 380], [90, 120, 60, 420], [340, 140, 70, 400], [420, 190, 60, 350]]
    .forEach(([x, y, w, h]) => {
      ctx.fillRect(x, y, w, h);
      windows(ctx, x, y, w, h, 'rgba(255,220,130,0.35)', 0.25);
    });
  // LegCo low block with round-top council chamber
  ctx.fillStyle = '#111a30';
  ctx.fillRect(150, 330, 200, 210);
  ctx.beginPath();
  ctx.arc(250, 330, 78, Math.PI, 0);
  ctx.fill();
  windows(ctx, 160, 350, 180, 130, 'rgba(180,210,255,0.35)', 0.3);
  addTex(scene, 'legco_far', c);

  // mid: government facade — columns, glass wall, banners, graffiti
  c = makeCanvas(768, 540);
  ctx = c.getContext('2d');
  // glass curtain wall
  for (let x = 0; x < 768; x += 96) {
    const g = ctx.createLinearGradient(0, 80, 0, 474);
    g.addColorStop(0, 'rgba(35,55,90,0.35)');
    g.addColorStop(1, 'rgba(18,28,50,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 6, 80, 84, 394);
    ctx.strokeStyle = '#26334e';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 6, 80, 84, 394);
  }
  // concrete columns
  [40, 230, 420, 610].forEach((x) => {
    ctx.fillStyle = '#2a3142';
    ctx.fillRect(x, 60, 44, 414);
    ctx.fillStyle = '#1d2433';
    ctx.fillRect(x + 36, 60, 8, 414);
  });
  // spray-paint graffiti on the columns
  ctx.save();
  ctx.font = `bold 30px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,215,0,0.85)';
  ctx.translate(252, 300);
  ctx.rotate(-0.08);
  ctx.fillText('自', 0, -20);
  ctx.fillText('由', 0, 16);
  ctx.restore();
  // hanging protest banners
  const banner = (x, w, text) => {
    ctx.fillStyle = '#111111';
    ctx.fillRect(x, 90, w, 200);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, 94, w - 8, 192);
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold 30px ${CJK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [...text].forEach((ch, i) => ctx.fillText(ch, x + w / 2, 104 + i * 36));
  };
  banner(120, 56, '撐香港');
  banner(500, 56, '企硬');
  addTex(scene, 'legco_mid', c);

  // near: linked crowd barriers, placards, shattered glass, cones
  c = makeCanvas(1024, 540);
  ctx = c.getContext('2d');
  // crowd barriers chained across
  const barrier = (x) => {
    ctx.strokeStyle = '#9aa4ae';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, 398, 120, 66);
    ctx.lineWidth = 2.5;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * 20, 398); ctx.lineTo(x + i * 20, 464); ctx.stroke();
    }
  };
  barrier(40);
  barrier(170);
  barrier(540);
  barrier(900);
  // leaning placards
  const placard = (x, tilt, text) => {
    ctx.save();
    ctx.translate(x, 420);
    ctx.rotate(tilt);
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-3, 0, 6, 52);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(-40, -52, 80, 54);
    ctx.fillStyle = '#111111';
    ctx.font = `bold 24px ${CJK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, -25);
    ctx.restore();
  };
  placard(330, -0.12, '加油');
  placard(740, 0.1, '自由');
  // shattered glass glitter
  ctx.fillStyle = 'rgba(200,230,255,0.65)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 89 + 17) % 1024;
    const y = 440 + ((i * 31) % 30);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i * 37) % 6);
    ctx.fillRect(-2.5, -1.2, 5, 2.4);
    ctx.restore();
  }
  // cones
  [240, 660, 990].forEach((x) => {
    ctx.fillStyle = '#ef6c00';
    ctx.beginPath();
    ctx.moveTo(x, 432); ctx.lineTo(x + 12, 468); ctx.lineTo(x - 12, 468);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(x - 7, 448, 14, 6);
  });
  addTex(scene, 'legco_near', c);

  // ground: pale stone plaza with glass sparkle
  c = makeCanvas(256, 74);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#23262e';
  ctx.fillRect(0, 0, 256, 74);
  ctx.fillStyle = '#2e323c';
  ctx.fillRect(0, 0, 256, 5);
  reflections(ctx, 256, 5, 56, ['rgba(220,235,255,1)', 'rgba(255,215,0,1)']);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 256; x += 52) {
    ctx.beginPath(); ctx.moveTo(x, 5); ctx.lineTo(x - 8, 74); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200,230,255,0.35)';
  for (let i = 0; i < 18; i++) ctx.fillRect((i * 53) % 256, 10 + ((i * 37) % 56), 3, 1.5);
  addTex(scene, 'legco_ground', c);
}

function genPolyu(scene) {
  // far: smoke-filled night sky lit by fires, campus towers, embers
  let c = makeCanvas(480, 540);
  let ctx = c.getContext('2d');
  skyGradient(ctx, 480, 540, [[0, '#0a0608'], [0.5, '#1d0f10'], [0.8, '#3d1a12'], [1, '#5c2414']]);
  // smoke columns
  [[110, 60], [300, 80], [430, 50]].forEach(([x, r]) => {
    for (let i = 0; i < 5; i++) {
      const g = ctx.createRadialGradient(x + i * 8, 420 - i * 78, 6, x + i * 8, 420 - i * 78, r);
      g.addColorStop(0, 'rgba(60,55,58,0.5)');
      g.addColorStop(1, 'rgba(60,55,58,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r + i * 8, 420 - i * 78 - r, r * 2, r * 2);
    }
  });
  // campus tower blocks
  ctx.fillStyle = '#1a0f10';
  [[0, 220, 90, 320], [100, 170, 80, 370], [310, 200, 90, 340], [410, 160, 70, 380]]
    .forEach(([x, y, w, h]) => {
      ctx.fillRect(x, y, w, h);
      windows(ctx, x, y, w, h, 'rgba(255,140,60,0.4)', 0.2);
    });
  // fire glow at street level
  const glow = ctx.createLinearGradient(0, 360, 0, 540);
  glow.addColorStop(0, 'rgba(255,110,40,0)');
  glow.addColorStop(1, 'rgba(255,110,40,0.35)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 360, 480, 180);
  // embers
  ctx.fillStyle = 'rgba(255,170,60,0.9)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 97 + 31) % 480;
    const y = 180 + ((i * 53 + 11) % 320);
    ctx.globalAlpha = 0.3 + ((i * 37) % 60) / 100;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  addTex(scene, 'polyu_far', c);

  // mid: red-brick facade with arched corridors, fires inside, banners
  c = makeCanvas(768, 540);
  ctx = c.getContext('2d');
  // brick wall
  ctx.fillStyle = '#4a1f18';
  ctx.fillRect(0, 60, 768, 414);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  for (let y = 60; y < 474; y += 22) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(768, y); ctx.stroke();
  }
  for (let y = 60; y < 474; y += 22) {
    for (let x = (y / 22) % 2 ? 0 : 24; x < 768; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 22); ctx.stroke();
    }
  }
  // arched corridor openings, some glowing with fire
  [[60, false], [240, true], [420, false], [600, true]].forEach(([x, burning]) => {
    ctx.fillStyle = burning ? '#2a0d06' : '#140808';
    ctx.fillRect(x, 230, 110, 244);
    ctx.beginPath();
    ctx.arc(x + 55, 230, 55, Math.PI, 0);
    ctx.fill();
    if (burning) {
      const g = ctx.createRadialGradient(x + 55, 430, 8, x + 55, 430, 90);
      g.addColorStop(0, 'rgba(255,160,50,0.85)');
      g.addColorStop(0.5, 'rgba(255,90,30,0.4)');
      g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 250, 110, 224);
    }
  });
  // rooftop banner
  ctx.fillStyle = '#111111';
  ctx.fillRect(300, 90, 200, 60);
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold 34px ${CJK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOS 理大', 400, 120);
  addTex(scene, 'polyu_mid', c);

  // near: burning barricades, debris, scattered bricks
  c = makeCanvas(1024, 540);
  ctx = c.getContext('2d');
  const flame = (x, y, s) => {
    ctx.save();
    ctx.shadowColor = '#ff8a30';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#ff7020';
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y);
    ctx.quadraticCurveTo(x - 10 * s, y - 26 * s, x, y - 38 * s);
    ctx.quadraticCurveTo(x + 12 * s, y - 22 * s, x + 14 * s, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffc14d';
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y);
    ctx.quadraticCurveTo(x - 4 * s, y - 14 * s, x, y - 20 * s);
    ctx.quadraticCurveTo(x + 6 * s, y - 12 * s, x + 7 * s, y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  // barricade piles: stacked tables / boards with fires on top
  const barricade = (x) => {
    ctx.fillStyle = '#23201e';
    ctx.fillRect(x, 420, 150, 50);
    ctx.fillStyle = '#322c28';
    ctx.fillRect(x + 16, 392, 118, 30);
    ctx.fillStyle = '#1c1916';
    ctx.fillRect(x + 38, 368, 76, 26);
    // protruding poles
    ctx.strokeStyle = '#3e362e';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 20, 420); ctx.lineTo(x - 16, 372); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 130, 420); ctx.lineTo(x + 164, 380); ctx.stroke();
    flame(x + 60, 372, 1.1);
    flame(x + 96, 376, 0.8);
    // glow on the ground
    const g = ctx.createRadialGradient(x + 75, 462, 8, x + 75, 462, 120);
    g.addColorStop(0, 'rgba(255,130,40,0.30)');
    g.addColorStop(1, 'rgba(255,130,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 50, 380, 260, 100);
  };
  barricade(120);
  barricade(580);
  barricade(880);
  // scattered bricks
  ctx.fillStyle = '#6d3a28';
  for (let i = 0; i < 26; i++) {
    const x = (i * 97 + 40) % 1024;
    const y = 440 + ((i * 31) % 26);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((i * 41) % 10) / 14 - 0.35);
    ctx.fillRect(-7, -3.5, 14, 7);
    ctx.restore();
  }
  addTex(scene, 'polyu_near', c);

  // ground: brick pavers lit by fire
  c = makeCanvas(256, 74);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#1d1210';
  ctx.fillRect(0, 0, 256, 74);
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(0, 0, 256, 5);
  reflections(ctx, 256, 5, 58, ['rgba(255,130,40,1)', 'rgba(255,200,80,1)']);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  for (let y = 14; y < 74; y += 18) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  for (let y = 14; y < 74; y += 18) {
    for (let x = (y / 18) % 2 ? 0 : 20; x < 256; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke();
    }
  }
  addTex(scene, 'polyu_ground', c);
}

/* ------------------------------------------------------------------ */
/* Weapons, projectiles, cutscene props                                */
/* ------------------------------------------------------------------ */

function generateWeapons(scene) {
  // 雨傘 yellow umbrella
  let c = makeCanvas(26, 26);
  let ctx = c.getContext('2d');
  ctx.strokeStyle = '#37474f';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(13, 8); ctx.lineTo(13, 23); ctx.stroke();
  ctx.beginPath(); ctx.arc(15, 23, 2.5, 0, Math.PI); ctx.stroke(); // hook handle
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(2, 10);
  ctx.quadraticCurveTo(13, -4, 24, 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f9a825';
  ctx.lineWidth = 1.2;
  [6, 13, 20].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(13, 1); ctx.lineTo(x, 10); ctx.stroke();
  });
  addTex(scene, 'wpn_chopper', c);

  // 汽油彈 molotov
  c = makeCanvas(26, 26);
  ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(230,140,60,0.9)';
  ctx.fillRect(10, 10, 7, 14);
  ctx.fillRect(12, 5, 3, 6);
  ctx.fillStyle = 'rgba(255,220,160,0.6)';
  ctx.fillRect(11, 12, 2, 10);
  // burning rag
  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(11.5, 2, 4, 4);
  ctx.fillStyle = '#ff9800';
  ctx.beginPath(); ctx.arc(13.5, 1.5, 2.4, 0, PI2); ctx.fill();
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath(); ctx.arc(13.5, 1, 1.2, 0, PI2); ctx.fill();
  addTex(scene, 'wpn_bottle', c);

  // 旗桿 flag pole with protest flag
  c = makeCanvas(26, 26);
  ctx = c.getContext('2d');
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4, 24); ctx.lineTo(22, 4); ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(21, 3); ctx.lineTo(12, 2); ctx.lineTo(16, 9);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(14, 3.5); ctx.stroke();
  addTex(scene, 'wpn_rod', c);

  // 路障 traffic cone / barricade slab
  c = makeCanvas(26, 26);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#ef6c00';
  ctx.beginPath();
  ctx.moveTo(13, 3); ctx.lineTo(20, 22); ctx.lineTo(6, 22);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.moveTo(11, 10); ctx.lineTo(15, 10); ctx.lineTo(16.5, 14.5); ctx.lineTo(9.5, 14.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e65100';
  ctx.fillRect(3, 22, 20, 3);
  addTex(scene, 'wpn_chair', c);
}

function generateProjectiles(scene) {
  // cannonball
  let c = makeCanvas(18, 18);
  let ctx = c.getContext('2d');
  ctx.fillStyle = '#21252b';
  ctx.beginPath(); ctx.arc(9, 9, 8, 0, PI2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(6, 6, 3, 0, PI2); ctx.fill();
  addTex(scene, 'proj_cannonball', c);

  // water wave crest
  c = makeCanvas(36, 28);
  ctx = c.getContext('2d');
  const wg = ctx.createLinearGradient(0, 0, 0, 28);
  wg.addColorStop(0, 'rgba(190,240,255,0.95)');
  wg.addColorStop(1, 'rgba(40,120,200,0.85)');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(0, 28);
  ctx.quadraticCurveTo(6, 4, 20, 8);
  ctx.quadraticCurveTo(14, 12, 18, 16);
  ctx.quadraticCurveTo(26, 10, 36, 14);
  ctx.lineTo(36, 28);
  ctx.closePath(); ctx.fill();
  addTex(scene, 'proj_wave', c);

  // chili powder cloud
  c = makeCanvas(30, 30);
  ctx = c.getContext('2d');
  [[15, 15, 12], [8, 18, 8], [22, 18, 8], [15, 8, 7]].forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(255,80,40,0.85)');
    g.addColorStop(1, 'rgba(200,40,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 30, 30);
  });
  addTex(scene, 'proj_chili', c);

  // thrown cleaver
  c = makeCanvas(16, 16);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#cfd8dc';
  ctx.beginPath();
  ctx.moveTo(2, 11); ctx.lineTo(10, 3); ctx.lineTo(13, 6); ctx.lineTo(6, 14);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(1, 11, 5, 4);
  addTex(scene, 'proj_cleaver', c);

  // shadow dagger
  c = makeCanvas(18, 8);
  ctx = c.getContext('2d');
  ctx.fillStyle = '#b09cd8';
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(13, 1); ctx.lineTo(13, 7);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(13, 1.5, 5, 5);
  addTex(scene, 'proj_dagger', c);
}

// Horizontal dry-brush ink stroke used by the stage intro cutscene.
function generateBrush(scene) {
  const W = 520;
  const H = 130;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const mid = H / 2;
  // main body: stacked horizontal strokes with ragged ends
  ctx.fillStyle = '#efe6d0';
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const y = mid + (t - 0.5) * 74 + Math.sin(i * 2.7) * 4;
    const x0 = 8 + Math.abs(Math.sin(i * 1.9)) * 26 * (1 - Math.abs(t - 0.5));
    const x1 = W - 8 - Math.abs(Math.cos(i * 2.3)) * 60 * Math.abs(t - 0.5) * 2;
    const thick = (1 - Math.abs(t - 0.5) * 1.7) * 9 + 1;
    ctx.globalAlpha = 0.5 + (1 - Math.abs(t - 0.5) * 2) * 0.5;
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, y, (x1 - x0) / 2, thick, 0, 0, PI2);
    ctx.fill();
  }
  // dry-brush streaks trailing off the right edge
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 14; i++) {
    const y = mid + (i / 14 - 0.5) * 56 + Math.sin(i * 3.1) * 3;
    ctx.fillRect(W - 130 + (i * 31) % 70, y, 50 + (i * 17) % 60, 2.4);
  }
  // ink spatter
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 18; i++) {
    const x = (i * 89 + 40) % W;
    const y = mid + (((i * 53) % 90) - 45);
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, PI2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  addTex(scene, 'fx_brush', c);
}

/* ------------------------------------------------------------------ */

export function generateAllTextures(scene) {
  generateFighters(scene);
  generateItems(scene);
  generateParticles(scene);
  generateWeapons(scene);
  generateProjectiles(scene);
  generateBrush(scene);
  genAdmiralty(scene);
  genLegco(scene);
  genYuenlong(scene);
  genPolyu(scene);
}
