'use client';

import type { CampaignEnemyCatalogItem, ProgressionProfile, SavedBattleSummary } from '@mfd/game';

interface LevelSelectScreenProps {
  readonly enemyCatalog: readonly CampaignEnemyCatalogItem[];
  readonly profile: ProgressionProfile;
  readonly savedBattle: SavedBattleSummary | null;
  readonly onStartNew: () => void;
  readonly onContinueSaved: () => void;
  readonly onBack: () => void;
}

export function LevelSelectScreen({
  enemyCatalog,
  profile,
  savedBattle,
  onStartNew,
  onContinueSaved,
  onBack,
}: LevelSelectScreenProps) {
  return (
    <div className="mfd-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, color: '#4ADE80' }}>Level Selection</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
            Select a Campaign Battlefield to defend against 5 escalating waves.
          </p>
        </div>
        <button type="button" className="mfd-btn" onClick={onBack}>
          Back to Menu
        </button>
      </div>

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.35), rgba(15, 23, 42, 0.95))',
          border: '3px solid #4ade80',
          borderRadius: 12,
          padding: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img
              src="/assets/maps/grassland_tile_light.png"
              alt="Grassland"
              width={48}
              height={48}
              className="mfd-pixel"
              style={{ borderRadius: 6, border: '2px solid #86efac' }}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: 22, color: '#FACC15' }}>Grassland — Stage 1</h3>
              <span className="mfd-badge mfd-badge-unlocked">5 Rows × 9 Columns · 5 Waves · Beginner-Friendly</span>
            </div>
          </div>

          <p style={{ fontSize: 13, lineHeight: 1.5, color: '#CBD5E1', margin: '10px 0 14px' }}>
            Hold the Grassland defense line across 5 Waves. Collect Energy Orbs to summon Base Defenders, fuse any two Tier-1 Defenders at 0 Energy across any distance, and unleash Special Abilities with Power Crystals.
          </p>

          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#E2E8F0', marginBottom: 16 }}>
            <span>Victories: <strong style={{ color: '#4ADE80' }}>{profile.totalVictories}</strong></span>
            <span>Victory Kills: <strong style={{ color: '#38BDF8' }}>{profile.totalVictoryKills}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {savedBattle && (
              <button type="button" className="mfd-btn mfd-btn-gold" onClick={onContinueSaved}>
                Continue Saved Battle (Wave {savedBattle.waveNumber}/{savedBattle.totalWaves})
              </button>
            )}
            <button type="button" className="mfd-btn mfd-btn-primary" onClick={onStartNew}>
              {savedBattle ? 'Start New Battle' : 'Play Grassland Campaign'}
            </button>
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#38BDF8', marginBottom: 10 }}>
            Enemy Forces on Grassland
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                  <div style={{ fontSize: 10, color: '#FACC15' }}>
                    +{enemy.energyReward} EN
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
    </div>
  );
}
