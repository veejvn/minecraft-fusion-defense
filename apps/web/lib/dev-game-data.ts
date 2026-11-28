import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  validateMvpDataset,
  type MvpCampaignLevelData,
  type MvpDataset,
} from '@mfd/game-data';

export interface GameDataFilePaths {
  readonly dir: string;
  readonly defendersPath: string;
  readonly enemiesPath: string;
  readonly recipesPath: string;
  readonly abilitiesPath: string;
  readonly grasslandPath: string;
  readonly sandboxPath: string;
  readonly campaignLevelsPath: string;
}

export function resolveGameDataPaths(): GameDataFilePaths | null {
  const candidates = [
    path.resolve(process.cwd(), 'packages', 'game-data'),
    path.resolve(process.cwd(), '..', '..', 'packages', 'game-data'),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, 'entities', 'defenders.json'))) {
      return {
        dir,
        defendersPath: path.join(dir, 'entities', 'defenders.json'),
        enemiesPath: path.join(dir, 'entities', 'enemies.json'),
        recipesPath: path.join(dir, 'recipes', 'fusion-recipes.json'),
        abilitiesPath: path.join(dir, 'abilities', 'abilities.json'),
        grasslandPath: path.join(dir, 'levels', 'grassland.json'),
        sandboxPath: path.join(dir, 'levels', 'playtest-sandbox.json'),
        campaignLevelsPath: path.join(dir, 'levels', 'campaign-levels.json'),
      };
    }
  }
  return null;
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function readCurrentMvpDataset(paths: GameDataFilePaths): MvpDataset {
  return validateMvpDataset({
    defenders: readJsonFile(paths.defendersPath),
    enemies: readJsonFile(paths.enemiesPath),
    fusionRecipes: readJsonFile(paths.recipesPath),
    abilities: readJsonFile(paths.abilitiesPath),
    grasslandLevel: readJsonFile(paths.grasslandPath),
    sandboxLevel: readJsonFile(paths.sandboxPath),
    campaignLevels: readJsonFile(paths.campaignLevelsPath),
  });
}

export function writeJsonPretty(filePath: string, data: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function sortCampaignLevels(levels: readonly MvpCampaignLevelData[]): MvpCampaignLevelData[] {
  return [...levels].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function formatDevGameDataError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'issues' in err &&
    Array.isArray((err as { issues: Array<{ path?: (string | number)[]; message?: string }> }).issues)
  ) {
    const issues = (err as { issues: Array<{ path?: (string | number)[]; message?: string }> }).issues;
    return issues
      .slice(0, 8)
      .map(issue => {
        const prefix = issue.path && issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${prefix}${issue.message ?? 'Invalid value'}`;
      })
      .join(' | ');
  }
  return err instanceof Error ? err.message : 'Invalid game-data payload';
}
