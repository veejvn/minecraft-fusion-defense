'use client';

import type { CampaignDefenderCatalogItem, DefenderCollectionEntry, ProgressionProfile, SavedBattleSummary } from '@mfd/game';

interface MainMenuScreenProps {
  readonly savedBattle: SavedBattleSummary | null;
  readonly profile: ProgressionProfile;
  readonly collection: readonly DefenderCollectionEntry[];
  readonly defenderCatalog: readonly CampaignDefenderCatalogItem[];
  readonly onPlayLevelSelect: () => void;
  readonly onContinueSaved: () => void;
  readonly onOpenCollection: () => void;
  readonly onOpenAchievements: () => void;
  readonly onOpenHowToPlay: () => void;
  readonly onOpenSettings: () => void;
}

const SHOWCASE_IDS = ['steel_guardian', 'infernal_archon', 'frost_guardian', 'skeleton_sniper', 'flame_fang'] as const;

export function MainMenuScreen({
  savedBattle,
  profile,
  collection,
  defenderCatalog,
  onPlayLevelSelect,
  onContinueSaved,
  onOpenCollection,
  onOpenAchievements,
  onOpenHowToPlay,
  onOpenSettings,
}: MainMenuScreenProps) {
  const unlockedCount = collection.filter(c => c.unlocked).length;
  const catalogById = new Map(defenderCatalog.map(d => [d.id, d]));

  return (
    <div className="mfd-card" style={{ padding: 28 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span className="mfd-badge mfd-badge-unlocked">DESKTOP WEB MVP · GRASSLAND 5x9</span>
            <span className="mfd-badge">20 DEFENDERS · 15 FUSIONS</span>
          </div>

          <h1 style={{ margin: '0 0 10px', fontSize: 34, lineHeight: 1.15, color: '#4ADE80' }}>
            Minecraft Fusion Defense
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.55, color: '#CBD5E1' }}>
            Tactical 2D pixel-art tower defense. Summon Base Defenders, fuse any two Tier-1 units at 0 Energy across the 5x9 Grassland battlefield, and unleash Power Crystal Special Abilities!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
            {savedBattle && (
              <button
                type="button"
                className="mfd-btn mfd-btn-gold"
                style={{ justifyContent: 'space-between', padding: '12px 18px', fontSize: 15 }}
                onClick={onContinueSaved}
              >
                <span>Continue Saved Battle</span>
                <span style={{ fontSize: 12 }}>
                  Wave {savedBattle.waveNumber}/{savedBattle.totalWaves} · {savedBattle.energy} EN
                </span>
              </button>
            )}

            <button
              type="button"
              className="mfd-btn mfd-btn-primary"
              style={{ padding: '12px 18px', fontSize: 16 }}
              onClick={onPlayLevelSelect}
            >
              Play Grassland Campaign
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" className="mfd-btn mfd-btn-crystal" onClick={onOpenCollection}>
                Collection ({unlockedCount}/{Math.max(20, collection.length)})
              </button>
              <button type="button" className="mfd-btn" onClick={onOpenAchievements}>
                Achievements ({profile.totalVictories} Wins)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" className="mfd-btn" onClick={onOpenHowToPlay}>
                How to Play
              </button>
              <button type="button" className="mfd-btn" onClick={onOpenSettings}>
                Settings
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, rgba(20, 83, 45, 0.38), rgba(15, 23, 42, 0.92))',
            border: '2px solid #334155',
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12, textAlign: 'center' }}>
            PIXEL-ART ROSTER PREVIEW (5 BASE + 15 FUSION DEFENDERS)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            {SHOWCASE_IDS.map(id => {
              const item = catalogById.get(id);
              const url = item?.spriteUrl ?? `/assets/sprites/defenders/${id}.png`;
              return (
                <div
                  key={id}
                  style={{
                    background: '#0f172a',
                    border: '2px solid #475569',
                    borderRadius: 8,
                    padding: 8,
                    textAlign: 'center',
                    width: 92,
                  }}
                >
                  <img src={url} alt={item?.name ?? id} width={64} height={64} className="mfd-pixel" />
                  <div style={{ fontSize: 10, color: '#FACC15', marginTop: 4, fontWeight: 700 }}>
                    {item?.name ?? id}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12, color: '#CBD5E1', borderTop: '1px solid #334155', paddingTop: 12 }}>
            <span>Victories: <strong style={{ color: '#4ADE80' }}>{profile.totalVictories}</strong></span>
            <span>Victory Kills: <strong style={{ color: '#38BDF8' }}>{profile.totalVictoryKills}</strong></span>
            <span>Unlocked: <strong style={{ color: '#FACC15' }}>{unlockedCount}/20</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
