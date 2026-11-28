'use client';

import type {
  CampaignEnemyCatalogItem,
  CampaignLevelCardView,
  ProgressionProfile,
  SavedBattleSummary,
} from '@mfd/game';

interface LevelSelectScreenProps {
  readonly levels: readonly CampaignLevelCardView[];
  readonly enemyCatalog: readonly CampaignEnemyCatalogItem[];
  readonly profile: ProgressionProfile;
  readonly savedBattle: SavedBattleSummary | null;
  readonly onStartNew: (levelId: string) => void;
  readonly onContinueSaved: () => void;
  readonly onBack: () => void;
}

const THEME_ACCENTS: Readonly<Record<string, { border: string; bg: string }>> = {
  grassland: {
    border: '#4ade80',
    bg: 'linear-gradient(135deg, rgba(22, 101, 52, 0.35), rgba(15, 23, 42, 0.95))',
  },
};

export function LevelSelectScreen({
  levels,
  enemyCatalog,
  profile,
  savedBattle,
  onStartNew,
  onContinueSaved,
  onBack,
}: LevelSelectScreenProps) {
  return (
    <div className="mfd-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, color: '#4ADE80' }}>Level Selection</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
            Select a Campaign Battlefield ({levels.length} {levels.length === 1 ? 'Stage' : 'Stages'} available).
            Victories: <strong style={{ color: '#4ADE80' }}>{profile.totalVictories}</strong> ·
            Kills: <strong style={{ color: '#38BDF8' }}>{profile.totalVictoryKills}</strong>
          </p>
        </div>
        <button type="button" className="mfd-btn" onClick={onBack}>
          Back to Menu
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, marginBottom: 20 }}>
        {levels.map(level => {
          const accent = THEME_ACCENTS[level.theme] ?? THEME_ACCENTS.grassland;
          const isSavedHere = savedBattle?.levelId === level.id;
          return (
            <div
              key={level.id}
              style={{
                background: accent.bg,
                border: `3px solid ${level.unlocked ? accent.border : '#475569'}`,
                borderRadius: 12,
                padding: 18,
                opacity: level.unlocked ? 1 : 0.72,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <img
                    src="/assets/maps/grassland_tile_light.png"
                    alt={level.name}
                    width={44}
                    height={44}
                    className="mfd-pixel"
                    style={{ borderRadius: 6, border: `2px solid ${accent.border}` }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 20, color: '#FACC15' }}>{level.name}</h3>
                      {level.cleared && (
                        <span className="mfd-badge mfd-badge-unlocked">CLEARED ✓</span>
                      )}
                      {!level.unlocked && (
                        <span className="mfd-badge" style={{ background: '#7f1d1d', color: '#fecaca' }}>
                          LOCKED
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      <span className="mfd-badge">
                        5×9 · {level.waveCount} {level.waveCount === 1 ? 'Wave' : 'Waves'} · {level.difficulty.toUpperCase()}
                      </span>
                      <span className="mfd-badge">{level.initialEmeralds} EM</span>
                      {level.startingDefenderCount > 0 && (
                        <span className="mfd-badge">{level.startingDefenderCount} Preset Units</span>
                      )}
                      {level.allowedBaseDefenderIds && (
                        <span className="mfd-badge">
                          Roster: {level.allowedBaseDefenderIds.length}/6 Base
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 13, lineHeight: 1.5, color: '#CBD5E1', margin: '8px 0 0' }}>
                  {level.description}
                </p>

                {!level.unlocked && (
                  <p style={{ fontSize: 12, color: '#FCA5A5', margin: '8px 0 0', fontWeight: 700 }}>
                    Requirement: {level.requirementText}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {isSavedHere && savedBattle && (
                  <button type="button" className="mfd-btn mfd-btn-gold" onClick={onContinueSaved}>
                    Continue Saved Battle (Wave {savedBattle.waveNumber}/{savedBattle.totalWaves})
                  </button>
                )}
                <button
                  type="button"
                  className="mfd-btn mfd-btn-primary"
                  disabled={!level.unlocked}
                  onClick={() => onStartNew(level.id)}
                >
                  {isSavedHere
                    ? 'Start New Battle'
                    : level.id === 'grassland'
                      ? 'Play Grassland Campaign'
                      : `Play ${level.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#0f172a', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#38BDF8', marginBottom: 10 }}>
          Enemy Forces Intel
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
          {enemyCatalog.map(enemy => (
            <div
              key={enemy.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#1e293b',
                padding: 8,
                borderRadius: 6,
                border: '1px solid #334155',
              }}
            >
              <img src={enemy.spriteUrl} alt={enemy.name} width={40} height={40} className="mfd-pixel" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{enemy.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{enemy.role}</div>
                <div style={{ fontSize: 10, color: '#6EE7B7' }}>
                  {enemy.energyReward > 0 ? `+${enemy.energyReward} EM` : '0 EM drop'}
                  {enemy.crystalReward > 0 && enemy.crystalDropChance > 0
                    ? ` · +${enemy.crystalReward} CRY (${Math.round(enemy.crystalDropChance * 100)}%)`
                    : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
