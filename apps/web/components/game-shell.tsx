'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AchievementView,
  CampaignController,
  CampaignDefenderCatalogItem,
  CampaignEnemyCatalogItem,
  CampaignGameHandle,
  CampaignLevelCardView,
  CampaignRecipeCatalogItem,
  CampaignSnapshot,
  CampaignTool,
  DefenderCollectionEntry,
  ProgressionProfile,
  SavedBattleSummary,
} from '@mfd/game';
import { BattleHudOverlay } from './battle/battle-hud-overlay';
import { CampaignHost } from './game/campaign-host';
import { AchievementsScreen } from './screens/achievements-screen';
import { DefenderCollectionScreen } from './screens/defender-collection-screen';
import { HowToPlayModal } from './screens/how-to-play-modal';
import { LevelSelectScreen } from './screens/level-select-screen';
import { MainMenuScreen } from './screens/main-menu-screen';
import { SettingsModal, type GameSettings } from './screens/settings-modal';

type ScreenView = 'MAIN_MENU' | 'LEVEL_SELECT' | 'COLLECTION' | 'ACHIEVEMENTS' | 'BATTLE';

const DEFAULT_SETTINGS: GameSettings = {
  visualStyle: 'pixel-art',
  showGridCoords: false,
  sfxMuted: true,
  musicMuted: true,
  unlockAllForTesting: false,
};

interface CatalogData {
  readonly defenders: readonly CampaignDefenderCatalogItem[];
  readonly recipes: readonly CampaignRecipeCatalogItem[];
  readonly enemies: readonly CampaignEnemyCatalogItem[];
}

