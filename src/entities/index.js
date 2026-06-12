// Enemy type registry — the spawner instantiates classes by config key.
// Register new enemy classes here after adding their config to data/enemies.js.

import Goon from './Goon.js';
import Enforcer from './Enforcer.js';
import KnifeFighter from './KnifeFighter.js';
import Acrobat from './Acrobat.js';
import Clone from './Clone.js';
import Dragon from './Dragon.js';
import Pirate from './Pirate.js';
import Queen from './Queen.js';
import Shadow from './Shadow.js';

export const ENEMY_CLASSES = {
  goon: Goon,
  enforcer: Enforcer,
  knife: KnifeFighter,
  acrobat: Acrobat,
  clone: Clone,
  dragon: Dragon,
  pirate: Pirate,
  queen: Queen,
  shadow: Shadow,
};
