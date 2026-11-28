'use client';

import { useState } from 'react';
import type { MvpWaveData } from '@mfd/game-data';
import {
  EDITOR_ENEMIES,
  LANE_MODE_OPTIONS,
  enemySpriteUrl,
  getWaveDurationSeconds,
} from './editor-types';

type MvpWaveSpawnGroupData = MvpWaveData['spawnGroups'][number];

interface WaveTimelinePanelProps {
  readonly waves: readonly MvpWaveData[];
  readonly waveCrystals: readonly number[];
  readonly onChangeWavesAndCrystals: (
    nextWaves: MvpWaveData[],
    nextCrystals: number[],
  ) => void;
  readonly onQuickTestFromWave: (waveIndex: number) => void;
}

const ENEMY_COLORS: Readonly<Record<string, string>> = {
  zombie: '#65A30D',
  husk: '#CA8A04',
  vindicator: '#475569',
  pillager: '#0D9488',
};

const ENEMY_BY_ID = new Map(EDITOR_ENEMIES.map(e => [e.id, e]));

export function WaveTimelinePanel({
  waves,
  waveCrystals,
  onChangeWavesAndCrystals,
  onQuickTestFromWave,
}: WaveTimelinePanelProps) {
  const [activeWaveIdx, setActiveWaveIdx] = useState<number>(0);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(0);

  const safeWaveIdx = Math.min(activeWaveIdx, Math.max(0, waves.length - 1));
  const activeWave = waves[safeWaveIdx];
  const safeGroupIdx = activeWave
    ? Math.min(selectedGroupIdx, Math.max(0, activeWave.spawnGroups.length - 1))
    : 0;
  const activeGroup = activeWave?.spawnGroups[safeGroupIdx] ?? null;

  if (!activeWave) {
    return null;
  }

  const timelineMaxSec = getWaveDurationSeconds(activeWave);
  const rulerTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => Math.round(timelineMaxSec * pct));

  const updateWaveAt = (idx: number, patch: Partial<MvpWaveData>) => {
    const nextWaves = waves.map((w, i) => (i === idx ? { ...w, ...patch } : w));
    onChangeWavesAndCrystals(nextWaves, [...waveCrystals]);
  };

  const updateWaveCrystalAt = (idx: number, value: number) => {
    const nextCrystals = [...waveCrystals];
    while (nextCrystals.length < waves.length) nextCrystals.push(1);
    nextCrystals[idx] = Math.max(0, Math.min(5, Math.round(value)));
    onChangeWavesAndCrystals([...waves], nextCrystals);
  };

  const addWave = () => {
    const nextIdx = waves.length + 1;
    const newWave: MvpWaveData = {
      id: `wave_${nextIdx}`,
      initialDelaySeconds: 5,
      delayBeforeNextWaveSeconds: 3,
      spawnGroups: [
        {
          enemyId: 'zombie',
          count: 4,
          startOffsetSeconds: 0,
          intervalSeconds: 3.5,
          allowedLanes: [0, 1, 2, 3, 4],
          laneMode: 'sequential',
        },
      ],
    };
    const nextWaves = [...waves, newWave];
    const nextCrystals = [...waveCrystals, 1];
    onChangeWavesAndCrystals(nextWaves, nextCrystals);
    setActiveWaveIdx(nextWaves.length - 1);
    setSelectedGroupIdx(0);
  };

  const duplicateWave = () => {
    const clone = structuredClone(activeWave);
    const nextIdx = safeWaveIdx + 1;
    const inserted = [
      ...waves.slice(0, nextIdx),
      clone,
      ...waves.slice(nextIdx),
    ].map((w, idx) => ({ ...w, id: `wave_${idx + 1}` }));
    const insertedCrystals = [
      ...waveCrystals.slice(0, nextIdx),
      waveCrystals[safeWaveIdx] ?? 1,
      ...waveCrystals.slice(nextIdx),
    ];
    onChangeWavesAndCrystals(inserted, insertedCrystals);
    setActiveWaveIdx(nextIdx);
  };

  const removeActiveWave = () => {
    if (waves.length <= 1) return;
    const nextWaves = waves
      .filter((_, i) => i !== safeWaveIdx)
      .map((w, idx) => ({ ...w, id: `wave_${idx + 1}` }));
    const nextCrystals = waveCrystals.filter((_, i) => i !== safeWaveIdx);
    onChangeWavesAndCrystals(nextWaves, nextCrystals);
    setActiveWaveIdx(Math.max(0, safeWaveIdx - 1));
    setSelectedGroupIdx(0);
  };

  const updateGroup = (groupIdx: number, patch: Partial<MvpWaveSpawnGroupData>) => {
    const nextGroups = activeWave.spawnGroups.map((g, i) =>
      i === groupIdx ? { ...g, ...patch } : g,
    );
    updateWaveAt(safeWaveIdx, { spawnGroups: nextGroups });
  };

  const addGroupOnLane = (lane: number) => {
    const nextGroup: MvpWaveSpawnGroupData = {
      enemyId: 'zombie',
      count: 3,
      startOffsetSeconds: 0,
      intervalSeconds: 4,
      allowedLanes: [lane],
      laneMode: 'fixed',
    };
    const nextGroups = [...activeWave.spawnGroups, nextGroup];
    updateWaveAt(safeWaveIdx, { spawnGroups: nextGroups });
    setSelectedGroupIdx(nextGroups.length - 1);
  };

  const duplicateSelectedGroup = () => {
    if (!activeGroup) return;
    const nextGroups = [...activeWave.spawnGroups, structuredClone(activeGroup)];
    updateWaveAt(safeWaveIdx, { spawnGroups: nextGroups });
    setSelectedGroupIdx(nextGroups.length - 1);
  };

  const deleteSelectedGroup = () => {
    if (!activeGroup || activeWave.spawnGroups.length <= 1) return;
    const nextGroups = activeWave.spawnGroups.filter((_, i) => i !== safeGroupIdx);
    updateWaveAt(safeWaveIdx, { spawnGroups: nextGroups });
    setSelectedGroupIdx(Math.max(0, safeGroupIdx - 1));
  };

  const toggleGroupLane = (lane: number) => {
    if (!activeGroup) return;
    const exists = activeGroup.allowedLanes.includes(lane);
    if (exists && activeGroup.allowedLanes.length <= 1) return;
    const nextLanes = exists
      ? activeGroup.allowedLanes.filter(l => l !== lane)
      : [...activeGroup.allowedLanes, lane].sort((a, b) => a - b);
    updateGroup(safeGroupIdx, { allowedLanes: nextLanes });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Wave Selector Tabs */}
      <div className="mfd-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {waves.map((w, idx) => {
              const selected = idx === safeWaveIdx;
              const enemyCount = w.spawnGroups.reduce((sum, g) => sum + g.count, 0);
              return (
                <button
                  key={`${w.id}-${idx}`}
                  type="button"
                  className={`mfd-btn ${selected ? 'mfd-btn-primary' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                  onClick={() => {
                    setActiveWaveIdx(idx);
                    setSelectedGroupIdx(0);
                  }}
                >
                  W{idx + 1} ({enemyCount})
                </button>
              );
            })}
            {waves.length < 20 && (
              <button
                type="button"
                className="mfd-btn mfd-btn-gold"
                style={{ padding: '5px 10px', fontSize: 12 }}
                onClick={addWave}
              >
                + Add Wave
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="mfd-btn mfd-btn-crystal"
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => onQuickTestFromWave(safeWaveIdx)}
              title={`Test Play jumping straight to Wave ${safeWaveIdx + 1}`}
            >
              ▶ Test Wave {safeWaveIdx + 1}
            </button>
            {waves.length < 20 && (
              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '5px 10px', fontSize: 12 }}
                onClick={duplicateWave}
              >
                Duplicate Wave
              </button>
            )}
            <button
              type="button"
              className="mfd-btn mfd-btn-danger"
              style={{ padding: '5px 10px', fontSize: 12 }}
              disabled={waves.length <= 1}
              onClick={removeActiveWave}
            >
              Delete Wave
            </button>
          </div>
        </div>

        {/* Wave-level Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            <span style={{ color: '#94A3B8' }}>Initial Delay (seconds)</span>
            <input
              type="number"
              min={0}
              max={60}
              step={0.5}
              value={activeWave.initialDelaySeconds}
              onChange={e =>
                updateWaveAt(safeWaveIdx, {
                  initialDelaySeconds: Math.max(0, Number(e.target.value) || 0),
                })
              }
              style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            <span style={{ color: '#94A3B8' }}>Delay Before Next Wave (s)</span>
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={activeWave.delayBeforeNextWaveSeconds}
              onChange={e =>
                updateWaveAt(safeWaveIdx, {
                  delayBeforeNextWaveSeconds: Math.max(0, Number(e.target.value) || 0),
                })
              }
              style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            <span style={{ color: '#38BDF8' }}>Power Crystals Reward (0–5)</span>
            <input
              type="number"
              min={0}
              max={5}
              step={1}
              value={waveCrystals[safeWaveIdx] ?? 1}
              onChange={e => updateWaveCrystalAt(safeWaveIdx, Number(e.target.value) || 0)}
              style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
            />
          </label>
        </div>
      </div>

      {/* 5-Lane Visual Wave Timeline */}
      <div className="mfd-card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: '#FACC15' }}>
              5-Lane Wave {safeWaveIdx + 1} Timeline (0s → {timelineMaxSec}s)
            </h3>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              Click một khối Enemy trên Lane để chỉnh sửa nhóm spawn đó, hoặc bấm + ở đầu mỗi Lane để thêm nhóm mới.
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#CBD5E1' }}>
            Total Enemies in Wave {safeWaveIdx + 1}:{' '}
            <strong style={{ color: '#4ADE80' }}>
              {activeWave.spawnGroups.reduce((s, g) => s + g.count, 0)}
            </strong>
          </div>
        </div>

        {/* Time Ruler */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, paddingLeft: 4 }}>LANE / ADD</div>
          <div style={{ position: 'relative', height: 20, borderBottom: '1px solid #334155' }}>
            {rulerTicks.map((sec, idx) => (
              <span
                key={`tick-${sec}-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${(sec / timelineMaxSec) * 100}%`,
                  transform: idx === 0 ? 'none' : idx === rulerTicks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                  fontSize: 10,
                  color: '#94A3B8',
                }}
              >
                {sec}s
              </span>
            ))}
          </div>
        </div>

        {/* L1..L5 Tracks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1, 2, 3, 4].map(lane => {
            const laneGroups = activeWave.spawnGroups
              .map((g, index) => ({ group: g, index }))
              .filter(entry => entry.group.allowedLanes.includes(lane));

            return (
              <div
                key={`timeline-lane-${lane}`}
                style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8' }}>Lane {lane + 1}</span>
                  <button
                    type="button"
                    className="mfd-btn"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    onClick={() => addGroupOnLane(lane)}
                    title={`Add spawn group on Lane ${lane + 1}`}
                  >
                    +
                  </button>
                </div>

                <div
                  style={{
                    position: 'relative',
                    minHeight: 42,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  {laneGroups.map(({ group, index }) => {
                    const startPct = Math.min(95, (group.startOffsetSeconds / timelineMaxSec) * 100);
                    const duration = Math.max(2, (group.count - 1) * group.intervalSeconds + 1.5);
                    const widthPct = Math.max(8, Math.min(100 - startPct, (duration / timelineMaxSec) * 100));
                    const isSelected = index === safeGroupIdx;
                    const enemyMeta = ENEMY_BY_ID.get(group.enemyId);
                    const bg = ENEMY_COLORS[group.enemyId] ?? '#475569';

                    return (
                      <button
                        key={`grp-${index}-lane-${lane}`}
                        type="button"
                        onClick={() => setSelectedGroupIdx(index)}
                        style={{
                          position: 'absolute',
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          top: 4,
                          bottom: 4,
                          background: bg,
                          border: isSelected ? '2px solid #FACC15' : '1px solid rgba(255,255,255,0.28)',
                          borderRadius: 5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '0 6px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          color: '#F8FAFC',
                          boxShadow: isSelected ? '0 0 0 2px rgba(250, 204, 21, 0.35)' : 'none',
                          zIndex: isSelected ? 2 : 1,
                        }}
                        title={`Group #${index + 1}: ${enemyMeta?.name ?? group.enemyId} x${group.count} | offset ${group.startOffsetSeconds}s | every ${group.intervalSeconds}s (${group.laneMode})`}
                      >
                        <img
                          src={enemySpriteUrl(group.enemyId)}
                          alt={enemyMeta?.name ?? group.enemyId}
                          width={20}
                          height={20}
                          className="mfd-pixel"
                        />
                        <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          #{index + 1} ×{group.count} ({group.startOffsetSeconds}s)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Spawn Group Inspector */}
      {activeGroup && (
        <div className="mfd-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src={enemySpriteUrl(activeGroup.enemyId)}
                alt={activeGroup.enemyId}
                width={28}
                height={28}
                className="mfd-pixel"
              />
              <h4 style={{ margin: 0, fontSize: 15, color: '#F8FAFC' }}>
                Spawn Group #{safeGroupIdx + 1} / {activeWave.spawnGroups.length}
              </h4>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="mfd-btn" style={{ padding: '4px 9px', fontSize: 12 }} onClick={duplicateSelectedGroup}>
                Duplicate Group
              </button>
              <button
                type="button"
                className="mfd-btn mfd-btn-danger"
                style={{ padding: '4px 9px', fontSize: 12 }}
                disabled={activeWave.spawnGroups.length <= 1}
                onClick={deleteSelectedGroup}
              >
                Delete Group
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Enemy Type</span>
              <select
                value={activeGroup.enemyId}
                onChange={e => updateGroup(safeGroupIdx, { enemyId: e.target.value })}
                style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
              >
                {EDITOR_ENEMIES.map(en => (
                  <option key={en.id} value={en.id}>
                    {en.name} ({en.role})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Count</span>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={activeGroup.count}
                onChange={e =>
                  updateGroup(safeGroupIdx, { count: Math.max(1, Math.round(Number(e.target.value) || 1)) })
                }
                style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Start Offset (s)</span>
              <input
                type="number"
                min={0}
                max={180}
                step={0.5}
                value={activeGroup.startOffsetSeconds}
                onChange={e =>
                  updateGroup(safeGroupIdx, {
                    startOffsetSeconds: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Spawn Interval (s)</span>
              <input
                type="number"
                min={0.5}
                max={60}
                step={0.5}
                value={activeGroup.intervalSeconds}
                onChange={e =>
                  updateGroup(safeGroupIdx, {
                    intervalSeconds: Math.max(0.5, Number(e.target.value) || 0.5),
                  })
                }
                style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <span style={{ color: '#94A3B8' }}>Lane Mode</span>
              <select
                value={activeGroup.laneMode}
                onChange={e =>
                  updateGroup(safeGroupIdx, {
                    laneMode: e.target.value as 'fixed' | 'sequential' | 'random',
                  })
                }
                style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
              >
                {LANE_MODE_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Allowed Lanes:</span>
            {[0, 1, 2, 3, 4].map(lane => {
              const active = activeGroup.allowedLanes.includes(lane);
              return (
                <button
                  key={`toggle-lane-${lane}`}
                  type="button"
                  className={`mfd-btn ${active ? 'mfd-btn-primary' : ''}`}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => toggleGroupLane(lane)}
                >
                  Lane {lane + 1}
                </button>
              );
            })}
            <button
              type="button"
              className="mfd-btn"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => updateGroup(safeGroupIdx, { allowedLanes: [0, 1, 2, 3, 4] })}
            >
              All 5 Lanes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
