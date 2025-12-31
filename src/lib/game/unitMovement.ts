/**
 * Модуль движения юнитов
 * Отвечает за логику перемещения юнитов к целям
 */

import { Unit, Building, Position } from "@/types/game";
import { moveUnit, getDistance, lineCrossesImpassable, getNextTarget, GAME_CONFIG } from "../gameLogic";
import { findTargets, canAttackTarget, getOptimalAttackDistance } from "./unitTargeting";
import { COMBAT_CONSTANTS } from "./constants";

export interface MovementContext {
  unit: Unit;
  allUnits: Unit[];
  allEnemyBuildings: Building[];
  deltaTime: number;
  now: number;
}

/**
 * Обрабатывает промежуточные цели юнита
 */
function handleIntermediateTargets(
  unit: Unit,
  allEnemyBuildings: Building[],
  deltaTime: number
): Unit | null {
  if (
    !unit.intermediateTargets ||
    unit.currentIntermediateIndex === undefined ||
    unit.currentIntermediateIndex >= unit.intermediateTargets.length
  ) {
    return null;
  }

  const currentTarget = unit.intermediateTargets[unit.currentIntermediateIndex];

  // Восстанавливаем targetPosition если нужно
  if (
    !unit.targetPosition ||
    unit.targetPosition.x !== currentTarget.x ||
    unit.targetPosition.y !== currentTarget.y
  ) {
    return {
      ...unit,
      targetPosition: currentTarget,
    };
  }

  return null;
}

/**
 * Обрабатывает атаку врага при наличии промежуточных целей
 */
