// Pickup weapon definitions (see GAME_DESIGN.md WEAPONS).
//
// A held weapon replaces the punch button with a single swing built by
// weaponMove(); the weapon breaks at the end of any swing that landed.
//   damage      HP removed per enemy hit
//   range       reach of the swing in screen px
//   maxTargets  how many enemies one swing may hit (rod = unlimited)
//   stun        ms the victim stays staggered (bottle)
//   wwe         chair Easter egg: announcer popup when the swing KOs

import { CHAR_SCALE } from '../constants.js';

export const WEAPONS = {
  chopper: {
    zh: '雨傘', en: 'UMBRELLA', tex: 'wpn_chopper',
    damage: 25, range: 55, maxTargets: 1,
    knockback: { x: 420, y: -260 }, knockdown: true,
  },
  bottle: {
    zh: '汽油彈', en: 'MOLOTOV', tex: 'wpn_bottle',
    damage: 15, range: 45, maxTargets: 1,
    knockback: { x: 160, y: 0 }, stun: 1500,
  },
  rod: {
    zh: '旗桿', en: 'FLAG POLE', tex: 'wpn_rod',
    damage: 20, range: 70, maxTargets: Infinity,
    knockback: { x: 300, y: -200 }, knockdown: true,
  },
  chair: {
    zh: '路障', en: 'BARRIER', tex: 'wpn_chair',
    damage: 30, range: 50, maxTargets: 2,
    knockback: { x: 380, y: -320 }, knockdown: true, wwe: true,
  },
};

// Build the player move executed when swinging `type`.
export function weaponMove(type) {
  const w = WEAPONS[type];
  const reach = w.range / CHAR_SCALE; // hitbox is authored in source-frame px
  return {
    anim: 'punch3', startup: 6, active: 5, recovery: 14,
    damage: w.damage, freeze: 12, hitstun: 22,
    knockback: w.knockback, knockdown: w.knockdown || false,
    stun: w.stun, maxTargets: w.maxTargets, wwe: w.wwe,
    hitbox: { fx: reach / 2 + 6, fy: 31, w: reach + 10, h: 24 },
    weapon: type, spGain: 0.1, sfx: 'kick', label: w.zh,
  };
}

// Weighted random pick from a stage's weaponWeights table.
export function pickWeapon(weights) {
  const entries = Object.entries(weights || {}).filter(([k]) => WEAPONS[k]);
  if (!entries.length) return 'bottle';
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}
