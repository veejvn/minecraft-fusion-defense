'use client';

import { useState } from 'react';
import type { CampaignVisualStyle } from '@mfd/game';

export interface GameSettings {
  readonly visualStyle: CampaignVisualStyle;
  readonly showGridCoords: boolean;
  readonly sfxMuted: boolean;
  readonly musicMuted: boolean;
  readonly unlockAllForTesting: boolean;
}

interface SettingsModalProps {
  readonly open: boolean;
  readonly settings: GameSettings;
  readonly hasSavedBattle: boolean;
  readonly onUpdateSettings: (next: GameSettings) => void;
  readonly onClearSavedBattle: () => void;
  readonly onResetProgression: () => void;
  readonly onClose: () => void;
}

export function SettingsModal({
  open,
  settings,
  hasSavedBattle,
  onUpdateSettings,
  onClearSavedBattle,
  onResetProgression,
  onClose,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  return (
    <div className="mfd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="mfd-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#38BDF8' }}>Settings & Data</h2>
          <button type="button" className="mfd-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#FACC15' }}>Visual Display</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#CBD5E1' }}>Sprite Mode:</span>
              <button
                type="button"
                className={`mfd-btn ${settings.visualStyle === 'pixel-art' ? 'mfd-btn-primary' : ''}`}
                onClick={() => onUpdateSettings({ ...settings, visualStyle: 'pixel-art' })}
              >
                Pixel Art 64x64 (Default)
              </button>
              <button
                type="button"
                className={`mfd-btn ${settings.visualStyle === 'procedural' ? 'mfd-btn-primary' : ''}`}
                onClick={() => onUpdateSettings({ ...settings, visualStyle: 'procedural' })}
              >
                Procedural Fallback
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.showGridCoords}
                onChange={e => onUpdateSettings({ ...settings, showGridCoords: e.target.checked })}
              />
              Show Grid Coordinates (row, col)
            </label>
          </div>

          <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, color: '#FACC15' }}>
              Audio Preferences <span style={{ fontSize: 11, color: '#94A3B8' }}>(Optional in MVP)</span>
            </h3>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!settings.sfxMuted}
                  onChange={e => onUpdateSettings({ ...settings, sfxMuted: !e.target.checked })}
                />
                Enable Sound Effects (Placeholder)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!settings.musicMuted}
                  onChange={e => onUpdateSettings({ ...settings, musicMuted: !e.target.checked })}
                />
                Enable Music (Placeholder)
              </label>
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: 8, padding: 14 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#FACC15' }}>Local Save & Internal Testing</h3>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              <input
                type="checkbox"
                checked={settings.unlockAllForTesting}
                onChange={e => onUpdateSettings({ ...settings, unlockAllForTesting: e.target.checked })}
              />
              Unlock All 20 Defenders & 15 Recipes for Next New Battle (Internal Testing Toggle)
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="mfd-btn"
                disabled={!hasSavedBattle}
                onClick={onClearSavedBattle}
              >
                Clear Saved Battle
              </button>

              {!confirmReset ? (
                <button type="button" className="mfd-btn mfd-btn-danger" onClick={() => setConfirmReset(true)}>
                  Reset Unlock Progression
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#FCA5A5' }}>Confirm permanent reset?</span>
                  <button
                    type="button"
                    className="mfd-btn mfd-btn-danger"
                    onClick={() => {
                      onResetProgression();
                      setConfirmReset(false);
                    }}
                  >
                    Yes, Reset
                  </button>
                  <button type="button" className="mfd-btn" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </button>
                </div>
              )}

              <a href="/playtest" className="mfd-btn mfd-btn-crystal">
                Open 1-Lane Sandbox (/playtest)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