function handleEnemyAttackWithIntermediate(
  unit: Unit,
  enemyUnit: Unit | null,
  enemyBuilding: Building | null,
  allEnemyBuildings: Building[],
  deltaTime: number
): Unit | null {
  const currentTarget = unit.intermediateTargets![unit.currentIntermediateIndex!];

  // Проверяем здание в промежуточной цели
  const buildingAtTarget = allEnemyBuildings.find((b) => {
    const dist = getDistance(b.position, currentTarget);
    return dist < COMBAT_CONSTANTS.BUILDING_TARGET_DISTANCE;
  });

  const distanceToTarget = getDistance(unit.position, currentTarget);

  // Если есть враг для атаки
  if (enemyUnit || enemyBuilding) {
    if (buildingAtTarget && distanceToTarget <= unit.attackRange) {
      if (!lineCrossesImpassable(unit.position, buildingAtTarget.position)) {
        // Останавливаемся для атаки, но сохраняем targetPosition
        return {
          ...unit,
          isMoving: false,
          targetPosition: currentTarget,
        };
      }
      // Ландшафт блокирует - пытаемся подойти ближе
      return moveUnit(unit, deltaTime);
    }
  }

  // Переключение на следующую промежуточную цель, если достигли текущую
  // Проверяем либо расстояние меньше радиуса атаки, либо очень близко к цели
  if (!buildingAtTarget && (distanceToTarget <= unit.attackRange || distanceToTarget <= COMBAT_CONSTANTS.INTERMEDIATE_TARGET_REACHED_THRESHOLD)) {
    const nextIndex = unit.currentIntermediateIndex! + 1;
    if (nextIndex < unit.intermediateTargets!.length) {
      return {
        ...unit,
        targetPosition: unit.intermediateTargets![nextIndex],
        currentIntermediateIndex: nextIndex,
        isMoving: true,
      };
    }
    // Все промежуточные цели достигнуты - переходим к финальной
    if (unit.finalTarget) {
      // Проверяем, есть ли живые здания у финальной цели
      const finalTargetBuildings = allEnemyBuildings.find((b) => {
        const dist = getDistance(b.position, unit.finalTarget!);
        return dist < COMBAT_CONSTANTS.BUILDING_TARGET_DISTANCE;
      });

      if (finalTargetBuildings) {
        // Финальная цель существует - идем к ней
        return {
          ...unit,
          targetPosition: unit.finalTarget,
          currentIntermediateIndex: undefined,
          hasReachedIntermediate: true,
          isMoving: true,
        };
      } else {
        // Финальная цель уничтожена - находим новую цель
        const nextTarget = getNextTarget(
          unit.playerId,
          unit.finalTarget,
          allEnemyBuildings,
          GAME_CONFIG.mapSize,
          unit.barrackIndex
        );
        return {
          ...unit,
          targetPosition: nextTarget,
          intermediateTargets: undefined,
          currentIntermediateIndex: undefined,
          finalTarget: undefined,
          hasReachedIntermediate: false,
          isMoving: true,
        };
      }
    }
  }

  // Если достигли промежуточную цель (очень близко), но нет зданий для атаки - переключаемся
  if (distanceToTarget <= COMBAT_CONSTANTS.INTERMEDIATE_TARGET_REACHED_THRESHOLD && !buildingAtTarget) {
    const nextIndex = unit.currentIntermediateIndex! + 1;
    if (nextIndex < unit.intermediateTargets!.length) {
      return {
        ...unit,
        targetPosition: unit.intermediateTargets![nextIndex],
        currentIntermediateIndex: nextIndex,
        isMoving: true,
      };
    }
    // Все промежуточные цели достигнуты - переходим к финальной
    if (unit.finalTarget) {
      // Проверяем, есть ли живые здания у финальной цели
      const finalTargetBuildings = allEnemyBuildings.find((b) => {
        const dist = getDistance(b.position, unit.finalTarget!);
        return dist < COMBAT_CONSTANTS.BUILDING_TARGET_DISTANCE;
      });

      if (finalTargetBuildings) {
        // Финальная цель существует - идем к ней
        return {
          ...unit,
          targetPosition: unit.finalTarget,
          currentIntermediateIndex: undefined,
          hasReachedIntermediate: true,
          isMoving: true,
        };
      } else {
        // Финальная цель уничтожена - находим новую цель
        const nextTarget = getNextTarget(
          unit.playerId,
          unit.finalTarget,
          allEnemyBuildings,
          GAME_CONFIG.mapSize,
          unit.barrackIndex
        );
        return {
          ...unit,
          targetPosition: nextTarget,
          intermediateTargets: undefined,
          currentIntermediateIndex: undefined,
          finalTarget: undefined,
          hasReachedIntermediate: false,
          isMoving: true,
        };
      }
    }
  }

  // Атака врага в радиусе
  if (enemyUnit) {
    const distance = getDistance(unit.position, enemyUnit.position);
    if (distance <= unit.attackRange) {
      const optimalDistance = getOptimalAttackDistance(unit);
      const isRanged = unit.attackRange > COMBAT_CONSTANTS.RANGED_THRESHOLD;

      if (distance > optimalDistance) {
        return moveUnit(unit, deltaTime);
      }

      if (isRanged || distance <= COMBAT_CONSTANTS.MELEE_DISTANCE) {
        // Останавливаемся для атаки, но сохраняем targetPosition на позицию врага
        return {
          ...unit,
          isMoving: false,
          targetPosition: enemyUnit.position,
        };
      }

      return moveUnit(unit, deltaTime);
    }
  }

  return null;
}

/**
 * Обрабатывает движение к врагу-юниту
 */
