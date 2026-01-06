"use client";

import React from "react";
import { Building, Player, PlayerId, UnitType } from "@/types/game";
import { Button } from "@/components/Button";
import { GAME_CONFIG } from "@/lib/gameLogic";
import { cn } from "@/lib/utils";

interface BuildingModalProps {
  building: Building;
  player: Player;
  playerId: PlayerId;
  onUpgrade: () => void;
  onRepair: () => void;
  onBuyUnit?: (unitType: UnitType) => void;
  onClose: () => void;
}

export const BuildingModal: React.FC<BuildingModalProps> = ({
  building,
  player,
  playerId,
  onUpgrade,
  onRepair,
  onBuyUnit,
  onClose,
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

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-gray-900 rounded-lg shadow-2xl border-2 border-gray-700 w-full max-w-sm pointer-events-auto max-h-[90vh] overflow-y-auto"
          style={{
            animation: "modalAppear 0.2s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getBuildingIcon()}</span>
              <div>
                <h3 className="text-lg font-bold text-white">{getBuildingName()}</h3>
                <p className="text-xs text-gray-400">Уровень {building.level}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none touch-manipulation">
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Здоровье */}
            <div className="space-y-2">
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
              <div className="text-sm text-blue-400 bg-blue-900/30 p-2 rounded">
                ⚔️ {building.availableUnits} юнитов доступно
              </div>
            )}

            {/* Кулдауны */}
            {building.upgradeCooldown && building.upgradeCooldown > 0 && (
              <div className="space-y-1 bg-orange-900/20 p-2 rounded">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>⏱️ Кулдаун улучшения:</span>
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
              <div className="space-y-1 bg-blue-900/20 p-2 rounded">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>⏱️ Кулдаун починки:</span>
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
            <div className="space-y-2 pt-2">
              <Button
                onClick={onUpgrade}
                disabled={!canUpgrade}
                variant="primary"
                size="lg"
                className="w-full py-3 text-base touch-manipulation min-h-[48px] justify-between">
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
                className="w-full py-3 text-base touch-manipulation min-h-[48px] justify-between">
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
                  className="w-full py-3 text-base touch-manipulation min-h-[48px] justify-between">
                  <span>⚔️ Купить воина</span>
                  <span className="text-yellow-400 font-semibold">
                    {GAME_CONFIG.unitCost.warrior} 🪙
                  </span>
                </Button>
              )}
            </div>

            {/* Информация о золоте игрока */}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">Ваше золото:</span>
                <span className="text-yellow-400 font-bold">
                  💰 {Math.floor(player.gold)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

