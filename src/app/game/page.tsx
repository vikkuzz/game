"use client";

import React from "react";
import { useGameState } from "@/hooks/useGameState";
import { GameMap } from "@/components/game/GameMap";
import { ControlPanel } from "@/components/game/ControlPanel";
import { GameOverModal } from "@/components/game/GameOverModal";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { UnitType, PlayerId } from "@/types/game";

/**
 * Страница игры Survival Chaos
 */
export default function GamePage() {
  const {
    gameState,
    buyUnit,
    upgradeBuilding,
    repairBuilding,
    upgradeCastleStat,
    togglePause,
    toggleAutoUpgrade,
    setGameSpeed,
    selectPlayer,
    selectBuilding,
    restartGame,
  } = useGameState();

  const handleBuildingClick = (buildingId: string) => {
    if (gameState.selectedBuilding === buildingId) {
      selectBuilding(null);
    } else {
      selectBuilding(buildingId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Section padding="lg">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Survival Chaos</h1>
          <div className="flex gap-2 items-center">
            {/* Управление игрой */}
            <Button
              onClick={togglePause}
              variant={gameState.isPaused ? "success" : "warning"}
              size="sm">
              {gameState.isPaused ? "▶ Продолжить" : "⏸ Пауза"}
            </Button>
            <div className="flex gap-1">
              <Button
                onClick={() => setGameSpeed(0.5)}
                variant={gameState.gameSpeed === 0.5 ? "primary" : "secondary"}
                size="sm">
                0.5x
              </Button>
              <Button
                onClick={() => setGameSpeed(1)}
                variant={gameState.gameSpeed === 1 ? "primary" : "secondary"}
                size="sm">
                1x
              </Button>
              <Button
                onClick={() => setGameSpeed(2)}
                variant={gameState.gameSpeed === 2 ? "primary" : "secondary"}
                size="sm">
                2x
              </Button>
            </div>
          </div>
        </div>

        {/* Информация о юнитах и прокачке игроков */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {gameState.players.map((player) => {
            const getPlayerStyles = (id: number) => {
              switch (id) {
                case 0:
                  return {
                    container: "bg-blue-900/50 border-blue-600",
                    title: "text-blue-300",
                  };
                case 1:
                  return {
                    container: "bg-red-900/50 border-red-600",
                    title: "text-red-300",
                  };
                case 2:
                  return {
                    container: "bg-green-900/50 border-green-600",
                    title: "text-green-300",
                  };
                case 3:
                  return {
                    container: "bg-yellow-900/50 border-yellow-600",
                    title: "text-yellow-300",
                  };
                default:
                  return {
                    container: "bg-gray-900/50 border-gray-600",
                    title: "text-gray-300",
                  };
              }
            };
            const styles = getPlayerStyles(player.id);
            return (
              <div
                key={player.id}
                className={`${styles.container} border-2 rounded-lg p-4 text-white`}>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>
                  Игрок {player.id + 1}
                </h3>

                {/* Информация о юнитах */}
                <div className="mb-3 space-y-1 text-sm">
                  <div className="font-semibold">Юниты:</div>
                  <div>
                    Всего:{" "}
                    <span className="font-bold">{player.units.length}</span>
                  </div>
                </div>

                {/* Информация о прокачке */}
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">Прокачка:</div>
                  <div>Атака: {player.upgrades.attack}</div>
                  <div>Защита: {player.upgrades.defense}</div>
                  <div>Здоровье: {player.upgrades.health}</div>
                  <div>Доход: {player.upgrades.goldIncome}</div>
                  <div>Здоровье зданий: {player.upgrades.buildingHealth}</div>
                  <div>Атака зданий: {player.upgrades.buildingAttack}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Игровая область */}
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Карта */}
          <div className="flex-1 flex justify-center">
            <GameMap
              gameState={gameState}
              selectedBuilding={gameState.selectedBuilding}
              onBuildingClick={handleBuildingClick}
            />
          </div>

          {/* Панель управления */}
          <div className="w-full lg:w-96">
            <ControlPanel
              gameState={gameState}
              selectedPlayer={gameState.selectedPlayer || 0}
              onBuyUnit={(
                playerId: PlayerId,
                barrackId: string,
                unitType: UnitType
              ) => buyUnit(playerId, barrackId, unitType)}
              onUpgradeBuilding={(playerId: PlayerId, buildingId: string) =>
                upgradeBuilding(playerId, buildingId)
              }
              onRepairBuilding={(playerId: PlayerId, buildingId: string) =>
                repairBuilding(playerId, buildingId)
              }
              onUpgradeCastleStat={(playerId: PlayerId, stat) =>
                upgradeCastleStat(playerId, stat)
              }
              onSelectPlayer={(playerId: PlayerId) => selectPlayer(playerId)}
              onToggleAutoUpgrade={toggleAutoUpgrade}
            />
          </div>
        </div>

        {/* Инструкции */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <h3 className="font-bold mb-2">Как играть:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Выберите игрока (1-4) в панели управления</li>
            <li>Кликните на здание (замок, барак или башню) для выбора</li>
            <li>Улучшайте здания и прокачивайте войска в замке</li>
            <li>
              Покупайте юнитов в бараках (количество ограничено и
              восстанавливается)
            </li>
            <li>Юниты автоматически идут к соседям и в центр карты</li>
            <li>Побеждает последний выживший игрок!</li>
          </ul>
        </div>
      </Section>

      {/* Модальное окно окончания игры */}
      <GameOverModal gameState={gameState} onRestart={restartGame} />
    </div>
  );
}