function handleEnemyUnitMovement(
  unit: Unit,
  enemyUnit: Unit,
  deltaTime: number
): Unit {
  const distance = getDistance(unit.position, enemyUnit.position);
  const isRanged = unit.attackRange > COMBAT_CONSTANTS.RANGED_THRESHOLD;
  const effectiveRange = isRanged
    ? unit.attackRange
    : COMBAT_CONSTANTS.MELEE_DISTANCE;

  // Если враг в радиусе эффективной атаки
  if (distance <= effectiveRange) {
    const optimalDistance = getOptimalAttackDistance(unit);

    if (isRanged) {
      if (distance > optimalDistance) {
        // Подходим ближе к оптимальной дистанции
        return moveUnit(
          {
            ...unit,
            targetPosition: enemyUnit.position,
            isMoving: true,
          },
          deltaTime
        );
      }
      // На оптимальной дистанции - останавливаемся для атаки
      // НО сохраняем targetPosition для продолжения движения, если враг уйдет
      return {
        ...unit,
        isMoving: false,
        targetPosition: enemyUnit.position, // Обновляем targetPosition на позицию врага
      };
    } else {
      // Ближний бой
      if (distance > COMBAT_CONSTANTS.MELEE_DISTANCE) {
        // Еще не достигли дистанции ближнего боя - продолжаем движение
        return moveUnit(
          {
            ...unit,
            targetPosition: enemyUnit.position,
            isMoving: true,
          },
          deltaTime
        );
      }
      // На дистанции ближнего боя - останавливаемся для атаки
      // НО сохраняем targetPosition для продолжения движения, если враг уйдет
      return {
        ...unit,
        isMoving: false,
        targetPosition: enemyUnit.position, // Обновляем targetPosition на позицию врага
      };
    }
  }

  // Враг вне радиуса атаки - двигаемся к нему
  return moveUnit(
    {
      ...unit,
      targetPosition: enemyUnit.position,
      isMoving: true,
    },
    deltaTime
  );
}

/**
 * Обрабатывает движение к зданию
 */
function handleEnemyBuildingMovement(
  unit: Unit,
  enemyBuilding: Building,
  deltaTime: number
): Unit {
  const distance = getDistance(unit.position, enemyBuilding.position);

  if (distance <= unit.attackRange) {
    if (!lineCrossesImpassable(unit.position, enemyBuilding.position)) {
      // В радиусе атаки и можем атаковать - останавливаемся
      // Но сохраняем targetPosition на случай, если здание будет разрушено
      return {
        ...unit,
        isMoving: false,
        targetPosition: enemyBuilding.position,
      };
    }
    // Ландшафт блокирует - пытаемся подойти ближе
    return moveUnit(
      {
        ...unit,
        targetPosition: enemyBuilding.position,
        isMoving: true,
      },
      deltaTime
    );
  }

  // Двигаемся к зданию
  return moveUnit(
    {
      ...unit,
      targetPosition: enemyBuilding.position,
      isMoving: true,
    },
    deltaTime
  );
}

/**
 * Обрабатывает поиск новой цели
 */
function handleNewTarget(
  unit: Unit,
  allEnemyBuildings: Building[],
  deltaTime: number
): Unit {
  if (unit.targetPosition) {
    const buildingAtTarget = allEnemyBuildings.find((b) => {
      const dist = getDistance(b.position, unit.targetPosition!);
      return dist < COMBAT_CONSTANTS.BUILDING_TARGET_DISTANCE;
    });

    if (buildingAtTarget) {
      // Цель еще существует - продолжаем движение
      return moveUnit(
        {
          ...unit,
          isMoving: true, // Убеждаемся, что движение включено
        },
        deltaTime
      );
    }

    // Цель разрушена или это промежуточная точка без здания - находим новую
    // Если есть финальная цель, используем её для определения следующей цели
    const referenceTarget = unit.finalTarget || unit.targetPosition;
    const nextTarget = getNextTarget(
      unit.playerId,
      referenceTarget,
      allEnemyBuildings,
      GAME_CONFIG.mapSize,
      unit.barrackIndex
    );
    return moveUnit(
      {
        ...unit,
        targetPosition: nextTarget,
        intermediateTargets: undefined,
        currentIntermediateIndex: undefined,
        finalTarget: undefined,
        hasReachedIntermediate: false,
        isMoving: true, // Убеждаемся, что движение включено
      },
      deltaTime
    );
  }

  // Нет цели - находим новую
  const nextTarget = getNextTarget(
    unit.playerId,
    undefined,
    allEnemyBuildings,
    GAME_CONFIG.mapSize,
    unit.barrackIndex
  );
  return moveUnit(
    {
      ...unit,
      targetPosition: nextTarget,
      intermediateTargets: undefined,
      currentIntermediateIndex: undefined,
      finalTarget: undefined,
      hasReachedIntermediate: false,
      isMoving: true, // Убеждаемся, что движение включено
    },
    deltaTime
  );
}

