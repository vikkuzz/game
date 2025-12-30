"use client";

import React from "react";
import { Unit, UnitType } from "@/types/game";
import { cn } from "@/lib/utils";

interface UnitProps {
  unit: Unit;
}

const playerColors = [
  "bg-blue-500",
  "bg-red-500",
  "bg-green-500",
  "bg-yellow-500",
];

const unitTypeIcons: Record<UnitType, string> = {
  warrior: "⚔️",
  archer: "🏹",
  mage: "🔮",
};

export const UnitComponent: React.FC<UnitProps> = ({ unit }) => {
  if (unit.health <= 0) return null;

  const colorClass = playerColors[unit.playerId];
  const healthPercent = (unit.health / unit.maxHealth) * 100;
  const size = 20; // Увеличено для лучшей видимости
  const isAttacking = unit.isAttacking || false;

  return (
    <div
      className={cn(
        "absolute rounded-full border-2 shadow-md",
        "border-white",
        colorClass
      )}
      style={{
        left: unit.position.x - size / 2,
        top: unit.position.y - size / 2,
        width: size,
        height: size,
      }}>
      {/* Иконка типа юнита */}
      <div className="w-full h-full flex items-center justify-center text-xs">
        {unitTypeIcons[unit.type]}
      </div>

      {/* Полоса здоровья - над юнитом сверху */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-900 rounded overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-200",
            healthPercent > 50
              ? "bg-green-500"
              : healthPercent > 25
              ? "bg-yellow-500"
              : "bg-red-500"
          )}
          style={{ width: `${Math.max(0, healthPercent)}%` }}
        />
      </div>

      {/* Простой индикатор атаки - только маленький значок */}
      {isAttacking && (
        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-red-600 text-sm font-bold z-20">
          ⚔
        </div>
      )}
    </div>
  );
};
