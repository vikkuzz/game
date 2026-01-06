/**
 * Модуль работы с юнитами
 */

import type { Unit, UnitType, Position, PlayerId, Player } from "@/types/game";
import { GAME_CONFIG } from "./config";
import { getDistance, isImpassable, lineCrossesImpassable } from "./positions";

/**
 * Создание юнита
 */
export function createUnit(
  type: UnitType,
  playerId: PlayerId,
  position: Position,
  targetData: { target: Position; intermediateTargets?: Position[] } | Position,
  upgrades: Player["upgrades"],
  barrackIndex?: number
): Unit {
  const baseStats = {
    warrior: {
      health: 100,
      attack: 20,
      defense: 10,
      speed: 30,
      attackRange: 50,
    },
    archer: { health: 60, attack: 25, defense: 5, speed: 35, attackRange: 180 },
    mage: { health: 50, attack: 30, defense: 3, speed: 25, attackRange: 100 },
  };

  const base = baseStats[type];
  const upgradeMultiplier = 1 + upgrades.attack * 0.1; // +10% за уровень
  const defenseMultiplier = 1 + upgrades.defense * 0.1;
  const healthMultiplier = 1 + upgrades.health * 0.15;

  // Поддержка старого и нового формата
  const targetInfo =
    "target" in targetData || !("x" in targetData)
      ? (targetData as { target: Position; intermediateTargets?: Position[] })
      : { target: targetData as Position };

  // Определяем начальную целевую позицию
  let initialTargetPosition: Position;
  let intermediateTargets: Position[] | undefined;
  let currentIntermediateIndex: number | undefined;
  let finalTarget: Position | undefined;

  if (
    targetInfo.intermediateTargets &&
    targetInfo.intermediateTargets.length > 0
  ) {
    // Есть промежуточные цели - начинаем с первой
    intermediateTargets = targetInfo.intermediateTargets;
    currentIntermediateIndex = 0;
    initialTargetPosition = intermediateTargets[0];
    finalTarget = targetInfo.target;
  } else {
    // Нет промежуточных целей - идем напрямую к цели
    initialTargetPosition = targetInfo.target;
    finalTarget = undefined;
  }

  return {
    id: `unit-${playerId}-${Date.now()}-${Math.random()}`,
    type,
    playerId,
    position: { ...position },
    targetPosition: initialTargetPosition,
    intermediateTargets,
    currentIntermediateIndex,
    finalTarget,
    hasReachedIntermediate: false,
    health: Math.floor(base.health * healthMultiplier),
    maxHealth: Math.floor(base.health * healthMultiplier),
    attack: Math.floor(base.attack * upgradeMultiplier),
    defense: Math.floor(base.defense * defenseMultiplier),
    speed: base.speed,
    attackRange: base.attackRange,
    isMoving: true,
    barrackIndex,
  };
}

/**
 * Нанесение урона юниту
 */
export function damageUnit(unit: Unit, damage: number): Unit {
  // Защита уменьшает урон: урон = базовый_урон - защита, минимум 1 урон
  const actualDamage = Math.max(1, Math.floor(damage - unit.defense));
  const newHealth = Math.max(0, unit.health - actualDamage);

  return {
    ...unit,
    health: newHealth,
  };
}

/**
 * Отталкивание юнитов друг от друга
 */
const UNIT_RADIUS = 12; // Радиус юнита (диаметр 24px)
const MIN_DISTANCE = UNIT_RADIUS * 2 + 4; // Минимальное расстояние между юнитами (слегка уменьшено для более мягкого эффекта)
const SEPARATION_SPEED = 110; // Скорость отталкивания (пикселей в секунду) - уменьшено, чтобы не было "разлёта"

export function separateUnits(
  unit: Unit,
  allUnits: Unit[],
  deltaTime: number
): Unit {
  let separationX = 0;
  let separationY = 0;
  let count = 0;

  allUnits.forEach((other) => {
    if (other.id === unit.id) return;

    const distance = getDistance(unit.position, other.position);
    if (distance < MIN_DISTANCE) {
      // Вычисляем вектор отталкивания
      let dx = unit.position.x - other.position.x;
      let dy = unit.position.y - other.position.y;
      
      // Если юниты в одной точке (distance = 0), используем случайное направление
      if (distance === 0 || (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1)) {
        // Генерируем случайное направление на основе ID юнита для детерминированности
        const hash = (unit.id.charCodeAt(0) + unit.id.charCodeAt(unit.id.length - 1)) % 360;
        const angle = (hash * Math.PI) / 180;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      }
      
      const normalizedDistance = Math.max(distance, 0.1); // Минимум 0.1 для избежания деления на ноль

      // Сила отталкивания зависит от близости (чем ближе, тем сильнее)
      // Для distance = 0 используем максимальную силу
      const separationForce = distance === 0 
        ? 1.8 // Максимальная сила для юнитов в одной точке (уменьшено)
        : Math.max(0.35, (MIN_DISTANCE - distance) / MIN_DISTANCE) * 1.1; // Мягче базовая сила отталкивания
      
      separationX += (dx / normalizedDistance) * separationForce;
      separationY += (dy / normalizedDistance) * separationForce;
      count++;
    }
  });

  if (count > 0 && (separationX !== 0 || separationY !== 0)) {
    // Нормализуем вектор
    const length = Math.sqrt(
      separationX * separationX + separationY * separationY
    );
    if (length > 0) {
      separationX /= length;
      separationY /= length;

      // Применяем отталкивание (скорость зависит от deltaTime)
      // Увеличиваем скорость для более быстрого разделения
      // Умножаем на силу отталкивания для более агрессивного разделения при скоплении
      const baseMoveDistance = (SEPARATION_SPEED * deltaTime) / 1000;
      // Если много юнитов рядом (count > 2), увеличиваем силу отталкивания
      const crowdMultiplier = count > 2 ? 1.2 : 1.0;
      const moveDistance = baseMoveDistance * crowdMultiplier;

      const newPosition = {
        x: unit.position.x + separationX * moveDistance,
        y: unit.position.y + separationY * moveDistance,
      };

      // Проверяем, не попадает ли новая позиция в непроходимую зону
      if (
        !isImpassable(newPosition) &&
        newPosition.x >= 0 &&
        newPosition.x < GAME_CONFIG.mapSize &&
        newPosition.y >= 0 &&
        newPosition.y < GAME_CONFIG.mapSize
      ) {
        return {
          ...unit,
          position: newPosition,
        };
      }

      // Если новая позиция в непроходимой зоне, пытаемся найти альтернативное направление
      const angles = [
        Math.atan2(separationY, separationX) + Math.PI / 2,
        Math.atan2(separationY, separationX) - Math.PI / 2,
        Math.atan2(separationY, separationX) + Math.PI,
      ];

      for (const angle of angles) {
        const tryPosition = {
          x: unit.position.x + Math.cos(angle) * moveDistance,
          y: unit.position.y + Math.sin(angle) * moveDistance,
        };

        if (
          !isImpassable(tryPosition) &&
          tryPosition.x >= 0 &&
          tryPosition.x < GAME_CONFIG.mapSize &&
          tryPosition.y >= 0 &&
          tryPosition.y < GAME_CONFIG.mapSize
        ) {
          return {
            ...unit,
            position: tryPosition,
          };
        }
      }

      // Если не можем найти безопасную позицию, остаемся на месте
      return unit;
    }
  }

  return unit;
}

