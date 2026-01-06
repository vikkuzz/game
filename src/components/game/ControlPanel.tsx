"use client";

import React, { useState } from "react";
import { GameState, UnitType, PlayerId } from "@/types/game";
import { Button } from "@/components/Button";
import { GAME_CONFIG } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { BuildingsList } from "./BuildingsList";

interface ControlPanelProps {
  gameState: GameState;
  selectedPlayer: PlayerId;
  onBuyUnit: (
    playerId: PlayerId,
    barrackId: string,
    unitType: UnitType
  ) => void;
  onUpgradeBuilding: (playerId: PlayerId, buildingId: string) => void;
  onRepairBuilding: (playerId: PlayerId, buildingId: string) => void;
  onUpgradeCastleStat: (
    playerId: PlayerId,
    stat: keyof GameState["players"][0]["upgrades"]
  ) => void;
  onSelectPlayer: (playerId: PlayerId) => void;
  onToggleAutoUpgrade: () => void;
  isNetworkMode?: boolean;
  myPlayerId?: PlayerId | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  gameState,
  selectedPlayer,
  onBuyUnit,
  onUpgradeBuilding,
  onRepairBuilding,
  onUpgradeCastleStat,
  onSelectPlayer,
  onToggleAutoUpgrade,
  isNetworkMode = false,
  myPlayerId = null,
}) => {
  const [showAllBuildings, setShowAllBuildings] = useState(false);
  const [showOnlyNeedsAttention, setShowOnlyNeedsAttention] = useState(false);
  const player = gameState.players[selectedPlayer];
  if (!player) return null;

  const selectedBuilding =
    player.castle.id === gameState.selectedBuilding
      ? player.castle
      : [...player.barracks, ...player.towers].find(
          (b) => b.id === gameState.selectedBuilding
        );

  const playerColors = ["blue", "red", "green", "yellow"];

  // Собираем все здания игрока
  const allBuildings = [
    player.castle,
    ...player.barracks,
    ...player.towers,
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6 max-h-[600px] overflow-y-auto">
      {/* Выбор игрока */}
      <div>
        <h3 className="text-lg font-bold mb-2">Игрок</h3>
        <div className="grid grid-cols-4 gap-2">
          {gameState.players.map((p, idx) => {
            const color = playerColors[idx];
            const isSelected = selectedPlayer === p.id;
            const isDisabled = isNetworkMode && myPlayerId !== null && p.id !== myPlayerId;
            return (
              <button
                key={p.id}
                onClick={() => !isDisabled && onSelectPlayer(p.id)}
                disabled={!p.isActive || isDisabled}
                className={cn(
                  "px-4 py-2 rounded font-medium transition-colors",
                  isSelected
                    ? `bg-${color}-600 text-white`
                    : isDisabled
                    ? `bg-gray-400 text-gray-600 cursor-not-allowed`
                    : `bg-${color}-200 text-gray-800 hover:bg-${color}-300`,
                  !p.isActive && "opacity-50 cursor-not-allowed"
                )}>
                {p.id + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Информация об игроке */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Золото:</span>
          <span className="text-yellow-600 font-bold">
            {Math.floor(player.gold)}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Доход:</span>
          <span className="text-green-600">{player.goldIncome}/сек</span>
        </div>
        <div className="border-t pt-2 mt-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="font-semibold">Авторазвитие:</span>
            <button
              onClick={onToggleAutoUpgrade}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                player.autoUpgrade ? "bg-blue-600" : "bg-gray-300"
              )}>
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  player.autoUpgrade ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Переключатель режима просмотра */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Здания</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAllBuildings(!showAllBuildings)}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                showAllBuildings
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              )}>
              {showAllBuildings ? "📋 Все здания" : "🎯 Выбранное"}
            </button>
            {showAllBuildings && (
              <button
                onClick={() => setShowOnlyNeedsAttention(!showOnlyNeedsAttention)}
                className={cn(
                  "px-3 py-1 rounded text-sm font-medium transition-colors",
                  showOnlyNeedsAttention
                    ? "bg-orange-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                )}>
                ⚠️
              </button>
            )}
          </div>
        </div>

        {/* Режим: Все здания */}
        {showAllBuildings ? (
          <BuildingsList
            buildings={allBuildings}
            player={player}
            playerId={selectedPlayer}
            onUpgrade={(buildingId) => onUpgradeBuilding(selectedPlayer, buildingId)}
            onRepair={(buildingId) => onRepairBuilding(selectedPlayer, buildingId)}
            onBuyUnit={(buildingId, unitType) => onBuyUnit(selectedPlayer, buildingId, unitType)}
            groupBy="type"
            showOnlyNeedsAttention={showOnlyNeedsAttention}
            compact={false}
          />
        ) : (
          /* Режим: Выбранное здание (старый интерфейс для обратной совместимости) */
          selectedBuilding && (
            <div className="space-y-2">
              <div className="text-sm">
                Здоровье: {Math.floor(selectedBuilding.health)} /{" "}
                {selectedBuilding.maxHealth}
              </div>
              <div className="text-sm">Уровень: {selectedBuilding.level}</div>

              {/* Действия с зданием */}
              <div className="flex flex-col gap-2 mt-4">
                {/* Улучшение */}
                <div className="space-y-1">
                  <Button
                    onClick={() =>
                      onUpgradeBuilding(selectedPlayer, selectedBuilding.id)
                    }
                    disabled={
                      player.gold < selectedBuilding.level * 200 ||
                      !!(
                        selectedBuilding.upgradeCooldown &&
                        selectedBuilding.upgradeCooldown > 0
                      ) ||
                      (selectedBuilding.type === "barracks" &&
                        selectedBuilding.level >= 2 &&
                        player.castle.level < 2)
                    }
                    variant="primary"
                    size="sm"
                    className="w-full">
                    Улучшить ({selectedBuilding.level * 200} золота)
                  </Button>
                  {selectedBuilding.upgradeCooldown &&
                    selectedBuilding.upgradeCooldown > 0 && (
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Кулдаун улучшения:</span>
                          <span>
                            {Math.ceil(selectedBuilding.upgradeCooldown / 1000)}с
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                ((5000 - selectedBuilding.upgradeCooldown) /
                                  5000) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                </div>

                {/* Починка */}
                <div className="space-y-1">
                  <Button
                    onClick={() =>
                      onRepairBuilding(selectedPlayer, selectedBuilding.id)
                    }
                    disabled={
                      selectedBuilding.health >= selectedBuilding.maxHealth ||
                      player.gold < 100 ||
                      !!(
                        selectedBuilding.repairCooldown &&
                        selectedBuilding.repairCooldown > 0
                      )
                    }
                    variant="secondary"
                    size="sm"
                    className="w-full">
                    Починить (100 золота)
                  </Button>
                  {selectedBuilding.repairCooldown &&
                    selectedBuilding.repairCooldown > 0 && (
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Кулдаун починки:</span>
                          <span>
                            {Math.ceil(selectedBuilding.repairCooldown / 1000)}с
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                ((300000 - selectedBuilding.repairCooldown) /
                                  300000) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                </div>

                {/* Покупка юнитов (только для бараков) */}
                {selectedBuilding.type === "barracks" && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-semibold">Купить юнитов:</div>
                    <div className="space-y-1">
                      <Button
                        onClick={() =>
                          onBuyUnit(
                            selectedPlayer,
                            selectedBuilding.id,
                            "warrior"
                          )
                        }
                        disabled={
                          player.gold < GAME_CONFIG.unitCost.warrior ||
                          (selectedBuilding.availableUnits || 0) <= 0
                        }
                        variant="success"
                        size="sm"
                        className="w-full">
                        Воин ({GAME_CONFIG.unitCost.warrior} золота)
                        {(selectedBuilding.availableUnits || 0) > 0 &&
                          ` - ${selectedBuilding.availableUnits} доступно`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Прокачка замка */}
      {selectedBuilding && selectedBuilding.type === "castle" && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold mb-2">Прокачка замка</h3>
          <div className="space-y-2">
            <Button
              onClick={() => onUpgradeCastleStat(selectedPlayer, "attack")}
              disabled={player.gold < (player.upgrades.attack + 1) * 150}
              variant="primary"
              size="sm"
              className="w-full justify-between items-center">
              <div className="flex flex-col items-start">
                <span className="font-medium">Атака</span>
                <span className="text-xs text-white">
                  Уровень: {player.upgrades.attack}
                </span>
              </div>
              <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                {(player.upgrades.attack + 1) * 150} золота
              </span>
            </Button>
            <Button
              onClick={() => onUpgradeCastleStat(selectedPlayer, "defense")}
              disabled={
                player.gold < (player.upgrades.defense + 1) * 150 ||
                (player.upgrades.defense >= 2 && player.castle.level < 2)
              }
              variant="primary"
              size="sm"
              className="w-full justify-between items-center">
              <div className="flex flex-col items-start">
                <span className="font-medium">Защита</span>
                <span className="text-xs text-white">
                  Уровень: {player.upgrades.defense}
                </span>
              </div>
              <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                {(player.upgrades.defense + 1) * 150} золота
              </span>
            </Button>
            <Button
              onClick={() => onUpgradeCastleStat(selectedPlayer, "health")}
              disabled={
                player.gold < (player.upgrades.health + 1) * 150 ||
                (player.upgrades.health >= 2 && player.castle.level < 2)
              }
              variant="primary"
              size="sm"
              className="w-full justify-between items-center">
              <div className="flex flex-col items-start">
                <span className="font-medium">Здоровье</span>
                <span className="text-xs text-white">
                  Уровень: {player.upgrades.health}
                </span>
              </div>
              <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                {(player.upgrades.health + 1) * 150} золота
              </span>
            </Button>
            {/* Временно закомментировано - магов убрали
            <Button
              onClick={() => onUpgradeCastleStat(selectedPlayer, "magic")}
              disabled={player.gold < (player.upgrades.magic + 1) * 150}
              variant="primary"
              size="sm"
              className="w-full justify-between">
              <span>Магия: {player.upgrades.magic}</span>
              <span>{(player.upgrades.magic + 1) * 150} золота</span>
            </Button>
            */}
            <Button
              onClick={() => onUpgradeCastleStat(selectedPlayer, "goldIncome")}
              disabled={
                player.gold < (player.upgrades.goldIncome + 1) * 150 ||
                (player.upgrades.goldIncome >= 2 && player.castle.level < 2)
              }
              variant="primary"
              size="sm"
              className="w-full justify-between items-center">
              <div className="flex flex-col items-start">
                <span className="font-medium">Доход</span>
                <span className="text-xs text-white">
                  Уровень: {player.upgrades.goldIncome}
                </span>
              </div>
              <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                {(player.upgrades.goldIncome + 1) * 150} золота
              </span>
            </Button>
            <Button
              onClick={() =>
                onUpgradeCastleStat(selectedPlayer, "buildingHealth")
              }
              disabled={
                player.gold < (player.upgrades.buildingHealth + 1) * 150 ||
                (player.upgrades.buildingHealth >= 2 && player.castle.level < 2)
              }
              variant="primary"
              size="sm"
              className="w-full justify-between items-center">
              <div className="flex flex-col items-start">
                <span className="font-medium">Здоровье зданий</span>
                <span className="text-xs text-white">
                  Уровень: {player.upgrades.buildingHealth}
                </span>
              </div>
              <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                {(player.upgrades.buildingHealth + 1) * 150} золота
              </span>
            </Button>
            <Button
              onClick={() =>
                onUpgradeCastleStat(selectedPlayer, "buildingAttack")
              }
              disabled={
                player.gold < (player.upgrades.buildingAttack + 1) * 150 ||
                (player.upgrades.buildingAttack >= 2 && player.castle.level < 2)
              }
              variant="primary"
              size="sm"
              className="w-full justify-between items-center">
              <div className="flex flex-col items-start">
                <span className="font-medium">Атака зданий</span>
                <span className="text-xs text-white">
                  Уровень: {player.upgrades.buildingAttack}
                </span>
              </div>
              <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
                {(player.upgrades.buildingAttack + 1) * 150} золота
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-bold mb-2">Статистика</h3>
        <div className="text-sm space-y-1">
          <div>Время игры: {Math.floor(gameState.gameTime)}с</div>
          <div>Юнитов: {player.units.length}</div>
          <div>Зданий: {1 + player.barracks.length + player.towers.length}</div>
        </div>
      </div>
    </div>
  );
};
