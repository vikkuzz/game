/**
 * Модуль обработки боя на сервере
 * Отвечает за атаки между юнитами, атаки зданий по юнитам, атаки юнитов по зданиям
 */

import type { GameState, PlayerId, Unit, Building as BuildingType } from "@/types/game";
import type { GameRoom } from "../gameServer";
import { processUnitCombat } from "./unitCombat";
import {
  processBuildingAttacks,
  processUnitAttacksOnBuildings,
} from "./buildingCombat";
import { getDistance, GAME_CONFIG } from "../gameLogic";
import { COMBAT_CONSTANTS } from "./constants";

/**
 * Обработка боя на сервере
 * (атаки между юнитами, атаки зданий по юнитам, атаки юнитов по зданиям)
 */
export function applyCombatTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  let state: GameState = room.gameState;
  const now = Date.now();

  // Получаем все юниты и здания
  const allUnitsList = state.players
    .flatMap((p) => p.units)
    .filter((u) => u.health > 0);

  // Сохраняем исходные юниты ДО обновления для проверки дистанции атаки
  const originalUnitsList = [...allUnitsList];

  // Обрабатываем атаки между юнитами
  const combatResult = processUnitCombat(
    allUnitsList,
    originalUnitsList,
    now
  );

  // Обрабатываем атаки зданий по юнитам
  const allBuildings = state.players.flatMap((p) => [
    p.castle,
    ...p.barracks,
    ...p.towers,
  ]);
  const buildingAttacks = processBuildingAttacks(
    allBuildings,
    allUnitsList,
    now
  );

  // Объединяем обновления юнитов из боевой системы и атак зданий
  buildingAttacks.updatedUnits.forEach((unit, id) => {
    combatResult.unitsMap.set(id, unit);
  });

  // Обрабатываем атаки юнитов по зданиям
  const unitsAttackingBuildings = new Map<string, Unit>();
  combatResult.unitsMap.forEach((unit, id) => {
    unitsAttackingBuildings.set(id, unit);
  });
  const unitBuildingAttacks = processUnitAttacksOnBuildings(
    allBuildings,
    allUnitsList,
    unitsAttackingBuildings,
    now
  );

  // Объединяем все обновления зданий
  const buildingsMap = new Map<string, BuildingType>();
  buildingAttacks.updatedBuildings.forEach((building, id) => {
    buildingsMap.set(id, building);
  });
  unitBuildingAttacks.updatedBuildings.forEach((building, id) => {
    buildingsMap.set(id, building);
  });

  // Объединяем обновления юнитов из атак по зданиям
  unitBuildingAttacks.updatedUnits.forEach((unit, id) => {
    const existing = combatResult.unitsMap.get(id);
    if (existing) {
      combatResult.unitsMap.set(id, { ...existing, ...unit });
    } else {
      combatResult.unitsMap.set(id, unit);
    }
  });

  // Применяем обновления к состоянию
  state = {
    ...state,
    players: state.players.map((player) => {
      // Обновляем юниты
      const updatedUnits = player.units.map((unit) => {
        const updated = combatResult.unitsMap.get(unit.id);
        return updated || unit;
      }).filter((u) => u.health > 0);

      // Обновляем здания
      let updatedCastle = player.castle;
      const castleUpdate = buildingsMap.get(player.castle.id);
      if (castleUpdate) {
        updatedCastle = castleUpdate as BuildingType;
      }

      const updatedBarracks = player.barracks.map((barrack) => {
        const updated = buildingsMap.get(barrack.id);
        return (updated || barrack) as BuildingType;
      });

      const updatedTowers = player.towers.map((tower) => {
        const updated = buildingsMap.get(tower.id);
        return (updated || tower) as BuildingType;
      });

      // Начисляем награды за убийства
      const killReward = combatResult.killRewards.get(player.id) || 0;
      const newGold = player.gold + killReward;

      // Обновляем статистику
      const statsUpdate = combatResult.statsUpdates.get(player.id);
      const newStats = statsUpdate
        ? {
            ...player.stats,
            unitsKilled: player.stats.unitsKilled + statsUpdate.unitsKilled,
            unitsLost: player.stats.unitsLost + statsUpdate.unitsLost,
            damageDealt: player.stats.damageDealt + statsUpdate.damageDealt,
            damageTaken: player.stats.damageTaken + statsUpdate.damageTaken,
            goldEarned: player.stats.goldEarned + killReward,
          }
        : player.stats;

      // Обрабатываем разрушенные здания
      const prevBuildings = [
        player.castle,
        ...player.barracks,
        ...player.towers,
      ];
      let buildingsDestroyed = 0;
      let buildingsLost = 0;
      let buildingReward = 0;

      prevBuildings.forEach((prevBuilding) => {
        const currentBuilding = buildingsMap.get(prevBuilding.id);
        if (
          prevBuilding.health > 0 &&
          currentBuilding &&
          currentBuilding.health <= 0
        ) {
          // Здание было разрушено
          if (player.id === prevBuilding.playerId) {
            buildingsLost += 1;
          }

          // Находим атакующих для награды (юниты, которые атаковали это здание)
          const attackers = new Set<PlayerId>();
          // Используем обновленные юниты из результата боя
          const allUpdatedUnits = state.players.flatMap((p) => p.units);
          allUpdatedUnits.forEach((unit) => {
            if (unit.playerId !== prevBuilding.playerId) {
              const distance = getDistance(
                unit.position,
                prevBuilding.position
              );
              if (distance < COMBAT_CONSTANTS.UNIT_ATTACK_BUILDING_DISTANCE) {
                attackers.add(unit.playerId);
              }
            }
          });

          if (attackers.size > 0) {
            const reward =
              GAME_CONFIG.buildingDestroyReward[prevBuilding.type] || 0;
            const rewardPerPlayer = Math.floor(reward / attackers.size);
            if (attackers.has(player.id)) {
              // Игрок атаковал здание другого игрока
              buildingsDestroyed += 1;
              buildingReward += rewardPerPlayer;
            }
          }
        }
      });

      return {
        ...player,
        units: updatedUnits,
        castle: updatedCastle,
        barracks: updatedBarracks,
        towers: updatedTowers,
        gold: newGold + buildingReward,
        stats: {
          ...newStats,
          buildingsDestroyed: player.stats.buildingsDestroyed + buildingsDestroyed,
          buildingsLost: player.stats.buildingsLost + buildingsLost,
          goldEarned: player.stats.goldEarned + buildingReward,
        },
      };
    }),
  };

  return state;
}

