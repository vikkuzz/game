/**
 * Модуль для работы с путями и целями юнитов
 * Отвечает за определение маршрутов движения юнитов из бараков
 */

import type { Position, PlayerId, Building } from "@/types/game";
import { getPlayerPosition, getDistance } from "./positions";

// Константы для промежуточных точек маршрута
const CELL_SIZE = 80;
const CELL_CENTER_OFFSET = 40;

/**
 * Промежуточные точки маршрута (центры клеток)
 */
export const INTERMEDIATE_POINTS = {
  B2: { x: CELL_SIZE * 1 + CELL_CENTER_OFFSET, y: CELL_SIZE * 1 + CELL_CENTER_OFFSET },
  I2: { x: CELL_SIZE * 8 + CELL_CENTER_OFFSET, y: CELL_SIZE * 1 + CELL_CENTER_OFFSET },
  B9: { x: CELL_SIZE * 1 + CELL_CENTER_OFFSET, y: CELL_SIZE * 8 + CELL_CENTER_OFFSET },
  I9: { x: CELL_SIZE * 8 + CELL_CENTER_OFFSET, y: CELL_SIZE * 8 + CELL_CENTER_OFFSET },
  H9: { x: CELL_SIZE * 7 + CELL_CENTER_OFFSET, y: CELL_SIZE * 8 + CELL_CENTER_OFFSET },
  I8: { x: CELL_SIZE * 8 + CELL_CENTER_OFFSET, y: CELL_SIZE * 7 + CELL_CENTER_OFFSET },
  I7: { x: CELL_SIZE * 8 + CELL_CENTER_OFFSET, y: CELL_SIZE * 6 + CELL_CENTER_OFFSET },
} as const;

/**
 * Маппинг игрок-барак -> промежуточная точка
 */
const INTERMEDIATE_TARGET_MAP: Record<string, Position> = {
  "0-1": INTERMEDIATE_POINTS.B2,  // Игрок 0, левый барак → B2
  "0-2": INTERMEDIATE_POINTS.I2,  // Игрок 0, правый барак → I2
  "1-1": INTERMEDIATE_POINTS.I2,  // Игрок 1, верхний барак → I2
  "1-2": INTERMEDIATE_POINTS.I9,  // Игрок 1, нижний барак → I9
  "2-1": INTERMEDIATE_POINTS.I9,  // Игрок 2, правый барак → I9
  "2-2": INTERMEDIATE_POINTS.B9,  // Игрок 2, левый барак → B9
  "3-1": INTERMEDIATE_POINTS.B9,  // Игрок 3, нижний барак → B9
  "3-2": INTERMEDIATE_POINTS.B2,  // Игрок 3, верхний барак → B2
};

/**
 * Получает промежуточную точку для игрока и барака
 */
function getIntermediatePoint(playerId: PlayerId, barrackIndex: number): Position | undefined {
  const key = `${playerId}-${barrackIndex}`;
  return INTERMEDIATE_TARGET_MAP[key];
}

/**
 * Получает соседнего игрока для бокового барака
 */
function getNeighborForBarrack(playerId: PlayerId, barrackIndex: number): PlayerId {
  // Барак 1 идет к соседу слева (против часовой), барак 2 к соседу справа (по часовой)
  return barrackIndex === 1
    ? (((playerId - 1 + 4) % 4) as PlayerId)
    : (((playerId + 1) % 4) as PlayerId);
}

/**
 * Получает игрока напротив
 */
function getOppositePlayer(playerId: PlayerId): PlayerId {
  return ((playerId + 2) % 4) as PlayerId;
}

/**
 * Получение целевой позиции для юнита из барака
 */
