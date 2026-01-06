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

  // Сначала проверяем, достигли ли мы текущей цели (промежуточной или финальной)
  // Это приоритетнее, чем поиск врагов - нужно продолжать движение по маршруту
  let targetReached = false;
  if (unit.targetPosition) {
    const distanceToTarget = getDistance(unit.position, unit.targetPosition);
    const REACHED_DISTANCE = 20; // Порог достижения цели (увеличен для надежности)

    if (distanceToTarget <= REACHED_DISTANCE) {
      targetReached = true;
      // Достигли цели, сразу переходим к следующей
      if (unit.intermediateTargets && unit.currentIntermediateIndex !== undefined) {
        const nextIndex = unit.currentIntermediateIndex + 1;
        if (nextIndex < unit.intermediateTargets.length) {
          // Есть следующая промежуточная цель - переходим к ней немедленно
          updatedUnit.currentIntermediateIndex = nextIndex;
          updatedUnit.targetPosition = unit.intermediateTargets[nextIndex];
          updatedUnit.isMoving = true;
        } else if (unit.finalTarget) {
          // Все промежуточные цели пройдены - переходим к финальной
          updatedUnit.targetPosition = unit.finalTarget;
          updatedUnit.finalTarget = undefined;
          updatedUnit.intermediateTargets = undefined;
          updatedUnit.currentIntermediateIndex = undefined;
          updatedUnit.isMoving = true;
        } else {
          // Нет финальной цели, ищем новую
          updatedUnit.intermediateTargets = undefined;
          updatedUnit.currentIntermediateIndex = undefined;
          updatedUnit.finalTarget = undefined;
          const newTarget = getNextTarget(
            unit.playerId,
            unit.position,
            allEnemyBuildings,
            800,
            unit.barrackIndex
          );
          updatedUnit.targetPosition = newTarget;
          updatedUnit.isMoving = true;
        }
      } else if (unit.finalTarget) {
        // Достигли промежуточной цели без intermediateTargets, переходим к финальной
        updatedUnit.targetPosition = unit.finalTarget;
        updatedUnit.finalTarget = undefined;
        updatedUnit.isMoving = true;
      } else {
        // Достигли цели, но нет следующей - ищем новую
        const newTarget = getNextTarget(
          unit.playerId,
          unit.position,
          allEnemyBuildings,
          800,
          unit.barrackIndex
        );
        updatedUnit.targetPosition = newTarget;
        updatedUnit.isMoving = true;
      }
    }
  }

  // Теперь определяем, к чему двигаться
  // Приоритет: текущая цель маршрута > враги > здания
  const nearestEnemy = findNearestEnemy(unit, allUnits);
  const nearestEnemyBuilding = findNearestEnemyBuilding(unit, allEnemyBuildings);
  
  // Определяем целевую позицию для движения
  let targetPosition: Position | null = null;
  
  if (updatedUnit.targetPosition) {
    // Есть цель маршрута - используем её (приоритет)
    targetPosition = updatedUnit.targetPosition;
  } else if (nearestEnemy) {
    // Нет цели маршрута, но есть враг - идем к нему
    targetPosition = nearestEnemy.position;
    updatedUnit.targetPosition = nearestEnemy.position;
  } else if (nearestEnemyBuilding) {
    // Нет цели маршрута и врагов, но есть здание - идем к нему
    targetPosition = nearestEnemyBuilding.position;
    updatedUnit.targetPosition = nearestEnemyBuilding.position;
  } else {
    // Нет целей, ищем новую
    const newTarget = getNextTarget(
      unit.playerId,
      unit.position,
      allEnemyBuildings,
      800,
      unit.barrackIndex
    );
    targetPosition = newTarget;
    updatedUnit.targetPosition = newTarget;
  }

  // Движемся к целевой позиции
  if (targetPosition) {
    const distanceToTarget = getDistance(unit.position, targetPosition);
    
    if (distanceToTarget > 0) {
      updatedUnit.isMoving = true;
      
      const dx = targetPosition.x - unit.position.x;
      const dy = targetPosition.y - unit.position.y;
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
    }
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

