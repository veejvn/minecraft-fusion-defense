import type { PlaytestDefenderView, PlaytestEnemyView } from '../playtest/playtest-controller';
import { EFFECT_SPRITE_ASSETS } from './asset-manifest';

export type BasicAttackVisualSpec =
  | {
      readonly kind: 'projectile';
      readonly textureKey: string;
      readonly fallbackColor: number;
      readonly size: number;
      readonly durationMs: number;
      readonly curved?: boolean;
      readonly arcHeight?: number;
      readonly tint?: number;
    }
  | {
      readonly kind: 'melee';
      readonly style: 'slam' | 'claw' | 'bite' | 'burst';
      readonly color: number;
      readonly durationMs: number;
      readonly textureKey?: string;
    };

export interface ActiveBasicAttack {
  readonly spec: BasicAttackVisualSpec;
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly startMs: number;
  readonly durationMs: number;
}

export interface BattleGridGeometry {
  readonly originX: number;
  readonly originY: number;
  readonly cellW: number;
  readonly cellH: number;
}

export const BASIC_ATTACK_VFX_BY_DEFENDER: Readonly<Record<string, BasicAttackVisualSpec>> = {
  // Ranged Straight Projectiles
  skeleton: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_arrow.key,
    fallbackColor: 0xfef08a,
    size: 32,
    durationMs: 220,
  },
  skeleton_sniper: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_arrow.key,
    fallbackColor: 0xfde047,
    tint: 0xfef08a,
    size: 36,
    durationMs: 190,
  },
  iron_ranger: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_steel_bolt.key,
    fallbackColor: 0xe2e8f0,
    size: 36,
    durationMs: 210,
  },
  frostbite_ranger: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_frost_pierce_arrow.key,
    fallbackColor: 0x38bdf8,
    size: 36,
    durationMs: 220,
  },
  snow_golem: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_snowball.key,
    fallbackColor: 0xe0f2fe,
    size: 30,
    durationMs: 240,
  },
  ice_golem: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_snowball.key,
    fallbackColor: 0x7dd3fc,
    tint: 0x7dd3fc,
    size: 36,
    durationMs: 240,
  },
  inferno_archer: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_meteor_arrow.key,
    fallbackColor: 0xf97316,
    size: 36,
    durationMs: 220,
  },

  // Ranged Lobbed / Parabolic Projectiles
  blaze: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_fireball.key,
    fallbackColor: 0xfb923c,
    size: 32,
    durationMs: 280,
    curved: true,
    arcHeight: 56,
  },
  infernal_archon: {
    kind: 'projectile',
    textureKey: EFFECT_SPRITE_ASSETS.proj_fireball.key,
    fallbackColor: 0xf97316,
    size: 38,
    durationMs: 280,
    curved: true,
    arcHeight: 64,
  },

  // Melee Slams
  iron_golem: {
    kind: 'melee',
    style: 'slam',
    color: 0xe2e8f0,
    durationMs: 220,
  },
  steel_guardian: {
    kind: 'melee',
    style: 'slam',
    color: 0xfacc15,
    durationMs: 240,
  },
  magma_colossus: {
    kind: 'melee',
    style: 'slam',
    color: 0xf97316,
    durationMs: 240,
  },

  // Melee Elemental Claws & Steam Bursts
  frost_guardian: {
    kind: 'melee',
    style: 'claw',
    textureKey: EFFECT_SPRITE_ASSETS.vfx_frost_claw.key,
    color: 0x38bdf8,
    durationMs: 220,
  },
  frostfang: {
    kind: 'melee',
    style: 'claw',
    textureKey: EFFECT_SPRITE_ASSETS.vfx_frost_claw.key,
    color: 0x7dd3fc,
    durationMs: 210,
  },
  steam_warden: {
    kind: 'melee',
    style: 'burst',
    textureKey: EFFECT_SPRITE_ASSETS.vfx_steam_burst.key,
    color: 0xbae6fd,
    durationMs: 230,
  },

  // Melee Fang / Bite Strikes
  wolf: {
    kind: 'melee',
    style: 'bite',
    color: 0xfef08a,
    durationMs: 190,
  },
  alpha_wolf: {
    kind: 'melee',
    style: 'bite',
    color: 0xfacc15,
    durationMs: 195,
  },
  ironfang_guardian: {
    kind: 'melee',
    style: 'bite',
    color: 0xcbd5e1,
    durationMs: 205,
  },
  bonefang_hunter: {
    kind: 'melee',
    style: 'bite',
    color: 0xf87171,
    durationMs: 195,
  },
  flame_fang: {
    kind: 'melee',
    style: 'bite',
    color: 0xf97316,
    durationMs: 200,
  },
};

