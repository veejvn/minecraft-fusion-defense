'use client';

import { Fragment, useState } from 'react';
import type { MvpStartingDefenderData } from '@mfd/game-data';
import {
  EDITOR_BASE_DEFENDERS,
  EDITOR_DEFENDERS,
  EDITOR_FUSION_DEFENDERS,
  defenderSpriteUrl,
} from './editor-types';

interface StartingGridEditorProps {
  readonly startingDefenders: readonly MvpStartingDefenderData[];
  readonly allowedBaseDefenderIds?: readonly string[];
  readonly ignoreUnlockRestrictions?: boolean;
  readonly onChangeStartingDefenders: (next: MvpStartingDefenderData[]) => void;
  readonly onChangeAllowedBaseDefenderIds: (next: string[] | undefined) => void;
  readonly onChangeIgnoreUnlockRestrictions: (next: boolean) => void;
}

const DEFENDER_BY_ID = new Map(EDITOR_DEFENDERS.map(d => [d.id, d]));

export function StartingGridEditor({
  startingDefenders,
  allowedBaseDefenderIds,
  ignoreUnlockRestrictions,
  onChangeStartingDefenders,
  onChangeAllowedBaseDefenderIds,
  onChangeIgnoreUnlockRestrictions,
}: StartingGridEditorProps) {
  const [paintId, setPaintId] = useState<string>('villager');
  const [rosterTab, setRosterTab] = useState<'base' | 'fusion'>('base');

  const cellMap = new Map<string, MvpStartingDefenderData>();
  for (const s of startingDefenders) {
    cellMap.set(`${s.row},${s.column}`, s);
  }

  const handleCellClick = (row: number, column: number) => {
    const key = `${row},${column}`;
    const existing = cellMap.get(key);
    if (paintId === '__erase__') {
      if (!existing) return;
      onChangeStartingDefenders(
        startingDefenders.filter(s => !(s.row === row && s.column === column)),
      );
      return;
    }
    if (existing && existing.definitionId === paintId) {
      // Toggle off when clicking same unit on cell
      onChangeStartingDefenders(
        startingDefenders.filter(s => !(s.row === row && s.column === column)),
      );
      return;
    }
    const filtered = startingDefenders.filter(s => !(s.row === row && s.column === column));
    onChangeStartingDefenders([
      ...filtered,
      { definitionId: paintId, row, column },
    ]);
  };

  const isRestrictedMode = Array.isArray(allowedBaseDefenderIds) && allowedBaseDefenderIds.length > 0;
  const activeAllowedSet = new Set(
    isRestrictedMode
      ? allowedBaseDefenderIds
      : EDITOR_BASE_DEFENDERS.map(d => d.id),
  );

  const toggleAllowedBaseDefender = (id: string) => {
    const current = isRestrictedMode
      ? [...allowedBaseDefenderIds]
      : EDITOR_BASE_DEFENDERS.map(d => d.id);
    if (current.includes(id)) {
      if (current.length <= 1) return; // Require at least 1 base defender
      onChangeAllowedBaseDefenderIds(current.filter(x => x !== id));
    } else {
      onChangeAllowedBaseDefenderIds([...current, id]);
    }
  };

  const paletteUnits = rosterTab === 'base' ? EDITOR_BASE_DEFENDERS : EDITOR_FUSION_DEFENDERS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section 1: Starting Defenders 5x10 Grid */}
      <div className="mfd-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: '#4ADE80' }}>
              Starting Defenders on Grid ({startingDefenders.length} units)
            </h3>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              Đơn vị đặt sẵn miễn phí ở Tick 0 đầu màn (hỗ trợ cả Base Tier-1 &amp; Fusion Tier-2). Click ô để đặt/xóa.
            </div>
          </div>
          {startingDefenders.length > 0 && (
            <button
              type="button"
              className="mfd-btn mfd-btn-danger"
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => onChangeStartingDefenders([])}
            >
              Clear Grid ({startingDefenders.length})
            </button>
          )}
        </div>

        {/* Palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`mfd-btn ${paintId === '__erase__' ? 'mfd-btn-danger' : ''}`}
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => setPaintId('__erase__')}
            >
              Eraser (Xóa ô)
            </button>
            <button
              type="button"
              className={`mfd-btn ${rosterTab === 'base' ? 'mfd-btn-primary' : ''}`}
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => setRosterTab('base')}
            >
              Tier 1 Base ({EDITOR_BASE_DEFENDERS.length})
            </button>
            <button
              type="button"
              className={`mfd-btn ${rosterTab === 'fusion' ? 'mfd-btn-gold' : ''}`}
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => setRosterTab('fusion')}
            >
              Tier 2 Fusion ({EDITOR_FUSION_DEFENDERS.length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {paletteUnits.map(u => {
              const selected = paintId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  className="mfd-btn"
                  onClick={() => setPaintId(u.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 11,
                    borderColor: selected ? '#facc15' : '#475569',
                    background: selected ? 'rgba(202, 138, 4, 0.25)' : '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <img
                    src={defenderSpriteUrl(u.id)}
                    alt={u.name}
                    width={24}
                    height={24}
                    className="mfd-pixel"
                  />
                  <span>{u.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5x10 Interactive Grid */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(10, minmax(62px, 1fr))', gap: 6, minWidth: 740 }}>
            <div />
            {Array.from({ length: 10 }, (_, col) => (
              <div
                key={`col-head-${col}`}
                style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', fontWeight: 700 }}
              >
                Col {col + 1}
              </div>
            ))}

            {Array.from({ length: 5 }, (_, row) => (
              <Fragment key={`row-${row}`}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#38BDF8',
                    background: '#0f172a',
                    borderRadius: 6,
                    border: '1px solid #334155',
                  }}
                >
                  Lane {row + 1}
                </div>
                {Array.from({ length: 10 }, (_, col) => {
                  const placed = cellMap.get(`${row},${col}`);
                  const def = placed ? DEFENDER_BY_ID.get(placed.definitionId) : undefined;
                  return (
                    <button
                      key={`cell-${row}-${col}`}
                      type="button"
                      onClick={() => handleCellClick(row, col)}
                      title={
                        def
                          ? `L${row + 1} C${col + 1}: ${def.name} (click to replace/remove)`
                          : `L${row + 1} C${col + 1}: Empty`
                      }
                      style={{
                        height: 62,
                        borderRadius: 8,
                        border: placed
                          ? `2px solid ${def?.tier === 2 ? '#FACC15' : '#4ADE80'}`
                          : '2px dashed #334155',
                        background: placed
                          ? 'rgba(20, 83, 45, 0.35)'
                          : (row + col) % 2 === 0
                            ? 'rgba(15, 23, 42, 0.7)'
                            : 'rgba(30, 41, 59, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 4,
                        color: '#F8FAFC',
                      }}
                    >
                      {placed && def ? (
                        <>
                          <img
                            src={defenderSpriteUrl(def.id)}
                            alt={def.name}
                            width={32}
                            height={32}
                            className="mfd-pixel"
                          />
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#E2E8F0', lineHeight: 1.1 }}>
                            {def.shortLabel}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 10, color: '#475569' }}>
                          {row + 1},{col + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Allowed Base Defenders & Progression Restrictions */}
      <div className="mfd-card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#38BDF8' }}>
          Roster &amp; Unlock Restrictions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="radio"
                name="defender-restriction-mode"
                checked={!isRestrictedMode}
                onChange={() => onChangeAllowedBaseDefenderIds(undefined)}
              />
              <span>Cho phép tất cả Base Defenders (mặc định theo Progression)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="radio"
                name="defender-restriction-mode"
                checked={isRestrictedMode}
                onChange={() =>
                  onChangeAllowedBaseDefenderIds(EDITOR_BASE_DEFENDERS.map(d => d.id))
                }
              />
              <span>Giới hạn Base Defenders được phép dùng trong màn này</span>
            </label>
          </div>

          {isRestrictedMode && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              {EDITOR_BASE_DEFENDERS.map(d => {
                const enabled = activeAllowedSet.has(d.id);
                return (
                  <button
                    key={`allow-${d.id}`}
                    type="button"
                    className="mfd-btn"
                    onClick={() => toggleAllowedBaseDefender(d.id)}
                    style={{
                      padding: '6px 10px',
                      borderColor: enabled ? '#4ade80' : '#475569',
                      background: enabled ? 'rgba(22, 163, 74, 0.22)' : '#0f172a',
                      opacity: enabled ? 1 : 0.48,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <img
                      src={defenderSpriteUrl(d.id)}
                      alt={d.name}
                      width={24}
                      height={24}
                      className="mfd-pixel"
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: enabled ? '#4ADE80' : '#94A3B8' }}>
                        {enabled ? 'Allowed' : 'Banned'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#FDE047', cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={Boolean(ignoreUnlockRestrictions)}
              onChange={e => onChangeIgnoreUnlockRestrictions(e.target.checked)}
            />
            <span>
              <strong>Challenge / Showcase Stage (ignoreUnlockRestrictions):</strong> Mở khóa toàn bộ đơn vị được phép &amp; toàn bộ công thức Fusion bất kể tiến độ tài khoản.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
