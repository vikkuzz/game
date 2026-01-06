"use client";

import React, { useState } from "react";
import { GameState, UnitType, PlayerId } from "@/types/game";
import { Button } from "@/components/Button";
import { GAME_CONFIG } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";
import { BuildingsList } from "./BuildingsList";

interface MobileControlPanelProps {
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

type TabType = "buildings" | "research" | "players" | "stats";

export const MobileControlPanel: React.FC<MobileControlPanelProps> = ({
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
  const [activeTab, setActiveTab] = useState<TabType>("buildings");
  const [isCollapsed, setIsCollapsed] = useState(true); // Компактный режим по умолчанию
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

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: "buildings", label: "Здания", icon: "🏛️" },
    { id: "research", label: "Исследования", icon: "🔬" },
    { id: "players", label: "Игроки", icon: "👥" },
    { id: "stats", label: "Статистика", icon: "📊" },
  ];

  // Собираем все здания игрока
  const allBuildings = [
    player.castle,
    ...player.barracks,
    ...player.towers,
  ];

  // Подсчитываем здания, требующие внимания
  const buildingsNeedingAttention = allBuildings.filter((building) => {
    const healthPercent = (building.health / building.maxHealth) * 100;
    const canUpgrade =
      player.gold >= building.level * 200 &&
      !(building.upgradeCooldown && building.upgradeCooldown > 0);
    const canRepair =
      building.health < building.maxHealth &&
      player.gold >= 100 &&
      !(building.repairCooldown && building.repairCooldown > 0);
    return healthPercent < 75 || canUpgrade || canRepair;
  }).length;

  return (
    <div className={cn(
      "lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t-2 border-gray-700 safe-area-inset-bottom transition-all duration-300",
      isCollapsed ? "max-h-[70px]" : ""
    )}>
      {/* Компактная панель (всегда видна) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold text-lg">
                💰 {Math.floor(player.gold)}
              </span>
              <span className="text-green-400 text-sm">
                +{player.goldIncome}/сек
              </span>
            </div>
          </div>
          {buildingsNeedingAttention > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {buildingsNeedingAttention}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            if (isCollapsed) {
              setActiveTab("buildings");
            }
          }}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-colors touch-manipulation",
            isCollapsed
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          )}>
          {isCollapsed ? "📈 Развитие" : "▼ Свернуть"}
        </button>
      </div>

      {/* Табы */}
      <div className={cn(
        "flex border-b border-gray-700 transition-all duration-300",
        isCollapsed && "hidden"
      )}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setIsCollapsed(false); // Разворачиваем при выборе таба
            }}
            className={cn(
              "flex-1 py-3 px-2 text-center text-sm font-medium transition-colors touch-manipulation",
              activeTab === tab.id
                ? "bg-blue-600 text-white border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white active:bg-gray-800"
            )}>
            <div className="text-lg mb-1">{tab.icon}</div>
            <div className="text-xs">{tab.label}</div>
          </button>
        ))}
      </div>

      {/* Контент табов */}
      <div className={cn(
        "max-h-[50vh] overflow-y-auto -webkit-overflow-scrolling-touch transition-all duration-300",
        isCollapsed && "hidden"
      )}>
        <div className="p-4 space-y-4">
          {/* Таб: Здания */}
          {activeTab === "buildings" && (
            <>
              {/* Фильтр и переключатель */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Все здания</h3>
                <button
                  onClick={() => setShowOnlyNeedsAttention(!showOnlyNeedsAttention)}
                  className={cn(
                    "px-3 py-1 rounded text-sm font-medium transition-colors touch-manipulation",
                    showOnlyNeedsAttention
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}>
                  {showOnlyNeedsAttention ? "⚠️ Требуют внимания" : "📋 Все"}
                </button>
              </div>

              {/* Список зданий */}
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
            </>
          )}

          {/* Таб: Исследования */}
          {activeTab === "research" && (
            <>
              {selectedBuilding && selectedBuilding.type === "castle" ? (
                <div>
                  <h3 className="text-lg font-bold mb-3 text-white">
                    Прокачка замка
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: "attack" as const, label: "⚔️ Атака", icon: "⚔️" },
                      { key: "defense" as const, label: "🛡️ Защита", icon: "🛡️" },
                      { key: "health" as const, label: "❤️ Здоровье", icon: "❤️" },
                      { key: "goldIncome" as const, label: "💰 Доход", icon: "💰" },
                      {
                        key: "buildingHealth" as const,
                        label: "🏗️ Здоровье зданий",
                        icon: "🏗️",
                      },
                      {
                        key: "buildingAttack" as const,
                        label: "🏹 Атака зданий",
                        icon: "🏹",
                      },
                    ].map((stat) => {
                      const cost = (player.upgrades[stat.key] + 1) * 150;
                      const isDisabled =
                        player.gold < cost ||
                        (player.upgrades[stat.key] >= 2 &&
                          player.castle.level < 2);
                      return (
                        <Button
                          key={stat.key}
                          onClick={() => onUpgradeCastleStat(selectedPlayer, stat.key)}
                          disabled={isDisabled}
                          variant="primary"
                          size="lg"
                          className="w-full py-3 text-sm justify-between touch-manipulation min-h-[48px]">
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{stat.label}</span>
                            <span className="text-xs opacity-75">
                              Уровень: {player.upgrades[stat.key]}
                            </span>
                          </div>
                          <span className="text-yellow-400 font-semibold">
                            {cost} 🪙
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">🔬</div>
                  <p>Выберите замок для исследований</p>
                </div>
              )}
            </>
          )}

          {/* Таб: Игроки */}
          {activeTab === "players" && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-3 text-white">Выбор игрока</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
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
                          "px-3 py-4 rounded font-medium transition-colors text-base touch-manipulation",
                          isSelected
                            ? `bg-${color}-600 text-white`
                            : isDisabled
                            ? `bg-gray-400 text-gray-600 cursor-not-allowed`
                            : `bg-${color}-200 text-gray-800 active:bg-${color}-300`,
                          !p.isActive && "opacity-50 cursor-not-allowed"
                        )}>
                        {p.id + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-white">Золото:</span>
                  <span className="text-yellow-400 font-bold text-lg">
                    {Math.floor(player.gold)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-white">Доход:</span>
                  <span className="text-green-400">{player.goldIncome}/сек</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-white">Юниты:</span>
                  <span className="text-blue-400">{player.units.length}</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-white">Авторазвитие:</span>
                    <button
                      onClick={onToggleAutoUpgrade}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                        player.autoUpgrade ? "bg-blue-600" : "bg-gray-300"
                      )}>
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                          player.autoUpgrade ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Таб: Статистика */}
          {activeTab === "stats" && (
            <>
              <h3 className="text-lg font-bold mb-3 text-white">Статистика</h3>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-300 mb-2">Время игры</div>
                  <div className="text-xl font-bold text-white">
                    {Math.floor(gameState.gameTime)}с
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-300 mb-2">Юнитов</div>
                  <div className="text-xl font-bold text-blue-400">
                    {player.units.length}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-300 mb-2">Зданий</div>
                  <div className="text-xl font-bold text-green-400">
                    {1 + player.barracks.length + player.towers.length}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-300 mb-2">Убито юнитов</div>
                  <div className="text-xl font-bold text-red-400">
                    {player.stats.unitsKilled}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-sm text-gray-300 mb-2">Разрушено зданий</div>
                  <div className="text-xl font-bold text-orange-400">
                    {player.stats.buildingsDestroyed}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
