'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MVP_GAME_DATA,
  mvpCampaignLevelSchema,
  type MvpCampaignLevelData,
  type MvpLevelDifficulty,
  type MvpLevelTheme,
  type MvpLevelUnlockRequirement,
} from '@mfd/game-data';
import {
  LEVEL_DIFFICULTIES,
  LEVEL_THEMES,
  createBlankCampaignLevel,
  duplicateCampaignLevel,
} from './editor-types';
import { StartingGridEditor } from './starting-grid-editor';
import { WaveTimelinePanel } from './wave-timeline-panel';
import { EditorTestPlayModal } from './editor-testplay-modal';

type EditorTab = 'timeline' | 'starting' | 'metadata' | 'json';

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

export function LevelEditorHost() {
  const [levels, setLevels] = useState<MvpCampaignLevelData[]>(() =>
    structuredClone([...MVP_GAME_DATA.campaignLevels]).sort((a, b) => a.order - b.order),
  );
  const [savedSnapshotJson, setSavedSnapshotJson] = useState<string>(() =>
    JSON.stringify([...MVP_GAME_DATA.campaignLevels].sort((a, b) => a.order - b.order)),
  );
  const [selectedId, setSelectedId] = useState<string>(
    MVP_GAME_DATA.campaignLevels[0]?.id ?? 'grassland',
  );
  const [activeTab, setActiveTab] = useState<EditorTab>('timeline');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [testPlayConfig, setTestPlayConfig] = useState<{
    readonly stage: MvpCampaignLevelData;
    readonly startWaveIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!IS_DEV_MODE) return;
    void fetch('/api/dev/levels')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.ok && Array.isArray(data.levels) && data.levels.length > 0) {
          setLevels(data.levels);
          setSavedSnapshotJson(JSON.stringify(data.levels));
        }
      })
      .catch(() => {
        // Fallback silently to statically bundled campaignLevels when API is unreachable.
      });
  }, []);

  const activeStage = useMemo(
    () => levels.find(l => l.id === selectedId) ?? levels[0],
    [levels, selectedId],
  );

  const isDirty = useMemo(
    () => JSON.stringify(levels) !== savedSnapshotJson,
    [levels, savedSnapshotJson],
  );

  useEffect(() => {
    if (activeStage) {
      setJsonText(JSON.stringify(activeStage, null, 2));
      setJsonError(null);
    }
  }, [activeStage]);

  const updateActiveStage = (updater: (current: MvpCampaignLevelData) => MvpCampaignLevelData) => {
    if (!activeStage) return;
    setLevels(prev =>
      prev.map(item => (item.id === activeStage.id ? updater(item) : item)),
    );
  };

  const handleCreateStage = () => {
    const nextStage = createBlankCampaignLevel(levels);
    setLevels(prev => [...prev, nextStage]);
    setSelectedId(nextStage.id);
    setFeedback({ kind: 'info', message: `Created "${nextStage.name}" (${nextStage.id}).` });
  };

  const handleDuplicateStage = () => {
    if (!activeStage) return;
    const copy = duplicateCampaignLevel(activeStage, levels);
    setLevels(prev => [...prev, copy]);
    setSelectedId(copy.id);
    setFeedback({ kind: 'info', message: `Duplicated into "${copy.name}".` });
  };

  const handleDeleteStage = (id: string) => {
    if (id === 'grassland') {
      setFeedback({ kind: 'error', message: 'Cannot delete mandatory starter stage "grassland".' });
      return;
    }
    const next = levels.filter(l => l.id !== id).map(lvl => {
      if (lvl.unlockRequirement.kind === 'clear-level' && lvl.unlockRequirement.levelId === id) {
        return { ...lvl, unlockRequirement: { kind: 'clear-level' as const, levelId: 'grassland' } };
      }
      return lvl;
    });
    setLevels(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? 'grassland');
    }
    setFeedback({ kind: 'info', message: `Removed "${id}" from draft list. Click Save All to persist to repo.` });
  };

  const handleSaveAllToRepo = async () => {
    if (!IS_DEV_MODE) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/dev/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        levels?: MvpCampaignLevelData[];
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.levels) {
        setFeedback({ kind: 'error', message: payload.error ?? 'Failed to save levels.' });
        return;
      }
      setLevels(payload.levels);
      setSavedSnapshotJson(JSON.stringify(payload.levels));
      setFeedback({
        kind: 'success',
        message: `Saved ${payload.levels.length} stages to packages/game-data/levels/campaign-levels.json & grassland.json!`,
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network error saving levels.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReloadFromRepo = async () => {
    if (!IS_DEV_MODE) return;
    try {
      const response = await fetch('/api/dev/levels');
      const payload = (await response.json()) as {
        ok?: boolean;
        levels?: MvpCampaignLevelData[];
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.levels) {
        setFeedback({ kind: 'error', message: payload.error ?? 'Reload failed.' });
        return;
      }
      setLevels(payload.levels);
      setSavedSnapshotJson(JSON.stringify(payload.levels));
      setFeedback({ kind: 'info', message: 'Reloaded stages from repository disk.' });
    } catch (err) {
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Reload error.' });
    }
  };

  const handleApplyJsonEdit = () => {
    if (!activeStage) return;
    try {
      const parsed = mvpCampaignLevelSchema.parse(JSON.parse(jsonText));
      if (parsed.id !== activeStage.id && levels.some(l => l.id === parsed.id)) {
        setJsonError(`Stage ID "${parsed.id}" already exists.`);
        return;
      }
      if (activeStage.id === 'grassland' && parsed.id !== 'grassland') {
        setJsonError('Starter stage "grassland" must retain id "grassland".');
        return;
      }
      setLevels(prev => prev.map(l => (l.id === activeStage.id ? parsed : l)));
      setSelectedId(parsed.id);
      setJsonError(null);
      setFeedback({ kind: 'success', message: `Applied JSON edits to "${parsed.name}".` });
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid Stage JSON');
    }
  };

  const handleExportStageJson = () => {
    if (!activeStage) return;
    const blob = new Blob([`${JSON.stringify(activeStage, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeStage.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportStageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = mvpCampaignLevelSchema.parse(JSON.parse(text));
      const exists = levels.some(l => l.id === parsed.id);
      setLevels(prev =>
        exists ? prev.map(l => (l.id === parsed.id ? parsed : l)) : [...prev, parsed],
      );
      setSelectedId(parsed.id);
      setFeedback({
        kind: 'success',
        message: `${exists ? 'Updated' : 'Imported'} stage "${parsed.name}" (${parsed.id}).`,
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Invalid imported JSON file.',
      });
    }
  };

  const launchTestPlay = (startWaveIndex = 0) => {
    if (!activeStage) return;
    try {
      const validated = mvpCampaignLevelSchema.parse(activeStage);
      setTestPlayConfig({ stage: validated, startWaveIndex });
    } catch (err) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Stage validation failed before Test Play.',
      });
    }
  };

  const otherLevels = levels.filter(l => activeStage && l.id !== activeStage.id);

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Studio Header */}
      <div className="mfd-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" className="mfd-btn" style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}>
            ← Campaign Home
          </Link>
          <Link href="/playtest" className="mfd-btn" style={{ padding: '6px 12px', fontSize: 12, textDecoration: 'none' }}>
            Balance Lab (/playtest)
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, color: '#4ADE80' }}>
              Dev Stage Studio (/editor)
            </h1>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              Thiết kế Campaign Stage · Timeline 5 Lane · Starting Grid &amp; Roster · Test Play Jump-to-Wave
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isDirty && (
            <span className="mfd-badge" style={{ background: '#854d0e', color: '#fef08a' }}>
              UNSAVED CHANGES
            </span>
          )}
          <button
            type="button"
            className="mfd-btn mfd-btn-crystal"
            style={{ padding: '7px 14px', fontSize: 13 }}
            disabled={!activeStage}
            onClick={() => launchTestPlay(0)}
          >
            ▶ Test Play Stage
          </button>
          <button
            type="button"
            className="mfd-btn mfd-btn-primary"
            style={{ padding: '7px 14px', fontSize: 13 }}
            disabled={!IS_DEV_MODE || isSaving}
            onClick={() => void handleSaveAllToRepo()}
          >
            {isSaving ? 'Saving...' : 'Save All to Repo'}
          </button>
        </div>
      </div>

      {!IS_DEV_MODE && (
        <div className="mfd-card" style={{ padding: '10px 14px', borderColor: '#f59e0b', color: '#fde68a', fontSize: 12 }}>
          Running in production build: repository disk write (`POST /api/dev/levels`) is disabled. You can still design stages, Test Play, and Export JSON.
        </div>
      )}

      {feedback && (
        <div
          className="mfd-card"
          style={{
            padding: '10px 14px',
            borderColor:
              feedback.kind === 'error'
                ? '#f87171'
                : feedback.kind === 'success'
                  ? '#4ade80'
                  : '#38bdf8',
            color:
              feedback.kind === 'error'
                ? '#fecaca'
                : feedback.kind === 'success'
                  ? '#bbf7d0'
                  : '#bae6fd',
            fontSize: 13,
          }}
        >
          {feedback.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 290px) 1fr', gap: 14, alignItems: 'start' }}>
        {/* Left Sidebar: Stage Roster CRUD */}
        <aside className="mfd-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14, color: '#FACC15' }}>Stages ({levels.length})</strong>
            <button
              type="button"
              className="mfd-btn mfd-btn-gold"
              style={{ padding: '4px 9px', fontSize: 11 }}
              onClick={handleCreateStage}
            >
              + New Stage
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...levels]
              .sort((a, b) => a.order - b.order)
              .map(stage => {
                const selected = stage.id === activeStage?.id;
                return (
                  <div
                    key={stage.id}
                    style={{
                      background: selected ? 'rgba(20, 83, 45, 0.35)' : '#0f172a',
                      border: `2px solid ${selected ? '#4ade80' : '#334155'}`,
                      borderRadius: 8,
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(stage.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#F8FAFC',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#4ADE80' : '#F8FAFC' }}>
                          #{stage.order} {stage.name}
                        </span>
                        <span style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' }}>
                          {stage.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {stage.id} · {stage.waves.length} waves · {stage.initialEmeralds} EM
                        {stage.startingDefenders && stage.startingDefenders.length > 0
                          ? ` · ${stage.startingDefenders.length} starters`
                          : ''}
                      </div>
                    </button>

                    {selected && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <button
                          type="button"
                          className="mfd-btn"
                          style={{ padding: '2px 7px', fontSize: 10 }}
                          onClick={handleDuplicateStage}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="mfd-btn mfd-btn-danger"
                          style={{ padding: '2px 7px', fontSize: 10 }}
                          disabled={stage.id === 'grassland'}
                          onClick={() => handleDeleteStage(stage.id)}
                          title={stage.id === 'grassland' ? 'Starter stage cannot be deleted' : 'Delete stage'}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              className="mfd-btn"
              style={{ padding: '5px 8px', fontSize: 11 }}
              onClick={handleExportStageJson}
              disabled={!activeStage}
            >
              Export Active Stage (.json)
            </button>
            <button
              type="button"
              className="mfd-btn"
              style={{ padding: '5px 8px', fontSize: 11 }}
              onClick={() => importInputRef.current?.click()}
            >
              Import Stage (.json)
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={e => void handleImportStageFile(e)}
            />
            {IS_DEV_MODE && (
              <button
                type="button"
                className="mfd-btn"
                style={{ padding: '5px 8px', fontSize: 11 }}
                onClick={() => void handleReloadFromRepo()}
              >
                Reload Disk JSON
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Editor Workspace */}
        {activeStage && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Workspace Tab Bar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`mfd-btn ${activeTab === 'timeline' ? 'mfd-btn-primary' : ''}`}
                style={{ padding: '7px 14px', fontSize: 13 }}
                onClick={() => setActiveTab('timeline')}
              >
                5-Lane Wave Timeline ({activeStage.waves.length})
              </button>
              <button
                type="button"
                className={`mfd-btn ${activeTab === 'starting' ? 'mfd-btn-primary' : ''}`}
                style={{ padding: '7px 14px', fontSize: 13 }}
                onClick={() => setActiveTab('starting')}
              >
                Starting Grid &amp; Roster ({activeStage.startingDefenders?.length ?? 0})
              </button>
              <button
                type="button"
                className={`mfd-btn ${activeTab === 'metadata' ? 'mfd-btn-primary' : ''}`}
                style={{ padding: '7px 14px', fontSize: 13 }}
                onClick={() => setActiveTab('metadata')}
              >
                Metadata &amp; Economy
              </button>
              <button
                type="button"
                className={`mfd-btn ${activeTab === 'json' ? 'mfd-btn-primary' : ''}`}
                style={{ padding: '7px 14px', fontSize: 13 }}
                onClick={() => setActiveTab('json')}
              >
                Stage JSON
              </button>
            </div>

            {activeTab === 'timeline' && (
              <WaveTimelinePanel
                waves={activeStage.waves}
                waveCrystals={activeStage.waveCrystals}
                onChangeWavesAndCrystals={(nextWaves, nextCrystals) =>
                  updateActiveStage(cur => ({
                    ...cur,
                    waves: nextWaves,
                    waveCrystals: nextCrystals,
                  }))
                }
                onQuickTestFromWave={waveIdx => launchTestPlay(waveIdx)}
              />
            )}

            {activeTab === 'starting' && (
              <StartingGridEditor
                startingDefenders={activeStage.startingDefenders ?? []}
                allowedBaseDefenderIds={activeStage.allowedBaseDefenderIds}
                ignoreUnlockRestrictions={activeStage.ignoreUnlockRestrictions}
                onChangeStartingDefenders={next =>
                  updateActiveStage(cur => ({ ...cur, startingDefenders: next }))
                }
                onChangeAllowedBaseDefenderIds={next =>
                  updateActiveStage(cur => ({
                    ...cur,
                    ...(next ? { allowedBaseDefenderIds: next } : { allowedBaseDefenderIds: undefined }),
                  }))
                }
                onChangeIgnoreUnlockRestrictions={next =>
                  updateActiveStage(cur => ({ ...cur, ignoreUnlockRestrictions: next }))
                }
              />
            )}

            {activeTab === 'metadata' && (
              <div className="mfd-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#4ADE80' }}>
                  Stage Metadata, Economy &amp; Unlock Rule
                </h3>

                {activeStage.id === 'grassland' && (
                  <div style={{ fontSize: 12, color: '#FDE047', background: 'rgba(133, 77, 14, 0.25)', border: '1px solid #ca8a04', borderRadius: 6, padding: '8px 10px' }}>
                    Note: Stage 1 (&quot;grassland&quot;) requires exactly 5 waves and automatically syncs with `packages/game-data/levels/grassland.json`.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#94A3B8' }}>Stage ID (a-z0-9_)</span>
                    <input
                      type="text"
                      value={activeStage.id}
                      disabled={activeStage.id === 'grassland'}
                      onChange={e => {
                        const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                        if (!raw || levels.some(l => l.id === raw)) return;
                        const oldId = activeStage.id;
                        setLevels(prev =>
                          prev.map(l => {
                            if (l.id === oldId) return { ...l, id: raw };
                            if (l.unlockRequirement.kind === 'clear-level' && l.unlockRequirement.levelId === oldId) {
                              return { ...l, unlockRequirement: { kind: 'clear-level', levelId: raw } };
                            }
                            return l;
                          }),
                        );
                        setSelectedId(raw);
                      }}
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#94A3B8' }}>Display Order</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={activeStage.order}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          order: Math.max(1, Math.round(Number(e.target.value) || 1)),
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#94A3B8' }}>Stage Name</span>
                    <input
                      type="text"
                      value={activeStage.name}
                      onChange={e => updateActiveStage(cur => ({ ...cur, name: e.target.value }))}
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#94A3B8' }}>Difficulty</span>
                    <select
                      value={activeStage.difficulty}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          difficulty: e.target.value as MvpLevelDifficulty,
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    >
                      {LEVEL_DIFFICULTIES.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#94A3B8' }}>Theme</span>
                    <select
                      value={activeStage.theme}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          theme: e.target.value as MvpLevelTheme,
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    >
                      {LEVEL_THEMES.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#94A3B8' }}>RNG Seed</span>
                    <input
                      type="number"
                      min={0}
                      value={activeStage.seed}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          seed: Math.max(0, Math.round(Number(e.target.value) || 0)),
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  <span style={{ color: '#94A3B8' }}>Description</span>
                  <input
                    type="text"
                    value={activeStage.description}
                    onChange={e => updateActiveStage(cur => ({ ...cur, description: e.target.value }))}
                    style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#6EE7B7' }}>Initial Emeralds</span>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      step={25}
                      value={activeStage.initialEmeralds}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          initialEmeralds: Math.max(0, Math.round(Number(e.target.value) || 0)),
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#38BDF8' }}>Fusion Glove Cooldown (s)</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      value={activeStage.fusionGloveCooldownSeconds}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          fusionGloveCooldownSeconds: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#FACC15' }}>Chest Amount (EM)</span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={5}
                      value={activeStage.villageChest.amount}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          villageChest: {
                            ...cur.villageChest,
                            amount: Math.max(1, Math.round(Number(e.target.value) || 25)),
                          },
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#FACC15' }}>Chest Interval (s)</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      step={1}
                      value={activeStage.villageChest.intervalSeconds}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          villageChest: {
                            ...cur.villageChest,
                            intervalSeconds: Math.max(1, Number(e.target.value) || 10),
                          },
                        }))
                      }
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={activeStage.villageChest.enabled}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          villageChest: { ...cur.villageChest, enabled: e.target.checked },
                        }))
                      }
                    />
                    <span>Enable Village Supply Chest</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={activeStage.enablePassiveEnergy}
                      onChange={e =>
                        updateActiveStage(cur => ({
                          ...cur,
                          enablePassiveEnergy: e.target.checked,
                        }))
                      }
                    />
                    <span>Enable Passive Energy Income (+50/3s)</span>
                  </label>
                </div>

                {/* Unlock Requirement */}
                <div style={{ borderTop: '1px solid #334155', paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <span style={{ color: '#94A3B8' }}>Unlock Requirement</span>
                    <select
                      value={activeStage.unlockRequirement.kind}
                      onChange={e => {
                        const kind = e.target.value as MvpLevelUnlockRequirement['kind'];
                        const nextReq: MvpLevelUnlockRequirement =
                          kind === 'clear-level'
                            ? {
                                kind: 'clear-level',
                                levelId: otherLevels[0]?.id ?? 'grassland',
                              }
                            : { kind: 'always' };
                        updateActiveStage(cur => ({ ...cur, unlockRequirement: nextReq }));
                      }}
                      style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                    >
                      <option value="always">Always Unlocked</option>
                      <option value="clear-level">Clear Specific Stage</option>
                    </select>
                  </label>

                  {activeStage.unlockRequirement.kind === 'clear-level' && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                      <span style={{ color: '#94A3B8' }}>Required Cleared Stage</span>
                      <select
                        value={activeStage.unlockRequirement.levelId}
                        onChange={e =>
                          updateActiveStage(cur => ({
                            ...cur,
                            unlockRequirement: { kind: 'clear-level', levelId: e.target.value },
                          }))
                        }
                        style={{ background: '#0f172a', color: '#F8FAFC', border: '1px solid #475569', borderRadius: 6, padding: '6px 8px' }}
                      >
                        {otherLevels.map(lvl => (
                          <option key={lvl.id} value={lvl.id}>
                            {lvl.name} ({lvl.id})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'json' && (
              <div className="mfd-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: '#38BDF8' }}>
                    Raw Stage JSON ({activeStage.id})
                  </h3>
                  <button
                    type="button"
                    className="mfd-btn mfd-btn-primary"
                    style={{ padding: '5px 12px', fontSize: 12 }}
                    onClick={handleApplyJsonEdit}
                  >
                    Apply JSON Changes
                  </button>
                </div>
                {jsonError && (
                  <div style={{ fontSize: 12, color: '#FCA5A5', background: '#450a0a', padding: '6px 10px', borderRadius: 6 }}>
                    {jsonError}
                  </div>
                )}
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  rows={22}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#E2E8F0',
                    border: '1px solid #475569',
                    borderRadius: 8,
                    padding: 10,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                />
              </div>
            )}
          </section>
        )}
      </div>

      {testPlayConfig && (
        <EditorTestPlayModal
          stage={testPlayConfig.stage}
          initialStartWaveIndex={testPlayConfig.startWaveIndex}
          onClose={() => setTestPlayConfig(null)}
        />
      )}
    </main>
  );
}
