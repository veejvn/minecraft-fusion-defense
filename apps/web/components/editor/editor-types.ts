import {
  MVP_GAME_DATA,
  type MvpCampaignLevelData,
  type MvpLevelDifficulty,
  type MvpLevelTheme,
  type MvpWaveData,
} from '@mfd/game-data';

export const EDITOR_DEFENDERS = MVP_GAME_DATA.defenders;
export const EDITOR_BASE_DEFENDERS = MVP_GAME_DATA.defenders.filter(d => d.tier === 1);
export const EDITOR_FUSION_DEFENDERS = MVP_GAME_DATA.defenders.filter(d => d.tier === 2);
export const EDITOR_ENEMIES = MVP_GAME_DATA.enemies;

export const LEVEL_THEMES: readonly { readonly id: MvpLevelTheme; readonly label: string; readonly color: string }[] = [
  { id: 'grassland', label: 'Grassland', color: '#4ADE80' },
];

export const LEVEL_DIFFICULTIES: readonly { readonly id: MvpLevelDifficulty; readonly label: string; readonly color: string }[] = [
  { id: 'easy', label: 'Easy', color: '#4ADE80' },
  { id: 'normal', label: 'Normal', color: '#38BDF8' },
  { id: 'hard', label: 'Hard', color: '#FACC15' },
  { id: 'expert', label: 'Expert', color: '#F87171' },
];

export const LANE_MODE_OPTIONS: readonly { readonly id: 'fixed' | 'sequential' | 'random'; readonly label: string }[] = [
  { id: 'sequential', label: 'Sequential (Xoay vòng)' },
  { id: 'fixed', label: 'Fixed (Lane đầu tiên)' },
  { id: 'random', label: 'Random (Ngẫu nhiên)' },
];

export function defenderSpriteUrl(id: string): string {
  return `/assets/sprites/defenders/${id}.png`;
}

export function enemySpriteUrl(id: string): string {
  return `/assets/sprites/enemies/${id}.png`;
}

export function createBlankCampaignLevel(
  existingLevels: readonly MvpCampaignLevelData[],
): MvpCampaignLevelData {
  const existingIds = new Set(existingLevels.map(l => l.id));
  let idx = existingLevels.length + 1;
  while (existingIds.has(`stage_${idx}`)) {
    idx += 1;
  }
  const maxOrder = existingLevels.reduce((max, lvl) => Math.max(max, lvl.order), 0);
  const template = existingLevels.find(l => l.id === 'grassland') ?? existingLevels[0];

  const defaultWave: MvpWaveData = {
    id: 'wave_1',
    initialDelaySeconds: 8,
    delayBeforeNextWaveSeconds: 3,
    spawnGroups: [
      {
        enemyId: 'zombie',
        count: 3,
        startOffsetSeconds: 0,
        intervalSeconds: 4,
        allowedLanes: [0, 2, 4],
        laneMode: 'sequential',
      },
    ],
  };

  return {
    id: `stage_${idx}`,
    order: maxOrder + 1,
    name: `Custom Stage ${idx}`,
    description: 'New custom Minecraft Fusion Defense campaign stage.',
    difficulty: 'normal',
    theme: 'grassland',
    unlockRequirement: template
      ? { kind: 'clear-level', levelId: template.id }
      : { kind: 'always' },
    rows: 5,
    columns: 9,
    seed: 20261128 + idx,
    initialEmeralds: 100,
    enablePassiveEnergy: false,
    fusionGloveCooldownSeconds: 10,
    villageChest: {
      enabled: true,
      amount: 50,
      intervalSeconds: 10,
    },
    energyItems: template
      ? structuredClone(template.energyItems)
      : {
          amount: 25,
          intervalSeconds: 6,
          region: { min: { x: 0.1, y: 0.15 }, max: { x: 0.9, y: 0.85 } },
          positions: [
            { x: 0.25, y: 0.3 },
            { x: 0.5, y: 0.5 },
            { x: 0.75, y: 0.7 },
          ],
        },
    startingDefenders: [],
    waveCrystals: [1],
    waves: [defaultWave],
  };
}

export function duplicateCampaignLevel(
  source: MvpCampaignLevelData,
  existingLevels: readonly MvpCampaignLevelData[],
): MvpCampaignLevelData {
  const existingIds = new Set(existingLevels.map(l => l.id));
  let suffix = 2;
  while (existingIds.has(`${source.id}_copy_${suffix}`)) {
    suffix += 1;
  }
  const maxOrder = existingLevels.reduce((max, lvl) => Math.max(max, lvl.order), 0);
  const copy = structuredClone(source);
  return {
    ...copy,
    id: `${source.id}_copy_${suffix}`,
    order: maxOrder + 1,
    name: `${source.name} (Copy)`,
  };
}

export function getWaveDurationSeconds(wave: MvpWaveData): number {
  let maxEnd = Math.max(10, wave.initialDelaySeconds + 10);
  for (const grp of wave.spawnGroups) {
    const end = grp.startOffsetSeconds + Math.max(0, grp.count - 1) * grp.intervalSeconds + 2;
    if (end > maxEnd) maxEnd = end;
  }
  return Math.ceil(maxEnd / 5) * 5;
}