export function getBasicAttackVisualSpec(definitionId: string): BasicAttackVisualSpec {
  return (
    BASIC_ATTACK_VFX_BY_DEFENDER[definitionId] ?? {
      kind: 'melee',
      style: 'slam',
      color: 0xe2e8f0,
      durationMs: 180,
    }
  );
}

/**
 * Tracks headless snapshot combat deltas (`attackCount` and `enemy.hp`) in render time
 * to synthesize visual projectiles, melee strike VFX, lunge/recoil offsets, and hit flashes.
 */
export class BasicAttackVisualTracker {
  private visualTimeMs = 0;
  private lastTick = -1;
  private readonly prevDefenderAttackState = new Map<
    string,
    { readonly anchor: number | null; readonly count: number }
  >();
  private readonly prevEnemyHp = new Map<string, number>();
  private readonly lastEnemyPos = new Map<string, { readonly lane: number; readonly x: number }>();
  private readonly defenderAttackAnims = new Map<
    string,
    { readonly startMs: number; readonly durationMs: number; readonly isMelee: boolean }
  >();
  private readonly enemyHitFlashUntil = new Map<string, number>();
  private activeBasicAttacks: ActiveBasicAttack[] = [];

  reset(): void {
    this.visualTimeMs = 0;
    this.lastTick = -1;
    this.prevDefenderAttackState.clear();
    this.prevEnemyHp.clear();
    this.lastEnemyPos.clear();
    this.defenderAttackAnims.clear();
    this.enemyHitFlashUntil.clear();
    this.activeBasicAttacks = [];
  }

  advance(deltaMs: number, paused: boolean): boolean {
    if (!paused) {
      this.visualTimeMs += Math.min(Math.max(0, deltaMs), 50);
    }
    const now = this.visualTimeMs;
    this.activeBasicAttacks = this.activeBasicAttacks.filter(a => now - a.startMs <= a.durationMs);
    for (const [id, anim] of this.defenderAttackAnims) {
      if (now - anim.startMs > anim.durationMs) {
        this.defenderAttackAnims.delete(id);
      }
    }
    for (const [id, until] of this.enemyHitFlashUntil) {
      if (now >= until) {
        this.enemyHitFlashUntil.delete(id);
      }
    }
    return (
      this.activeBasicAttacks.length > 0 ||
      this.defenderAttackAnims.size > 0 ||
      this.enemyHitFlashUntil.size > 0
    );
  }

