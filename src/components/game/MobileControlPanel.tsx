"use client";

import React, { useState } from "react";
import { GameState, UnitType, PlayerId } from "@/types/game";
import { Button } from "@/components/Button";
import { GAME_CONFIG } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  return (
    <div className={cn(
      "lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t-2 border-gray-700 safe-area-inset-bottom transition-all duration-300",
      isCollapsed ? "max-h-[60px]" : ""
    )}>
      {/* Кнопка сворачивания */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full py-2 px-4 flex items-center justify-center gap-2 text-gray-400 hover:text-white active:bg-gray-800 transition-colors touch-manipulation border-b border-gray-700">
        <span className="text-sm font-medium">
          {isCollapsed ? "Развернуть меню" : "Свернуть меню"}
        </span>
        <span className={cn(
          "transition-transform duration-300 text-lg",
          isCollapsed ? "rotate-180" : ""
        )}>
          ▼
        </span>
      </button>

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
              {selectedBuilding ? (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold mb-2 text-white">
                      {selectedBuilding.type === "castle" && "🏰 Замок"}
                      {selectedBuilding.type === "barracks" && "🏛️ Бараки"}
                      {selectedBuilding.type === "tower" && "🗼 Башня"}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-gray-300">
                        Здоровье: {Math.floor(selectedBuilding.health)} /{" "}
                        {selectedBuilding.maxHealth}
                      </div>
                      <div className="text-sm text-gray-300">
                        Уровень: {selectedBuilding.level}
                      </div>
                      {/* Полоса здоровья */}
                      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            (selectedBuilding.health / selectedBuilding.maxHealth) * 100 > 50
                              ? "bg-green-500"
                              : (selectedBuilding.health / selectedBuilding.maxHealth) * 100 > 25
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          )}
                          style={{
                            width: `${
                              (selectedBuilding.health / selectedBuilding.maxHealth) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Действия с зданием */}
                    <div className="flex flex-col gap-3">
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
                          size="lg"
                          className="w-full py-4 text-base touch-manipulation min-h-[48px]">
                          ⬆ Улучшить ({selectedBuilding.level * 200} золота)
                        </Button>
                        {selectedBuilding.upgradeCooldown &&
                          selectedBuilding.upgradeCooldown > 0 && (
                            <div className="w-full">
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
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
                            !!(selectedBuilding.repairCooldown && selectedBuilding.repairCooldown > 0)
                          }
                          variant="secondary"
                          size="lg"
                          className="w-full py-4 text-base touch-manipulation min-h-[48px]">
                          🔧 Починить (100 золота)
                        </Button>
                        {selectedBuilding.repairCooldown &&
                          selectedBuilding.repairCooldown > 0 && (
                            <div className="w-full">
                              <div className="flex justify-between text-xs text-gray-300 mb-1">
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
                        <div className="mt-2 space-y-2">
                          <div className="text-sm font-semibold text-white">
                            Купить юнитов:
                            {(selectedBuilding.availableUnits || 0) > 0 &&
                              ` ${selectedBuilding.availableUnits} доступно`}
                          </div>
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
                            size="lg"
                            className="w-full py-4 text-base touch-manipulation min-h-[48px]">
                            ⚔️ Воин ({GAME_CONFIG.unitCost.warrior} золота)
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">🏛️</div>
                  <p>Выберите здание на карте</p>
                </div>
              )}
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
