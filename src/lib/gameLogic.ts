/**
 * Игровая логика для Survival Chaos
 * 
 * Этот файл теперь служит точкой входа для обратной совместимости.
 * Основная логика разбита на модули в папке game/:
 * - config.ts - конфигурация игры
 * - positions.ts - работа с позициями
 * - buildings.ts - создание и работа со зданиями
 * - units.ts - создание и работа с юнитами
 * - player.ts - создание игроков
 * - spawning.ts - спавн юнитов
 */

// Реэкспорт конфигурации
export { GAME_CONFIG } from "./game/config";

// Реэкспорт функций для позиций
export {
  getPlayerPosition,
  getDistance,
  getCellCoordinates,
  isInSameCell,
  isImpassable,
  lineCrossesImpassable,
} from "./game/positions";

// Реэкспорт функций для зданий
export {
  createCastle,
  createBarracks,
  createTowers,
  damageBuilding,
} from "./game/buildings";

// Реэкспорт функций для юнитов
export {
  createUnit,
  damageUnit,
  separateUnits,
} from "./game/units";

// Реэкспорт функций для игроков
export {
  createPlayer,
  getNeighborPlayers,
} from "./game/player";

// Реэкспорт функций для спавна
export {
  getSpawnUnitType,
  getSpawnInterval,
} from "./game/spawning";

// Реэкспорт функций для путей юнитов
export {
  getUnitTarget,
  getNextTarget,
  getNextCircularTarget,
} from "./game/unitPaths";

// Реэкспорт функций для поиска целей
export {
  findNearestEnemy,
  findNearestEnemyBuilding,
  findNearestEnemyUnitForBuilding,
  findTargets,
} from "./game/unitTargeting";

// Импорты для оставшихся функций, которые еще не перенесены
import {
  Player,
  Building,
  Unit,
  Position,
  PlayerId,
  GameState,
  BuildingType,
  UnitType,
} from "@/types/game";
import { GAME_CONFIG } from "./game/config";
import { getPlayerPosition, getDistance, getCellCoordinates, isInSameCell, isImpassable, lineCrossesImpassable } from "./game/positions";
import { createCastle, createBarracks, createTowers, damageBuilding } from "./game/buildings";
import { createUnit, damageUnit, separateUnits } from "./game/units";
import { createPlayer, getNeighborPlayers } from "./game/player";
import { getSpawnUnitType, getSpawnInterval } from "./game/spawning";
// Импортируем функции для путей юнитов из модуля
// (реэкспортируются выше для обратной совместимости)

// Функции getSpawnUnitType, getSpawnInterval, createUnit, damageUnit, separateUnits
// теперь экспортируются из ./game/spawning и ./game/units
// Остальные функции, которые еще не перенесены:

// Функция createUnit теперь экспортируется из ./game/units

// Непроходимые зоны (координаты квадратов 80x80px)
const IMPASSABLE_ZONES = [
  { x: 80 * 2, y: 80 * 2 }, // C3
  { x: 80 * 3, y: 80 * 3 }, // D4
  { x: 80 * 6, y: 80 * 3 }, // G4
  { x: 80 * 7, y: 80 * 2 }, // H3
  { x: 80 * 2, y: 80 * 7 }, // C8
  { x: 80 * 3, y: 80 * 6 }, // D7
  { x: 80 * 6, y: 80 * 6 }, // G7
  { x: 80 * 7, y: 80 * 7 }, // H8
];
const CELL_SIZE = 80;

// Функции isImpassable, lineCrossesImpassable, getDistance теперь экспортируются из ./game/positions