/**
 * Сбрасывает флаг атаки через определенное время
 */
export function resetAttackFlag(unit: Unit, now: number): Unit {
  if (
    unit.isAttacking &&
    unit.lastAttackTime &&
    now - unit.lastAttackTime > COMBAT_CONSTANTS.ATTACK_ANIMATION_DURATION
  ) {
    return {
      ...unit,
      isAttacking: false,
      attackTarget: undefined,
    };
  }
  return unit;
}

/**
 * Проверяет, есть ли враги в радиусе атаки
 */
function hasEnemiesInRange(
  unit: Unit,
  targets: ReturnType<typeof findTargets>
): boolean {
  if (!targets.enemyUnit && !targets.enemyBuilding) {
    return false;
  }

  const isRanged = unit.attackRange > COMBAT_CONSTANTS.RANGED_THRESHOLD;
  const effectiveRange = isRanged
    ? unit.attackRange
    : COMBAT_CONSTANTS.MELEE_DISTANCE;

  if (targets.enemyUnit && targets.distanceToUnit <= effectiveRange) {
    return true;
  }

  if (
    targets.enemyBuilding &&
    targets.distanceToBuilding <= unit.attackRange
  ) {
    return true;
  }

  return false;
}

/**
 * Основная функция обработки движения юнита
 */
