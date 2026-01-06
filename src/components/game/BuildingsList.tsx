"use client";

import React, { useState } from "react";
import { Building, Player, PlayerId, UnitType } from "@/types/game";
import { BuildingCard } from "./BuildingCard";
import { cn } from "@/lib/utils";

interface BuildingsListProps {
  buildings: Building[];
  player: Player;
  playerId: PlayerId;
  onUpgrade: (buildingId: string) => void;
  onRepair: (buildingId: string) => void;
  onBuyUnit?: (buildingId: string, unitType: UnitType) => void;
  groupBy?: "type" | "none";
  showOnlyNeedsAttention?: boolean;
  compact?: boolean;
}

interface BuildingGroup {
  type: "castle" | "barracks" | "tower";
  buildings: Building[];
  label: string;
  icon: string;
}

export const BuildingsList: React.FC<BuildingsListProps> = ({
  buildings,
  player,
  playerId,
  onUpgrade,
  onRepair,
  onBuyUnit,
  groupBy = "type",
  showOnlyNeedsAttention = false,
  compact = false,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["castle", "barracks", "tower"])
  );

  // Фильтрация зданий, требующих внимания
  const needsAttention = (building: Building) => {
    if (showOnlyNeedsAttention) {
      const healthPercent = (building.health / building.maxHealth) * 100;
      const canUpgrade =
        player.gold >= building.level * 200 &&
        !(building.upgradeCooldown && building.upgradeCooldown > 0);
      const canRepair =
        building.health < building.maxHealth &&
        player.gold >= 100 &&
        !(building.repairCooldown && building.repairCooldown > 0);
      return healthPercent < 75 || canUpgrade || canRepair;
    }
    return true;
  };

  const filteredBuildings = buildings.filter(needsAttention);

  // Группировка зданий
  const groupBuildings = (): BuildingGroup[] => {
    if (groupBy === "none") {
      return [
        {
          type: "castle",
          buildings: filteredBuildings,
          label: "Все здания",
          icon: "🏛️",
        },
      ];
    }

    const groups: BuildingGroup[] = [
      {
        type: "castle",
        buildings: filteredBuildings.filter((b) => b.type === "castle"),
        label: "Замок",
        icon: "🏰",
      },
      {
        type: "barracks",
        buildings: filteredBuildings.filter((b) => b.type === "barracks"),
        label: "Бараки",
        icon: "🏛️",
      },
      {
        type: "tower",
        buildings: filteredBuildings.filter((b) => b.type === "tower"),
        label: "Башни",
        icon: "🗼",
      },
    ];

    return groups.filter((group) => group.buildings.length > 0);
  };

  const groups = groupBuildings();

  const toggleGroup = (type: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedGroups(newExpanded);
  };

  if (filteredBuildings.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-2">✅</div>
        <p>Все здания в порядке</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.type);
        const hasMultiple = group.buildings.length > 1;

        return (
          <div key={group.type} className="space-y-2">
            {/* Заголовок группы */}
            {hasMultiple && (
              <button
                onClick={() => toggleGroup(group.type)}
                className="w-full flex items-center justify-between p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors touch-manipulation">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{group.icon}</span>
                  <span className="font-semibold text-white">
                    {group.label} ({group.buildings.length})
                  </span>
                </div>
                <span
                  className={cn(
                    "text-gray-400 transition-transform",
                    isExpanded && "rotate-180"
                  )}>
                  ▼
                </span>
              </button>
            )}

            {/* Здания в группе */}
            {(!hasMultiple || isExpanded) && (
              <div className="space-y-2">
                {group.buildings.map((building, index) => (
                  <BuildingCard
                    key={building.id}
                    building={building}
                    player={player}
                    playerId={playerId}
                    onUpgrade={() => onUpgrade(building.id)}
                    onRepair={() => onRepair(building.id)}
                    onBuyUnit={
                      onBuyUnit
                        ? (unitType) => onBuyUnit(building.id, unitType)
                        : undefined
                    }
                    compact={compact}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