// Движение юнита к цели с учетом непроходимых зон
export function moveUnit(unit: Unit, deltaTime: number): Unit {
  if (!unit.isMoving) return unit;

  // Если текущая позиция в непроходимой зоне, пытаемся выбраться
  if (isImpassable(unit.position)) {
    // Пытаемся сдвинуться в любую сторону
    const speed = (unit.speed * deltaTime) / 1000;
    const angles = [
      0,
      Math.PI / 2,
      Math.PI,
      -Math.PI / 2,
      Math.PI / 4,
      -Math.PI / 4,
      Math.PI * 0.75,
      -Math.PI * 0.75,
    ];
    for (const angle of angles) {
      const tryPosition = {
        x: unit.position.x + Math.cos(angle) * speed * 2,
        y: unit.position.y + Math.sin(angle) * speed * 2,
      };
      if (
        !isImpassable(tryPosition) &&
        tryPosition.x >= 0 &&
        tryPosition.x < GAME_CONFIG.mapSize &&
        tryPosition.y >= 0 &&
        tryPosition.y < GAME_CONFIG.mapSize
      ) {
        return { ...unit, position: tryPosition };
      }
    }
  }

  // Проверяем, есть ли промежуточные цели и достигли ли мы текущую
  if (
    unit.intermediateTargets &&
    unit.currentIntermediateIndex !== undefined &&
    unit.currentIntermediateIndex < unit.intermediateTargets.length
  ) {
    const currentIntermediateTarget =
      unit.intermediateTargets[unit.currentIntermediateIndex];
    const intermediateDistance = getDistance(
      unit.position,
      currentIntermediateTarget
    );
    const speed = (unit.speed * deltaTime) / 1000;

    // Проверяем, прошел ли юнит через контрольную точку
    // Если расстояние было минимальным (близко к центру) и теперь увеличивается, значит прошел через точку
    const PASS_THROUGH_THRESHOLD = 30; // Минимальное расстояние для прохождения через точку
    const hasPassedThrough =
      unit.lastIntermediateDistance !== undefined &&
      unit.lastIntermediateDistance <= PASS_THROUGH_THRESHOLD &&
      intermediateDistance > unit.lastIntermediateDistance &&
      intermediateDistance > PASS_THROUGH_THRESHOLD; // Убеждаемся, что действительно прошли дальше

    if (hasPassedThrough) {
      // Прошли через контрольную точку - переключаемся на следующую цель
      const nextIndex = unit.currentIntermediateIndex + 1;

      if (nextIndex < unit.intermediateTargets.length) {
        // Есть еще промежуточные цели - переключаемся на следующую
        return {
          ...unit,
          targetPosition: unit.intermediateTargets[nextIndex],
          currentIntermediateIndex: nextIndex,
          lastIntermediateDistance: undefined, // Сбрасываем для следующей цели
        };
      } else {
        // Все промежуточные цели достигнуты - переключаемся на финальную
        if (unit.finalTarget) {
          return {
            ...unit,
            targetPosition: unit.finalTarget,
            currentIntermediateIndex: undefined,
            hasReachedIntermediate: true,
            lastIntermediateDistance: undefined,
          };
        }
        // Если нет финальной цели, останавливаемся
        return {
          ...unit,
          currentIntermediateIndex: undefined,
          hasReachedIntermediate: true,
          isMoving: false,
          lastIntermediateDistance: undefined,
        };
      }
    }

    // Сохраняем текущее расстояние для следующей проверки
    const updatedUnit = {
      ...unit,
      lastIntermediateDistance: intermediateDistance,
    };

    // Продолжаем движение к текущей промежуточной цели
    const dx = currentIntermediateTarget.x - updatedUnit.position.x;
    const dy = currentIntermediateTarget.y - updatedUnit.position.y;
    const angle = Math.atan2(dy, dx);

    const newPosition = {
      x: updatedUnit.position.x + Math.cos(angle) * speed,
      y: updatedUnit.position.y + Math.sin(angle) * speed,
    };

    // Проверяем весь путь движения на непроходимые зоны
    if (lineCrossesImpassable(updatedUnit.position, newPosition, 50)) {
      // Путь блокирован, пытаемся обойти препятствие
      // Пробуем несколько углов обхода
      const angles = [
        angle + Math.PI / 2, // Перпендикулярно влево
        angle - Math.PI / 2, // Перпендикулярно вправо
        angle + Math.PI / 4, // Диагональ влево
        angle - Math.PI / 4, // Диагональ вправо
      ];

      for (const tryAngle of angles) {
        const tryPosition = {
          x: updatedUnit.position.x + Math.cos(tryAngle) * speed,
          y: updatedUnit.position.y + Math.sin(tryAngle) * speed,
        };

        // Проверяем, что позиция в пределах карты
        if (
          tryPosition.x < 0 ||
          tryPosition.x >= GAME_CONFIG.mapSize ||
          tryPosition.y < 0 ||
          tryPosition.y >= GAME_CONFIG.mapSize
        ) {
          continue;
        }

        // Проверяем, что путь не пересекает препятствия
        if (
          !lineCrossesImpassable(updatedUnit.position, tryPosition, 50) &&
          !isImpassable(tryPosition)
        ) {
          return { ...updatedUnit, position: tryPosition };
        }
      }

      // Не можем двигаться, останавливаемся
      return { ...updatedUnit, isMoving: false };
    }

    // Проверяем конечную позицию
    if (isImpassable(newPosition)) {
      // Конечная позиция в непроходимой зоне, пытаемся обойти
      const angles = [
        angle + Math.PI / 2,
        angle - Math.PI / 2,
        angle + Math.PI / 4,
        angle - Math.PI / 4,
      ];

      for (const tryAngle of angles) {
        const tryPosition = {
          x: updatedUnit.position.x + Math.cos(tryAngle) * speed,
          y: updatedUnit.position.y + Math.sin(tryAngle) * speed,
        };

        if (
          tryPosition.x < 0 ||
          tryPosition.x >= GAME_CONFIG.mapSize ||
          tryPosition.y < 0 ||
          tryPosition.y >= GAME_CONFIG.mapSize
        ) {
          continue;
        }

        if (
          !lineCrossesImpassable(updatedUnit.position, tryPosition, 50) &&
          !isImpassable(tryPosition)
        ) {
          return { ...updatedUnit, position: tryPosition };
        }
      }

      return { ...updatedUnit, isMoving: false };
    }

    return { ...updatedUnit, position: newPosition };
  }

  if (!unit.targetPosition) return unit;

  const distance = getDistance(unit.position, unit.targetPosition);
  const speed = (unit.speed * deltaTime) / 1000; // Конвертируем в пиксели за кадр

  if (distance <= speed) {
    // Проверяем, не находится ли цель в непроходимой зоне
    if (isImpassable(unit.targetPosition)) {
      // Цель в непроходимой зоне, останавливаемся
      return {
        ...unit,
        isMoving: false,
      };
    }
    // Достигли цели
    return {
      ...unit,
      position: { ...unit.targetPosition },
      isMoving: false,
    };
  }

  // Движение к цели
  const dx = unit.targetPosition.x - unit.position.x;
  const dy = unit.targetPosition.y - unit.position.y;
  const angle = Math.atan2(dy, dx);

  const newPosition = {
    x: unit.position.x + Math.cos(angle) * speed,
    y: unit.position.y + Math.sin(angle) * speed,
  };

  // Проверяем весь путь движения на непроходимые зоны (увеличиваем количество проверок)
  if (lineCrossesImpassable(unit.position, newPosition, 50)) {
    // Путь блокирован, пытаемся обойти препятствие
    // Пробуем несколько углов обхода
    const angles = [
      angle + Math.PI / 2, // Перпендикулярно влево
      angle - Math.PI / 2, // Перпендикулярно вправо
      angle + Math.PI / 4, // Диагональ влево
      angle - Math.PI / 4, // Диагональ вправо
    ];

    for (const tryAngle of angles) {
      const tryPosition = {
        x: unit.position.x + Math.cos(tryAngle) * speed,
        y: unit.position.y + Math.sin(tryAngle) * speed,
      };

      // Проверяем, что позиция в пределах карты
      if (
        tryPosition.x < 0 ||
        tryPosition.x >= GAME_CONFIG.mapSize ||
        tryPosition.y < 0 ||
        tryPosition.y >= GAME_CONFIG.mapSize
      ) {
        continue;
      }

      // Проверяем, что путь не пересекает препятствия
      if (
        !lineCrossesImpassable(unit.position, tryPosition, 50) &&
        !isImpassable(tryPosition)
      ) {
        return { ...unit, position: tryPosition };
      }
    }

    // Не можем двигаться, останавливаемся
    return { ...unit, isMoving: false };
  }

  // Проверяем конечную позицию
  if (isImpassable(newPosition)) {
    // Конечная позиция в непроходимой зоне, пытаемся обойти
    const angles = [
      angle + Math.PI / 2,
      angle - Math.PI / 2,
      angle + Math.PI / 4,
      angle - Math.PI / 4,
    ];

    for (const tryAngle of angles) {
      const tryPosition = {
        x: unit.position.x + Math.cos(tryAngle) * speed,
        y: unit.position.y + Math.sin(tryAngle) * speed,
      };

      if (
        tryPosition.x < 0 ||
        tryPosition.x >= GAME_CONFIG.mapSize ||
        tryPosition.y < 0 ||
        tryPosition.y >= GAME_CONFIG.mapSize
      ) {
        continue;
      }

      if (
        !lineCrossesImpassable(unit.position, tryPosition, 50) &&
        !isImpassable(tryPosition)
      ) {
        return {
          ...unit,
          position: tryPosition,
        };
      }
    }

    // Не можем двигаться, останавливаемся
    return {
      ...unit,
      isMoving: false,
    };
  }

  return {
    ...unit,
    position: newPosition,
  };
}

