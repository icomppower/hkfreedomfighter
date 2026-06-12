// Stage / wave layout — the four HK Freedom Fighter stages, each with
// four regular waves and a boss wave at the end.
//
// To add a new stage: append an entry here with a `bg` key, then add matching
// background generators in src/assets/textures.js named `<bg>_far`, `<bg>_mid`,
// `<bg>_near`, `<bg>_ground` (see generateBackgrounds). The GameScene picks
// everything else up automatically.
//
// Wave: { triggerX, enemies: [{ type, n }], boss? } — the wave spawns when the
// player crosses triggerX; the arena locks until every enemy in it is dead.
//
// weaponWeights drive the random weapon drop table for the stage
// (see data/weapons.js).

export const ZONES = [
  {
    key: 'admiralty',
    name: '金鐘',
    nameEn: 'ADMIRALTY',
    width: 4600,
    bg: 'admiralty',
    rain: true,
    weaponWeights: { chopper: 3, bottle: 3, rod: 2, chair: 1 },
    waves: [
      { triggerX: 520, enemies: [{ type: 'goon', n: 3 }] },
      { triggerX: 1400, enemies: [{ type: 'goon', n: 2 }, { type: 'knife', n: 1 }] },
      { triggerX: 2300, enemies: [{ type: 'enforcer', n: 1 }, { type: 'goon', n: 2 }] },
      { triggerX: 3200, enemies: [{ type: 'knife', n: 2 }, { type: 'goon', n: 2 }] },
      { triggerX: 4000, boss: true, enemies: [{ type: 'dragon', n: 1 }] },
    ],
  },
  {
    key: 'legco',
    name: '立法會',
    nameEn: 'LEGCO',
    width: 4800,
    bg: 'legco',
    rain: false,
    weaponWeights: { chopper: 1, bottle: 3, rod: 3, chair: 2 },
    waves: [
      { triggerX: 560, enemies: [{ type: 'goon', n: 2 }, { type: 'acrobat', n: 1 }] },
      { triggerX: 1480, enemies: [{ type: 'knife', n: 2 }, { type: 'goon', n: 1 }] },
      { triggerX: 2420, enemies: [{ type: 'enforcer', n: 1 }, { type: 'acrobat', n: 2 }] },
      { triggerX: 3340, enemies: [{ type: 'enforcer', n: 1 }, { type: 'knife', n: 1 }, { type: 'goon', n: 2 }] },
      { triggerX: 4200, boss: true, enemies: [{ type: 'pirate', n: 1 }] },
    ],
  },
  {
    key: 'yuenlong',
    name: '元朗',
    nameEn: 'YUEN LONG',
    width: 4800,
    bg: 'yuenlong',
    rain: false,
    weaponWeights: { chopper: 3, bottle: 2, rod: 1, chair: 3 },
    waves: [
      { triggerX: 540, enemies: [{ type: 'goon', n: 3 }, { type: 'knife', n: 1 }] },
      { triggerX: 1460, enemies: [{ type: 'acrobat', n: 2 }, { type: 'goon', n: 2 }] },
      { triggerX: 2400, enemies: [{ type: 'enforcer', n: 2 }, { type: 'knife', n: 1 }] },
      { triggerX: 3320, enemies: [{ type: 'knife', n: 2 }, { type: 'acrobat', n: 2 }] },
      { triggerX: 4200, boss: true, enemies: [{ type: 'queen', n: 1 }] },
    ],
  },
  {
    key: 'polyu',
    name: '理工大學',
    nameEn: 'POLYU SIEGE',
    width: 5000,
    bg: 'polyu',
    rain: false,
    weaponWeights: { chopper: 1, bottle: 2, rod: 3, chair: 3 },
    waves: [
      { triggerX: 560, enemies: [{ type: 'knife', n: 2 }, { type: 'acrobat', n: 1 }] },
      { triggerX: 1500, enemies: [{ type: 'enforcer', n: 1 }, { type: 'goon', n: 3 }] },
      { triggerX: 2460, enemies: [{ type: 'acrobat', n: 2 }, { type: 'knife', n: 2 }] },
      { triggerX: 3400, enemies: [{ type: 'enforcer', n: 2 }, { type: 'acrobat', n: 1 }, { type: 'goon', n: 1 }] },
      { triggerX: 4380, boss: true, enemies: [{ type: 'shadow', n: 1 }] },
    ],
  },
];
