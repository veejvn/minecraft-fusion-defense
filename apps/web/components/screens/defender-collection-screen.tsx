'use client';

import { useState } from 'react';
import type {
  CampaignDefenderCatalogItem,
  CampaignRecipeCatalogItem,
  DefenderCollectionEntry,
} from '@mfd/game';

interface DefenderCollectionScreenProps {
  readonly collection: readonly DefenderCollectionEntry[];
  readonly defenderCatalog: readonly CampaignDefenderCatalogItem[];
  readonly recipeCatalog: readonly CampaignRecipeCatalogItem[];
  readonly onBack: () => void;
}

type CollectionTab = 'base' | 'fusion' | 'recipes';

export function DefenderCollectionScreen({
  collection,
  defenderCatalog,
  recipeCatalog,
  onBack,
}: DefenderCollectionScreenProps) {
  const [tab, setTab] = useState<CollectionTab>('base');
  const catalogById = new Map(defenderCatalog.map(d => [d.id, d]));
  const collectionById = new Map(collection.map(c => [c.id, c]));

  const baseItems = defenderCatalog.filter(d => d.tier === 1);
  const fusionItems = defenderCatalog.filter(d => d.tier === 2);
  const unlockedCount = collection.filter(c => c.unlocked).length;

  return (
    <div className="mfd-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, color: '#4ADE80' }}>
            Defender Collection ({unlockedCount} / {collection.length} Unlocked)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
            6 Base Defenders, 16 Tier-2 Fusion Defenders, 16 Free Recipes, and 22 Special Abilities (1 Power Crystal, 0s Cooldown)
          </p>
        </div>
        <button type="button" className="mfd-btn" onClick={onBack}>
          Back to Menu
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`mfd-btn ${tab === 'base' ? 'mfd-btn-primary' : ''}`}
          onClick={() => setTab('base')}
        >
          Base Defenders ({baseItems.length})
        </button>
        <button
          type="button"
          className={`mfd-btn ${tab === 'fusion' ? 'mfd-btn-gold' : ''}`}
          onClick={() => setTab('fusion')}
        >
          Fusion Defenders ({fusionItems.length})
        </button>
        <button
          type="button"
          className={`mfd-btn ${tab === 'recipes' ? 'mfd-btn-crystal' : ''}`}
          onClick={() => setTab('recipes')}
        >
          Fusion Recipes ({recipeCatalog.length})
        </button>
      </div>

      {(tab === 'base' || tab === 'fusion') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {(tab === 'base' ? baseItems : fusionItems).map(item => {
            const entry = collectionById.get(item.id);
            const unlocked = entry?.unlocked ?? false;
            return (
              <div
                key={item.id}
                style={{
                  background: '#1e293b',
                  border: `2px solid ${unlocked ? (item.tier === 2 ? '#facc15' : '#4ade80') : '#475569'}`,
                  borderRadius: 8,
                  padding: 14,
                  opacity: unlocked ? 1 : 0.78,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img
                    src={item.spriteUrl}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="mfd-pixel"
                    style={{
                      background: '#0f172a',
                      borderRadius: 6,
                      border: '1px solid #334155',
                      filter: unlocked ? 'none' : 'grayscale(85%)',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 15, color: item.tier === 2 ? '#FACC15' : '#F8FAFC' }}>
                        {item.name}
                      </strong>
                      <span className={`mfd-badge ${unlocked ? 'mfd-badge-unlocked' : 'mfd-badge-locked'}`}>
                        {unlocked ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{item.role}</div>
                    <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>
                      {item.tier === 1
                        ? `Cost: ${item.summonEnergyCost} Emeralds`
                        : `Recipe: ${item.inputs?.map(id => catalogById.get(id)?.name ?? id).join(' + ')} (0 Emeralds)`}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>HP: {item.maxHp}</span>
                  <span>DMG: {item.damage}</span>
                  <span>AS: {item.attackSpeed}/s</span>
                  <span>RNG: {item.attackRange}</span>
                </div>

                <div style={{ background: '#0f172a', borderRadius: 6, padding: 8, fontSize: 12 }}>
                  <div style={{ color: '#38BDF8', fontWeight: 700 }}>
                    Ability: {item.abilityName} (1 Crystal)
                  </div>
                  <div style={{ color: '#CBD5E1', marginTop: 2 }}>{item.abilitySummary}</div>
                </div>

                {!unlocked && (
                  <div style={{ fontSize: 11, color: '#FCA5A5' }}>Requirement: {entry?.requirement ?? 'Victory Milestone'}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'recipes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {recipeCatalog.map(recipe => {
            const entry = collectionById.get(recipe.outputId);
            const unlocked = entry?.unlocked ?? false;
            return (
              <div
                key={recipe.id}
                style={{
                  background: '#1e293b',
                  border: `2px solid ${unlocked ? '#38bdf8' : '#475569'}`,
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={recipe.inputASpriteUrl} alt={recipe.inputs[0]} width={44} height={44} className="mfd-pixel" />
                  <span style={{ fontWeight: 700, color: '#94A3B8' }}>+</span>
                  <img src={recipe.inputBSpriteUrl} alt={recipe.inputs[1]} width={44} height={44} className="mfd-pixel" />
                  <span style={{ fontWeight: 700, color: '#FACC15' }}>=</span>
                  <img src={recipe.outputSpriteUrl} alt={recipe.outputName} width={48} height={48} className="mfd-pixel" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FACC15' }}>{recipe.outputName}</div>
                    <div style={{ fontSize: 11, color: '#CBD5E1' }}>{recipe.label}</div>
                    {!unlocked && <div style={{ fontSize: 11, color: '#FCA5A5' }}>{entry?.requirement}</div>}
                  </div>
                </div>
                <span className={`mfd-badge ${unlocked ? 'mfd-badge-unlocked' : 'mfd-badge-locked'}`}>
                  {unlocked ? 'OPEN' : 'LOCKED'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
