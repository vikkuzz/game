/**
 * Модуль обработки движения юнитов
 * Отвечает за обновление позиций юнитов и их движение к целям
 */

import type { Unit, Building, Position } from "@/types/game";
import { getDistance, getNextTarget } from "../gameLogic";
import { findNearestEnemy, findNearestEnemyBuilding } from "./unitTargeting";

interface ProcessUnitMovementParams {
  unit: Unit;
  allUnits: Unit[];
  allEnemyBuildings: Building[];
  deltaTime: number;
  now: number;
}

/**
 * Обрабатывает движение одного юнита
 */
export function processUnitMovement({
  unit,
  allUnits,
  allEnemyBuildings,
  deltaTime,
  now,
}: ProcessUnitMovementParams): Unit {
  if (unit.health <= 0) {
    return unit;
  }

  let updatedUnit = { ...unit };

  // Проверяем, есть ли враги поблизости
  const nearestEnemy = findNearestEnemy(unit, allUnits);
  const nearestEnemyBuilding = findNearestEnemyBuilding(unit, allEnemyBuildings);

  // Если есть ближайший враг, идем к нему
  if (nearestEnemy) {
    const distanceToEnemy = getDistance(unit.position, nearestEnemy.position);
    updatedUnit.targetPosition = nearestEnemy.position;
    updatedUnit.isMoving = true;

    // Движемся к врагу
    const dx = nearestEnemy.position.x - unit.position.x;
    const dy = nearestEnemy.position.y - unit.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const moveDistance = unit.speed * (deltaTime / 1000);
      const moveX = (dx / distance) * moveDistance;
      const moveY = (dy / distance) * moveDistance;

      updatedUnit.position = {
        x: unit.position.x + moveX,
        y: unit.position.y + moveY,
      };
    }
  } else if (nearestEnemyBuilding) {
    // Если есть ближайшее вражеское здание, идем к нему
    const distanceToBuilding = getDistance(unit.position, nearestEnemyBuilding.position);
    updatedUnit.targetPosition = nearestEnemyBuilding.position;
    updatedUnit.isMoving = true;

    const dx = nearestEnemyBuilding.position.x - unit.position.x;
    const dy = nearestEnemyBuilding.position.y - unit.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const moveDistance = unit.speed * (deltaTime / 1000);
      const moveX = (dx / distance) * moveDistance;
      const moveY = (dy / distance) * moveDistance;

      updatedUnit.position = {
        x: unit.position.x + moveX,
        y: unit.position.y + moveY,
      };
    }
  } else if (unit.targetPosition) {
    // Движемся к целевой позиции
    const distanceToTarget = getDistance(unit.position, unit.targetPosition);

    if (distanceToTarget > 5) {
      // Еще не достигли цели
      updatedUnit.isMoving = true;

      const dx = unit.targetPosition.x - unit.position.x;
      const dy = unit.targetPosition.y - unit.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const moveDistance = unit.speed * (deltaTime / 1000);
        const moveX = (dx / distance) * moveDistance;
        const moveY = (dy / distance) * moveDistance;

        updatedUnit.position = {
          x: unit.position.x + moveX,
          y: unit.position.y + moveY,
        };
      }
    } else {
      // Достигли цели, проверяем промежуточные цели
      if (unit.intermediateTargets && unit.currentIntermediateIndex !== undefined) {
        const nextIndex = unit.currentIntermediateIndex + 1;
        if (nextIndex < unit.intermediateTargets.length) {
          // Есть следующая промежуточная цель
          updatedUnit.currentIntermediateIndex = nextIndex;
          updatedUnit.targetPosition = unit.intermediateTargets[nextIndex];
          updatedUnit.isMoving = true;
        } else if (unit.finalTarget) {
          // Переходим к финальной цели
          updatedUnit.targetPosition = unit.finalTarget;
          updatedUnit.isMoving = true;
        } else {
          // Нет больше целей, ищем новую
          const newTarget = getNextTarget(
            unit.playerId,
            unit.position,
            allEnemyBuildings,
            800, // mapSize - нужно передавать как параметр, но пока используем константу
            unit.barrackIndex
          );
          updatedUnit.targetPosition = newTarget;
          updatedUnit.isMoving = true;
        }
      } else if (unit.finalTarget) {
        // Достигли промежуточной цели, переходим к финальной
        updatedUnit.targetPosition = unit.finalTarget;
        updatedUnit.isMoving = true;
      } else {
        // Нет больше целей, ищем новую
        const newTarget = getNextTarget(
          unit.playerId,
          unit.position,
          allEnemyBuildings,
          800, // mapSize
          unit.barrackIndex
        );
        updatedUnit.targetPosition = newTarget;
        updatedUnit.isMoving = true;
      }
    }
  } else {
    // Нет цели, ищем новую
    const newTarget = getNextTarget(
      unit.playerId,
      unit.position,
      allEnemyBuildings,
      800, // mapSize
      unit.barrackIndex
    );
    updatedUnit.targetPosition = newTarget;
    updatedUnit.isMoving = true;
  }

  return updatedUnit;
}

/**
 * Сбрасывает флаг атаки юнита
 */
export function resetAttackFlag(unit: Unit): Unit {
  return {
    ...unit,
    isAttacking: false,
    attackTarget: undefined,
  };
}

