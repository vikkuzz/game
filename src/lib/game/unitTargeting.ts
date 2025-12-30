/**
 * Модуль поиска целей для юнитов
 * Отвечает за определение ближайших врагов и зданий
 */

import { Unit, Building, Position } from "@/types/game";
import { findNearestEnemy, findNearestEnemyBuilding, getDistance } from "../gameLogic";
import { COMBAT_CONSTANTS } from "./constants";

export interface TargetInfo {
  enemyUnit: Unit | null;
  enemyBuilding: Building | null;
  distanceToUnit: number;
  distanceToBuilding: number;
}

/**
 * Находит ближайших врагов для юнита
 */
export function findTargets(
  unit: Unit,
  allUnits: Unit[],
  allEnemyBuildings: Building[]
): TargetInfo {
  const enemyUnit = findNearestEnemy(unit, allUnits);
  const enemyBuilding = findNearestEnemyBuilding(unit, allEnemyBuildings);

  return {
    enemyUnit,
    enemyBuilding,
    distanceToUnit: enemyUnit
      ? getDistance(unit.position, enemyUnit.position)
      : Infinity,
    distanceToBuilding: enemyBuilding
      ? getDistance(unit.position, enemyBuilding.position)
      : Infinity,
  };
}

/**
 * Проверяет, может ли юнит атаковать цель на текущей дистанции
 */
export function canAttackTarget(
  unit: Unit,
  targetPosition: Position,
  distance: number
): boolean {
  const isRanged = unit.attackRange > COMBAT_CONSTANTS.RANGED_THRESHOLD;
  const effectiveRange = isRanged
    ? unit.attackRange
    : COMBAT_CONSTANTS.MELEE_DISTANCE;

  return distance <= effectiveRange;
}

/**
 * Определяет оптимальную дистанцию для атаки
 */
export function getOptimalAttackDistance(unit: Unit): number {
  const isRanged = unit.attackRange > COMBAT_CONSTANTS.RANGED_THRESHOLD;
  if (!isRanged) {
    return COMBAT_CONSTANTS.MELEE_DISTANCE;
  }
  return unit.attackRange * COMBAT_CONSTANTS.OPTIMAL_RANGE_MULTIPLIER;
}

