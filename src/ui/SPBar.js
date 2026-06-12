// Three-segment SP (special points) meter. Each segment fills cyan;
// full segments pulse brighter so the player knows a special is banked.

export default class SPBar {
  constructor(scene, x, y, opts = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.segW = opts.segW ?? 56;
    this.segH = opts.segH ?? 10;
    this.gap = 5;
    this.value = 0; // 0..3, fractional
    this.gfx = scene.add.graphics().setDepth(opts.depth ?? 10);
    this.draw(0);
  }

  set(value) {
    this.value = Phaser.Math.Clamp(value, 0, 3);
  }

  update(time) {
    this.draw(time);
  }

  draw(time) {
    const g = this.gfx;
    g.clear();
    const pulse = 0.75 + 0.25 * Math.sin((time || 0) / 150);
    for (let i = 0; i < 3; i++) {
      const sx = this.x + i * (this.segW + this.gap);
      const fill = Phaser.Math.Clamp(this.value - i, 0, 1);
      g.fillStyle(0x101626, 0.85);
      g.fillRect(sx, this.y, this.segW, this.segH);
      if (fill > 0) {
        const full = fill >= 1;
        g.fillStyle(full ? 0x4dd9ff : 0x1d7fa8, full ? pulse : 1);
        g.fillRect(sx + 1, this.y + 1, (this.segW - 2) * fill, this.segH - 2);
      }
      g.lineStyle(1.5, 0x4dd9ff, 0.9);
      g.strokeRect(sx, this.y, this.segW, this.segH);
    }
  }

  destroy() {
    this.gfx.destroy();
  }
}