// Функция damageUnit теперь экспортируется из ./game/units

// Функция separateUnits теперь экспортируется из ./game/units

// Поиск ближайшего вражеского юнита
// Функции findNearestEnemy, findNearestEnemyBuilding, findNearestEnemyUnitForBuilding
// теперь экспортируются из ./game/unitTargeting

// Функции getCellCoordinates, isInSameCell теперь экспортируются из ./game/positions

/**
 * Проверяет, есть ли вражеские юниты в клетке барака
 */
export function hasEnemyInBarrackCell(
  barrack: Building,
  allUnits: Unit[]
): boolean {
  const enemyUnits = allUnits.filter(
    (u) => u.playerId !== barrack.playerId && u.health > 0
  );

  return enemyUnits.some((unit) => isInSameCell(barrack.position, unit.position));
}

/**
 * Проверяет, есть ли союзные воины в клетке барака
 */
export function hasAllyWarriorInBarrackCell(
  barrack: Building,
  allUnits: Unit[]
): boolean {
  const allyWarriors = allUnits.filter(
    (u) => u.playerId === barrack.playerId && u.type === "warrior" && u.health > 0
  );

  return allyWarriors.some((warrior) =>
    isInSameCell(barrack.position, warrior.position)
  );
}

// Функция damageBuilding теперь экспортируется из ./game/buildings
