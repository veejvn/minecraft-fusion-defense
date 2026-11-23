import * as Phaser from 'phaser';
import type { Cell } from '../battlefield/grid';
import {
  PLAYTEST_PIXEL_TEXTURE_KEYS,
  registerPlaytestPixelTextures,
} from '../playtest/procedural-pixel-art';
import type {
  PlaytestController,
  PlaytestDefenderView,
  PlaytestEnemyView,
  PlaytestHudSnapshot,
  PlaytestItemView,
} from '../playtest/playtest-controller';

/** Active canvas pointer tool controlled by the Playtest UI. */
export type PlaytestTool =
  | { readonly kind: 'select' }
  | { readonly kind: 'place'; readonly definitionId: string; readonly freeSandbox: boolean }
  | { readonly kind: 'crystal' }
  | { readonly kind: 'remove' };

/** Visual rendering mode for comparing procedural pixel art vs block placeholders. */
export type PlaytestVisualStyle = 'ai-64' | 'pixel-code' | 'blocks';

interface AiSpriteEntry {
  readonly key: string;
  readonly url: string;
  readonly size1Lane: number;
  readonly size5Lane: number;
  readonly floating?: boolean;
}

const PLAYTEST_AI_GRASS_ASSET = {
  key: 'mfd-ai64-grass',
  url: '/playtest-preview/ai-grassland-tile-64.png',
} as const;

const PLAYTEST_AI_DEFENDER_ASSETS: Readonly<Record<string, AiSpriteEntry>> = {
  iron_golem: { key: 'mfd-ai64-iron-golem', url: '/playtest-preview/ai-iron-golem-64.png', size1Lane: 104, size5Lane: 74 },
  snow_golem: { key: 'mfd-ai64-snow-golem', url: '/playtest-preview/ai-snow-golem-64.png', size1Lane: 96, size5Lane: 68 },
  skeleton: { key: 'mfd-ai64-skeleton', url: '/playtest-preview/ai-skeleton-64.png', size1Lane: 96, size5Lane: 68 },
  wolf: { key: 'mfd-ai64-wolf', url: '/playtest-preview/ai-wolf-64.png', size1Lane: 92, size5Lane: 64 },
  blaze: { key: 'mfd-ai64-blaze', url: '/playtest-preview/ai-blaze-64.png', size1Lane: 96, size5Lane: 68, floating: true },
};

const PLAYTEST_AI_ENEMY_ASSETS: Readonly<Record<string, AiSpriteEntry>> = {
  zombie: { key: 'mfd-ai64-zombie', url: '/playtest-preview/ai-zombie-64.png', size1Lane: 80, size5Lane: 58 },
  husk: { key: 'mfd-ai64-husk', url: '/playtest-preview/ai-husk-64.png', size1Lane: 84, size5Lane: 60 },
  vindicator: { key: 'mfd-ai64-vindicator', url: '/playtest-preview/ai-vindicator-64.png', size1Lane: 84, size5Lane: 60 },
  pillager: { key: 'mfd-ai64-pillager', url: '/playtest-preview/ai-pillager-64.png', size1Lane: 84, size5Lane: 60 },
};

const ALL_PLAYTEST_AI_ASSETS = [
  PLAYTEST_AI_GRASS_ASSET,
  ...Object.values(PLAYTEST_AI_DEFENDER_ASSETS),
  ...Object.values(PLAYTEST_AI_ENEMY_ASSETS),
] as const;

interface GridGeometry {
  readonly originX: number;
  readonly originY: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly rows: number;
  readonly cols: number;
}

type DragState =
  | {
      kind: 'crystal';
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      kind: 'defender-pending';
      sourceId: string;
      sourceCell: Cell;
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      kind: 'defender-fuse';
      sourceId: string;
      sourceCell: Cell;
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    };

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const TOP_BAR_HEIGHT = 76;
const CRYSTAL_ORB_X = 1040;
const CRYSTAL_ORB_Y = 38;
const CRYSTAL_ORB_RADIUS = 24;
const CRYSTAL_HIT_RADIUS = 28;
const ITEM_HIT_RADIUS = 22;
const DRAG_THRESHOLD_PX = 16;
const METEOR_TRAVEL_TICKS = 8;

const DEFAULT_LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#F8FAFC',
  fontStyle: 'bold',
};

function getGridGeometry(showAuxLanes: boolean): GridGeometry {
  if (!showAuxLanes) {
    return {
      originX: 140,
      originY: 230,
      cellW: 110,
      cellH: 180,
      rows: 1,
      cols: 9,
    };
  }
  return {
    originX: 140,
    originY: 120,
    cellW: 110,
    cellH: 104,
    rows: 5,
    cols: 9,
  };
}

function getToolLabel(tool: PlaytestTool): string {
  switch (tool.kind) {
    case 'select':
      return 'TOOL: SELECT / FUSE';
    case 'place':
      return `TOOL: ${tool.freeSandbox ? 'FREE' : 'SUMMON'} ${tool.definitionId.toUpperCase()}`;
    case 'crystal':
      return 'TOOL: CAST ABILITY';
    case 'remove':
      return 'TOOL: REMOVE';
  }
}

/**
 * Interactive Phaser 3.90 playtest scene rendering BattleRuntime snapshots
 * with pooled text labels and persistent cleared graphics layers.
 */
export class PlaytestScene extends Phaser.Scene {
  private readonly controller: PlaytestController;
  private readonly onFirstRender: () => void;

  private tool: PlaytestTool = { kind: 'select' };
  private visualStyle: PlaytestVisualStyle = 'ai-64';
  private snapshot!: PlaytestHudSnapshot;
  private unsubscribe: (() => void) | null = null;
  private dragState: DragState | null = null;
  private hoverCell: Cell | null = null;
  private hoverCrystalOrb = false;
  private needsRender = true;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private gridOverlayGraphics!: Phaser.GameObjects.Graphics;
  private unitGraphics!: Phaser.GameObjects.Graphics;
  private unitHudGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;

  private topStatsText!: Phaser.GameObjects.Text;
  private topModeText!: Phaser.GameObjects.Text;
  private topToolText!: Phaser.GameObjects.Text;
  private crystalOrbText!: Phaser.GameObjects.Text;
  private baseLabelText!: Phaser.GameObjects.Text;
  private spawnLabelText!: Phaser.GameObjects.Text;
  private laneHeaderText!: Phaser.GameObjects.Text;
  private columnTexts: Phaser.GameObjects.Text[] = [];
  private terminalTitleText!: Phaser.GameObjects.Text;
  private terminalSubText!: Phaser.GameObjects.Text;

  private labelPool: Phaser.GameObjects.Text[] = [];
  private labelPoolCursor = 0;
  private tileSpritePool: Phaser.GameObjects.Image[] = [];
  private tileSpritePoolCursor = 0;
  private unitSpritePool: Phaser.GameObjects.Image[] = [];
  private unitSpritePoolCursor = 0;

