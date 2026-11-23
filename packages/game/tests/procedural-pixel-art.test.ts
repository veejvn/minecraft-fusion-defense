import { describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import {
  PIXEL_ART_SPRITES,
  PLAYTEST_PIXEL_TEXTURE_KEYS,
  registerPlaytestPixelTextures,
} from '../src/playtest/procedural-pixel-art';

describe('procedural-pixel-art (code pixel-matrix prototype)', () => {
  it('defines valid dimensions, palettes, and row lengths for all 6 sprites', () => {
    expect(PIXEL_ART_SPRITES).toHaveLength(6);

    const expectedSizes: Record<string, { w: number; h: number; requireTransparent: boolean; requireOpaque: boolean }> = {
      [PLAYTEST_PIXEL_TEXTURE_KEYS.ironGolem]: { w: 32, h: 32, requireTransparent: true, requireOpaque: false },
      [PLAYTEST_PIXEL_TEXTURE_KEYS.zombie]: { w: 32, h: 32, requireTransparent: true, requireOpaque: false },
      [PLAYTEST_PIXEL_TEXTURE_KEYS.grassEven]: { w: 32, h: 32, requireTransparent: false, requireOpaque: true },
      [PLAYTEST_PIXEL_TEXTURE_KEYS.grassOdd]: { w: 32, h: 32, requireTransparent: false, requireOpaque: true },
      [PLAYTEST_PIXEL_TEXTURE_KEYS.energy]: { w: 16, h: 16, requireTransparent: true, requireOpaque: false },
      [PLAYTEST_PIXEL_TEXTURE_KEYS.crystal]: { w: 16, h: 16, requireTransparent: true, requireOpaque: false },
    };

    for (const spec of PIXEL_ART_SPRITES) {
      const rule = expectedSizes[spec.key];
      expect(rule, `unexpected sprite key ${spec.key}`).toBeDefined();
      expect(spec.width).toBe(rule.w);
      expect(spec.height).toBe(rule.h);
      expect(spec.rows).toHaveLength(spec.height);

      for (const [token, hex] of Object.entries(spec.palette)) {
        expect(token).toHaveLength(1);
        expect(token).not.toBe('.');
        expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }

      let transparentCount = 0;
      let coloredCount = 0;
      for (let y = 0; y < spec.rows.length; y++) {
        const row = spec.rows[y];
        expect(row, `${spec.key} row ${y} width`).toHaveLength(spec.width);
        for (const ch of row) {
          if (ch === '.') {
            transparentCount += 1;
          } else {
            expect(spec.palette[ch], `${spec.key} missing palette key '${ch}'`).toBeDefined();
            coloredCount += 1;
          }
        }
      }

      expect(coloredCount).toBeGreaterThan(0);
      if (rule.requireTransparent) {
        expect(transparentCount).toBeGreaterThan(0);
      }
      if (rule.requireOpaque) {
        expect(transparentCount).toBe(0);
      }
    }
  });

  it('registers CanvasTextures with NEAREST filter and stays idempotent per scene', () => {
    const existingKeys = new Set<string>();
    const createdRecords: Array<{
      key: string;
      width: number;
      height: number;
      fillCount: number;
      refreshCalls: number;
      filterModes: number[];
    }> = [];

    const fakeScene = {
      textures: {
        exists: vi.fn((key: string) => existingKeys.has(key)),
        createCanvas: vi.fn((key: string, width: number, height: number) => {
          existingKeys.add(key);
          const record = {
            key,
            width,
            height,
            fillCount: 0,
            refreshCalls: 0,
            filterModes: [] as number[],
          };
          createdRecords.push(record);
          return {
            getContext: () => ({
              clearRect: vi.fn(),
              fillStyle: '',
              fillRect: vi.fn(() => {
                record.fillCount += 1;
              }),
            }),
            refresh: vi.fn(() => {
              record.refreshCalls += 1;
            }),
            setFilter: vi.fn((mode: number) => {
              record.filterModes.push(mode);
            }),
          };
        }),
      },
    } as unknown as Phaser.Scene;

    const nearestFilter = 1 as Phaser.Textures.FilterMode;
    registerPlaytestPixelTextures(fakeScene, nearestFilter);

    expect(createdRecords).toHaveLength(6);
    for (const rec of createdRecords) {
      expect(rec.fillCount).toBeGreaterThan(0);
      expect(rec.refreshCalls).toBe(1);
      expect(rec.filterModes).toEqual([1]);
    }

    // Calling again on the same scene should not recreate existing textures.
    registerPlaytestPixelTextures(fakeScene, nearestFilter);
    expect(createdRecords).toHaveLength(6);
    expect(fakeScene.textures.createCanvas).toHaveBeenCalledTimes(6);
  });
});
