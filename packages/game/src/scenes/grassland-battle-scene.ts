import * as Phaser from 'phaser';
import {
  ALL_GAME_ASSETS,
  DEFENDER_SPRITE_ASSETS,
  EFFECT_SPRITE_ASSETS,
  ENEMY_SPRITE_ASSETS,
  ITEM_SPRITE_ASSETS,
  MAP_TILE_ASSETS,
  applyNearestFilterToManifestTextures,
  preloadGameAssets,
} from '../assets/asset-manifest';
import type { Cell } from '../battlefield/grid';
import type { CampaignController, CampaignSnapshot } from '../campaign/campaign-controller';
import type { PlaytestDefenderView, PlaytestEnemyView, PlaytestItemView } from '../playtest/playtest-controller';
import { PLAYTEST_PIXEL_TEXTURE_KEYS } from '../playtest/procedural-pixel-art';

export type CampaignTool =
  | { readonly kind: 'select' }
  | { readonly kind: 'place'; readonly definitionId: string }
  | { readonly kind: 'crystal' };

export type ExternalDragPayload =
  | { readonly kind: 'place'; readonly definitionId: string }
  | { readonly kind: 'crystal' };

export type CampaignVisualStyle = 'pixel-art' | 'procedural';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const GRID_ORIGIN_X = 136;
const GRID_ORIGIN_Y = 22;
const CELL_W = 112;
const CELL_H = 132;
const GRID_ROWS = 5;
const GRID_COLS = 9;
const ITEM_HIT_RADIUS = 26;
const DRAG_THRESHOLD_PX = 14;
const METEOR_TRAVEL_TICKS = 8;
const INFERNO_TRAVEL_TICKS = 5;

type DragState =
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

/**
 * Interactive 5x9 Grassland Campaign Battlefield Phaser Scene rendering all
 * 47 pixel-art PNG assets, simple idle/VFX animations, item-priority clicks,
 * base summon placement, unlimited-distance fusion drag, and Power Crystal abilities.
 */
export class GrasslandBattleScene extends Phaser.Scene {
  private readonly controller: CampaignController;
  private readonly onFirstRender: () => void;
  private readonly onToolChange?: (tool: CampaignTool) => void;

  private tool: CampaignTool = { kind: 'select' };
  private visualStyle: CampaignVisualStyle = 'pixel-art';
  private showGridCoords = false;
  private snapshot!: CampaignSnapshot;
  private unsubscribe: (() => void) | null = null;
  private dragState: DragState | null = null;
  private hoverCell: Cell | null = null;
  private externalDrag: { readonly payload: ExternalDragPayload; readonly cell: Cell | null } | null = null;
  private needsRender = true;
  private firstRendered = false;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private unitGraphics!: Phaser.GameObjects.Graphics;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;

  private tileSpritePool: Phaser.GameObjects.Image[] = [];
  private tileSpriteCursor = 0;
  private unitSpritePool: Phaser.GameObjects.Image[] = [];
  private unitSpriteCursor = 0;
  private fxSpritePool: Phaser.GameObjects.Image[] = [];
  private fxSpriteCursor = 0;
  private labelPool: Phaser.GameObjects.Text[] = [];
  private labelCursor = 0;

  constructor(
    controller: CampaignController,
    onFirstRender: () => void,
    onToolChange?: (tool: CampaignTool) => void,
  ) {
    super({ key: 'GrasslandBattleScene' });
    this.controller = controller;
    this.onFirstRender = onFirstRender;
    this.onToolChange = onToolChange;
  }

  setTool(tool: CampaignTool): void {
    this.tool = tool;
    this.needsRender = true;
  }

  private clearToolToSelect(): void {
    if (this.tool.kind === 'select') return;
    this.tool = { kind: 'select' };
    this.onToolChange?.(this.tool);
    this.needsRender = true;
  }

