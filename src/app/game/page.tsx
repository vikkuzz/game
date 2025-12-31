"use client";

import React from "react";
import { useGameState } from "@/hooks/useGameState";
import { GameMap } from "@/components/game/GameMap";
import { ControlPanel } from "@/components/game/ControlPanel";
import { GameOverModal } from "@/components/game/GameOverModal";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { UnitType, PlayerId } from "@/types/game";
import { MobileControlPanel } from "@/components/game/MobileControlPanel";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col md:block">
      {/* Мобильный layout - карта на весь экран */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Компактный заголовок с управлением */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 px-3 py-2 z-10 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-lg font-bold text-white">Survival Chaos</h1>
            <div className="flex gap-1 items-center">
              <Button
                onClick={togglePause}
                variant={gameState.isPaused ? "success" : "warning"}
                size="sm"
                className="text-xs px-2 py-1">
                {gameState.isPaused ? "▶" : "⏸"}
              </Button>
              <div className="flex gap-1">
                <Button
                  onClick={() => setGameSpeed(0.5)}
                  variant={gameState.gameSpeed === 0.5 ? "primary" : "secondary"}
                  size="sm"
                  className="text-xs px-2 py-1">
                  0.5x
                </Button>
                <Button
                  onClick={() => setGameSpeed(1)}
                  variant={gameState.gameSpeed === 1 ? "primary" : "secondary"}
                  size="sm"
                  className="text-xs px-2 py-1">
                  1x
                </Button>
                <Button
                  onClick={() => setGameSpeed(2)}
                  variant={gameState.gameSpeed === 2 ? "primary" : "secondary"}
                  size="sm"
                  className="text-xs px-2 py-1">
                  2x
                </Button>
              </div>
            </div>
          </div>
          {/* Золото и доход */}
          {gameState.players[gameState.selectedPlayer || 0] && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">💰</span>
                <span className="text-yellow-400 font-bold">
                  {Math.floor(gameState.players[gameState.selectedPlayer || 0].gold)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">📈</span>
                <span className="text-green-400 font-semibold">
                  {gameState.players[gameState.selectedPlayer || 0].goldIncome}/сек
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Окно обзора карты - сжимается, но карта внутри полного размера с прокруткой */}
        <div className="flex-1 overflow-auto relative w-full bg-gray-800">
          <div className="inline-block">
            <GameMap
              gameState={gameState}
              selectedBuilding={gameState.selectedBuilding}
              onBuildingClick={handleBuildingClick}
              selectedPlayer={gameState.selectedPlayer ?? undefined}
            />
          </div>
        </div>

        {/* Мобильная панель с табами внизу */}
        <MobileControlPanel
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

      {/* Десктопный layout */}
      <Section padding="lg" className="hidden md:block">
        {/* Заголовок и управление */}
        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Survival Chaos</h1>
            {/* Золото и доход */}
            {gameState.players[gameState.selectedPlayer || 0] && (
              <div className="flex items-center gap-4 text-base">
                <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                  <span className="text-yellow-400">💰</span>
                  <span className="text-yellow-400 font-bold">
                    {Math.floor(gameState.players[gameState.selectedPlayer || 0].gold)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                  <span className="text-green-400">📈</span>
                  <span className="text-green-400 font-semibold">
                    {gameState.players[gameState.selectedPlayer || 0].goldIncome}/сек
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto justify-between md:justify-end">
            {/* Управление игрой */}
            <Button
              onClick={togglePause}
              variant={gameState.isPaused ? "success" : "warning"}
              size="sm"
              className="flex-1 md:flex-none">
              {gameState.isPaused ? "▶ Продолжить" : "⏸ Пауза"}
            </Button>
            <div className="flex gap-1">
              <Button
                onClick={() => setGameSpeed(0.5)}
                variant={gameState.gameSpeed === 0.5 ? "primary" : "secondary"}
                size="sm"
                className="text-xs px-2">
                0.5x
              </Button>
              <Button
                onClick={() => setGameSpeed(1)}
                variant={gameState.gameSpeed === 1 ? "primary" : "secondary"}
                size="sm"
                className="text-xs px-2">
                1x
              </Button>
              <Button
                onClick={() => setGameSpeed(2)}
                variant={gameState.gameSpeed === 2 ? "primary" : "secondary"}
                size="sm"
                className="text-xs px-2">
                2x
              </Button>
            </div>
          </div>
        </div>

        {/* Информация о юнитах и прокачке игроков - скрыта на мобильных, показывается в панели */}
        <div className="mb-6 hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="flex-1 flex justify-center overflow-x-auto md:overflow-visible">
            <GameMap
              gameState={gameState}
              selectedBuilding={gameState.selectedBuilding}
              onBuildingClick={handleBuildingClick}
              selectedPlayer={gameState.selectedPlayer ?? undefined}
            />
          </div>

          {/* Панель управления - скрыта на мобильных, показывается через выдвижное меню */}
          <div className="hidden lg:block w-full lg:w-96">
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


        {/* Инструкции - скрыты на мобильных */}
        <div className="mt-6 hidden md:block bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
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