export function GameShell() {
  const [screen, setScreen] = useState<ScreenView>('MAIN_MENU');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const [controller, setController] = useState<CampaignController | null>(null);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [snapshot, setSnapshot] = useState<CampaignSnapshot | null>(null);
  const [savedBattle, setSavedBattle] = useState<SavedBattleSummary | null>(null);
  const [levels, setLevels] = useState<readonly CampaignLevelCardView[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('grassland');
  const [collection, setCollection] = useState<readonly DefenderCollectionEntry[]>([]);
  const [achievements, setAchievements] = useState<readonly AchievementView[]>([]);
  const [profile, setProfile] = useState<ProgressionProfile>({
    totalVictories: 0,
    totalVictoryKills: 0,
    unlockedDefenderIds: ['iron_golem', 'skeleton'],
    unlockedRecipeIds: ['fusion_skeleton_sniper', 'fusion_steel_guardian', 'fusion_iron_ranger'],
    recordedBattleIds: [],
  });
  const [activeTool, setActiveTool] = useState<CampaignTool>({ kind: 'select' });
  const [battleHandle, setBattleHandle] = useState<CampaignGameHandle | null>(null);

  const syncMetaFromController = useCallback((ctrl: CampaignController) => {
    setProfile(ctrl.getProgressionProfile());
    setLevels(ctrl.getCampaignLevelsView());
    setCollection(ctrl.getDefenderCollection());
    setAchievements(ctrl.getAchievements());
    setSavedBattle(ctrl.getSavedBattleSummary());
    setSnapshot(ctrl.getSnapshot());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import('@mfd/game').then(mod => {
      if (cancelled) return;
      const ctrl = new mod.CampaignController();
      setCatalog({
        defenders: mod.CAMPAIGN_DEFENDER_CATALOG,
        recipes: mod.CAMPAIGN_RECIPE_CATALOG,
        enemies: mod.CAMPAIGN_ENEMY_CATALOG,
      });
      setController(ctrl);
      syncMetaFromController(ctrl);
    });
    return () => {
      cancelled = true;
    };
  }, [syncMetaFromController]);

  const handleSnapshot = useCallback(
    (next: CampaignSnapshot) => {
      setSnapshot(next);
      setProfile(next.progressionProfile);
      if (controller) {
        setLevels(controller.getCampaignLevelsView());
        setCollection(controller.getDefenderCollection());
        setAchievements(controller.getAchievements());
        if (next.status === 'victory' || next.status === 'defeat') {
          setSavedBattle(null);
        }
      }
    },
    [controller],
  );

  const handleStartNewBattle = (levelId?: string) => {
    if (!controller) return;
    const targetLevelId = levelId ?? snapshot?.activeLevelId ?? selectedLevelId;
    setSelectedLevelId(targetLevelId);
    setActiveTool({ kind: 'select' });
    controller.startNewBattle({
      levelId: targetLevelId,
      unlockAll: settings.unlockAllForTesting,
    });
    syncMetaFromController(controller);
    if (controller.getSnapshot().status === 'playing') {
      setScreen('BATTLE');
    }
  };

  const handleContinueSaved = () => {
    if (!controller) return;
    setActiveTool({ kind: 'select' });
    if (controller.resumeSavedBattle({ unlockAll: settings.unlockAllForTesting })) {
      syncMetaFromController(controller);
      setScreen('BATTLE');
    } else {
      syncMetaFromController(controller);
    }
  };

  const handleSaveAndExit = () => {
    if (!controller) return;
    setActiveTool({ kind: 'select' });
    setBattleHandle(null);
    controller.abandonBattleToMenu(true);
    syncMetaFromController(controller);
    setScreen('MAIN_MENU');
  };

  const handleReturnFromTerminal = () => {
    if (!controller) return;
    setActiveTool({ kind: 'select' });
    setBattleHandle(null);
    controller.abandonBattleToMenu(false);
    syncMetaFromController(controller);
    setScreen('MAIN_MENU');
  };

  return (
    <main className={screen === 'BATTLE' ? 'mfd-shell mfd-shell-battle' : 'mfd-shell'}>
      <div className="mfd-container">
        {!controller || !catalog ? (
          <div className="mfd-card" style={{ textAlign: 'center', padding: 40 }}>
            <h1 style={{ margin: '0 0 10px', color: '#4ADE80' }}>Minecraft Fusion Defense</h1>
            <p role="status" style={{ color: '#94A3B8', margin: 0 }}>
              Loading campaign runtime...
            </p>
          </div>
        ) : (
          <>
            {screen === 'MAIN_MENU' && (
              <MainMenuScreen
                savedBattle={savedBattle}
                profile={profile}
                collection={collection}
                defenderCatalog={catalog.defenders}
                onPlayLevelSelect={() => setScreen('LEVEL_SELECT')}
                onContinueSaved={handleContinueSaved}
                onOpenCollection={() => {
                  syncMetaFromController(controller);
                  setScreen('COLLECTION');
                }}
                onOpenAchievements={() => {
                  syncMetaFromController(controller);
                  setScreen('ACHIEVEMENTS');
                }}
                onOpenHowToPlay={() => setHowToPlayOpen(true)}
                onOpenSettings={() => {
                  syncMetaFromController(controller);
                  setSettingsOpen(true);
                }}
              />
            )}

            {screen === 'LEVEL_SELECT' && (
              <LevelSelectScreen
                levels={levels}
                enemyCatalog={catalog.enemies}
                profile={profile}
                savedBattle={savedBattle}
                onStartNew={levelId => handleStartNewBattle(levelId)}
                onContinueSaved={handleContinueSaved}
                onBack={() => setScreen('MAIN_MENU')}
              />
            )}

            {screen === 'COLLECTION' && (
              <DefenderCollectionScreen
                collection={collection}
                defenderCatalog={catalog.defenders}
                recipeCatalog={catalog.recipes}
                onBack={() => setScreen('MAIN_MENU')}
              />
            )}

            {screen === 'ACHIEVEMENTS' && (
              <AchievementsScreen
                profile={profile}
                achievements={achievements}
                collection={collection}
                onBack={() => setScreen('MAIN_MENU')}
              />
            )}

            {screen === 'BATTLE' && snapshot && (
              <section aria-label="Grassland Campaign Battle" className="mfd-battle-section">
                <BattleHudOverlay
                  snapshot={snapshot}
                  activeTool={activeTool}
                  battleHandle={battleHandle}
                  defenderCatalog={catalog.defenders}
                  onSelectTool={setActiveTool}
                  onClaimPending={() => controller.claimPendingWaveReward()}
                  onTogglePause={() => controller.togglePause()}
                  onSetSpeed={speed => controller.setSpeed(speed)}
                  onOpenHowToPlay={() => setHowToPlayOpen(true)}
                  onRestartBattle={() => handleStartNewBattle(snapshot.activeLevelId ?? selectedLevelId)}
                  onSaveAndExit={handleSaveAndExit}
                  onReturnToMenuTerminal={handleReturnFromTerminal}
                />
                <CampaignHost
                  controller={controller}
                  activeTool={activeTool}
                  visualStyle={settings.visualStyle}
                  showGridCoords={settings.showGridCoords}
                  onSnapshot={handleSnapshot}
                  onToolChange={setActiveTool}
                  onHandleReady={setBattleHandle}
                />
              </section>
            )}
          </>
        )}
      </div>

      <HowToPlayModal open={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        hasSavedBattle={savedBattle !== null}
        onUpdateSettings={next => {
          setSettings(next);
          controller?.setUnlockAllMode(next.unlockAllForTesting);
          if (controller) syncMetaFromController(controller);
        }}
        onClearSavedBattle={() => {
          controller?.clearSavedBattle();
          if (controller) syncMetaFromController(controller);
        }}
        onResetProgression={() => {
          controller?.resetProgression();
          if (controller) syncMetaFromController(controller);
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
