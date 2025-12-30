/**
 * Модуль боевой логики зданий
 * Отвечает за обработку атак зданий по юнитам и юнитов по зданиям
 */

import { Unit, Building, PlayerId } from "@/types/game";
import {
  damageUnit,
  damageBuilding,
  getDistance,
  lineCrossesImpassable,
  findNearestEnemyUnitForBuilding,
} from "../gameLogic";
import { COMBAT_CONSTANTS } from "./constants";

/**
 * Обрабатывает атаки зданий по юнитам
 */
export function processBuildingAttacks(
  buildings: Building[],
  allUnits: Unit[],
  now: number
): {
  updatedUnits: Map<string, Unit>;
  updatedBuildings: Map<string, Building>;
} {
  const updatedUnits = new Map<string, Unit>();
  const updatedBuildings = new Map<string, Building>();

  buildings.forEach((building) => {
    if (
      building.health <= 0 ||
      !building.attack ||
      !building.attackRange
    ) {
      return;
    }

    const canAttack =
      !building.lastAttackTime ||
      now - building.lastAttackTime >= COMBAT_CONSTANTS.BUILDING_ATTACK_INTERVAL;

    if (!canAttack) {
      return;
    }

    const nearestEnemy = findNearestEnemyUnitForBuilding(building, allUnits);

    if (!nearestEnemy) {
      updatedBuildings.set(building.id, {
        ...building,
        attackTarget: undefined,
      });
      return;
    }

    const distance = getDistance(building.position, nearestEnemy.position);

    if (
      distance <= building.attackRange &&
      !lineCrossesImpassable(building.position, nearestEnemy.position)
    ) {
      const currentEnemy = updatedUnits.get(nearestEnemy.id) || nearestEnemy;
      const damagedEnemy = damageUnit(currentEnemy, building.attack);

      updatedUnits.set(nearestEnemy.id, {
        ...damagedEnemy,
        health: Math.max(0, damagedEnemy.health),
      });

      updatedBuildings.set(building.id, {
        ...building,
        lastAttackTime: now,
        attackTarget: nearestEnemy.position,
      });
    } else {
      updatedBuildings.set(building.id, {
        ...building,
        attackTarget: undefined,
      });
    }
  });

  return { updatedUnits, updatedBuildings };
}

/**
 * Обрабатывает атаки юнитов по зданиям
 */
export function processUnitAttacksOnBuildings(
  buildings: Building[],
  allUnits: Unit[],
  unitsAttackingBuildings: Map<string, Unit>,
  now: number
): {
  updatedBuildings: Map<string, Building>;
  updatedUnits: Map<string, Unit>;
} {
  const updatedBuildings = new Map<string, Building>();
  const updatedUnits = new Map<string, Unit>();

  buildings.forEach((building) => {
    if (building.health <= 0) return;

    const enemyUnits = allUnits
      .filter((u) => u.playerId !== building.playerId && u.health > 0)
      .map((u) => {
        return unitsAttackingBuildings.get(u.id) || u;
      });

    enemyUnits.forEach((enemyUnit) => {
      const canAttack =
        !enemyUnit.lastAttackTime ||
        now - enemyUnit.lastAttackTime >= COMBAT_CONSTANTS.UNIT_ATTACK_INTERVAL;

      if (!canAttack) return;

      const distance = getDistance(enemyUnit.position, building.position);

      if (
        distance < COMBAT_CONSTANTS.UNIT_ATTACK_BUILDING_DISTANCE &&
        !lineCrossesImpassable(enemyUnit.position, building.position)
      ) {
        const currentBuilding =
          updatedBuildings.get(building.id) || building;
        const oldHealth = currentBuilding.health;

        const damagedBuilding = damageBuilding(currentBuilding, enemyUnit.attack);
        const damage = Math.max(0, oldHealth - damagedBuilding.health);

        if (damage > 0) {
          updatedBuildings.set(building.id, damagedBuilding);
          updatedUnits.set(enemyUnit.id, {
            ...enemyUnit,
            lastAttackTime: now,
          });
        }
      }
    });
  });

  return { updatedBuildings, updatedUnits };
}

