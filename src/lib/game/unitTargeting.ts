/**
 * Модуль поиска целей для юнитов
 * Отвечает за определение ближайших врагов и зданий
 */

import { Unit, Building, Position } from "@/types/game";
import { getDistance } from "./positions";
import { COMBAT_CONSTANTS } from "./constants";

// Константы для радиусов обнаружения
const UNIT_DETECTION_RADIUS = 150;
const BUILDING_DETECTION_RADIUS = 200;
const DEFAULT_BUILDING_ATTACK_RANGE = 200;

export interface TargetInfo {
  enemyUnit: Unit | null;
  enemyBuilding: Building | null;
  distanceToUnit: number;
  distanceToBuilding: number;
}

/**
 * Поиск ближайшего вражеского юнита
 */
export function findNearestEnemy(unit: Unit, allUnits: Unit[]): Unit | null {
  const enemies = allUnits.filter(
    (u) => u.playerId !== unit.playerId && u.health > 0
  );

  if (enemies.length === 0) return null;

  let nearest: Unit | null = null;
  let minDistance = Infinity;

  enemies.forEach((enemy) => {
    const distance = getDistance(unit.position, enemy.position);
    if (distance < minDistance && distance < UNIT_DETECTION_RADIUS) {
      minDistance = distance;
      nearest = enemy;
    }
  });

  return nearest;
}

/**
 * Поиск ближайшего вражеского здания
 */
export function findNearestEnemyBuilding(
  unit: Unit,
  allBuildings: Building[]
): Building | null {
  const enemyBuildings = allBuildings.filter(
    (b) => b.playerId !== unit.playerId && b.health > 0
  );

  if (enemyBuildings.length === 0) return null;

  let nearest: Building | null = null;
  let minDistance = Infinity;

  enemyBuildings.forEach((building) => {
    const distance = getDistance(unit.position, building.position);
    if (distance < minDistance && distance < BUILDING_DETECTION_RADIUS) {
      minDistance = distance;
      nearest = building;
    }
  });

  return nearest;
}

/**
 * Поиск ближайшего вражеского юнита для здания
 */
export function findNearestEnemyUnitForBuilding(
  building: Building,
  allUnits: Unit[]
): Unit | null {
  const enemyUnits = allUnits.filter(
    (u) => u.playerId !== building.playerId && u.health > 0
  );

  if (enemyUnits.length === 0) return null;

  let nearest: Unit | null = null;
  let minDistance = Infinity;
  const attackRange = building.attackRange || DEFAULT_BUILDING_ATTACK_RANGE;

  enemyUnits.forEach((unit) => {
    const distance = getDistance(building.position, unit.position);
    if (distance < minDistance && distance <= attackRange) {
      minDistance = distance;
      nearest = unit;
    }
  });

  return nearest;
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

