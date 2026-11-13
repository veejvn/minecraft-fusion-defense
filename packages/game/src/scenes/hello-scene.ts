import * as Phaser from 'phaser';

export class HelloScene extends Phaser.Scene {
  constructor(onFirstRender: () => void) {
    super({ key: 'HelloScene' });
    this.onFirstRender = onFirstRender;
  }

  private readonly onFirstRender: () => void;

  create(): void {
    this.events.once(Phaser.Scenes.Events.RENDER, this.onFirstRender);
    this.cameras.main.setBackgroundColor('#1E293B');
    this.add.text(640, 360, 'Phaser Ready', {
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontSize: '48px',
    }).setOrigin(0.5);
  }
}
