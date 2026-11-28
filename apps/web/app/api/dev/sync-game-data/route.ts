import { NextResponse } from 'next/server';
import { mergePlaytestPresetIntoDataset } from '@mfd/game-data';
import {
  formatDevGameDataError,
  readCurrentMvpDataset,
  resolveGameDataPaths,
  writeJsonPretty,
} from '../../../../lib/dev-game-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const paths = resolveGameDataPaths();
  if (!paths) {
    return NextResponse.json(
      { error: 'Could not locate packages/game-data directory on disk.' },
      { status: 500 },
    );
  }

  try {
    const currentDataset = readCurrentMvpDataset(paths);
    const merged = mergePlaytestPresetIntoDataset(currentDataset, rawPreset);

    writeJsonPretty(paths.defendersPath, merged.defenders);
    writeJsonPretty(paths.enemiesPath, merged.enemies);
    writeJsonPretty(paths.abilitiesPath, merged.abilities);
    writeJsonPretty(paths.grasslandPath, merged.grasslandLevel);
    writeJsonPretty(paths.campaignLevelsPath, merged.campaignLevels);

    return NextResponse.json({
      ok: true,
      updatedFiles: [
        'packages/game-data/entities/defenders.json',
        'packages/game-data/entities/enemies.json',
        'packages/game-data/abilities/abilities.json',
        'packages/game-data/levels/grassland.json',
        'packages/game-data/levels/campaign-levels.json',
      ],
    });
  } catch (err) {
    return NextResponse.json({ error: formatDevGameDataError(err) }, { status: 400 });
  }
}
