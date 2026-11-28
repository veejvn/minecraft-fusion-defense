import { NextResponse } from 'next/server';
import {
  mergeCampaignLevelsIntoDataset,
  mvpCampaignLevelSchema,
  type MvpCampaignLevelData,
} from '@mfd/game-data';
import {
  formatDevGameDataError,
  readCurrentMvpDataset,
  resolveGameDataPaths,
  sortCampaignLevels,
  writeJsonPretty,
} from '../../../../lib/dev-game-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function devOnlyForbidden(): NextResponse {
  return NextResponse.json(
    { error: 'Dev Stage Studio API is only enabled in local development mode.' },
    { status: 403 },
  );
}

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return devOnlyForbidden();
  }
  const paths = resolveGameDataPaths();
  if (!paths) {
    return NextResponse.json(
      { error: 'Could not locate packages/game-data directory on disk.' },
      { status: 500 },
    );
  }
  try {
    const dataset = readCurrentMvpDataset(paths);
    return NextResponse.json({
      ok: true,
      levels: sortCampaignLevels(dataset.campaignLevels),
    });
  } catch (err) {
    return NextResponse.json({ error: formatDevGameDataError(err) }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return devOnlyForbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const paths = resolveGameDataPaths();
  if (!paths) {
    return NextResponse.json(
      { error: 'Could not locate packages/game-data directory on disk.' },
      { status: 500 },
    );
  }

  try {
    const currentDataset = readCurrentMvpDataset(paths);
    let nextLevels: MvpCampaignLevelData[];

    if (body && typeof body === 'object' && 'levels' in body) {
      nextLevels = (body as { levels: MvpCampaignLevelData[] }).levels;
    } else if (body && typeof body === 'object' && 'level' in body) {
      const incoming = mvpCampaignLevelSchema.parse((body as { level: unknown }).level);
      const exists = currentDataset.campaignLevels.some(l => l.id === incoming.id);
      nextLevels = exists
        ? currentDataset.campaignLevels.map(l => (l.id === incoming.id ? incoming : l))
        : [...currentDataset.campaignLevels, incoming];
    } else {
      const incoming = mvpCampaignLevelSchema.parse(body);
      const exists = currentDataset.campaignLevels.some(l => l.id === incoming.id);
      nextLevels = exists
        ? currentDataset.campaignLevels.map(l => (l.id === incoming.id ? incoming : l))
        : [...currentDataset.campaignLevels, incoming];
    }

    const sortedLevels = sortCampaignLevels(nextLevels);
    const merged = mergeCampaignLevelsIntoDataset(currentDataset, sortedLevels);

    writeJsonPretty(paths.campaignLevelsPath, merged.campaignLevels);
    writeJsonPretty(paths.grasslandPath, merged.grasslandLevel);

    return NextResponse.json({
      ok: true,
      levels: merged.campaignLevels,
      updatedFiles: [
        'packages/game-data/levels/campaign-levels.json',
        'packages/game-data/levels/grassland.json',
      ],
    });
  } catch (err) {
    return NextResponse.json({ error: formatDevGameDataError(err) }, { status: 400 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return devOnlyForbidden();
  }

  const url = new URL(request.url);
  let targetId = url.searchParams.get('id');
  if (!targetId) {
    try {
      const body = (await request.json()) as { id?: unknown };
      if (typeof body?.id === 'string') {
        targetId = body.id;
      }
    } catch {
      // Ignore empty body when query param was omitted.
    }
  }

  if (!targetId) {
    return NextResponse.json({ error: 'Missing stage id parameter.' }, { status: 400 });
  }
  if (targetId === 'grassland') {
    return NextResponse.json(
      { error: 'Cannot delete mandatory starter stage "grassland".' },
      { status: 400 },
    );
  }

  const paths = resolveGameDataPaths();
  if (!paths) {
    return NextResponse.json(
      { error: 'Could not locate packages/game-data directory on disk.' },
      { status: 500 },
    );
  }

  try {
    const currentDataset = readCurrentMvpDataset(paths);
    if (!currentDataset.campaignLevels.some(l => l.id === targetId)) {
      return NextResponse.json({ error: `Stage "${targetId}" not found.` }, { status: 404 });
    }

    const filtered = sortCampaignLevels(
      currentDataset.campaignLevels.filter(l => l.id !== targetId),
    );
    const merged = mergeCampaignLevelsIntoDataset(currentDataset, filtered);

    writeJsonPretty(paths.campaignLevelsPath, merged.campaignLevels);
    writeJsonPretty(paths.grasslandPath, merged.grasslandLevel);

    return NextResponse.json({
      ok: true,
      deletedId: targetId,
      levels: merged.campaignLevels,
    });
  } catch (err) {
    return NextResponse.json({ error: formatDevGameDataError(err) }, { status: 400 });
  }
}
