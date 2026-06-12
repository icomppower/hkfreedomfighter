// Registers every character animation with the global anim manager.
// Animation keys follow `<charKey>-<animName>`; textures `<charKey>_<animName>`.

import { POSES, ANIM_RATES } from '../assets/textures.js';
import { PALETTES } from '../data/enemies.js';

export function registerAllAnimations(scene) {
  for (const charKey of Object.keys(PALETTES)) {
    for (const [anim, poses] of Object.entries(POSES)) {
      const key = `${charKey}-${anim}`;
      if (scene.anims.exists(key)) continue;
      const [frameRate, repeat] = ANIM_RATES[anim] || [10, 0];
      scene.anims.create({
        key,
        frames: poses.map((_, i) => ({ key: `${charKey}_${anim}`, frame: i })),
        frameRate,
        repeat,
      });
    }
  }
}
