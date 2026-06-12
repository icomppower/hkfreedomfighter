// Global game constants shared across scenes / entities / systems.

export const GAME_W = 960;
export const GAME_H = 540;

// Y coordinate of the ground plane (entity origins are bottom-center).
export const GROUND_Y = 474;

// Duration of a single logic frame in ms — combat data is authored in
// 60fps frames (startup / active / recovery), converted at runtime.
export const FRAME_MS = 1000 / 60;

// Character render scale (sprite frames are 48x64 source pixels).
export const CHAR_SCALE = 1.5;

export const STORAGE = {
  SCORES: 'hkb_scores',
  INITIALS: 'hkb_initials',
  CHECKPOINT: 'hkb_checkpoint',
};

export const DEPTH = {
  BG_FAR: 0,
  BG_MID: 1,
  BG_NEAR: 2,
  GROUND: 3,
  SHADOW: 4,
  ITEM: 5,
  ENEMY: 6,
  PLAYER: 7,
  FX: 8,
  RAIN: 9,
};
