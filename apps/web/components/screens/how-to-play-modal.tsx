'use client';

interface HowToPlayModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const GUIDE_STEPS = [
  {
    step: '1. Villagers, Supply Chest & Emeralds',
    icon: '/assets/sprites/items/emerald.png',
    text: 'Start with 100 Emeralds. Deploy Villagers (50 EM) to harvest Emerald drops on the field, and click the Village Supply Chest on the left Base margin whenever it restocks (+25 EM every 10s). Click or hover over dropped Emeralds to collect them.',
  },
  {
    step: '2. Fusion, Glove & Shovel',
    icon: '/assets/sprites/defenders/steel_guardian.png',
    text: 'Fuse by dragging a Base Defender card onto a compatible Tier-1 Defender on the grid (pays card Emeralds & cooldown), or use the Fusion Glove (0 EM, 10s CD) to Move or Fuse placed Defenders (including Villager + Villager = Master Trader). Use Shovel to remove unwanted Defenders.',
  },
  {
    step: '3. Power Crystal Special Abilities',
    icon: '/assets/sprites/items/power_crystal.png',
    text: 'Collect Power Crystals dropped by defeated Enemies (chance-based) or Claim Pending Wave Rewards (cap 5/5). Click or drag the Power Crystal button onto any Defender to cast its Special Ability (1 Crystal, 0s cooldown).',
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
