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

  // Если юнит атакует, не двигаем его (стоит на месте во время боя)
  if (unit.isAttacking || unit.attackTarget) {
    return { ...unit, isMoving: false };
  }

  let updatedUnit = { ...unit };

  // 1) Определяем цель-преследование (стикнуть к врагу, пока кто-то не погибнет)
  const ENGAGE_DISTANCE = Math.max(200, unit.attackRange * 3); // радиус начала преследования

  // Если уже есть выбранная цель (по ID), пытаемся её поддерживать
  let chaseEnemy: Unit | null = null;
  if (updatedUnit.target) {
    const existing = allUnits.find((u) => u.id === updatedUnit.target && u.health > 0) || null;
    chaseEnemy = existing;
    // Если текущая цель исчезла/умерла — сбрасываем
    if (!existing) {
      updatedUnit.target = undefined;
    }
  }

  // Если нет активной цели, пробуем захватить ближайшего врага в радиусе вовлечения
  if (!chaseEnemy) {
    const nearestEnemyTry = findNearestEnemy(unit, allUnits);
    if (nearestEnemyTry) {
      const dist = getDistance(unit.position, nearestEnemyTry.position);
      if (dist <= ENGAGE_DISTANCE) {
        chaseEnemy = nearestEnemyTry;
        updatedUnit.target = nearestEnemyTry.id; // запоминаем цель для «прилипания»
      }
    }
  }

  // 2) Если мы НЕ преследуем врага, то обслуживаем прогресс по маршруту (чекпоинты)
  let targetReached = false;
  if (!chaseEnemy && unit.targetPosition) {
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
  // Приоритет: активная цель-враг (преследование) > ближайший враг > цель маршрута > вражеское здание > новая цель
  const nearestEnemy = findNearestEnemy(unit, allUnits);
  const nearestEnemyBuilding = findNearestEnemyBuilding(unit, allEnemyBuildings);
  
  // Определяем целевую позицию для движения
  let targetPosition: Position | null = null;
  
  if (chaseEnemy) {
    // Преследуем закреплённого врага
    targetPosition = chaseEnemy.position;
    updatedUnit.targetPosition = chaseEnemy.position;
  } else if (nearestEnemy) {
    // Нет закреплённой цели, но есть враг поблизости — идём к нему
    targetPosition = nearestEnemy.position;
    updatedUnit.targetPosition = nearestEnemy.position;
    updatedUnit.target = nearestEnemy.id;
  } else if (updatedUnit.targetPosition) {
    // Цель маршрута
    targetPosition = updatedUnit.targetPosition;
  } else if (nearestEnemyBuilding) {
    // Нет врагов, идём к зданию
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

