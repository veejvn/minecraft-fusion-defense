'use client';

interface HowToPlayModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const GUIDE_STEPS = [
  {
    step: '1. Collect Energy & Summon',
    icon: '/assets/sprites/items/energy_orb.png',
    text: 'Click glowing Energy Orbs on the Grassland grid to gain Energy. Select an unlocked Base Defender card at the top bar and click an empty cell on the 5x9 battlefield to summon.',
  },
  {
    step: '2. Free Drag-and-Drop Fusion',
    icon: '/assets/sprites/defenders/steel_guardian.png',
    text: 'Drag any living Tier-1 Defender onto another Tier-1 Defender anywhere on the 5x9 grid — across any distance or lane, for 0 Energy! The Tier-2 Fusion Defender spawns on the target cell at full HP.',
  },
  {
    step: '3. Power Crystal Special Abilities',
    icon: '/assets/sprites/items/power_crystal.png',
    text: 'Click Power Crystal Drops or Claim Pending Wave Rewards (cap 5/5). Click the Power Crystal button in the HUD, then click any Defender to unleash its Special Ability (1 Crystal, 0s cooldown).',
  },
  {
    step: '4. Defend 5 Waves & Unlock Units',
    icon: '/assets/sprites/enemies/vindicator.png',
    text: 'Prevent Zombies, Husks, Vindicators, and Pillagers from crossing the left Base line across all 5 Waves. Victories permanently unlock Snow Golem, Wolf, Blaze, and their 12 Fusion Recipes!',
  },
] as const;

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  if (!open) return null;

  return (
    <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="How to Play">
      <div className="mfd-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#4ADE80' }}>How to Play</h2>
          <button type="button" className="mfd-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {GUIDE_STEPS.map(card => (
            <div
              key={card.step}
              style={{
                background: '#1e293b',
                border: '2px solid #334155',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={card.icon} alt="" width={40} height={40} className="mfd-pixel" />
                <strong style={{ fontSize: 14, color: '#FACC15' }}>{card.step}</strong>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#CBD5E1' }}>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
