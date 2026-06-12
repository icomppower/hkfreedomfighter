// Player move data. All timing values are in 60fps frames.
//
// Shape of a move:
//   anim            animation suffix (textures: `keung_<anim>`, anims: `keung-<anim>`)
//   startup/active/recovery   frame counts for the three attack phases
//   damage          HP removed (enemy HP is small: goon=3, boss=40)
//   freeze          hitstop frames applied to attacker+victim on contact (8-12)
//   hitstun         how long the victim staggers, in frames
//   knockback       {x, y} velocity applied to victim (x is along facing)
//   hitbox          {fx, fy, w, h} in source-frame px: fx = forward offset of the
//                   box center from the sprite center, fy = height of the box
//                   center above the feet. Scaled by sprite scale at runtime.
//   chains          {Z: moveKey, X: moveKey} — buffered follow-ups
//   chainFrom       earliest frame the buffered chain may start (default: end of active)
//   launcher        sends the victim airborne (juggle state)
//   knockdown       victim falls and must get up
//   spGain          SP bars gained by the player on a clean hit
//   cost            SP bars consumed (specials)
//   dash            horizontal velocity applied during active frames
//   rehit           for multi-hit moves: clear the hit registry every N frames
//   activeUntilLand active frames last until the attacker touches the ground
//   aura            cosmetic glow flag (specials)

export const PLAYER_MOVES = {
  punch1: {
    anim: 'punch1', startup: 3, active: 3, recovery: 8,
    damage: 1, freeze: 8, hitstun: 16, knockback: { x: 140, y: 0 },
    hitbox: { fx: 16, fy: 31, w: 26, h: 14 },
    chains: { Z: 'punch2', X: 'launcher' }, chainFrom: 8, spGain: 0.12, sfx: 'punch',
  },
  punch2: {
    anim: 'punch2', startup: 4, active: 3, recovery: 9,
    damage: 1, freeze: 8, hitstun: 18, knockback: { x: 170, y: 0 },
    hitbox: { fx: 16, fy: 31, w: 26, h: 14 },
    chains: { Z: 'punch3', X: 'launcher' }, chainFrom: 9, spGain: 0.12, sfx: 'punch',
  },
  punch3: {
    anim: 'punch3', startup: 5, active: 3, recovery: 13,
    damage: 1.5, freeze: 10, hitstun: 20, knockback: { x: 300, y: -180 },
    hitbox: { fx: 18, fy: 30, w: 28, h: 16 },
    knockdown: true, spGain: 0.16, sfx: 'kick',
  },
  kick: {
    anim: 'kick', startup: 5, active: 4, recovery: 11,
    damage: 1.5, freeze: 9, hitstun: 18, knockback: { x: 190, y: 0 },
    hitbox: { fx: 18, fy: 30, w: 28, h: 16 },
    chains: { Z: 'sweep' }, chainFrom: 10, spGain: 0.14, sfx: 'kick',
  },
  sweep: {
    anim: 'sweep', startup: 6, active: 4, recovery: 13,
    damage: 1, freeze: 9, hitstun: 18, knockback: { x: 220, y: -140 },
    hitbox: { fx: 16, fy: 8, w: 30, h: 12 },
    knockdown: true, spGain: 0.14, sfx: 'kick',
  },
  launcher: {
    anim: 'launcher', startup: 6, active: 4, recovery: 14,
    damage: 1.5, freeze: 10, hitstun: 24, knockback: { x: 70, y: -620 },
    hitbox: { fx: 13, fy: 34, w: 24, h: 32 },
    launcher: true, spGain: 0.16, sfx: 'kick',
  },
  uppercut: {
    anim: 'uppercut', startup: 5, active: 5, recovery: 15,
    damage: 2, freeze: 11, hitstun: 24, knockback: { x: 40, y: -700 },
    hitbox: { fx: 9, fy: 42, w: 22, h: 38 },
    launcher: true, spGain: 0.18, sfx: 'kick',
  },
  airpunch: {
    anim: 'airpunch', startup: 3, active: 4, recovery: 7,
    damage: 1, freeze: 8, hitstun: 16, knockback: { x: 170, y: 60 },
    hitbox: { fx: 15, fy: 33, w: 24, h: 14 },
    keepMomentum: true, spGain: 0.12, sfx: 'punch',
  },
  divekick: {
    anim: 'divekick', startup: 4, active: 1, recovery: 9,
    damage: 1.5, freeze: 10, hitstun: 20, knockback: { x: 200, y: -260 },
    hitbox: { fx: 12, fy: 16, w: 24, h: 20 },
    knockdown: true, activeUntilLand: true, keepMomentum: true,
    spGain: 0.16, sfx: 'kick',
  },
  dragonFist: {
    anim: 'specialA', startup: 7, active: 9, recovery: 15,
    damage: 3, freeze: 12, hitstun: 26, knockback: { x: 380, y: -260 },
    hitbox: { fx: 18, fy: 31, w: 34, h: 22 },
    knockdown: true, cost: 1, dash: 540, aura: true,
    spGain: 0, sfx: 'special', label: '龍拳 DRAGON FIST',
  },
  hurricane: {
    anim: 'specialB', startup: 9, active: 30, recovery: 16,
    damage: 1.2, freeze: 8, hitstun: 18, knockback: { x: 120, y: -300 },
    hitbox: { fx: 0, fy: 30, w: 64, h: 38 },
    knockdown: true, cost: 2, rehit: 6, aura: true,
    spGain: 0, sfx: 'special', label: '旋風腿 HURRICANE KICK',
  },
};

export function comboLabel(count) {
  if (count >= 13) return '無雙 MAX!!';
  if (count >= 10) return 'RAMPAGE!';
  if (count >= 8) return 'ULTRA!';
  if (count >= 6) return 'SAVAGE';
  if (count >= 5) return 'PENTA';
  if (count >= 4) return 'QUADRA';
  if (count >= 3) return 'TRIPLE';
  if (count >= 2) return 'DOUBLE';
  return '';
}

// Score multiplier driven by the live combo counter (x1..x5).
export function comboMultiplier(count) {
  return 1 + Math.min(4, Math.floor(count / 4));
}
