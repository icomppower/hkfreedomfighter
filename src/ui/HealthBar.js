// Gold-outlined gradient health bar with a trailing "ghost" segment that
// lags behind damage. Used for both the player (top-left) and the boss
// (bottom-center).

export default class HealthBar {
  constructor(scene, x, y, width, height, opts = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.colors = opts.colors || [0xff5252, 0xb71c1c];
    this.value = 1;
    this.ghost = 1;
    this.gfx = scene.add.graphics().setDepth(opts.depth ?? 10);
    if (opts.label) {
      this.label = scene.add.text(x, y - 16, opts.label, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffd54f', fontStyle: 'bold',
      }).setDepth(opts.depth ?? 10);
    }
    this.draw();
  }

  set(current, max) {
    this.value = Phaser.Math.Clamp(max > 0 ? current / max : 0, 0, 1);
  }

  update() {
    // Ghost bar eases down toward the real value.
    if (this.ghost > this.value) {
      this.ghost = Math.max(this.value, this.ghost - 0.008);
    } else {
      this.ghost = this.value;
    }
    this.draw();
  }

  draw() {
    const g = this.gfx;
    const { x, y, width: w, height: h } = this;
    g.clear();
    g.fillStyle(0x14101c, 0.85);
    g.fillRect(x, y, w, h);
    if (this.ghost > 0) {
      g.fillStyle(0xffe082, 0.55);
      g.fillRect(x + 2, y + 2, (w - 4) * this.ghost, h - 4);
    }
    if (this.value > 0) {
      g.fillGradientStyle(this.colors[0], this.colors[0], this.colors[1], this.colors[1], 1);
      g.fillRect(x + 2, y + 2, (w - 4) * this.value, h - 4);
    }
    g.lineStyle(2, 0xffd54f, 1);
    g.strokeRect(x, y, w, h);
  }

  setVisible(v) {
    this.gfx.setVisible(v);
    this.label?.setVisible(v);
  }

  destroy() {
    this.gfx.destroy();
    this.label?.destroy();
  }
}
