/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { PasswordGateModal } from './components/PasswordGateModal';
import { ShopModal } from './components/ShopModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { InventoryModal } from './components/InventoryModal';
import { VictoryModal } from './components/VictoryModal';
import { Minimap } from './components/Minimap';
import { sound } from './utils/audio';

export default function App() {
  // Single game engine instance
  const [engineKey, setEngineKey] = useState(0);
  const engine = useMemo(() => new GameEngine(), [engineKey]);

  // Modals state
  const [showGateModal, setShowGateModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());

  const handleToggleMute = useCallback(() => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const handleRestart = useCallback(() => {
    setShowVictoryModal(false);
    setShowGateModal(false);
    setShowShopModal(false);
    setShowLeaderboardModal(false);
    setShowInventoryModal(false);
    setEngineKey(prev => prev + 1);
  }, []);

  const handleVictory = useCallback(() => {
    setShowGateModal(false);
    setShowVictoryModal(true);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      
      {/* 2D Canvas Viewport */}
      <GameCanvas
        engine={engine}
        onOpenGate={() => setShowGateModal(true)}
        onOpenShop={() => setShowShopModal(true)}
        onOpenLeaderboard={() => setShowLeaderboardModal(true)}
        onOpenInventory={() => setShowInventoryModal(true)}
      />

      {/* Main Game HUD */}
      <HUD
        engine={engine}
        onOpenGate={() => setShowGateModal(true)}
        onOpenShop={() => setShowShopModal(true)}
        onOpenLeaderboard={() => setShowLeaderboardModal(true)}
        onOpenInventory={() => setShowInventoryModal(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Radar Minimap */}
      <Minimap engine={engine} />

      {/* MODALS */}
      {showGateModal && (
        <PasswordGateModal
          engine={engine}
          onClose={() => setShowGateModal(false)}
          onVictory={handleVictory}
        />
      )}

      {showShopModal && (
        <ShopModal
          engine={engine}
          onClose={() => setShowShopModal(false)}
        />
      )}

      {showLeaderboardModal && (
        <LeaderboardModal
          engine={engine}
          onClose={() => setShowLeaderboardModal(false)}
        />
      )}

      {showInventoryModal && (
        <InventoryModal
          engine={engine}
          onClose={() => setShowInventoryModal(false)}
          onOpenGate={() => {
            setShowInventoryModal(false);
            setShowGateModal(true);
          }}
        />
      )}

      {showVictoryModal && (
        <VictoryModal
          engine={engine}
          onRestart={handleRestart}
        />
      )}

    </div>
  );
}