export function processUnitMovement(context: MovementContext): Unit {
  const { unit, allUnits, allEnemyBuildings, deltaTime, now } = context;

  if (unit.health <= 0) return unit;

  let updatedUnit = resetAttackFlag(unit, now);

  // Обработка промежуточных целей
  const intermediateResult = handleIntermediateTargets(
    updatedUnit,
    allEnemyBuildings,
    deltaTime
  );
  if (intermediateResult) {
    updatedUnit = intermediateResult;
  }

  const hasIntermediateTargets =
    updatedUnit.intermediateTargets &&
    updatedUnit.currentIntermediateIndex !== undefined &&
    updatedUnit.currentIntermediateIndex < updatedUnit.intermediateTargets.length;

  // Поиск целей
  const targets = findTargets(updatedUnit, allUnits, allEnemyBuildings);

  // ВАЖНО: Если юнит остановился, но нет врагов в радиусе атаки - возобновляем движение
  if (!updatedUnit.isMoving && !hasEnemiesInRange(updatedUnit, targets)) {
    // Если есть промежуточные цели, проверяем, достиг ли юнит текущую промежуточную цель
    if (hasIntermediateTargets && updatedUnit.intermediateTargets) {
      const currentIntermediate = updatedUnit.intermediateTargets[updatedUnit.currentIntermediateIndex!];
      const distanceToIntermediate = getDistance(updatedUnit.position, currentIntermediate);
      
      // Если достиг промежуточную цель и нет зданий для атаки - переключаемся
      if (distanceToIntermediate <= COMBAT_CONSTANTS.INTERMEDIATE_TARGET_REACHED_THRESHOLD) {
        const buildingAtIntermediate = allEnemyBuildings.find((b) => {
          const dist = getDistance(b.position, currentIntermediate);
          return dist < COMBAT_CONSTANTS.BUILDING_TARGET_DISTANCE;
        });
        
        if (!buildingAtIntermediate) {
          // Достигли промежуточную цель, но нет зданий - переключаемся на следующую
          const nextIndex = updatedUnit.currentIntermediateIndex! + 1;
          if (nextIndex < updatedUnit.intermediateTargets.length) {
            updatedUnit = {
              ...updatedUnit,
              targetPosition: updatedUnit.intermediateTargets[nextIndex],
              currentIntermediateIndex: nextIndex,
              isMoving: true,
            };
          } else if (updatedUnit.finalTarget) {
            // Все промежуточные цели достигнуты - идем к финальной
            updatedUnit = {
              ...updatedUnit,
              targetPosition: updatedUnit.finalTarget,
              currentIntermediateIndex: undefined,
              hasReachedIntermediate: true,
              isMoving: true,
            };
          }
        } else {
          // Есть здание - продолжаем движение к нему
          updatedUnit = {
            ...updatedUnit,
            isMoving: true,
          };
        }
      } else {
        // Еще не достиг промежуточную цель - продолжаем движение
        updatedUnit = {
          ...updatedUnit,
          isMoving: true,
        };
      }
    } else {
      // Нет промежуточных целей - просто возобновляем движение
      updatedUnit = {
        ...updatedUnit,
        isMoving: true,
      };
    }
  }

  // Если есть промежуточные цели
  if (hasIntermediateTargets) {
    const result = handleEnemyAttackWithIntermediate(
      updatedUnit,
      targets.enemyUnit,
      targets.enemyBuilding,
      allEnemyBuildings,
      deltaTime
    );
    if (result) {
      return result;
    }

    // Проверяем, уничтожена ли финальная цель, пока движемся к промежуточной
    if (updatedUnit.finalTarget) {
      const finalTargetBuildings = allEnemyBuildings.find((b) => {
        const dist = getDistance(b.position, updatedUnit.finalTarget!);
        return dist < COMBAT_CONSTANTS.BUILDING_TARGET_DISTANCE;
      });

      if (!finalTargetBuildings) {
        // Финальная цель уничтожена - находим новую цель
        const nextTarget = getNextTarget(
          updatedUnit.playerId,
          updatedUnit.finalTarget,
          allEnemyBuildings,
          GAME_CONFIG.mapSize,
          updatedUnit.barrackIndex
        );
        return moveUnit(
          {
            ...updatedUnit,
            targetPosition: nextTarget,
            intermediateTargets: undefined,
            currentIntermediateIndex: undefined,
            finalTarget: undefined,
            hasReachedIntermediate: false,
            isMoving: true,
          },
          deltaTime
        );
      }
    }

    // Продолжаем движение к промежуточной цели
    let movedUnit = moveUnit(updatedUnit, deltaTime);

    // Проверка преждевременного переключения промежуточных целей
    if (
      movedUnit.currentIntermediateIndex !== undefined &&
      movedUnit.currentIntermediateIndex > updatedUnit.currentIntermediateIndex! &&
      updatedUnit.currentIntermediateIndex !== undefined
    ) {
      const prevIndex = updatedUnit.currentIntermediateIndex;
      const prevTarget = updatedUnit.intermediateTargets![prevIndex];
      const buildingAtPrev = allEnemyBuildings.find((b) => {
        const dist = getDistance(b.position, prevTarget);
        return dist < COMBAT_CONSTANTS.BUILDING_TARGET_DISTANCE;
      });

      if (buildingAtPrev) {
        const distToPrev = getDistance(movedUnit.position, prevTarget);
        if (distToPrev <= movedUnit.attackRange) {
          return {
            ...movedUnit,
            targetPosition: prevTarget,
            currentIntermediateIndex: prevIndex,
          };
        }
      }
    }

    return movedUnit;
  }

  // Приоритет атаке юнитов
  if (targets.enemyUnit) {
    return handleEnemyUnitMovement(updatedUnit, targets.enemyUnit, deltaTime);
  }

  // Атака зданий
  if (targets.enemyBuilding) {
    return handleEnemyBuildingMovement(
      updatedUnit,
      targets.enemyBuilding,
      deltaTime
    );
  }

  // Поиск новой цели
  return handleNewTarget(updatedUnit, allEnemyBuildings, deltaTime);
}

