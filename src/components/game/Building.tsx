"use client";

import React, { useState, useEffect } from "react";
import { Building as BuildingType } from "@/types/game";
import { cn } from "@/lib/utils";

interface BuildingProps {
  building: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  playerGold?: number;
  playerGoldIncome?: number;
}

const playerColors = [
  "bg-blue-600",
  "bg-red-600",
  "bg-green-600",
  "bg-yellow-600",
];

const playerBorderColors = [
  "border-blue-800",
  "border-red-800",
  "border-green-800",
  "border-yellow-800",
];

export const BuildingComponent: React.FC<BuildingProps> = ({
  building,
  isSelected,
  onClick,
  playerGold,
  playerGoldIncome,
}) => {
  const colorClass = playerColors[building.playerId];
  const borderClass = playerBorderColors[building.playerId];
  const healthPercent = (building.health / building.maxHealth) * 100;

  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getSize = () => {
    // Увеличиваем размеры на мобильных для лучшей видимости
    const multiplier = isMobile ? 1.2 : 1;
    
    switch (building.type) {
      case "castle":
        return { width: 80 * multiplier, height: 80 * multiplier };
      case "barracks":
        return { width: 60 * multiplier, height: 40 * multiplier };
      case "tower":
        return { width: 30 * multiplier, height: 30 * multiplier };
      default:
        return { width: 40 * multiplier, height: 40 * multiplier };
    }
  };

  const size = getSize();

  return (
    <div
      className={cn(
        "absolute cursor-pointer transition-all",
        isSelected && "ring-4 ring-yellow-400 ring-opacity-75"
      )}
      style={{
        left: building.position.x - size.width / 2,
        top: building.position.y - size.height / 2,
        width: size.width,
        height: size.height,
      }}
      onClick={onClick}>
      {/* Здание */}
      <div
        className={cn(
          "w-full h-full border-2 rounded relative",
          colorClass,
          borderClass,
          building.health <= 0 && "opacity-50 grayscale"
        )}
        style={{
          backgroundColor: building.type === "castle" ? undefined : undefined,
        }}>
        {/* Уровень - внутри здания вверху */}
        <div className="absolute top-0 left-0 text-xs font-bold text-white bg-black/70 px-1 rounded-br">
          Lv{building.level}
        </div>

        {/* Иконка типа здания */}
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
          {building.type === "castle" && "🏰"}
          {building.type === "barracks" && "🏛️"}
          {building.type === "tower" && "🗼"}
        </div>

        {/* Золото и доход (только для замков) - над полосой здоровья */}
        {building.type === "castle" && playerGold !== undefined && playerGoldIncome !== undefined && (
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1 text-[8px] font-bold">
            <div className="bg-black/80 text-yellow-400 px-1 py-0.5 rounded flex items-center gap-0.5">
              <span>💰</span>
              <span>{Math.floor(playerGold)}</span>
            </div>
            <div className="bg-black/80 text-green-400 px-1 py-0.5 rounded flex items-center gap-0.5">
              <span>📈</span>
              <span>{playerGoldIncome}/с</span>
            </div>
          </div>
        )}

        {/* Полоса здоровья - внутри здания внизу */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-800 rounded-b overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              healthPercent > 50
                ? "bg-green-500"
                : healthPercent > 25
                ? "bg-yellow-500"
                : "bg-red-500"
            )}
            style={{ width: `${healthPercent}%` }}
          />
        </div>

        {/* Доступные юниты (для бараков) - внутри здания вверху справа */}
        {building.type === "barracks" &&
          building.availableUnits !== undefined && (
            <div className="absolute top-0 right-0 text-xs text-white bg-black/70 px-1 py-0.5 rounded-bl">
              {building.availableUnits}/{building.maxAvailableUnits}
            </div>
          )}
      </div>
    </div>
  );
};
