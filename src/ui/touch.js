// Shared virtual-input state written by MobileControls and read by Player.
// Held directions mirror keyboard isDown; presses are one-shot and consumed
// by Player.consumeInput() exactly like buffered key presses.

export const TouchState = {
  left: false, right: false, up: false, down: false, block: false,
};

export const TouchPresses = {
  z: false, x: false, jump: false,
};

export function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}