  private clientPointToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = this.game?.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    if (x < 0 || x > CANVAS_WIDTH || y < 0 || y > CANVAS_HEIGHT) return null;
    return { x, y };
  }

  setExternalDragAtClientPoint(payload: ExternalDragPayload | null, clientX: number, clientY: number): void {
    if (!payload) {
      if (this.externalDrag !== null) {
        this.externalDrag = null;
        this.needsRender = true;
      }
      return;
    }
    const pt = this.clientPointToCanvas(clientX, clientY);
    const cell = pt ? this.screenToCell(pt.x, pt.y) : null;
    this.externalDrag = { payload, cell };
    this.needsRender = true;
  }

  dropExternalDragAtClientPoint(payload: ExternalDragPayload, clientX: number, clientY: number): boolean {
    this.externalDrag = null;
    const pt = this.clientPointToCanvas(clientX, clientY);
    const cell = pt ? this.screenToCell(pt.x, pt.y) : null;
    this.needsRender = true;
    if (!cell) return false;
    if (payload.kind === 'place') {
      const ok = this.controller.summonDefender(payload.definitionId, cell);
      if (ok) {
        this.clearToolToSelect();
      }
      return ok;
    }
    const defender = this.findDefenderAtCell(cell);
    if (!defender) return false;
    const ok = this.controller.activateAbility(defender.id, cell);
    if (ok) {
      this.clearToolToSelect();
    }
    return ok;
  }

  setVisualStyle(style: CampaignVisualStyle): void {
    this.visualStyle = style;
    this.needsRender = true;
  }

  setShowGridCoords(show: boolean): void {
    this.showGridCoords = show;
    this.needsRender = true;
  }

  init(): void {
    this.dragState = null;
    this.hoverCell = null;
    this.externalDrag = null;
    this.needsRender = true;
    this.snapshot = this.controller.getSnapshot();
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      // Fall back cleanly to procedural textures if any optional image fails to load.
    });
    preloadGameAssets(this, Phaser.Textures.FilterMode.NEAREST);
  }

  private hasTexture(key: string): boolean {
    if (!this.textures.exists(key)) return false;
    return this.textures.get(key).key !== '__MISSING';
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0F172A');
    this.input.mouse?.disableContextMenu();
    applyNearestFilterToManifestTextures(this, Phaser.Textures.FilterMode.NEAREST);

    this.bgGraphics = this.add.graphics().setDepth(0);
    this.overlayGraphics = this.add.graphics().setDepth(3);
    this.unitGraphics = this.add.graphics().setDepth(10);
    this.hudGraphics = this.add.graphics().setDepth(14);
    this.fxGraphics = this.add.graphics().setDepth(22);

    this.hintText = this.add
      .text(CANVAS_WIDTH / 2, 707, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#CBD5E1',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(30);

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
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerCancel, this);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.renderScene();
    if (!this.firstRendered) {
      this.firstRendered = true;
      this.onFirstRender();
    }
  }

  update(_time: number, delta: number): void {
    const stepped = this.controller.stepMs(delta);
    const snap = this.snapshot;
    if (
      stepped > 0 ||
      this.needsRender ||
      this.dragState !== null ||
      snap.items.length > 0 ||
      snap.projectiles.length > 0 ||
      snap.flashes.length > 0 ||
      snap.defenders.length > 0 ||
      snap.enemies.length > 0
    ) {
      this.renderScene();
      this.needsRender = false;
    }
  }

  private getCellRect(cell: Cell) {
    return {
      x: GRID_ORIGIN_X + cell.column * CELL_W,
      y: GRID_ORIGIN_Y + cell.row * CELL_H,
      w: CELL_W,
      h: CELL_H,
    };
  }

  private screenToCell(px: number, py: number): Cell | null {
    const col = Math.floor((px - GRID_ORIGIN_X) / CELL_W);
    const row = Math.floor((py - GRID_ORIGIN_Y) / CELL_H);
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
    return { row, column: col };
  }

  private getItemCoords(item: PlaytestItemView): { x: number; y: number } {
    if (item.position.kind === 'cell') {
      const r = this.getCellRect(item.position.cell);
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    }
    if (item.position.kind === 'lane') {
      return {
        x: GRID_ORIGIN_X + item.position.position * CELL_W,
        y: GRID_ORIGIN_Y + (item.position.lane + 0.5) * CELL_H,
      };
    }
    return {
      x: GRID_ORIGIN_X + item.position.point.x * (GRID_COLS * CELL_W),
      y: GRID_ORIGIN_Y + item.position.point.y * (GRID_ROWS * CELL_H),
    };
  }

  private findItemAt(px: number, py: number): PlaytestItemView | null {
    for (let i = this.snapshot.items.length - 1; i >= 0; i--) {
      const item = this.snapshot.items[i];
      const pos = this.getItemCoords(item);
      if (Phaser.Math.Distance.Between(px, py, pos.x, pos.y) <= ITEM_HIT_RADIUS) {
        return item;
      }
    }
    return null;
  }

  private findDefenderAtCell(cell: Cell): PlaytestDefenderView | undefined {
    return this.snapshot.defenders.find(d => d.row === cell.row && d.column === cell.column);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const px = pointer.x;
    const py = pointer.y;

    // Right-click cancels active summon or crystal tool back to Select/Fuse.
    if (pointer.rightButtonDown()) {
      this.dragState = null;
      this.clearToolToSelect();
      this.needsRender = true;
      return;
    }

    // Priority 1 (GAMEPLAY_MECHANICS.md §18): Collect Energy / Power Crystal items before unit selection!
    const item = this.findItemAt(px, py);
    if (item) {
      this.controller.collectItem(item.id);
      return;
    }

    const cell = this.screenToCell(px, py);
    if (!cell) return;

    if (this.tool.kind === 'place') {
      const ok = this.controller.summonDefender(this.tool.definitionId, cell);
      if (ok) {
        this.clearToolToSelect();
      }
      this.needsRender = true;
      return;
    }

    const defender = this.findDefenderAtCell(cell);
    if (this.tool.kind === 'crystal') {
      if (defender) {
        const ok = this.controller.activateAbility(defender.id, cell);
        if (ok) {
          this.clearToolToSelect();
        }
        this.needsRender = true;
      }
      return;
    }

    if (defender) {
      this.dragState = {
        kind: 'defender-pending',
        sourceId: defender.id,
        sourceCell: { row: defender.row, column: defender.column },
        startX: px,
        startY: py,
        currentX: px,
        currentY: py,
      };
      this.needsRender = true;
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const px = pointer.x;
    const py = pointer.y;
    const cell = this.screenToCell(px, py);
    if (
      (cell === null && this.hoverCell !== null) ||
      (cell !== null && (this.hoverCell?.row !== cell.row || this.hoverCell?.column !== cell.column))
    ) {
      this.hoverCell = cell;
      this.needsRender = true;
    }

    if (!this.dragState) return;
    this.dragState.currentX = px;
    this.dragState.currentY = py;
    if (
      this.dragState.kind === 'defender-pending' &&
      Phaser.Math.Distance.Between(this.dragState.startX, this.dragState.startY, px, py) >= DRAG_THRESHOLD_PX
    ) {
      this.dragState = {
        kind: 'defender-fuse',
        sourceId: this.dragState.sourceId,
        sourceCell: this.dragState.sourceCell,
        startX: this.dragState.startX,
        startY: this.dragState.startY,
        currentX: px,
        currentY: py,
      };
    }
    this.needsRender = true;
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState) return;
    const state = this.dragState;
    this.dragState = null;

    if (state.kind === 'defender-fuse') {
      const cell = this.screenToCell(pointer.x, pointer.y);
      if (cell) {
        const target = this.findDefenderAtCell(cell);
        if (target && target.id !== state.sourceId) {
          this.controller.fuseDefenders(state.sourceId, target.id);
        }
      }
    }
    this.needsRender = true;
  }

  private handlePointerCancel(): void {
    this.dragState = null;
    this.needsRender = true;
  }

  private resetPools(): void {
    this.tileSpriteCursor = 0;
    this.unitSpriteCursor = 0;
    this.fxSpriteCursor = 0;
    this.labelCursor = 0;
  }

  private hideUnusedPools(): void {
    for (let i = this.tileSpriteCursor; i < this.tileSpritePool.length; i++) this.tileSpritePool[i].setVisible(false);
    for (let i = this.unitSpriteCursor; i < this.unitSpritePool.length; i++) this.unitSpritePool[i].setVisible(false);
    for (let i = this.fxSpriteCursor; i < this.fxSpritePool.length; i++) this.fxSpritePool[i].setVisible(false);
    for (let i = this.labelCursor; i < this.labelPool.length; i++) this.labelPool[i].setVisible(false);
  }

  private acquireSprite(
    pool: Phaser.GameObjects.Image[],
    cursor: number,
    depth: number,
    x: number,
    y: number,
    key: string,
    w: number,
    h: number,
    alpha = 1,
    tint?: number,
  ): Phaser.GameObjects.Image {
    let img = pool[cursor];
    if (!img) {
      img = this.add.image(x, y, key).setDepth(depth);
      pool.push(img);
    }
    img
      .setTexture(key)
      .setPosition(x, y)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(w, h)
      .setAlpha(alpha)
      .clearTint()
      .setVisible(true);
    if (tint !== undefined) img.setTint(tint);
    return img;
  }

  private putTile(x: number, y: number, key: string, w: number, h: number, alpha = 1): void {
    this.acquireSprite(this.tileSpritePool, this.tileSpriteCursor++, 1, x, y, key, w, h, alpha);
  }

  private putUnit(x: number, y: number, key: string, w: number, h: number, alpha = 1, tint?: number): void {
    this.acquireSprite(this.unitSpritePool, this.unitSpriteCursor++, 12, x, y, key, w, h, alpha, tint);
  }

  private putFx(x: number, y: number, key: string, w: number, h: number, alpha = 1, tint?: number): void {
    this.acquireSprite(this.fxSpritePool, this.fxSpriteCursor++, 18, x, y, key, w, h, alpha, tint);
  }

  private putLabel(x: number, y: number, text: string, color = '#F8FAFC', fontSize = '11px'): void {
    let lbl = this.labelPool[this.labelCursor];
    if (!lbl) {
      lbl = this.add
        .text(x, y, text, {
          fontFamily: 'monospace',
          fontSize,
          fontStyle: 'bold',
          color,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(24);
      this.labelPool.push(lbl);
    }
    lbl
      .setPosition(x, y)
      .setText(text)
      .setStyle({
        fontFamily: 'monospace',
        fontSize,
        fontStyle: 'bold',
        color,
      })
      .setVisible(true);
    this.labelCursor += 1;
  }

  private renderScene(): void {
    const snap = this.snapshot;
    this.resetPools();
    this.bgGraphics.clear();
    this.overlayGraphics.clear();
    this.unitGraphics.clear();
    this.hudGraphics.clear();
    this.fxGraphics.clear();

    this.renderBackdropAndGrid(snap);
    this.renderZonesAndAuras(snap);
    this.renderDefenders(snap);
    this.renderEnemies(snap);
    this.renderProjectiles(snap);
    this.renderItems(snap);
    this.renderFlashes(snap);
    this.renderDragOverlay();
    this.updateHintText();

    this.hideUnusedPools();
  }

  private renderBackdropAndGrid(snap: CampaignSnapshot): void {
    const gridW = GRID_COLS * CELL_W;
    const gridH = GRID_ROWS * CELL_H;

    // Outer dark stone frame
    this.bgGraphics.fillStyle(0x090f1d, 1);
    this.bgGraphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.bgGraphics.fillStyle(0x13221a, 1);
    this.bgGraphics.fillRoundedRect(GRID_ORIGIN_X - 78, GRID_ORIGIN_Y - 12, gridW + 156, gridH + 24, 12);

    const usePng = this.visualStyle === 'pixel-art';
    const lightTile = MAP_TILE_ASSETS.grassland_tile_light.key;
    const darkTile = MAP_TILE_ASSETS.grassland_tile_dark.key;
    const baseGateKey = MAP_TILE_ASSETS.base_gate_tile.key;
    const spawnKey = MAP_TILE_ASSETS.spawn_portal_tile.key;

    for (let r = 0; r < GRID_ROWS; r++) {
      const cy = GRID_ORIGIN_Y + (r + 0.5) * CELL_H;
      // Left Base Defense Gate column
      if (usePng && this.hasTexture(baseGateKey)) {
        this.putTile(GRID_ORIGIN_X - 38, cy, baseGateKey, 72, CELL_H - 2, 0.95);
      } else {
        this.bgGraphics.fillStyle(0x1e293b, 0.95);
        this.bgGraphics.fillRect(GRID_ORIGIN_X - 74, GRID_ORIGIN_Y + r * CELL_H + 2, 70, CELL_H - 4);
      }
      // Right Enemy Spawn Portal column
      if (usePng && this.hasTexture(spawnKey)) {
        this.putTile(GRID_ORIGIN_X + gridW + 38, cy, spawnKey, 72, CELL_H - 2, 0.95);
      } else {
        this.bgGraphics.fillStyle(0x3b0764, 0.85);
        this.bgGraphics.fillRect(GRID_ORIGIN_X + gridW + 4, GRID_ORIGIN_Y + r * CELL_H + 2, 70, CELL_H - 4);
      }

      for (let c = 0; c < GRID_COLS; c++) {
        const cell = { row: r, column: c };
        const rect = this.getCellRect(cell);
        const even = (r + c) % 2 === 0;
        const pngKey = even ? lightTile : darkTile;
        const fallbackKey = even ? PLAYTEST_PIXEL_TEXTURE_KEYS.grassEven : PLAYTEST_PIXEL_TEXTURE_KEYS.grassOdd;

        if (usePng && this.hasTexture(pngKey)) {
          this.putTile(rect.x + rect.w / 2, rect.y + rect.h / 2, pngKey, rect.w - 1, rect.h - 1, 1);
        } else if (this.hasTexture(fallbackKey)) {
          this.putTile(rect.x + rect.w / 2, rect.y + rect.h / 2, fallbackKey, rect.w - 1, rect.h - 1, 1);
        } else {
          this.bgGraphics.fillStyle(even ? 0x166534 : 0x14532d, 1);
          this.bgGraphics.fillRect(rect.x, rect.y, rect.w, rect.h);
        }

        if (this.showGridCoords) {
          this.putLabel(rect.x + 18, rect.y + 12, `${r},${c}`, '#A7F3D0', '10px');
        }
      }
    }

    this.bgGraphics.lineStyle(2, 0x34d399, 0.65);
    this.bgGraphics.strokeRect(GRID_ORIGIN_X, GRID_ORIGIN_Y, gridW, gridH);
    this.putLabel(GRID_ORIGIN_X - 38, GRID_ORIGIN_Y + 14, 'BASE', '#93C5FD', '11px');
    this.putLabel(GRID_ORIGIN_X + gridW + 38, GRID_ORIGIN_Y + 14, 'SPAWN', '#F9A8D4', '11px');

    // Interactive placement / fusion / crystal highlights (supports both click mode and pointer drag-and-drop)
    const previewTool =
      this.externalDrag?.payload ?? (this.tool.kind !== 'select' ? this.tool : null);
    const previewCell = this.externalDrag ? this.externalDrag.cell : this.hoverCell;
    if (previewTool && previewCell) {
      const rect = this.getCellRect(previewCell);
      const occupant = this.findDefenderAtCell(previewCell);
      if (previewTool.kind === 'place') {
        const ok = !occupant;
        this.overlayGraphics.fillStyle(ok ? 0x22c55e : 0xef4444, 0.28);
        this.overlayGraphics.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
        this.overlayGraphics.lineStyle(2.5, ok ? 0x4ade80 : 0xf87171, 0.95);
        this.overlayGraphics.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);

        const pngKey = DEFENDER_SPRITE_ASSETS[previewTool.definitionId]?.key;
        const procKey = PLAYTEST_PIXEL_TEXTURE_KEYS.ironGolem;
        const ghostKey =
          this.visualStyle === 'pixel-art' && pngKey && this.hasTexture(pngKey)
            ? pngKey
            : this.hasTexture(procKey)
              ? procKey
              : null;
        if (ghostKey) {
          this.putFx(
            rect.x + rect.w / 2,
            rect.y + rect.h / 2,
            ghostKey,
            64,
            64,
            ok ? 0.68 : 0.36,
            ok ? undefined : 0xf87171,
          );
        }
      } else if (previewTool.kind === 'crystal' && occupant) {
        this.overlayGraphics.fillStyle(0x38bdf8, 0.3);
        this.overlayGraphics.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
        this.overlayGraphics.lineStyle(3, 0x38bdf8, 1);
        this.overlayGraphics.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      }
    }

    if (this.dragState?.kind === 'defender-fuse') {
      for (const candidate of snap.defenders) {
        if (candidate.id === this.dragState.sourceId) continue;
        const outId = this.controller.getFusionOutputId(this.dragState.sourceId, candidate.id);
        if (!outId) continue;
        const r = this.getCellRect({ row: candidate.row, column: candidate.column });
        this.overlayGraphics.fillStyle(0xfacc15, 0.28);
        this.overlayGraphics.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
        this.overlayGraphics.lineStyle(3, 0xfef08a, 1);
        this.overlayGraphics.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      }
    }
  }

  private renderZonesAndAuras(snap: CampaignSnapshot): void {
    const pulse = 0.65 + 0.35 * Math.sin(this.time.now * 0.006);
    for (const zone of snap.slowZones) {
      const rect = this.getCellRect({ row: zone.row, column: zone.column });
      this.overlayGraphics.fillStyle(0x38bdf8, 0.24 * pulse);
      this.overlayGraphics.fillRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
      this.overlayGraphics.lineStyle(2, 0x7dd3fc, 0.9);
      this.overlayGraphics.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
      this.putLabel(rect.x + rect.w / 2, rect.y + rect.h - 12, 'ICE ZONE', '#BAE6FD', '10px');
    }

    for (const aura of snap.redirectAuras) {
      const minR = Math.max(0, aura.ownerRow - aura.radius);
      const maxR = Math.min(GRID_ROWS - 1, aura.ownerRow + aura.radius);
      const minC = Math.max(0, aura.ownerColumn - aura.radius);
      const maxC = Math.min(GRID_COLS - 1, aura.ownerColumn + aura.radius);
      const x = GRID_ORIGIN_X + minC * CELL_W + 4;
      const y = GRID_ORIGIN_Y + minR * CELL_H + 4;
      const w = (maxC - minC + 1) * CELL_W - 8;
      const h = (maxR - minR + 1) * CELL_H - 8;
      this.overlayGraphics.lineStyle(2.5, 0xfbbf24, 0.78 * pulse);
      this.overlayGraphics.strokeRect(x, y, w, h);
    }
  }

  private renderDefenders(snap: CampaignSnapshot): void {
    const t = this.time.now;
    const usePng = this.visualStyle === 'pixel-art';
    const frostShieldKey = EFFECT_SPRITE_ASSETS.vfx_frost_shield.key;
    const bastionShieldKey = EFFECT_SPRITE_ASSETS.vfx_iron_bastion.key;
    const howlRingKey = EFFECT_SPRITE_ASSETS.vfx_howl_ring.key;

    for (const def of snap.defenders) {
      const rect = this.getCellRect({ row: def.row, column: def.column });
      const cx = rect.x + rect.w / 2;
      const isHovering = def.definitionId === 'blaze' || def.definitionId === 'infernal_archon';
      const bob = isHovering
        ? Math.sin(t * 0.005 + def.column) * 4
        : Math.sin(t * 0.003 + def.row) * 1.5;
      const cy = rect.y + rect.h / 2 + bob - 2;
      const size = def.tier === 2 ? 78 : 70;

      // Subtle ground shadow
      this.unitGraphics.fillStyle(0x020617, 0.35);
      this.unitGraphics.fillEllipse(cx, rect.y + rect.h / 2 + 30, size * 0.65, 12);

      // Buff aura ring behind unit
      if (def.buffDamagePct > 0 || def.buffAttackSpeedPct > 0) {
        if (usePng && this.hasTexture(howlRingKey)) {
          this.putTile(cx, cy + 6, howlRingKey, size + 16, size + 16, 0.7);
        } else {
          this.unitGraphics.lineStyle(2, 0xfde047, 0.85);
          this.unitGraphics.strokeCircle(cx, cy, size * 0.52);
        }
      }

      const assetKey = DEFENDER_SPRITE_ASSETS[def.definitionId]?.key;
      const tint = def.isStunned ? 0xfef08a : def.isFrozen ? 0x67e8f9 : undefined;
      if (usePng && assetKey && this.hasTexture(assetKey)) {
        this.putUnit(cx, cy, assetKey, size, size, 1, tint);
      } else if (this.hasTexture(PLAYTEST_PIXEL_TEXTURE_KEYS.ironGolem)) {
        this.putUnit(cx, cy, PLAYTEST_PIXEL_TEXTURE_KEYS.ironGolem, size * 0.85, size * 0.85, 1, tint ?? def.color);
      } else {
        this.unitGraphics.fillStyle(def.color, 1);
        this.unitGraphics.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 8);
        this.putLabel(cx, cy, def.shortLabel, '#0F172A', '13px');
      }

      // Shield overlay
      if (def.shieldAmount > 0) {
        const shieldKey = def.definitionId === 'frost_guardian' ? frostShieldKey : bastionShieldKey;
        if (usePng && this.hasTexture(shieldKey)) {
          this.putFx(cx, cy, shieldKey, size + 14, size + 14, 0.82);
        } else {
          this.hudGraphics.lineStyle(2.5, 0x38bdf8, 0.9);
          this.hudGraphics.strokeCircle(cx, cy, size * 0.56);
        }
      }

      // HP bar & Shield bar above unit
      const barW = 68;
      const barX = cx - barW / 2;
      const barY = rect.y + 8;
      const hpRatio = def.maxHp > 0 ? Phaser.Math.Clamp(def.hp / def.maxHp, 0, 1) : 0;
      this.hudGraphics.fillStyle(0x020617, 0.92);
      this.hudGraphics.fillRect(barX, barY, barW, 8);
      this.hudGraphics.fillStyle(def.tier === 2 ? 0xfacc15 : 0x22c55e, 1);
      this.hudGraphics.fillRect(barX + 1, barY + 1, (barW - 2) * hpRatio, 6);

      if (def.shieldAmount > 0 && def.shieldMaxAmount > 0) {
        const sRatio = Phaser.Math.Clamp(def.shieldAmount / def.shieldMaxAmount, 0, 1);
        this.hudGraphics.fillStyle(0x38bdf8, 1);
        this.hudGraphics.fillRect(barX + 1, barY + 6, (barW - 2) * sRatio, 3);
      }

      if (def.tier === 2) {
        this.putLabel(barX + barW + 10, barY + 4, 'T2', '#FACC15', '10px');
      }
    }
  }

  private renderEnemies(snap: CampaignSnapshot): void {
    const t = this.time.now;
    const usePng = this.visualStyle === 'pixel-art';
    const iceBlockKey = EFFECT_SPRITE_ASSETS.vfx_ice_block.key;
    const markKey = EFFECT_SPRITE_ASSETS.vfx_predator_mark.key;

    for (const enemy of snap.enemies) {
      const ex = GRID_ORIGIN_X + enemy.x * CELL_W;
      const sway = enemy.isFrozen || enemy.isStunned ? 0 : Math.sin(t * 0.008 + enemy.lane) * 2;
      const ey = GRID_ORIGIN_Y + (enemy.lane + 0.5) * CELL_H + sway;
      const size = 62;

      this.unitGraphics.fillStyle(0x020617, 0.35);
      this.unitGraphics.fillEllipse(ex, ey + 28, 38, 10);

      const assetKey = ENEMY_SPRITE_ASSETS[enemy.definitionId]?.key;
      const tint = enemy.isFrozen
        ? 0x67e8f9
        : enemy.isStunned
          ? 0xfef08a
          : enemy.burnCount > 0
            ? 0xfb923c
            : enemy.slowPct > 0
              ? 0x93c5fd
              : undefined;

      if (usePng && assetKey && this.hasTexture(assetKey)) {
        this.putUnit(ex, ey, assetKey, size, size, 1, tint);
      } else if (this.hasTexture(PLAYTEST_PIXEL_TEXTURE_KEYS.zombie)) {
        this.putUnit(ex, ey, PLAYTEST_PIXEL_TEXTURE_KEYS.zombie, size, size, 1, tint ?? enemy.color);
      } else {
        this.unitGraphics.fillStyle(enemy.color, 1);
        this.unitGraphics.fillRoundedRect(ex - 26, ey - 26, 52, 52, 6);
        this.putLabel(ex, ey, enemy.shortLabel, '#FFFFFF', '11px');
      }

      if (enemy.isFrozen && usePng && this.hasTexture(iceBlockKey)) {
        this.putFx(ex, ey, iceBlockKey, 66, 66, 0.72);
      }

      if (enemy.isVulnerable) {
        if (usePng && this.hasTexture(markKey)) {
          this.putFx(ex, ey - 42, markKey, 28, 28, 1);
        } else {
          this.putLabel(ex, ey - 42, 'MARK +40%', '#F87171', '10px');
        }
      }

      // Enemy HP Bar
      const barW = 50;
      const barX = ex - barW / 2;
      const barY = ey - 36;
      const hpRatio = enemy.maxHp > 0 ? Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1) : 0;
      this.hudGraphics.fillStyle(0x020617, 0.92);
      this.hudGraphics.fillRect(barX, barY, barW, 7);
      this.hudGraphics.fillStyle(0xef4444, 1);
      this.hudGraphics.fillRect(barX + 1, barY + 1, (barW - 2) * hpRatio, 5);

      const tags: string[] = [];
      if (enemy.isFrozen) tags.push('FRZ');
      if (enemy.isStunned) tags.push('STUN');
      if (enemy.slowPct > 0) tags.push('SLOW');
      if (enemy.burnCount > 0) tags.push(enemy.burnCount > 1 ? `BURN×${enemy.burnCount}` : 'BURN');
      if (tags.length > 0) {
        this.putLabel(ex, ey + 36, tags.join(' '), '#FDE68A', '10px');
      }
    }
  }

  private renderProjectiles(snap: CampaignSnapshot): void {
    const usePng = this.visualStyle === 'pixel-art';
    const pulse = 0.7 + 0.3 * Math.sin(this.time.now * 0.014);

    for (const proj of snap.projectiles) {
      if (proj.kind === 'lane') {
        const px = GRID_ORIGIN_X + proj.x * CELL_W;
        const py = GRID_ORIGIN_Y + (proj.lane + 0.5) * CELL_H;
        const effectKey =
          proj.abilityId === 'guardian_charge'
            ? EFFECT_SPRITE_ASSETS.proj_iron_wolf.key
            : proj.abilityId === 'glacier_barrage'
              ? EFFECT_SPRITE_ASSETS.proj_frost_pierce_arrow.key
              : proj.abilityId === 'siege_volley'
                ? EFFECT_SPRITE_ASSETS.proj_steel_bolt.key
                : proj.abilityId === 'piercing_barrage'
                  ? EFFECT_SPRITE_ASSETS.proj_piercing_arrow.key
                  : EFFECT_SPRITE_ASSETS.proj_arrow.key;
        const size = proj.abilityId === 'guardian_charge' ? 68 : 34;

        if (usePng && this.hasTexture(effectKey)) {
          this.putFx(px, py, effectKey, size, size, 1);
        } else {
          this.fxGraphics.lineStyle(4, proj.pierce ? 0x38bdf8 : 0xfbbf24, 1);
          this.fxGraphics.lineBetween(px - 18, py, px + 14, py);
        }
      } else {
        const rect = this.getCellRect(proj.impactCell);
        const tx = rect.x + rect.w / 2;
        const ty = rect.y + rect.h / 2;
        this.fxGraphics.lineStyle(2.5, 0xf87171, pulse);
        this.fxGraphics.strokeCircle(tx, ty, 22);

        const totalTicks = proj.abilityId === 'inferno' ? INFERNO_TRAVEL_TICKS : METEOR_TRAVEL_TICKS;
        const progress = Phaser.Math.Clamp(1 - proj.remainingTravelTicks / totalTicks, 0, 1);
        // Parabolic curve for Blaze lobbed fireballs vs angled meteor rain
        const curX = proj.abilityId === 'inferno' ? tx - 65 * (1 - progress) : tx + 44 * (1 - progress);
        const arcLift = proj.abilityId === 'inferno' ? Math.sin(progress * Math.PI) * 58 : 135 * (1 - progress);
        const curY = ty - arcLift;
        const projKey =
          proj.abilityId === 'inferno'
            ? EFFECT_SPRITE_ASSETS.proj_fireball.key
            : EFFECT_SPRITE_ASSETS.proj_meteor_arrow.key;
        if (usePng && this.hasTexture(projKey)) {
          this.putFx(curX, curY, projKey, 34, 34, 1);
        } else {
          this.fxGraphics.fillStyle(0xf97316, 1);
          this.fxGraphics.fillCircle(curX, curY, 7);
        }
      }
    }
  }

  private renderItems(snap: CampaignSnapshot): void {
    const pulse = 1 + 0.1 * Math.sin(this.time.now * 0.008);
    const usePng = this.visualStyle === 'pixel-art';

    for (const item of snap.items) {
      const pos = this.getItemCoords(item);
      const size = 40 * pulse;
      if (item.kind === 'energy') {
        this.unitGraphics.fillStyle(0xfacc15, 0.28);
        this.unitGraphics.fillCircle(pos.x, pos.y, 20 * pulse);
        const key =
          usePng && this.hasTexture(ITEM_SPRITE_ASSETS.energy_orb.key)
            ? ITEM_SPRITE_ASSETS.energy_orb.key
            : PLAYTEST_PIXEL_TEXTURE_KEYS.energy;
        if (this.hasTexture(key)) {
          this.putFx(pos.x, pos.y, key, size, size, 1);
        }
        this.putLabel(pos.x, pos.y + 22, `+${item.amount}`, '#FEF08A', '11px');
      } else {
        this.unitGraphics.fillStyle(0x38bdf8, 0.3);
        this.unitGraphics.fillCircle(pos.x, pos.y, 22 * pulse);
        const key =
          usePng && this.hasTexture(ITEM_SPRITE_ASSETS.power_crystal.key)
            ? ITEM_SPRITE_ASSETS.power_crystal.key
            : PLAYTEST_PIXEL_TEXTURE_KEYS.crystal;
        if (this.hasTexture(key)) {
          this.putFx(pos.x, pos.y, key, size, size, 1);
        }
        this.putLabel(pos.x, pos.y + 22, 'CRYSTAL', '#BAE6FD', '10px');
      }
    }
  }

  private renderFlashes(snap: CampaignSnapshot): void {
    const usePng = this.visualStyle === 'pixel-art';
    const gridW = GRID_COLS * CELL_W;
    const gridH = GRID_ROWS * CELL_H;

    for (const flash of snap.flashes) {
      const alpha = Phaser.Math.Clamp(flash.ttlMs / 800, 0.15, 0.9);
      if (flash.kind === 'summon' && flash.cell) {
        const rect = this.getCellRect(flash.cell);
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        const popAlpha = Phaser.Math.Clamp(flash.ttlMs / 450, 0.2, 0.95);
        const ringRadius = 26 + (1 - popAlpha) * 28;
        this.fxGraphics.fillStyle(0x22c55e, 0.22 * popAlpha);
        this.fxGraphics.fillCircle(cx, cy, ringRadius);
        this.fxGraphics.lineStyle(3, 0x4ade80, popAlpha);
        this.fxGraphics.strokeCircle(cx, cy, ringRadius);
        this.putLabel(cx, rect.y + 18, `${flash.label}!`, '#86EFAC', '12px');
        continue;
      }
      const aid = flash.abilityId;

      if (aid === 'absolute_zero' || aid === 'solar_cataclysm') {
        this.fxGraphics.fillStyle(aid === 'absolute_zero' ? 0x38bdf8 : 0xf97316, 0.25 * alpha);
        this.fxGraphics.fillRect(GRID_ORIGIN_X, GRID_ORIGIN_Y, gridW, gridH);
        this.putLabel(GRID_ORIGIN_X + gridW / 2, GRID_ORIGIN_Y + gridH / 2, flash.label, '#FFFFFF', '22px');
        continue;
      }

      if (aid === 'wildfire_rush') {
        const fireWolfKey = EFFECT_SPRITE_ASSETS.proj_fire_wolf.key;
        for (let r = 0; r < GRID_ROWS; r++) {
          const laneEnemy = snap.enemies.find(e => e.lane === r);
          const lx = laneEnemy
            ? GRID_ORIGIN_X + laneEnemy.x * CELL_W
            : GRID_ORIGIN_X + 3.5 * CELL_W;
          const ly = GRID_ORIGIN_Y + (r + 0.5) * CELL_H;
          if (usePng && this.hasTexture(fireWolfKey)) {
            this.putFx(lx, ly, fireWolfKey, 72, 72, alpha);
          }
        }
        continue;
      }

      if (flash.cell) {
        const rect = this.getCellRect(flash.cell);
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        if (aid === 'thermal_collapse' && usePng && this.hasTexture(EFFECT_SPRITE_ASSETS.vfx_steam_burst.key)) {
          this.putFx(cx, cy, EFFECT_SPRITE_ASSETS.vfx_steam_burst.key, CELL_W * 2.6, CELL_H * 2.6, alpha);
        } else if (aid === 'winter_pounce' && usePng && this.hasTexture(EFFECT_SPRITE_ASSETS.vfx_frost_claw.key)) {
          this.putFx(cx + CELL_W * 1.1, cy, EFFECT_SPRITE_ASSETS.vfx_frost_claw.key, CELL_W * 2.5, CELL_H * 0.9, alpha);
        } else if ((aid === 'earthquake' || aid === 'eruption') && usePng && this.hasTexture(EFFECT_SPRITE_ASSETS.vfx_earth_crack.key)) {
          this.putFx(cx + CELL_W, cy, EFFECT_SPRITE_ASSETS.vfx_earth_crack.key, 120, 96, alpha, aid === 'eruption' ? 0xf97316 : undefined);
        } else if ((aid === 'pack_frenzy' || aid === 'alpha_howl') && usePng && this.hasTexture(EFFECT_SPRITE_ASSETS.vfx_howl_ring.key)) {
          this.putFx(cx, cy, EFFECT_SPRITE_ASSETS.vfx_howl_ring.key, aid === 'alpha_howl' ? CELL_W * 2.4 : 96, aid === 'alpha_howl' ? CELL_H * 2.4 : 96, alpha);
        } else {
          this.fxGraphics.lineStyle(3, flash.color, alpha);
          this.fxGraphics.strokeCircle(cx, cy, 48);
        }
        this.putLabel(cx, rect.y + 20, flash.label, '#FFFFFF', '12px');
      }
    }
  }

  private renderDragOverlay(): void {
    if (!this.dragState || this.dragState.kind !== 'defender-fuse') return;
    this.fxGraphics.lineStyle(3, 0xfacc15, 0.9);
    const srcRect = this.getCellRect(this.dragState.sourceCell);
    this.fxGraphics.lineBetween(
      srcRect.x + srcRect.w / 2,
      srcRect.y + srcRect.h / 2,
      this.dragState.currentX,
      this.dragState.currentY,
    );

    if (this.hoverCell) {
      const target = this.findDefenderAtCell(this.hoverCell);
      if (target && target.id !== this.dragState.sourceId) {
        const outId = this.controller.getFusionOutputId(this.dragState.sourceId, target.id);
        this.putLabel(
          this.dragState.currentX,
          this.dragState.currentY - 26,
          outId ? `FUSE -> ${outId.replace(/_/g, ' ').toUpperCase()}` : 'INVALID / LOCKED FUSION',
          outId ? '#4ADE80' : '#F87171',
          '12px',
        );
      }
    }
  }

  private updateHintText(): void {
    if (this.tool.kind === 'place') {
      this.hintText.setText(
        `SUMMON MODE (${this.tool.definitionId.replace(/_/g, ' ').toUpperCase()}): Click an empty cell to place — Right-click to cancel`,
      );
      return;
    }
    if (this.tool.kind === 'crystal') {
      this.hintText.setText(
        'POWER CRYSTAL MODE: Click any living Defender on the grid to activate its Special Ability — Right-click to cancel',
      );
      return;
    }
    this.hintText.setText(
      'Click Energy/Crystals to collect · Select a Base Defender card above to Summon · Drag two Tier-1 Defenders together to Fuse (Free, any distance)',
    );
  }
}

export { ALL_GAME_ASSETS };