  syncFromSnapshot(
    defenders: readonly PlaytestDefenderView[],
    enemies: readonly PlaytestEnemyView[],
    geom: BattleGridGeometry,
    currentTick = -1,
  ): void {
    if (currentTick >= 0 && this.lastTick >= 0 && currentTick < this.lastTick) {
      this.reset();
    }
    if (currentTick >= 0) {
      this.lastTick = currentTick;
    }

    const enemyById = new Map(enemies.map(e => [e.id, e]));
    const livingDefIds = new Set<string>();
    const livingEnemyIds = new Set<string>();

    for (const def of defenders) {
      livingDefIds.add(def.id);
      const prev = this.prevDefenderAttackState.get(def.id);
      const anchor = def.attackAnchorTick;
      const count = def.attackCount;
      this.prevDefenderAttackState.set(def.id, { anchor, count });

      const firedOnSpawn =
        prev === undefined &&
        count > 0 &&
        anchor !== null &&
        currentTick >= 0 &&
        currentTick - anchor <= 2;
      const firedAfterPrev =
        prev !== undefined &&
        count > 0 &&
        ((anchor === prev.anchor && count > prev.count) ||
          (anchor !== prev.anchor && anchor !== null));

      if (firedOnSpawn || firedAfterPrev) {
        const spec = getBasicAttackVisualSpec(def.definitionId);
        const isMelee = spec.kind === 'melee';
        this.defenderAttackAnims.set(def.id, {
          startMs: this.visualTimeMs,
          durationMs: isMelee ? 185 : 150,
          isMelee,
        });

        const startX = geom.originX + (def.column + 0.65) * geom.cellW;
        const startY = geom.originY + (def.row + 0.48) * geom.cellH;
        const livingTarget = def.targetId ? enemyById.get(def.targetId) : undefined;
        const slainTarget = !livingTarget && def.targetId ? this.lastEnemyPos.get(def.targetId) : undefined;
        const fallbackTarget =
          livingTarget ??
          slainTarget ??
          enemies.find(e => e.lane === def.row && e.x >= def.column);
        const endCol = fallbackTarget ? fallbackTarget.x : def.column + (isMelee ? 1.05 : 3.2);
        const endX = geom.originX + endCol * geom.cellW;
        const endY = geom.originY + ((fallbackTarget ? fallbackTarget.lane : def.row) + 0.5) * geom.cellH;

        this.activeBasicAttacks.push({
          spec,
          startX,
          startY,
          endX,
          endY,
          startMs: this.visualTimeMs,
          durationMs: spec.durationMs,
        });
      }
    }

    for (const id of this.prevDefenderAttackState.keys()) {
      if (!livingDefIds.has(id)) {
        this.prevDefenderAttackState.delete(id);
        this.defenderAttackAnims.delete(id);
      }
    }

    for (const enemy of enemies) {
      livingEnemyIds.add(enemy.id);
      const prevHp = this.prevEnemyHp.get(enemy.id);
      if (prevHp !== undefined && enemy.hp < prevHp) {
        this.enemyHitFlashUntil.set(enemy.id, this.visualTimeMs + 110);
      }
      this.prevEnemyHp.set(enemy.id, enemy.hp);
      this.lastEnemyPos.set(enemy.id, { lane: enemy.lane, x: enemy.x });
    }

    for (const id of this.prevEnemyHp.keys()) {
      if (!livingEnemyIds.has(id)) {
        this.prevEnemyHp.delete(id);
        this.lastEnemyPos.delete(id);
        this.enemyHitFlashUntil.delete(id);
      }
    }
  }

  getDefenderOffsetX(defenderId: string): number {
    const anim = this.defenderAttackAnims.get(defenderId);
    if (!anim) return 0;
    const elapsed = this.visualTimeMs - anim.startMs;
    if (elapsed < 0 || elapsed > anim.durationMs) return 0;
    const p = elapsed / anim.durationMs;
    return Math.sin(p * Math.PI) * (anim.isMelee ? 12 : -6);
  }

  isEnemyHitFlashing(enemyId: string): boolean {
    const until = this.enemyHitFlashUntil.get(enemyId);
    return until !== undefined && this.visualTimeMs < until;
  }

  getActiveAttacks(): readonly ActiveBasicAttack[] {
    return this.activeBasicAttacks;
  }

  getVisualTimeMs(): number {
    return this.visualTimeMs;
  }
}

export interface BasicAttackRenderGraphics {
  lineStyle(lineWidth: number, color: number, alpha?: number): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
  fillStyle(color: number, alpha?: number): unknown;
  fillCircle(x: number, y: number, radius: number): unknown;
  strokeCircle(x: number, y: number, radius: number): unknown;
}