  constructor(controller: PlaytestController, onFirstRender: () => void) {
    super({ key: 'PlaytestScene' });
    this.controller = controller;
    this.onFirstRender = onFirstRender;
  }

  /** Update active pointer tool from React HUD. */
  setTool(tool: PlaytestTool): void {
    this.tool = tool;
    this.needsRender = true;
  }

  /** Switch between code-authored pixel textures and block placeholders. */
  setVisualStyle(style: PlaytestVisualStyle): void {
    this.visualStyle = style;
    this.needsRender = true;
  }

  init(): void {
    this.dragState = null;
    this.hoverCell = null;
    this.hoverCrystalOrb = false;
    this.needsRender = true;
    this.snapshot = this.controller.getSnapshot();
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      // Safe no-op fallback: render methods check hasLoadedTexture and fall back to pixel-code.
    });
    for (const asset of ALL_PLAYTEST_AI_ASSETS) {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, asset.url);
      }
    }
  }

  private hasLoadedTexture(key: string): boolean {
    if (!this.textures.exists(key)) return false;
    return this.textures.get(key).key !== '__MISSING';
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0F172A');
    this.input.mouse?.disableContextMenu();

    registerPlaytestPixelTextures(this, Phaser.Textures.FilterMode.NEAREST);
    for (const asset of ALL_PLAYTEST_AI_ASSETS) {
      if (this.hasLoadedTexture(asset.key)) {
        this.textures.get(asset.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    this.bgGraphics = this.add.graphics().setDepth(0);
    this.gridOverlayGraphics = this.add.graphics().setDepth(3);
    this.unitGraphics = this.add.graphics().setDepth(10);
    this.unitHudGraphics = this.add.graphics().setDepth(14);
    this.fxGraphics = this.add.graphics().setDepth(20);

    this.createStaticLabels();

    this.snapshot = this.controller.getSnapshot();
    this.unsubscribe = this.controller.subscribe(next => {
      this.snapshot = next;
      this.needsRender = true;
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerCancel, this);

    const cleanup = () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerCancel, this);
      this.dragState = null;
      this.hoverCell = null;
      this.hoverCrystalOrb = false;
      this.labelPool = [];
      this.tileSpritePool = [];
      this.unitSpritePool = [];
      this.columnTexts = [];
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.events.once(Phaser.Scenes.Events.RENDER, this.onFirstRender);

    this.renderScene();
    this.needsRender = false;
  }

  update(_time: number, delta: number): void {
    this.controller.stepMs(delta);
    const hasAnimations =
      this.snapshot.items.length > 0 ||
      this.snapshot.projectiles.length > 0 ||
      this.snapshot.flashes.length > 0 ||
      this.dragState !== null;

    if (this.needsRender || hasAnimations) {
      this.renderScene();
      this.needsRender = false;
    }
  }

  private createStaticLabels(): void {
    this.topStatsText = this.add
      .text(24, 14, '', { fontFamily: 'monospace', fontSize: '16px', color: '#F8FAFC', fontStyle: 'bold' })
      .setDepth(30);

    this.topModeText = this.add
      .text(24, 44, '', { fontFamily: 'monospace', fontSize: '13px', color: '#94A3B8' })
      .setDepth(30);

    this.topToolText = this.add
      .text(560, 44, '', { fontFamily: 'monospace', fontSize: '13px', color: '#38BDF8', fontStyle: 'bold' })
      .setDepth(30);

    this.crystalOrbText = this.add
      .text(CRYSTAL_ORB_X + 36, CRYSTAL_ORB_Y, 'DRAG\nCRYSTAL', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#E0F2FE',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setDepth(30);

    this.baseLabelText = this.add
      .text(90, 320, 'BASE', { fontFamily: 'monospace', fontSize: '16px', color: '#38BDF8', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(5);

    this.spawnLabelText = this.add
      .text(1185, 320, 'SPAWN', { fontFamily: 'monospace', fontSize: '16px', color: '#F87171', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(5);

    this.laneHeaderText = this.add
      .text(24, 230, 'LANE 1\nPRIMARY', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#4ADE80',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setDepth(5);

    this.columnTexts = [];
    for (let col = 0; col < 9; col++) {
      const label = this.add
        .text(0, 0, `C${col}`, { fontFamily: 'monospace', fontSize: '13px', color: '#94A3B8', fontStyle: 'bold' })
        .setOrigin(0.5, 1)
        .setDepth(5);
      this.columnTexts.push(label);
    }

    this.terminalTitleText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 14, '', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setVisible(false);

    this.terminalSubText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 32, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#E2E8F0',
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setVisible(false);
  }

  private resetLabelPool(): void {
    this.labelPoolCursor = 0;
  }

  private hideUnusedPooledLabels(): void {
    for (let i = this.labelPoolCursor; i < this.labelPool.length; i++) {
      this.labelPool[i].setVisible(false);
    }
  }

  private resetSpritePools(): void {
    this.tileSpritePoolCursor = 0;
    this.unitSpritePoolCursor = 0;
  }

  private hideUnusedPooledSprites(): void {
    for (let i = this.tileSpritePoolCursor; i < this.tileSpritePool.length; i++) {
      this.tileSpritePool[i].setVisible(false);
    }
    for (let i = this.unitSpritePoolCursor; i < this.unitSpritePool.length; i++) {
      this.unitSpritePool[i].setVisible(false);
    }
  }

  private acquirePooledSprite(
    pool: Phaser.GameObjects.Image[],
    cursor: number,
    depth: number,
    x: number,
    y: number,
    textureKey: string,
    displayW: number,
    displayH: number,
    alpha = 1,
    tint?: number,
  ): Phaser.GameObjects.Image {
    let img = pool[cursor];
    if (!img) {
      img = this.add.image(x, y, textureKey).setDepth(depth);
      pool.push(img);
    }
    img
      .setTexture(textureKey)
      .setPosition(x, y)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(displayW, displayH)
      .setAlpha(alpha)
      .clearTint()
      .setVisible(true);
    if (tint !== undefined) {
      img.setTint(tint);
    }
    return img;
  }

  private acquireTileSprite(
    x: number,
    y: number,
    textureKey: string,
    displayW: number,
    displayH: number,
    alpha = 1,
    tint?: number,
  ): Phaser.GameObjects.Image {
    const img = this.acquirePooledSprite(
      this.tileSpritePool,
      this.tileSpritePoolCursor,
      1,
      x,
      y,
      textureKey,
      displayW,
      displayH,
      alpha,
      tint,
    );
    this.tileSpritePoolCursor += 1;
    return img;
  }

  private acquireUnitSprite(
    x: number,
    y: number,
    textureKey: string,
    displayW: number,
    displayH: number,
    alpha = 1,
    tint?: number,
  ): Phaser.GameObjects.Image {
    const img = this.acquirePooledSprite(
      this.unitSpritePool,
      this.unitSpritePoolCursor,
      12,
      x,
      y,
      textureKey,
      displayW,
      displayH,
      alpha,
      tint,
    );
    this.unitSpritePoolCursor += 1;
    return img;
  }

  private acquireLabel(
    x: number,
    y: number,
    text: string,
    color = '#F8FAFC',
    fontSize = '12px',
    originX = 0.5,
    originY = 0.5,
    depth = 25,
  ): Phaser.GameObjects.Text {
    let label = this.labelPool[this.labelPoolCursor];
    if (!label) {
      label = this.add.text(x, y, text, DEFAULT_LABEL_STYLE);
      this.labelPool.push(label);
    }
    this.labelPoolCursor += 1;
    label
      .setPosition(x, y)
      .setText(text)
      .setColor(color)
      .setFontSize(fontSize)
      .setOrigin(originX, originY)
      .setDepth(depth)
      .setVisible(true);
    return label;
  }

  private getCellRect(cell: Cell, geom: GridGeometry): { x: number; y: number; w: number; h: number } {
    return {
      x: geom.originX + cell.column * geom.cellW,
      y: geom.originY + cell.row * geom.cellH,
      w: geom.cellW,
      h: geom.cellH,
    };
  }

  private getItemCoords(item: PlaytestItemView, geom: GridGeometry): { x: number; y: number } {
    if (item.position.kind === 'normalized') {
      return {
        x: geom.originX + item.position.point.x * geom.cols * geom.cellW,
        y: geom.originY + item.position.point.y * geom.rows * geom.cellH,
      };
    }
    if (item.position.kind === 'cell') {
      const clampedRow = Math.min(item.position.cell.row, geom.rows - 1);
      return {
        x: geom.originX + (item.position.cell.column + 0.5) * geom.cellW,
        y: geom.originY + (clampedRow + 0.5) * geom.cellH,
      };
    }
    const clampedLane = Math.min(item.position.lane, geom.rows - 1);
    return {
      x: geom.originX + item.position.position * geom.cellW,
      y: geom.originY + (clampedLane + 0.5) * geom.cellH,
    };
  }

  private hitTestCell(x: number, y: number, geom: GridGeometry): Cell | null {
    const col = Math.floor((x - geom.originX) / geom.cellW);
    const row = Math.floor((y - geom.originY) / geom.cellH);
    if (col < 0 || col >= geom.cols || row < 0 || row >= geom.rows) {
      return null;
    }
    return { row, column: col };
  }

  private hitTestCrystalOrb(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, CRYSTAL_ORB_X, CRYSTAL_ORB_Y) <= CRYSTAL_HIT_RADIUS;
  }

  private hitTestItem(x: number, y: number, geom: GridGeometry): PlaytestItemView | null {
    let best: PlaytestItemView | null = null;
    let bestDist = ITEM_HIT_RADIUS;
    for (const item of this.snapshot.items) {
      const pos = this.getItemCoords(item, geom);
      const dist = Phaser.Math.Distance.Between(x, y, pos.x, pos.y);
      if (dist <= bestDist) {
        best = item;
        bestDist = dist;
      }
    }
    return best;
  }

  private findDefenderAtCell(cell: Cell): PlaytestDefenderView | undefined {
    return this.snapshot.defenders.find(d => d.row === cell.row && d.column === cell.column);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const x = pointer.x;
    const y = pointer.y;
    const geom = getGridGeometry(this.snapshot.showAuxLanes);

    if (pointer.button === 2) {
      const cell = this.hitTestCell(x, y, geom);
      if (cell) {
        const defender = this.findDefenderAtCell(cell);
        if (defender) {
          this.controller.removeDefender(defender.id);
          this.needsRender = true;
        }
      }
      return;
    }

    if (pointer.button !== 0) return;

    const item = this.hitTestItem(x, y, geom);
    if (item) {
      this.controller.collectItem(item.id);
      this.needsRender = true;
      return;
    }

    if (this.hitTestCrystalOrb(x, y)) {
      this.dragState = {
        kind: 'crystal',
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      };
      this.needsRender = true;
      return;
    }

    const cell = this.hitTestCell(x, y, geom);
    if (!cell) return;

    const defender = this.findDefenderAtCell(cell);
    if (defender) {
      this.dragState = {
        kind: 'defender-pending',
        sourceId: defender.id,
        sourceCell: cell,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      };
      this.needsRender = true;
      return;
    }

    if (this.tool.kind === 'place') {
      this.controller.placeDefender(this.tool.definitionId, cell, this.tool.freeSandbox);
    } else if (this.tool.kind === 'select') {
      this.controller.selectDefender(null);
    }
    this.needsRender = true;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const x = pointer.x;
    const y = pointer.y;
    const geom = getGridGeometry(this.snapshot.showAuxLanes);
    this.hoverCell = this.hitTestCell(x, y, geom);
    this.hoverCrystalOrb = this.hitTestCrystalOrb(x, y);

    if (this.dragState) {
      this.dragState.currentX = x;
      this.dragState.currentY = y;
      if (this.dragState.kind === 'defender-pending') {
        const dist = Phaser.Math.Distance.Between(
          this.dragState.startX,
          this.dragState.startY,
          x,
          y,
        );
        if (dist > DRAG_THRESHOLD_PX) {
          this.dragState = {
            kind: 'defender-fuse',
            sourceId: this.dragState.sourceId,
            sourceCell: this.dragState.sourceCell,
            startX: this.dragState.startX,
            startY: this.dragState.startY,
            currentX: x,
            currentY: y,
          };
        }
      }
    }
    this.needsRender = true;
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState || pointer.button !== 0) return;

    const drag = this.dragState;
    this.dragState = null;

    const x = pointer.x;
    const y = pointer.y;
    const geom = getGridGeometry(this.snapshot.showAuxLanes);
    const cell = this.hitTestCell(x, y, geom);
    const targetDefender = cell ? this.findDefenderAtCell(cell) : undefined;

    if (drag.kind === 'crystal') {
      if (targetDefender) {
        this.controller.activateAbility(targetDefender.id);
      }
    } else if (drag.kind === 'defender-fuse') {
      if (targetDefender && targetDefender.id !== drag.sourceId) {
        this.controller.fuseDefenders(drag.sourceId, targetDefender.id);
      }
    } else if (drag.kind === 'defender-pending') {
      if (this.tool.kind === 'crystal') {
        this.controller.activateAbility(drag.sourceId);
      } else if (this.tool.kind === 'remove') {
        this.controller.removeDefender(drag.sourceId);
      } else {
        this.controller.selectDefender(drag.sourceId);
      }
    }

    this.needsRender = true;
  }

  private handlePointerCancel(): void {
    if (this.dragState) {
      this.dragState = null;
      this.needsRender = true;
    }
  }

  private renderScene(): void {
    const snap = this.snapshot;
    const geom = getGridGeometry(snap.showAuxLanes);

    this.bgGraphics.clear();
    this.gridOverlayGraphics.clear();
    this.unitGraphics.clear();
    this.unitHudGraphics.clear();
    this.fxGraphics.clear();
    this.resetLabelPool();
    this.resetSpritePools();

    this.renderTopBar(snap);
    this.renderGrid(snap, geom);
    this.renderSlowZones(snap, geom);
    this.renderRedirectAuras(snap, geom);
    this.renderDefenders(snap, geom);
    this.renderEnemies(snap, geom);
    this.renderProjectiles(snap, geom);
    this.renderItems(snap, geom);
    this.renderFlashes(snap, geom);
    this.renderDragAndHover(snap, geom);
    this.renderTerminalBanner(snap);

    this.hideUnusedPooledLabels();
    this.hideUnusedPooledSprites();
  }

  private renderTopBar(snap: PlaytestHudSnapshot): void {
    this.bgGraphics.fillStyle(0x1e293b, 0.96);
    this.bgGraphics.fillRect(0, 0, CANVAS_WIDTH, TOP_BAR_HEIGHT);
    this.bgGraphics.lineStyle(2, 0x334155, 1);
    this.bgGraphics.lineBetween(0, TOP_BAR_HEIGHT, CANVAS_WIDTH, TOP_BAR_HEIGHT);

    const pendingStr = snap.pendingCrystals > 0 ? ` (+${snap.pendingCrystals} pending)` : '';
    this.topStatsText.setText(
      `ENERGY: ${snap.energy}   |   CRYSTALS: ${snap.crystals}/5${pendingStr}   |   T${snap.tick} (${snap.elapsedSeconds.toFixed(1)}s)`,
    );

    const waveStr =
      snap.mode === 'sandbox'
        ? 'MODE: SANDBOX'
        : `MODE: 5-WAVE (${(snap.currentWaveIndex ?? 0) + 1}/${snap.totalWaves} · ${snap.waveStatus.toUpperCase()})`;
    const speedStr = snap.paused ? `PAUSED · ${snap.speedMultiplier}x` : `RUNNING · ${snap.speedMultiplier}x`;
    this.topModeText.setText(`${waveStr}   |   ${speedStr}`);
    this.topToolText.setText(getToolLabel(this.tool));

    // Draggable Power Crystal Orb
    const canDragCrystal = snap.crystals > 0 && snap.terminal === null;
    const orbAlpha = canDragCrystal ? 1 : 0.4;
    this.bgGraphics.fillStyle(0x0ea5e9, 0.25 * orbAlpha);
    this.bgGraphics.fillCircle(CRYSTAL_ORB_X, CRYSTAL_ORB_Y, CRYSTAL_ORB_RADIUS + 5);
    this.bgGraphics.fillStyle(0x38bdf8, orbAlpha);
    this.bgGraphics.fillCircle(CRYSTAL_ORB_X, CRYSTAL_ORB_Y, CRYSTAL_ORB_RADIUS);
    this.bgGraphics.lineStyle(
      this.hoverCrystalOrb ? 3 : 2,
      this.hoverCrystalOrb ? 0xfef08a : 0xe0f2fe,
      orbAlpha,
    );
    this.bgGraphics.strokeCircle(CRYSTAL_ORB_X, CRYSTAL_ORB_Y, CRYSTAL_ORB_RADIUS);

    // Inner crystal diamond facet (or pixel sprite in ai-64 / pixel-code mode)
    if (this.visualStyle !== 'blocks') {
      this.acquireUnitSprite(
        CRYSTAL_ORB_X,
        CRYSTAL_ORB_Y,
        PLAYTEST_PIXEL_TEXTURE_KEYS.crystal,
        32,
        32,
        orbAlpha,
      );
    } else {
      this.bgGraphics.fillStyle(0xe0f2fe, 0.9 * orbAlpha);
      this.bgGraphics.fillTriangle(
        CRYSTAL_ORB_X,
        CRYSTAL_ORB_Y - 12,
        CRYSTAL_ORB_X + 10,
        CRYSTAL_ORB_Y,
        CRYSTAL_ORB_X - 10,
        CRYSTAL_ORB_Y,
      );
      this.bgGraphics.fillStyle(0x0284c7, 0.9 * orbAlpha);
      this.bgGraphics.fillTriangle(
        CRYSTAL_ORB_X,
        CRYSTAL_ORB_Y + 12,
        CRYSTAL_ORB_X + 10,
        CRYSTAL_ORB_Y,
        CRYSTAL_ORB_X - 10,
        CRYSTAL_ORB_Y,
      );
    }

    this.crystalOrbText.setAlpha(orbAlpha);
  }

  private renderGrid(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    const gridW = geom.cols * geom.cellW;
    const gridH = geom.rows * geom.cellH;
    const gridCenterY = geom.originY + gridH / 2;

    // Base defense zone (left)
    this.bgGraphics.fillStyle(0x1e3a5f, 0.55);
    this.bgGraphics.fillRect(geom.originX - 88, geom.originY, 84, gridH);
    this.bgGraphics.lineStyle(4, 0x38bdf8, 0.9);
    this.bgGraphics.lineBetween(geom.originX, geom.originY - 6, geom.originX, geom.originY + gridH + 6);
    this.baseLabelText.setPosition(geom.originX - 46, gridCenterY);

    // Spawn portal zone (right)
    this.bgGraphics.fillStyle(0x4c1d95, 0.35);
    this.bgGraphics.fillRect(geom.originX + gridW + 4, geom.originY, 94, gridH);
    this.bgGraphics.lineStyle(4, 0xf87171, 0.85);
    this.bgGraphics.lineBetween(
      geom.originX + gridW,
      geom.originY - 6,
      geom.originX + gridW,
      geom.originY + gridH + 6,
    );
    this.spawnLabelText.setPosition(geom.originX + gridW + 51, gridCenterY);

    this.laneHeaderText.setPosition(16, geom.originY + geom.cellH / 2);

    for (let col = 0; col < geom.cols; col++) {
      this.columnTexts[col].setPosition(geom.originX + (col + 0.5) * geom.cellW, geom.originY - 8);
    }

    // Checkerboard grass tiles
    const useAiGrass =
      this.visualStyle === 'ai-64' && this.hasLoadedTexture(PLAYTEST_AI_GRASS_ASSET.key);
    for (let row = 0; row < geom.rows; row++) {
      const isPrimary = row === 0;
      for (let col = 0; col < geom.cols; col++) {
        const x = geom.originX + col * geom.cellW;
        const y = geom.originY + row * geom.cellH;
        const even = (row + col) % 2 === 0;
        if (useAiGrass) {
          this.acquireTileSprite(
            x + geom.cellW / 2,
            y + geom.cellH / 2,
            PLAYTEST_AI_GRASS_ASSET.key,
            geom.cellW - 2,
            geom.cellH - 2,
            isPrimary ? 1 : 0.55,
            isPrimary ? (even ? undefined : 0xdcfce7) : even ? 0x94a3b8 : 0x7e92a8,
          );
          this.gridOverlayGraphics.lineStyle(1, isPrimary ? 0x4ade80 : 0x334155, isPrimary ? 0.55 : 0.7);
          this.gridOverlayGraphics.strokeRect(x, y, geom.cellW, geom.cellH);
        } else if (this.visualStyle !== 'blocks') {
          this.acquireTileSprite(
            x + geom.cellW / 2,
            y + geom.cellH / 2,
            even ? PLAYTEST_PIXEL_TEXTURE_KEYS.grassEven : PLAYTEST_PIXEL_TEXTURE_KEYS.grassOdd,
            geom.cellW - 2,
            geom.cellH - 2,
            isPrimary ? 1 : 0.55,
            isPrimary ? undefined : 0x94a3b8,
          );
          this.gridOverlayGraphics.lineStyle(1, isPrimary ? 0x4ade80 : 0x334155, isPrimary ? 0.55 : 0.7);
          this.gridOverlayGraphics.strokeRect(x, y, geom.cellW, geom.cellH);
        } else {
          const fill = isPrimary
            ? even
              ? 0x1e5631
              : 0x256d3b
            : even
              ? 0x163824
              : 0x1b452c;
          this.bgGraphics.fillStyle(fill, isPrimary ? 0.95 : 0.72);
          this.bgGraphics.fillRect(x + 1, y + 1, geom.cellW - 2, geom.cellH - 2);
          this.bgGraphics.lineStyle(1, isPrimary ? 0x4ade80 : 0x334155, isPrimary ? 0.45 : 0.65);
          this.bgGraphics.strokeRect(x, y, geom.cellW, geom.cellH);
        }
      }
    }

    // Primary Row 0 highlight border
    this.gridOverlayGraphics.lineStyle(3, 0x4ade80, 0.85);
    this.gridOverlayGraphics.strokeRect(geom.originX, geom.originY, gridW, geom.cellH);

    // Off-lane enemy indicator when auxiliary lanes are hidden
    if (!snap.showAuxLanes) {
      const hiddenCount = snap.enemies.filter(e => e.lane > 0).length;
      if (hiddenCount > 0) {
        this.acquireLabel(
          CANVAS_WIDTH / 2,
          geom.originY + geom.cellH + 26,
          `+${hiddenCount} Enemies on hidden Lanes 2–5 (toggle Show 5 Lanes to inspect)`,
          '#FBBF24',
          '13px',
        );
      }
    }
  }

  private renderSlowZones(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    for (const zone of snap.slowZones) {
      if (zone.row >= geom.rows || zone.column >= geom.cols) continue;
      const rect = this.getCellRect({ row: zone.row, column: zone.column }, geom);
      this.gridOverlayGraphics.fillStyle(0x22d3ee, 0.28);
      this.gridOverlayGraphics.fillRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
      this.gridOverlayGraphics.lineStyle(2, 0x67e8f9, 0.85);
      this.gridOverlayGraphics.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);

      this.acquireLabel(
        rect.x + rect.w / 2,
        rect.y + rect.h - 14,
        `SLOW -${Math.round(zone.slowPct * 100)}%`,
        '#A5F3FC',
        '11px',
      );
    }
  }

  private renderRedirectAuras(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    for (const aura of snap.redirectAuras) {
      if (aura.ownerRow >= geom.rows) continue;
      const minR = Math.max(0, aura.ownerRow - aura.radius);
      const maxR = Math.min(geom.rows - 1, aura.ownerRow + aura.radius);
      const minC = Math.max(0, aura.ownerColumn - aura.radius);
      const maxC = Math.min(geom.cols - 1, aura.ownerColumn + aura.radius);

      const x = geom.originX + minC * geom.cellW + 2;
      const y = geom.originY + minR * geom.cellH + 2;
      const w = (maxC - minC + 1) * geom.cellW - 4;
      const h = (maxR - minR + 1) * geom.cellH - 4;

      this.gridOverlayGraphics.fillStyle(0xfbbf24, 0.08);
      this.gridOverlayGraphics.fillRect(x, y, w, h);
      this.gridOverlayGraphics.lineStyle(2, 0xfbbf24, 0.75);
      this.gridOverlayGraphics.strokeRect(x, y, w, h);

      const ownerRect = this.getCellRect({ row: aura.ownerRow, column: aura.ownerColumn }, geom);
      const ox = ownerRect.x + ownerRect.w / 2;
      const oy = ownerRect.y + ownerRect.h / 2;

      for (const allyId of aura.protectedAllyIds) {
        const ally = snap.defenders.find(d => d.id === allyId);
        if (!ally || ally.row >= geom.rows) continue;
        const allyRect = this.getCellRect({ row: ally.row, column: ally.column }, geom);
        this.unitGraphics.lineStyle(2, 0xfde047, 0.75);
        this.unitGraphics.lineBetween(ox, oy, allyRect.x + allyRect.w / 2, allyRect.y + allyRect.h / 2);
      }
    }
  }

  private renderDefenders(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    const fuseSourceId = this.dragState?.kind === 'defender-fuse' ? this.dragState.sourceId : null;

    for (const def of snap.defenders) {
      if (def.row >= geom.rows) continue;
      const rect = this.getCellRect({ row: def.row, column: def.column }, geom);
      const pad = 10;
      const cardX = rect.x + pad;
      const cardY = rect.y + 10;
      const cardW = rect.w - pad * 2;
      const cardH = rect.h - 20;

      const isSelected = def.id === snap.selectedDefenderId;
      const isValidFuseTarget =
        fuseSourceId !== null && fuseSourceId !== def.id && this.controller.canFuse(fuseSourceId, def.id);
      const aiEntry = this.visualStyle === 'ai-64' ? PLAYTEST_AI_DEFENDER_ASSETS[def.definitionId] : undefined;
      const useAiSprite = aiEntry !== undefined && this.hasLoadedTexture(aiEntry.key);
      const useCodeSprite = !useAiSprite && this.visualStyle !== 'blocks' && def.definitionId === 'iron_golem';
      const usePixelSprite = useAiSprite || useCodeSprite;

      if (usePixelSprite) {
        const textureKey = useAiSprite ? aiEntry.key : PLAYTEST_PIXEL_TEXTURE_KEYS.ironGolem;
        const centerX = rect.x + rect.w / 2;
        const shadowY = rect.y + rect.h - 28;
        const isFloating = Boolean(useAiSprite && aiEntry.floating);
        this.unitGraphics.fillStyle(0x020617, isFloating ? 0.24 : 0.38);
        this.unitGraphics.fillEllipse(
          centerX,
          shadowY,
          geom.rows === 1 ? (isFloating ? 50 : 74) : isFloating ? 36 : 52,
          geom.rows === 1 ? (isFloating ? 14 : 18) : isFloating ? 10 : 12,
        );

        if (isSelected || isValidFuseTarget) {
          this.unitGraphics.lineStyle(4, isSelected ? 0xfef08a : 0x4ade80, 0.95);
          this.unitGraphics.strokeRoundedRect(cardX, cardY, cardW, cardH, 8);
        }

        const spriteSize = useAiSprite
          ? geom.rows === 1
            ? aiEntry.size1Lane
            : aiEntry.size5Lane
          : geom.rows === 1
            ? 96
            : 64;
        const spriteTint = def.isFrozen ? 0x67e8f9 : def.isStunned ? 0xfef08a : undefined;
        this.acquireUnitSprite(
          centerX,
          rect.y + rect.h * 0.44,
          textureKey,
          spriteSize,
          spriteSize,
          1,
          spriteTint,
        );

        this.acquireLabel(
          cardX + cardW / 2,
          cardY + 8,
          `${def.shortLabel} T${def.tier}`,
          '#F8FAFC',
          geom.rows === 1 ? '11px' : '10px',
        );
      } else {
        // Card fill
        this.unitGraphics.fillStyle(def.color, 0.94);
        this.unitGraphics.fillRoundedRect(cardX, cardY, cardW, cardH, 8);

        // Border highlight
        let borderColor = def.accentColor;
        let borderWidth = def.tier === 2 ? 3 : 2;
        if (isSelected) {
          borderColor = 0xfef08a;
          borderWidth = 4;
        } else if (isValidFuseTarget) {
          borderColor = 0x4ade80;
          borderWidth = 4;
        }
        this.unitGraphics.lineStyle(borderWidth, borderColor, 1);
        this.unitGraphics.strokeRoundedRect(cardX, cardY, cardW, cardH, 8);

        // Label + Tier tag
        this.acquireLabel(
          cardX + cardW / 2,
          cardY + cardH * 0.32,
          `${def.shortLabel} T${def.tier}`,
          '#0F172A',
          geom.rows === 1 ? '17px' : '13px',
        );
      }

      // HP bar (always above sprite/card on unitHudGraphics)
      const barW = cardW - 14;
      const barX = cardX + 7;
      const hpBarY = cardY + cardH - 18;
      const hpRatio = def.maxHp > 0 ? Math.max(0, Math.min(1, def.hp / def.maxHp)) : 0;
      const hpColor = hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xf59e0b : 0xef4444;

      this.unitHudGraphics.fillStyle(0x0f172a, 0.9);
      this.unitHudGraphics.fillRect(barX, hpBarY, barW, 8);
      this.unitHudGraphics.fillStyle(hpColor, 1);
      this.unitHudGraphics.fillRect(barX + 1, hpBarY + 1, Math.max(0, (barW - 2) * hpRatio), 6);

      // Shield bar (cyan for Frost Guardian, gold for Steel Guardian)
      if (def.shieldAmount > 0 && def.shieldMaxAmount > 0) {
        const shieldBarY = hpBarY - 8;
        const shieldRatio = Math.max(0, Math.min(1, def.shieldAmount / def.shieldMaxAmount));
        const shieldColor = def.definitionId === 'frost_guardian' ? 0x22d3ee : 0xfbbf24;
        this.unitHudGraphics.fillStyle(0x0f172a, 0.9);
        this.unitHudGraphics.fillRect(barX, shieldBarY, barW, 6);
        this.unitHudGraphics.fillStyle(shieldColor, 1);
        this.unitHudGraphics.fillRect(barX + 1, shieldBarY + 1, Math.max(0, (barW - 2) * shieldRatio), 4);
      }

      // Status / Buff pills
      if (def.badges.length > 0) {
        const pillText = def.badges.map(b => b.label).slice(0, 2).join(' ');
        const pillColor =
          def.isStunned || def.isFrozen ? '#FCA5A5' : def.buffDamagePct > 0 ? '#FDE047' : '#BAE6FD';
        this.acquireLabel(
          cardX + cardW / 2,
          usePixelSprite ? cardY + cardH - 27 : cardY + cardH * 0.58,
          pillText,
          pillColor,
          '10px',
        );
      }
    }
  }

  private renderEnemies(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    // Deterministic vertical stagger when multiple enemies share near-identical x in a lane
    const laneLastX = new Map<number, number>();
    const laneStaggerIdx = new Map<number, number>();
    const staggerOffsets = [0, -22, 22, -38, 38];

    for (const enemy of snap.enemies) {
      if (enemy.lane >= geom.rows) continue;

      const prevX = laneLastX.get(enemy.lane);
      let staggerIndex = 0;
      if (prevX !== undefined && Math.abs(enemy.x - prevX) < 0.35) {
        staggerIndex = (laneStaggerIdx.get(enemy.lane) ?? 0) + 1;
      }
      laneLastX.set(enemy.lane, enemy.x);
      laneStaggerIdx.set(enemy.lane, staggerIndex);

      const staggerScale = geom.rows === 1 ? 1 : 0.55;
      const offsetY = staggerOffsets[staggerIndex % staggerOffsets.length] * staggerScale;

      const ex = geom.originX + enemy.x * geom.cellW;
      const ey = geom.originY + (enemy.lane + 0.5) * geom.cellH + offsetY;
      const aiEntry = this.visualStyle === 'ai-64' ? PLAYTEST_AI_ENEMY_ASSETS[enemy.definitionId] : undefined;
      const useAiSprite = aiEntry !== undefined && this.hasLoadedTexture(aiEntry.key);
      const useCodeSprite = !useAiSprite && this.visualStyle !== 'blocks' && enemy.definitionId === 'zombie';
      const usePixelSprite = useAiSprite || useCodeSprite;
      const size = useAiSprite
        ? geom.rows === 1
          ? aiEntry.size1Lane
          : aiEntry.size5Lane
        : useCodeSprite
          ? geom.rows === 1
            ? 64
            : 48
          : geom.rows === 1
            ? 42
            : 30;

      if (usePixelSprite) {
        this.unitGraphics.fillStyle(0x020617, 0.36);
        this.unitGraphics.fillEllipse(ex, ey + size * 0.38, size * 0.65, 10);

        const spriteTint = enemy.isFrozen
          ? 0x67e8f9
          : enemy.isStunned
            ? 0xfef08a
            : enemy.burnCount > 0
              ? 0xfb923c
              : undefined;
        const textureKey = useAiSprite ? aiEntry.key : PLAYTEST_PIXEL_TEXTURE_KEYS.zombie;
        this.acquireUnitSprite(ex, ey, textureKey, size, size, 1, spriteTint);
      } else {
        // Enemy block/circle
        this.unitGraphics.fillStyle(enemy.color, 0.96);
        this.unitGraphics.fillRoundedRect(ex - size / 2, ey - size / 2, size, size, 7);

        const outline = enemy.isFrozen
          ? 0x67e8f9
          : enemy.isStunned
            ? 0xfef08a
            : enemy.burnCount > 0
              ? 0xfb923c
              : 0xf8fafc;
        this.unitGraphics.lineStyle(2, outline, 0.95);
        this.unitGraphics.strokeRoundedRect(ex - size / 2, ey - size / 2, size, size, 7);

        this.acquireLabel(ex, ey, enemy.shortLabel, '#FFFFFF', geom.rows === 1 ? '13px' : '11px');
      }

      // HP bar above enemy
      const barW = 46;
      const barX = ex - barW / 2;
      const barY = ey - size / 2 - 11;
      const hpRatio = enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) : 0;
      this.unitHudGraphics.fillStyle(0x0f172a, 0.95);
      this.unitHudGraphics.fillRect(barX, barY, barW, 7);
      this.unitHudGraphics.fillStyle(0xef4444, 1);
      this.unitHudGraphics.fillRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * hpRatio), 5);

      // Compact status tags
      const tags: string[] = [];
      if (enemy.isFrozen) tags.push('FRZ');
      if (enemy.isStunned) tags.push('STUN');
      if (enemy.slowPct > 0) tags.push('SLOW');
      if (enemy.burnCount > 0) tags.push(enemy.burnCount > 1 ? `BURN×${enemy.burnCount}` : 'BURN');

      if (tags.length > 0) {
        this.acquireLabel(ex, ey + size / 2 + 9, tags.join(' '), '#FDE68A', '10px');
      }
    }
  }

  private renderProjectiles(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    const pulse = 0.65 + 0.35 * Math.sin(this.time.now * 0.015);

    for (const proj of snap.projectiles) {
      if (proj.kind === 'lane') {
        if (proj.lane >= geom.rows) continue;
        const px = geom.originX + proj.x * geom.cellW;
        const py = geom.originY + (proj.lane + 0.5) * geom.cellH;

        if (proj.abilityId === 'piercing_barrage' || proj.pierce) {
          // Glowing cyan-gold piercing beam/arrow
          this.unitGraphics.lineStyle(8, 0x38bdf8, 0.45);
          this.unitGraphics.lineBetween(px - 28, py, px + 14, py);
          this.unitGraphics.lineStyle(3, 0xfef08a, 1);
          this.unitGraphics.lineBetween(px - 24, py, px + 16, py);
          this.unitGraphics.fillStyle(0xfef08a, 1);
          this.unitGraphics.fillTriangle(px + 20, py, px + 8, py - 6, px + 8, py + 6);
        } else {
          // Arrow storm projectile
          this.unitGraphics.lineStyle(3, 0xfbbf24, 1);
          this.unitGraphics.lineBetween(px - 14, py, px + 10, py);
          this.unitGraphics.fillStyle(0xf8fafc, 1);
          this.unitGraphics.fillTriangle(px + 14, py, px + 5, py - 4, px + 5, py + 4);
        }
      } else {
        if (proj.impactCell.row >= geom.rows || proj.impactCell.column >= geom.cols) continue;
        const rect = this.getCellRect(proj.impactCell, geom);
        const tx = rect.x + rect.w / 2;
        const ty = rect.y + rect.h / 2;

        // Pulsing red target circle on impactCell
        this.unitGraphics.lineStyle(2.5, 0xf87171, pulse);
        this.unitGraphics.strokeCircle(tx, ty, 24);
        this.unitGraphics.fillStyle(0xef4444, 0.14 * pulse);
        this.unitGraphics.fillCircle(tx, ty, 24);

        // Descending fiery streak
        const progress = Phaser.Math.Clamp(1 - proj.remainingTravelTicks / METEOR_TRAVEL_TICKS, 0, 1);
        const startX = tx + 42 * (1 - progress);
        const startY = ty - 150 * (1 - progress);
        this.unitGraphics.lineStyle(4, 0xf97316, 0.95);
        this.unitGraphics.lineBetween(startX + 12, startY - 28, startX, startY);
        this.unitGraphics.fillStyle(0xfef08a, 1);
        this.unitGraphics.fillCircle(startX, startY, 5);
      }
    }
  }

  private renderItems(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    const pulse = 1 + 0.12 * Math.sin(this.time.now * 0.008);

    for (const item of snap.items) {
      const pos = this.getItemCoords(item, geom);
      if (this.visualStyle !== 'blocks') {
        const size = 32 * pulse;
        if (item.kind === 'energy') {
          this.unitGraphics.fillStyle(0xfacc15, 0.24);
          this.unitGraphics.fillCircle(pos.x, pos.y, 18 * pulse);
          this.acquireUnitSprite(pos.x, pos.y, PLAYTEST_PIXEL_TEXTURE_KEYS.energy, size, size, 1);
          this.acquireLabel(pos.x, pos.y + 18, `+${item.amount}`, '#FEF08A', '10px');
        } else {
          this.unitGraphics.fillStyle(0x38bdf8, 0.28);
          this.unitGraphics.fillCircle(pos.x, pos.y, 19 * pulse);
          this.acquireUnitSprite(pos.x, pos.y, PLAYTEST_PIXEL_TEXTURE_KEYS.crystal, size, size, 1);
          this.acquireLabel(pos.x, pos.y + 18, 'CRY', '#E0F2FE', '10px');
        }
        continue;
      }

      if (item.kind === 'energy') {
        const r = 14 * pulse;
        this.unitGraphics.fillStyle(0xfacc15, 0.25);
        this.unitGraphics.fillCircle(pos.x, pos.y, r + 6);
        this.unitGraphics.fillStyle(0xfbbf24, 0.95);
        this.unitGraphics.fillCircle(pos.x, pos.y, r);
        this.unitGraphics.lineStyle(2, 0xfef9c3, 1);
        this.unitGraphics.strokeCircle(pos.x, pos.y, r);
        this.acquireLabel(pos.x, pos.y, `+${item.amount}`, '#0F172A', '10px');
      } else {
        const r = 15 * pulse;
        this.unitGraphics.fillStyle(0x38bdf8, 0.28);
        this.unitGraphics.fillCircle(pos.x, pos.y, r + 6);
        this.unitGraphics.fillStyle(0x0ea5e9, 0.95);
        this.unitGraphics.fillPoints(
          [
            new Phaser.Geom.Point(pos.x, pos.y - r),
            new Phaser.Geom.Point(pos.x + r, pos.y),
            new Phaser.Geom.Point(pos.x, pos.y + r),
            new Phaser.Geom.Point(pos.x - r, pos.y),
          ],
          true,
        );
        this.unitGraphics.lineStyle(2, 0xe0f2fe, 1);
        this.unitGraphics.strokePoints(
          [
            new Phaser.Geom.Point(pos.x, pos.y - r),
            new Phaser.Geom.Point(pos.x + r, pos.y),
            new Phaser.Geom.Point(pos.x, pos.y + r),
            new Phaser.Geom.Point(pos.x - r, pos.y),
          ],
          true,
        );
        this.acquireLabel(pos.x, pos.y, 'CRY', '#FFFFFF', '9px');
      }
    }
  }

  private renderFlashes(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    const gridW = geom.cols * geom.cellW;
    const gridH = geom.rows * geom.cellH;

    for (const flash of snap.flashes) {
      const alpha = Phaser.Math.Clamp(flash.ttlMs / 750, 0.1, 0.85);

      if (flash.abilityId === 'absolute_zero') {
        this.fxGraphics.fillStyle(flash.color, 0.28 * alpha);
        this.fxGraphics.fillRect(geom.originX, geom.originY, gridW, gridH);
        this.acquireLabel(geom.originX + gridW / 2, geom.originY + gridH / 2, flash.label, '#E0F2FE', '22px');
        continue;
      }

      if (
        flash.lane !== undefined &&
        (flash.abilityId === 'blizzard' ||
          flash.abilityId === 'earthquake' ||
          flash.abilityId === 'inferno')
      ) {
        if (flash.lane < geom.rows) {
          const y = geom.originY + flash.lane * geom.cellH;
          this.fxGraphics.fillStyle(flash.color, 0.3 * alpha);
          this.fxGraphics.fillRect(geom.originX, y, gridW, geom.cellH);
          this.acquireLabel(
            geom.originX + gridW / 2,
            y + 22,
            flash.label,
            '#FFFFFF',
            '16px',
          );
        }
        continue;
      }

      if (flash.cell && flash.cell.row < geom.rows && flash.cell.column < geom.cols) {
        const rect = this.getCellRect(flash.cell, geom);
        this.fxGraphics.fillStyle(flash.color, 0.35 * alpha);
        this.fxGraphics.fillRoundedRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 8);
        this.fxGraphics.lineStyle(3, flash.color, alpha);
        this.fxGraphics.strokeRoundedRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 8);
        this.acquireLabel(rect.x + rect.w / 2, rect.y - 10, flash.label, '#FEF08A', '13px');
      }
    }
  }

  private renderDragAndHover(snap: PlaytestHudSnapshot, geom: GridGeometry): void {
    if (this.hoverCell) {
      const rect = this.getCellRect(this.hoverCell, geom);
      const hoverColor =
        this.tool.kind === 'remove'
          ? 0xf87171
          : this.tool.kind === 'crystal'
            ? 0x38bdf8
            : 0xfef08a;
      this.fxGraphics.lineStyle(2.5, hoverColor, 0.85);
      this.fxGraphics.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    }

    if (!this.dragState) return;

    if (this.dragState.kind === 'crystal') {
      const cx = this.dragState.currentX;
      const cy = this.dragState.currentY;
      this.fxGraphics.lineStyle(2, 0x38bdf8, 0.75);
      this.fxGraphics.lineBetween(CRYSTAL_ORB_X, CRYSTAL_ORB_Y, cx, cy);
      this.fxGraphics.fillStyle(0x38bdf8, 0.9);
      this.fxGraphics.fillCircle(cx, cy, 16);
      this.fxGraphics.lineStyle(2, 0xe0f2fe, 1);
      this.fxGraphics.strokeCircle(cx, cy, 16);

      if (this.hoverCell) {
        const target = this.findDefenderAtCell(this.hoverCell);
        if (target) {
          const rect = this.getCellRect(this.hoverCell, geom);
          this.fxGraphics.lineStyle(4, 0x38bdf8, 1);
          this.fxGraphics.strokeRoundedRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 8);
        }
      }
    } else if (this.dragState.kind === 'defender-fuse') {
      const sourceRect = this.getCellRect(this.dragState.sourceCell, geom);
      const sx = sourceRect.x + sourceRect.w / 2;
      const sy = sourceRect.y + sourceRect.h / 2;
      const target = this.hoverCell ? this.findDefenderAtCell(this.hoverCell) : undefined;
      const validFuse =
        target !== undefined &&
        target.id !== this.dragState.sourceId &&
        this.controller.canFuse(this.dragState.sourceId, target.id);

      const lineColor = validFuse ? 0x4ade80 : target ? 0xf87171 : 0x94a3b8;
      this.fxGraphics.lineStyle(4, lineColor, 0.95);
      this.fxGraphics.lineBetween(sx, sy, this.dragState.currentX, this.dragState.currentY);
      this.fxGraphics.fillStyle(lineColor, 1);
      this.fxGraphics.fillCircle(this.dragState.currentX, this.dragState.currentY, 8);

      if (target && target.id !== this.dragState.sourceId && this.hoverCell) {
        const rect = this.getCellRect(this.hoverCell, geom);
        this.fxGraphics.lineStyle(4, lineColor, 1);
        this.fxGraphics.strokeRoundedRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 8);
        this.acquireLabel(
          rect.x + rect.w / 2,
          rect.y - 12,
          validFuse ? 'DROP TO FUSE!' : 'NO RECIPE',
          validFuse ? '#4ADE80' : '#FCA5A5',
          '12px',
        );
      }
    }
  }

  private renderTerminalBanner(snap: PlaytestHudSnapshot): void {
    if (snap.terminal === null) {
      this.terminalTitleText.setVisible(false);
      this.terminalSubText.setVisible(false);
      return;
    }

    const isVictory = snap.terminal === 'victory';
    this.fxGraphics.fillStyle(0x020617, 0.72);
    this.fxGraphics.fillRect(0, TOP_BAR_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - TOP_BAR_HEIGHT);
    this.fxGraphics.fillStyle(isVictory ? 0x064e3b : 0x7f1d1d, 0.92);
    this.fxGraphics.fillRoundedRect(CANVAS_WIDTH / 2 - 260, CANVAS_HEIGHT / 2 - 75, 520, 150, 14);
    this.fxGraphics.lineStyle(3, isVictory ? 0x4ade80 : 0xf87171, 1);
    this.fxGraphics.strokeRoundedRect(CANVAS_WIDTH / 2 - 260, CANVAS_HEIGHT / 2 - 75, 520, 150, 14);

    this.terminalTitleText
      .setText(isVictory ? 'VICTORY!' : 'DEFEAT!')
      .setColor(isVictory ? '#4ADE80' : '#FCA5A5')
      .setVisible(true);

    this.terminalSubText
      .setText(
        isVictory
          ? 'All waves defeated — use Reset in the top bar to playtest again'
          : 'Enemy breached the base — use Reset in the top bar to retry',
      )
      .setVisible(true);
  }
}
