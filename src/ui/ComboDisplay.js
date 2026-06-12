// Combo counter: big punchy number + streak label, scale-in on every hit,
// fades out shortly after the combo drops.

export default class ComboDisplay {
  constructor(scene, x, y) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setDepth(11).setAlpha(0);
    this.countText = scene.add.text(0, 0, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '52px',
      color: '#ffe14d', stroke: '#7a1010', strokeThickness: 8, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.labelText = scene.add.text(0, 42, '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '22px',
      color: '#ff5d8f', stroke: '#2a0418', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.hitsText = scene.add.text(0, -38, 'HITS', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add([this.countText, this.labelText, this.hitsText]);
    this.fadeTimer = null;
  }

  show(count, label) {
    if (count < 2) {
      this.fadeOut();
      return;
    }
    this.countText.setText(String(count));
    this.labelText.setText(label || '');
    this.container.setAlpha(1);
    this.scene.tweens.killTweensOf(this.container);
    this.container.setScale(1.5);
    this.scene.tweens.add({
      targets: this.container, scale: 1, duration: 140, ease: 'Back.Out',
    });
    if (this.fadeTimer) this.fadeTimer.remove();
    this.fadeTimer = this.scene.time.delayedCall(1500, () => this.fadeOut());
  }

  fadeOut() {
    this.scene.tweens.add({ targets: this.container, alpha: 0, duration: 250 });
  }

  destroy() {
    if (this.fadeTimer) this.fadeTimer.remove();
    this.container.destroy();
  }
}