export function renderBasicAttackEffects(
  tracker: BasicAttackVisualTracker,
  gfx: BasicAttackRenderGraphics,
  useSprites: boolean,
  hasTexture: (key: string) => boolean,
  putSprite: (x: number, y: number, key: string, size: number, alpha: number, tint?: number) => void,
): void {
  const now = tracker.getVisualTimeMs();

  for (const atk of tracker.getActiveAttacks()) {
    const p = Math.min(1, Math.max(0, (now - atk.startMs) / atk.durationMs));
    if (atk.spec.kind === 'projectile') {
      const curX = atk.startX + (atk.endX - atk.startX) * p;
      const baseY = atk.startY + (atk.endY - atk.startY) * p;
      const arcOffset = atk.spec.curved ? Math.sin(p * Math.PI) * (atk.spec.arcHeight ?? 52) : 0;
      const curY = baseY - arcOffset;

      const trailP = Math.max(0, p - 0.18);
      const trailX = atk.startX + (atk.endX - atk.startX) * trailP;
      const trailArc = atk.spec.curved ? Math.sin(trailP * Math.PI) * (atk.spec.arcHeight ?? 52) : 0;
      const trailY = atk.startY + (atk.endY - atk.startY) * trailP - trailArc;

      gfx.lineStyle(4, atk.spec.fallbackColor, 0.65);
      gfx.lineBetween(trailX, trailY, curX, curY);

      if (useSprites && hasTexture(atk.spec.textureKey)) {
        putSprite(curX, curY, atk.spec.textureKey, atk.spec.size, 1, atk.spec.tint);
      } else {
        gfx.fillStyle(atk.spec.fallbackColor, 1);
        gfx.fillCircle(curX, curY, Math.max(6, atk.spec.size * 0.24));
      }

      if (p >= 0.78) {
        const sparkAlpha = Math.max(0.2, (1 - p) / 0.22);
        gfx.fillStyle(atk.spec.fallbackColor, sparkAlpha * 0.72);
        gfx.fillCircle(atk.endX, atk.endY, 14);
      }
    } else {
      const alpha = Math.max(0.15, 1 - p);
      if (atk.spec.style === 'claw' || atk.spec.style === 'burst') {
        const cx = (atk.startX + atk.endX) * 0.5 + 10;
        const cy = atk.endY;
        if (useSprites && atk.spec.textureKey && hasTexture(atk.spec.textureKey)) {
          const size = 48 + p * 18;
          putSprite(cx, cy, atk.spec.textureKey, size, alpha, atk.spec.color);
        } else {
          gfx.lineStyle(3.5, atk.spec.color, alpha);
          gfx.lineBetween(cx - 18, cy - 16, cx + 18, cy + 14);
          gfx.lineBetween(cx - 18, cy + 14, cx + 18, cy - 16);
        }
      } else if (atk.spec.style === 'bite') {
        const bx = atk.endX - 6;
        const by = atk.endY;
        const spread = 16;
        gfx.lineStyle(4, atk.spec.color, alpha);
        gfx.lineBetween(bx - spread, by - spread, bx + spread, by + spread);
        gfx.lineBetween(bx - spread, by + spread, bx + spread, by - spread);
        gfx.fillStyle(0xffffff, alpha * 0.75);
        gfx.fillCircle(bx, by, 6 + p * 8);
      } else {
        // Melee 'slam' shockwave
        const sx = (atk.startX + atk.endX) * 0.5 + 8;
        const sy = atk.endY;
        const radius = 14 + p * 26;
        gfx.fillStyle(atk.spec.color, alpha * 0.28);
        gfx.fillCircle(sx, sy, radius);
        gfx.lineStyle(3.5, atk.spec.color, alpha);
        gfx.strokeCircle(sx, sy, radius);
      }
    }
  }
}
