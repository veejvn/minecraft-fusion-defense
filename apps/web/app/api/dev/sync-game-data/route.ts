import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { mergePlaytestPresetIntoDataset, validateMvpDataset } from '@mfd/game-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveGameDataDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'packages', 'game-data'),
    path.resolve(process.cwd(), '..', '..', 'packages', 'game-data'),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, 'entities', 'defenders.json'))) {
      return dir;
    }
  }
  return null;
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function formatError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'issues' in err &&
    Array.isArray((err as { issues: Array<{ path?: (string | number)[]; message?: string }> }).issues)
  ) {
    const issues = (err as { issues: Array<{ path?: (string | number)[]; message?: string }> }).issues;
    return issues
      .slice(0, 6)
      .map(issue => {
        const prefix = issue.path && issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${prefix}${issue.message ?? 'Invalid value'}`;
      })
      .join(' | ');
  }
  return err instanceof Error ? err.message : 'Invalid balance dataset payload';
}

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Game data JSON sync is only enabled in local development mode.' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const rawPreset =
    body && typeof body === 'object' && 'preset' in body
      ? (body as { preset: unknown }).preset
      : body;

  const gameDataDir = resolveGameDataDir();
  if (!gameDataDir) {
    return NextResponse.json(
      { error: 'Could not locate packages/game-data directory on disk.' },
      { status: 500 },
    );
  }

  try {
    const defendersPath = path.join(gameDataDir, 'entities', 'defenders.json');
    const enemiesPath = path.join(gameDataDir, 'entities', 'enemies.json');
    const recipesPath = path.join(gameDataDir, 'recipes', 'fusion-recipes.json');
    const abilitiesPath = path.join(gameDataDir, 'abilities', 'abilities.json');
    const grasslandPath = path.join(gameDataDir, 'levels', 'grassland.json');
    const sandboxPath = path.join(gameDataDir, 'levels', 'playtest-sandbox.json');

    const currentDataset = validateMvpDataset({
      defenders: readJsonFile(defendersPath),
      enemies: readJsonFile(enemiesPath),
      fusionRecipes: readJsonFile(recipesPath),
      abilities: readJsonFile(abilitiesPath),
      grasslandLevel: readJsonFile(grasslandPath),
      sandboxLevel: readJsonFile(sandboxPath),
    });

    const merged = mergePlaytestPresetIntoDataset(currentDataset, rawPreset);

    writeFileSync(defendersPath, `${JSON.stringify(merged.defenders, null, 2)}\n`, 'utf8');
    writeFileSync(enemiesPath, `${JSON.stringify(merged.enemies, null, 2)}\n`, 'utf8');
    writeFileSync(abilitiesPath, `${JSON.stringify(merged.abilities, null, 2)}\n`, 'utf8');
    writeFileSync(grasslandPath, `${JSON.stringify(merged.grasslandLevel, null, 2)}\n`, 'utf8');

    return NextResponse.json({
      ok: true,
      updatedFiles: [
        'packages/game-data/entities/defenders.json',
        'packages/game-data/entities/enemies.json',
        'packages/game-data/abilities/abilities.json',
        'packages/game-data/levels/grassland.json',
      ],
    });
  } catch (err) {
    return NextResponse.json({ error: formatError(err) }, { status: 400 });
  }
}
