"use client";

import React from "react";
import { Building, Player, UnitType } from "@/types/game";
import { Button } from "@/components/Button";
import { GAME_CONFIG } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";

interface BuildingCardProps {
  building: Building;
  player: Player;
  playerId: number;
  onUpgrade: () => void;
  onRepair: () => void;
  onBuyUnit?: (unitType: UnitType) => void;
  compact?: boolean;
  showDetails?: boolean;
}

export const BuildingCard: React.FC<BuildingCardProps> = ({
  building,
  player,
  playerId,
  onUpgrade,
  onRepair,
  onBuyUnit,
  compact = false,
  showDetails = false,
}) => {
  const healthPercent = (building.health / building.maxHealth) * 100;
  const upgradeCost = building.level * 200;
  const repairCost = 100;
  const canUpgrade =
    player.gold >= upgradeCost &&
    !(building.upgradeCooldown && building.upgradeCooldown > 0) &&
    !(
      building.type === "barracks" &&
      building.level >= 2 &&
      player.castle.level < 2
    );
  const canRepair =
    building.health < building.maxHealth &&
    player.gold >= repairCost &&
    !(building.repairCooldown && building.repairCooldown > 0);

  const getBuildingIcon = () => {
    switch (building.type) {
      case "castle":
        return "🏰";
      case "barracks":
        return "🏛️";
      case "tower":
        return "🗼";
      default:
        return "🏛️";
    }
  };

  const getBuildingName = () => {
    switch (building.type) {
      case "castle":
        return "Замок";
      case "barracks":
        return "Бараки";
      case "tower":
        return "Башня";
      default:
        return "Здание";
    }
  };

  const getHealthColor = () => {
    if (healthPercent > 75) return "bg-green-500";
    if (healthPercent > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getBuildingIcon()}</span>
            <span className="font-medium text-white text-sm">
              {getBuildingName()}
            </span>
            <span className="text-xs text-gray-400">Lv.{building.level}</span>
          </div>
          <div className="flex items-center gap-1">
            {canUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded touch-manipulation">
                ⬆
              </button>
            )}
            {canRepair && (
              <button
                onClick={onRepair}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded touch-manipulation">
                🔧
              </button>
            )}
          </div>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", getHealthColor())}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getBuildingIcon()}</span>
          <div>
            <div className="font-bold text-white">{getBuildingName()}</div>
            <div className="text-xs text-gray-400">Уровень {building.level}</div>
          </div>
        </div>
        {showDetails && (
          <button className="text-gray-400 hover:text-white">📊</button>
        )}
      </div>

      {/* Здоровье */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">Здоровье</span>
          <span className="text-white font-medium">
            {Math.floor(building.health)} / {building.maxHealth}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", getHealthColor())}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>

      {/* Доступные юниты (для бараков) */}
      {building.type === "barracks" && building.availableUnits !== undefined && (
        <div className="text-sm text-blue-400">
          ⚔️ {building.availableUnits} юнитов доступно
        </div>
      )}

      {/* Кулдауны */}
      {building.upgradeCooldown && building.upgradeCooldown > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Кулдаун улучшения:</span>
            <span>{Math.ceil(building.upgradeCooldown / 1000)}с</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((5000 - building.upgradeCooldown) / 5000) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {building.repairCooldown && building.repairCooldown > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Кулдаун починки:</span>
            <span>{Math.ceil(building.repairCooldown / 1000)}с</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((300000 - building.repairCooldown) / 300000) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Действия */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={onUpgrade}
          disabled={!canUpgrade}
          variant="primary"
          size="lg"
          className="w-full py-3 text-sm touch-manipulation min-h-[44px] justify-between">
          <span>⬆ Улучшить</span>
          <span className="text-yellow-400 font-semibold">
            {upgradeCost} 🪙
          </span>
        </Button>

        <Button
          onClick={onRepair}
          disabled={!canRepair}
          variant="secondary"
          size="lg"
          className="w-full py-3 text-sm touch-manipulation min-h-[44px] justify-between">
          <span>🔧 Починить</span>
          <span className="text-yellow-400 font-semibold">
            {repairCost} 🪙
          </span>
        </Button>

        {building.type === "barracks" && onBuyUnit && (
          <Button
            onClick={() => onBuyUnit("warrior")}
            disabled={
              player.gold < GAME_CONFIG.unitCost.warrior ||
              (building.availableUnits || 0) <= 0
            }
            variant="success"
            size="lg"
            className="w-full py-3 text-sm touch-manipulation min-h-[44px] justify-between">
            <span>⚔️ Купить воина</span>
            <span className="text-yellow-400 font-semibold">
              {GAME_CONFIG.unitCost.warrior} 🪙
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};

