'use client';

import type { AchievementView, DefenderCollectionEntry, ProgressionProfile } from '@mfd/game';

interface AchievementsScreenProps {
  readonly profile: ProgressionProfile;
  readonly achievements: readonly AchievementView[];
  readonly collection: readonly DefenderCollectionEntry[];
  readonly onBack: () => void;
}

export function AchievementsScreen({
  profile,
  achievements,
  collection,
  onBack,
}: AchievementsScreenProps) {
  const unlockedUnits = collection.filter(c => c.unlocked).length;
  const totalUnits = collection.length;

  return (
    <div className="mfd-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, color: '#FACC15' }}>Achievements & Progression</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
            Only victories count toward unlock progression. Defeats add zero progress.
          </p>
        </div>
        <button type="button" className="mfd-btn" onClick={onBack}>
          Back to Menu
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Total Grassland Victories</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#4ADE80', marginTop: 4 }}>{profile.totalVictories}</div>
        </div>
        <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Cumulative Victory Kills</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#38BDF8', marginTop: 4 }}>{profile.totalVictoryKills}</div>
        </div>
        <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Defenders Unlocked</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FACC15', marginTop: 4 }}>
            {unlockedUnits} / {totalUnits}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#1e293b', border: '2px solid #4ade80', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#4ADE80' }}>First Line of Defense</strong>
            <span className="mfd-badge mfd-badge-unlocked">COMPLETED</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#CBD5E1' }}>
            Starter Defenders unlocked: Iron Golem, Skeleton, Steel Guardian, Skeleton Sniper, Iron Ranger.
          </p>
        </div>

        {achievements.map(ach => {
          const pct = Math.min(100, Math.round((ach.current / Math.max(1, ach.target)) * 100));
          return (
            <div
              key={ach.id}
              style={{
                background: '#1e293b',
                border: `2px solid ${ach.completed ? '#4ade80' : '#334155'}`,
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <strong style={{ fontSize: 15, color: ach.completed ? '#4ADE80' : '#F8FAFC' }}>{ach.name}</strong>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {ach.description} · Unlocks <strong style={{ color: '#FACC15' }}>{ach.rewardDefenderId.replace(/_/g, ' ')}</strong>
                  </div>
                </div>
                <span className={`mfd-badge ${ach.completed ? 'mfd-badge-unlocked' : 'mfd-badge-locked'}`}>
                  {ach.current} / {ach.target}
                </span>
              </div>
              <div className="mfd-progress-track">
                <div className="mfd-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}

        <div
          style={{
            background: '#1e293b',
            border: `2px solid ${unlockedUnits === totalUnits ? '#facc15' : '#334155'}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <strong style={{ fontSize: 15, color: '#FACC15' }}>Master of Fusion</strong>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                Unlock all 5 Base Defenders and all 15 Tier-2 Fusion Recipes.
              </div>
            </div>
            <span className={`mfd-badge ${unlockedUnits === totalUnits ? 'mfd-badge-unlocked' : 'mfd-badge-locked'}`}>
              {unlockedUnits} / {totalUnits}
            </span>
          </div>
          <div className="mfd-progress-track">
            <div className="mfd-progress-fill" style={{ width: `${Math.round((unlockedUnits / totalUnits) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