export function getUnitTarget(
  playerId: PlayerId,
  barrackIndex: number,
  mapSize: number
): { target: Position; intermediateTargets?: Position[] } {
  const center = { x: mapSize / 2, y: mapSize / 2 };

  if (barrackIndex === 0) {
    // Центральный барак - сначала в центр карты, потом к противнику напротив
    const oppositePlayerId = getOppositePlayer(playerId);
    const oppositeTarget = getPlayerPosition(oppositePlayerId, mapSize);
    return {
      target: oppositeTarget,
      intermediateTargets: [center],
    };
  }

  // Боковые бараки (1 и 2) - к соседним игрокам
  const targetNeighbor = getNeighborForBarrack(playerId, barrackIndex);
  const finalTarget = getPlayerPosition(targetNeighbor, mapSize);
  const intermediatePoint = getIntermediatePoint(playerId, barrackIndex);

  return intermediatePoint
    ? { target: finalTarget, intermediateTargets: [intermediatePoint] }
    : { target: finalTarget };
}

/**
 * Получение следующей цели для юнита из бокового барака по кругу
 */
export function getNextCircularTarget(
  playerId: PlayerId,
  barrackIndex: number,
  currentTarget: Position | undefined,
  allEnemyBuildings: Building[],
  mapSize: number
): Position {
  const center = { x: mapSize / 2, y: mapSize / 2 };

  if (!currentTarget) {
    // Если нет текущей цели, устанавливаем начальную цель
    const targetNeighbor = getNeighborForBarrack(playerId, barrackIndex);
    const neighborBuildings = allEnemyBuildings.filter(
      (b) => b.playerId === targetNeighbor
    );
    
    if (neighborBuildings.length > 0) {
      return getPlayerPosition(targetNeighbor, mapSize);
    }
    
    // Если сосед уничтожен, идем дальше по кругу
    const nextPlayer = barrackIndex === 1
      ? (((targetNeighbor - 1 + 4) % 4) as PlayerId)
      : (((targetNeighbor + 1) % 4) as PlayerId);
      
    if (nextPlayer !== playerId) {
      return getPlayerPosition(nextPlayer, mapSize);
    }
    
    return center;
  }

  // Определяем, какой игрок был целью
  const distances = [0, 1, 2, 3].map((id) =>
    getDistance(currentTarget, getPlayerPosition(id as PlayerId, mapSize))
  );
  const minDistIndex = distances.indexOf(Math.min(...distances));
  const targetPlayerId = minDistIndex as PlayerId;

  // Проверяем, есть ли живые здания у этого игрока
  const targetPlayerBuildings = allEnemyBuildings.filter(
    (b) => b.playerId === targetPlayerId
  );

  if (targetPlayerBuildings.length > 0) {
    // Находим ближайшее здание
    let nearest: Building | null = null;
    let minDistance = Infinity;
    
    for (const building of targetPlayerBuildings) {
      const distance = getDistance(currentTarget, building.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = building;
      }
    }
    
    if (nearest) {
      return nearest.position;
    }
  }

  // Специальная логика для боковых игроков, когда верхний уничтожен
  if (targetPlayerId === 0 && (playerId === 1 || playerId === 3)) {
    if (playerId === 1 && barrackIndex === 1) {
      const player3Buildings = allEnemyBuildings.filter(b => b.playerId === 3);
      if (player3Buildings.length > 0) {
        return getPlayerPosition(3, mapSize);
      }
      const player2Buildings = allEnemyBuildings.filter(b => b.playerId === 2);
      if (player2Buildings.length > 0) {
        return INTERMEDIATE_POINTS.I9;
      }
      return center;
    }
    
    if (playerId === 3 && barrackIndex === 2) {
      const player1Buildings = allEnemyBuildings.filter(b => b.playerId === 1);
      if (player1Buildings.length > 0) {
        return getPlayerPosition(1, mapSize);
      }
      const player2Buildings = allEnemyBuildings.filter(b => b.playerId === 2);
      if (player2Buildings.length > 0) {
        return INTERMEDIATE_POINTS.B9;
      }
      return center;
    }
  }

  // Обычная логика движения по кругу
  const direction = barrackIndex === 1 ? -1 : 1; // Против часовой или по часовой
  let nextPlayer = ((targetPlayerId + direction + 4) % 4) as PlayerId;
  
  // Пропускаем себя
  if (nextPlayer === playerId) {
    nextPlayer = ((nextPlayer + direction + 4) % 4) as PlayerId;
  }
  
  const nextPlayerBuildings = allEnemyBuildings.filter(b => b.playerId === nextPlayer);
  if (nextPlayerBuildings.length > 0) {
    return getPlayerPosition(nextPlayer, mapSize);
  }
  
  // Если следующий игрок уничтожен, идем дальше или в центр
  const finalPlayer = ((nextPlayer + direction + 4) % 4) as PlayerId;
  if (finalPlayer !== playerId) {
    const finalPlayerBuildings = allEnemyBuildings.filter(b => b.playerId === finalPlayer);
    if (finalPlayerBuildings.length > 0) {
      return getPlayerPosition(finalPlayer, mapSize);
    }
  }
  
  return center;
}

