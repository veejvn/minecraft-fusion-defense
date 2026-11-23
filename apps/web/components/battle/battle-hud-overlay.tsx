'use client';

import type { CampaignDefenderCatalogItem, CampaignSnapshot, CampaignSpeed, CampaignTool } from '@mfd/game';

interface BattleHudOverlayProps {
  readonly snapshot: CampaignSnapshot;
  readonly activeTool: CampaignTool;
  readonly defenderCatalog: readonly CampaignDefenderCatalogItem[];
  readonly onSelectTool: (tool: CampaignTool) => void;
  readonly onClaimPending: () => void;
  readonly onTogglePause: () => void;
  readonly onSetSpeed: (speed: CampaignSpeed) => void;
  readonly onOpenHowToPlay: () => void;
  readonly onRestartBattle: () => void;
  readonly onSaveAndExit: () => void;
  readonly onReturnToMenuTerminal: () => void;
}

export function BattleHudOverlay({
  snapshot,
  activeTool,
  defenderCatalog,
  onSelectTool,
  onClaimPending,
  onTogglePause,
  onSetSpeed,
  onOpenHowToPlay,
  onRestartBattle,
  onSaveAndExit,
  onReturnToMenuTerminal,
}: BattleHudOverlayProps) {
  const catalogById = new Map(defenderCatalog.map(d => [d.id, d]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
      {/* Top Tactical HUD Bar */}
      <div
        className="mfd-card"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Resources: Energy & Power Crystal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#0f172a',
              border: '2px solid #ca8a04',
              borderRadius: 8,
              padding: '6px 10px',
            }}
            title="Energy used to summon Base Defenders"
          >
            <img src="/assets/sprites/items/energy_orb.png" alt="Energy" width={28} height={28} className="mfd-pixel" />
            <div>
              <div style={{ fontSize: 10, color: '#FDE047', fontWeight: 700 }}>ENERGY</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#FEF08A' }}>{snapshot.energy}</div>
            </div>
          </div>

          <button
            type="button"
            className={`mfd-btn ${activeTool.kind === 'crystal' ? 'mfd-btn-crystal' : ''}`}
            style={{ padding: '6px 10px' }}
            disabled={snapshot.crystals < 1 || snapshot.status !== 'playing'}
            onClick={() =>
              onSelectTool(activeTool.kind === 'crystal' ? { kind: 'select' } : { kind: 'crystal' })
            }
            title="Click then select a Defender to cast its Special Ability (1 Crystal, 0s cooldown)"
          >
            <img src="/assets/sprites/items/power_crystal.png" alt="Crystal" width={28} height={28} className="mfd-pixel" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 10, color: '#BAE6FD' }}>CRYSTALS</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {snapshot.crystals} / {snapshot.maxCrystals}
              </div>
            </div>
          </button>

          {snapshot.pendingWaveCrystals > 0 && (
            <button
              type="button"
              className="mfd-btn mfd-btn-gold"
              disabled={snapshot.crystals >= snapshot.maxCrystals || snapshot.status !== 'playing'}
              onClick={onClaimPending}
              title="Claim pending Wave Reward Power Crystals once storage has room"
            >
              Claim +{snapshot.pendingWaveCrystals} Pending
            </button>
          )}
        </div>

        {/* Base Defender Selection Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {snapshot.baseDefenderCards.map(card => {
            const selected = activeTool.kind === 'place' && activeTool.definitionId === card.id;
            const disabled = !card.unlocked || !card.canAfford || snapshot.status !== 'playing';
            return (
              <button
                key={card.id}
                type="button"
                className="mfd-btn"
                disabled={!card.unlocked || snapshot.status !== 'playing'}
                onClick={() => {
                  if (!card.unlocked) return;
                  onSelectTool(selected ? { kind: 'select' } : { kind: 'place', definitionId: card.id });
                }}
                style={{
                  padding: '5px 8px',
                  borderColor: selected ? '#facc15' : card.unlocked && card.canAfford ? '#4ade80' : '#475569',
                  background: selected ? 'rgba(202, 138, 4, 0.25)' : '#0f172a',
                  opacity: card.unlocked ? (disabled && !selected ? 0.68 : 1) : 0.45,
                }}
                title={card.unlocked ? `${card.name} (${card.cost} EN) — ${card.abilityName}` : `Locked: ${card.requirement}`}
              >
                <img
                  src={card.spriteUrl}
                  alt={card.name}
                  width={36}
                  height={36}
                  className="mfd-pixel"
                  style={{ filter: card.unlocked ? 'none' : 'grayscale(100%)' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>{card.name}</div>
                  <div style={{ fontSize: 10, color: card.unlocked ? (card.canAfford ? '#4ADE80' : '#F87171') : '#94A3B8' }}>
                    {card.unlocked ? `${card.cost} EN` : 'LOCKED'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Wave Status & Match Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              background: '#0f172a',
              border: '2px solid #334155',
              borderRadius: 8,
              padding: '5px 10px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: '#38BDF8', fontWeight: 700 }}>
              WAVE {snapshot.waveNumber}/{snapshot.totalWaves}
            </div>
            <div style={{ fontSize: 11, color: '#CBD5E1' }}>
              Enemies: {snapshot.enemiesRemaining} · Kills: {snapshot.enemiesKilled}
            </div>
          </div>

          <button
            type="button"
            className="mfd-btn"
            onClick={() => onSetSpeed(snapshot.speedMultiplier === 1 ? 2 : 1)}
            title="Toggle simulation speed (1x / 2x)"
          >
            {snapshot.speedMultiplier}x
          </button>

          <button type="button" className="mfd-btn" onClick={onOpenHowToPlay} title="How to Play">
            ?
          </button>

          <button
            type="button"
            className="mfd-btn mfd-btn-gold"
            disabled={snapshot.terminal !== null}
            onClick={onTogglePause}
          >
            {snapshot.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Feedback Toast Strip */}
      {snapshot.lastToast && (
        <div
          role="status"
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            border: `1px solid ${
              snapshot.lastToast.kind === 'error'
                ? '#f87171'
                : snapshot.lastToast.kind === 'success'
                  ? '#4ade80'
                  : '#38bdf8'
            }`,
            background:
              snapshot.lastToast.kind === 'error'
                ? 'rgba(127, 29, 29, 0.55)'
                : snapshot.lastToast.kind === 'success'
                  ? 'rgba(20, 83, 45, 0.55)'
                  : 'rgba(12, 74, 110, 0.45)',
            color: '#F8FAFC',
          }}
        >
          {snapshot.lastToast.message}
        </div>
      )}

      {/* Pause Modal */}
      {snapshot.status === 'paused' && (
        <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Game Paused">
          <div className="mfd-modal" style={{ maxWidth: 440, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 26, color: '#FACC15' }}>Game Paused</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#CBD5E1' }}>
              Wave {snapshot.waveNumber}/{snapshot.totalWaves} · Energy: {snapshot.energy} · Crystals: {snapshot.crystals}/{snapshot.maxCrystals}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" className="mfd-btn mfd-btn-primary" onClick={onTogglePause}>
                Resume Battle
              </button>
              <button type="button" className="mfd-btn" onClick={onOpenHowToPlay}>
                How to Play
              </button>
              <button type="button" className="mfd-btn" onClick={onRestartBattle}>
                Restart Grassland Battle
              </button>
              <button type="button" className="mfd-btn mfd-btn-gold" onClick={onSaveAndExit}>
                Save & Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {snapshot.status === 'victory' && (
        <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Victory">
          <div className="mfd-modal" style={{ maxWidth: 560, textAlign: 'center', borderColor: '#4ade80' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 30, color: '#4ADE80' }}>Grassland Victory!</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#E2E8F0' }}>
              You defended all 5 Waves and defeated <strong>{snapshot.enemiesKilled}</strong> Enemies!
            </p>

            {(snapshot.newlyUnlocked.defenders.length > 0 || snapshot.newlyUnlocked.recipes.length > 0) ? (
              <div
                style={{
                  background: '#1e293b',
                  border: '2px solid #facc15',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FACC15', marginBottom: 10 }}>
                  New Unlocks Earned!
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {snapshot.newlyUnlocked.defenders.map(id => {
                    const item = catalogById.get(id);
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: '6px 10px', borderRadius: 6 }}>
                        <img
                          src={item?.spriteUrl ?? `/assets/sprites/defenders/${id}.png`}
                          alt={item?.name ?? id}
                          width={32}
                          height={32}
                          className="mfd-pixel"
                        />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80' }}>
                          Base: {item?.name ?? id}
                        </span>
                      </div>
                    );
                  })}
                  {snapshot.newlyUnlocked.recipes.map(recipeId => {
                    const item = defenderCatalog.find(d => d.recipeId === recipeId);
                    return (
                      <div key={recipeId} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: '6px 10px', borderRadius: 6 }}>
                        {item && (
                          <img src={item.spriteUrl} alt={item.name} width={32} height={32} className="mfd-pixel" />
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8' }}>
                          Recipe: {item?.name ?? recipeId}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94A3B8' }}>
                Victory recorded! Total Victories: {snapshot.progressionProfile.totalVictories} · Cumulative Kills: {snapshot.progressionProfile.totalVictoryKills}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="mfd-btn mfd-btn-primary" onClick={onRestartBattle}>
                Play Again
              </button>
              <button type="button" className="mfd-btn" onClick={onReturnToMenuTerminal}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defeat Modal */}
      {snapshot.status === 'defeat' && (
        <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Defeat">
          <div className="mfd-modal" style={{ maxWidth: 460, textAlign: 'center', borderColor: '#f87171' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 30, color: '#F87171' }}>Defeat!</h2>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#E2E8F0' }}>
              An Enemy crossed the defense line on Wave {snapshot.waveNumber}/{snapshot.totalWaves}.
            </p>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: '#94A3B8' }}>
              Defeated matches add zero unlock progression. Adjust your strategy and try again!
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="mfd-btn mfd-btn-primary" onClick={onRestartBattle}>
                Retry Grassland
              </button>
              <button type="button" className="mfd-btn" onClick={onReturnToMenuTerminal}>
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