/**
 * Получение следующей цели для юнита из центрального барака (движение по углам)
 */
function getNextCornerTarget(
  playerId: PlayerId,
  currentTarget: Position | undefined,
  mapSize: number
): Position {
  const CELL_EDGE_OFFSET = 40;
  const corners = [
    { x: CELL_EDGE_OFFSET, y: CELL_EDGE_OFFSET }, // A1 - верхний левый
    { x: mapSize - CELL_EDGE_OFFSET, y: CELL_EDGE_OFFSET }, // J1 - верхний правый
    { x: mapSize - CELL_EDGE_OFFSET, y: mapSize - CELL_EDGE_OFFSET }, // J10 - нижний правый
    { x: CELL_EDGE_OFFSET, y: mapSize - CELL_EDGE_OFFSET }, // A10 - нижний левый
  ];

  const startCornerIndex = playerId;

  if (currentTarget) {
    let nearestCornerIndex = 0;
    let minDistance = Infinity;

    corners.forEach((corner, index) => {
      const distance = getDistance(currentTarget, corner);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCornerIndex = index;
      }
    });

    const nextCornerIndex = (nearestCornerIndex + 1) % 4;
    return corners[nextCornerIndex];
  }

  return corners[startCornerIndex];
}

/**
 * Получение следующей цели для юнита, если текущая разрушена
 */
export function getNextTarget(
  playerId: PlayerId,
  currentTarget: Position | undefined,
  allEnemyBuildings: Building[],
  mapSize: number,
  barrackIndex?: number
): Position {
  // Центральный барак (barrackIndex === 0)
  if (barrackIndex === 0) {
    const oppositePlayerId = getOppositePlayer(playerId);
    const oppositeBuildings = allEnemyBuildings.filter(
      (b) => b.playerId === oppositePlayerId && b.health > 0
    );

    if (oppositeBuildings.length > 0) {
      const referencePos = currentTarget || getPlayerPosition(playerId, mapSize);
      let nearest: Building | null = null;
      let minDistance = Infinity;

      const buildingPriority = { castle: 3, barracks: 2, tower: 1 };

      for (const building of oppositeBuildings) {
        const distance = getDistance(referencePos, building.position);
        const priority = buildingPriority[building.type as keyof typeof buildingPriority] || 0;
        const weightedDistance = distance / (priority * 1.5);

        if (weightedDistance < minDistance) {
          minDistance = weightedDistance;
          nearest = building;
        }
      }

      if (nearest) {
        return nearest.position;
      }
    }

    return getNextCornerTarget(playerId, currentTarget, mapSize);
  }

  // Боковой барак (1 или 2)
  if (barrackIndex !== undefined && barrackIndex !== 0) {
    return getNextCircularTarget(
      playerId,
      barrackIndex,
      currentTarget,
      allEnemyBuildings,
      mapSize
    );
  }

  // Общая логика: находим ближайшее вражеское здание
  if (allEnemyBuildings.length > 0) {
    const referencePos = currentTarget || getPlayerPosition(playerId, mapSize);
    let nearest: Building | null = null;
    let minDistance = Infinity;

    for (const building of allEnemyBuildings) {
      if (building.health <= 0) continue;
      const distance = getDistance(referencePos, building.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = building;
      }
    }

    if (nearest) {
      return nearest.position;
    }
  }

  // Если нет целей, возвращаемся в центр
  return { x: mapSize / 2, y: mapSize / 2 };
}

