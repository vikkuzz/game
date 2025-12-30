/**
 * Игровая логика для Survival Chaos
 */

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

// Конфигурация игры
export const GAME_CONFIG = {
  mapSize: 800,
  unitSpawnInterval: 15000, // 15 секунд
  goldIncomeInterval: 1000, // 1 секунда
  gameLoopInterval: 50, // 50мс для плавной анимации
  unitSpeed: 30, // пикселей в секунду
  unitCost: {
    warrior: 50,
    archer: 75,
    mage: 100,
  },
  maxAvailableUnits: {
    warrior: 10,
    archer: 8,
    mage: 5,
  },
  unitRestoreTime: 5000, // 5 секунд на восстановление одного юнита
  killReward: {
    warrior: 15, // Золото за убийство воина
    archer: 20, // Золото за убийство лучника
    mage: 25, // Золото за убийство мага
  },
  buildingDestroyReward: {
    castle: 500, // Золото за разрушение замка
    barracks: 150, // Золото за разрушение барака
    tower: 100, // Золото за разрушение башни
  },
};

// Создание начальной позиции игрока на карте (замок в центре стороны квадрата)
export function getPlayerPosition(
  playerId: PlayerId,
  mapSize: number
): Position {
  const center = mapSize / 2;
  const edgeOffset = mapSize * 0.35; // Замок ближе к краю карты (35% от центра к краю)

  switch (playerId) {
    case 0: // Верх (центр верхней стороны)
      return { x: center, y: center - edgeOffset };
    case 1: // Право (центр правой стороны)
      return { x: center + edgeOffset, y: center };
    case 2: // Низ (центр нижней стороны)
      return { x: center, y: center + edgeOffset };
    case 3: // Лево (центр левой стороны)
      return { x: center - edgeOffset, y: center };
    default:
      return { x: center, y: center };
  }
}

// Создание начального замка
export function createCastle(playerId: PlayerId, position: Position): Building {
  return {
    id: `castle-${playerId}`,
    type: "castle",
    playerId,
    position,
    health: 3000,
    maxHealth: 3000,
    level: 1,
    attack: 30,
    attackRange: 50,
    defense: 15,
  };
}

// Создание начальных бараков
export function createBarracks(
  playerId: PlayerId,
  castlePos: Position,
  mapSize: number
): Building[] {
  const barracks: Building[] = [];
  const center = mapSize / 2;
  const sideOffset = 90; // Расстояние по бокам от замка
  const centerOffset = 70; // Расстояние от замка к центру (для центрального барака)

  let positions: Position[] = [];

  switch (playerId) {
    case 0: // Верх
      positions = [
        { x: castlePos.x, y: castlePos.y + centerOffset }, // Центральный (к центру)
        { x: castlePos.x - sideOffset, y: castlePos.y }, // Левый (к соседу слева)
        { x: castlePos.x + sideOffset, y: castlePos.y }, // Правый (к соседу справа)
      ];
      break;
    case 1: // Право
      positions = [
        { x: castlePos.x - centerOffset, y: castlePos.y }, // Центральный (к центру)
        { x: castlePos.x, y: castlePos.y - sideOffset }, // Верхний (к соседу сверху)
        { x: castlePos.x, y: castlePos.y + sideOffset }, // Нижний (к соседу снизу)
      ];
      break;
    case 2: // Низ
      positions = [
        { x: castlePos.x, y: castlePos.y - centerOffset }, // Центральный (к центру)
        { x: castlePos.x + sideOffset, y: castlePos.y }, // Правый (к соседу справа)
        { x: castlePos.x - sideOffset, y: castlePos.y }, // Левый (к соседу слева)
      ];
      break;
    case 3: // Лево
      positions = [
        { x: castlePos.x + centerOffset, y: castlePos.y }, // Центральный (к центру)
        { x: castlePos.x, y: castlePos.y + sideOffset }, // Нижний (к соседу снизу)
        { x: castlePos.x, y: castlePos.y - sideOffset }, // Верхний (к соседу сверху)
      ];
      break;
  }

  positions.forEach((pos, index) => {
    const initialSpawnInterval = getSpawnInterval(1); // Начальный уровень 1
    barracks.push({
      id: `barracks-${playerId}-${index}`,
      type: "barracks",
      playerId,
      position: pos,
      health: 1500,
      maxHealth: 1500,
      level: 1,
      spawnCooldown: initialSpawnInterval, // Начальный кулдаун для первого спавна
      availableUnits: 5,
      maxAvailableUnits: 5,
      defense: 10,
      unitRestoreTime: GAME_CONFIG.unitRestoreTime,
    });
  });

  return barracks;
}

// Создание начальных башен
export function createTowers(
  playerId: PlayerId,
  castlePos: Position,
  mapSize: number
): Building[] {
  const towers: Building[] = [];
  const center = mapSize / 2;
  const sideOffset = 90; // Расстояние по бокам от замка (такое же как в createBarracks)
  const centerOffset = 70; // Расстояние от замка к центру (такое же как в createBarracks)
  const towerOffset = 60; // Расстояние по бокам от центрального барака для башен

  // Вычисляем позицию центрального барака
  let centerBarrackPos: Position;
  switch (playerId) {
    case 0: // Верх
      centerBarrackPos = { x: castlePos.x, y: castlePos.y + centerOffset };
      break;
    case 1: // Право
      centerBarrackPos = { x: castlePos.x - centerOffset, y: castlePos.y };
      break;
    case 2: // Низ
      centerBarrackPos = { x: castlePos.x, y: castlePos.y - centerOffset };
      break;
    case 3: // Лево
      centerBarrackPos = { x: castlePos.x + centerOffset, y: castlePos.y };
      break;
    default:
      centerBarrackPos = castlePos;
  }

  let positions: Position[] = [];

  switch (playerId) {
    case 0: // Верх
      positions = [
        // 2 башни по бокам центрального барака
        { x: centerBarrackPos.x - towerOffset, y: centerBarrackPos.y }, // Левая
        { x: centerBarrackPos.x + towerOffset, y: centerBarrackPos.y }, // Правая
        // 4 башни возле боковых бараков (по 2 с каждой стороны)
        { x: castlePos.x - sideOffset, y: castlePos.y - towerOffset }, // Левый верх
        { x: castlePos.x - sideOffset, y: castlePos.y + towerOffset }, // Левый низ
        { x: castlePos.x + sideOffset, y: castlePos.y - towerOffset }, // Правый верх
        { x: castlePos.x + sideOffset, y: castlePos.y + towerOffset }, // Правый низ
      ];
      break;
    case 1: // Право
      positions = [
        // 2 башни по бокам центрального барака
        { x: centerBarrackPos.x, y: centerBarrackPos.y - towerOffset }, // Верхняя
        { x: centerBarrackPos.x, y: centerBarrackPos.y + towerOffset }, // Нижняя
        // 4 башни возле боковых бараков
        { x: castlePos.x - towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x - towerOffset, y: castlePos.y + sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y + sideOffset },
      ];
      break;
    case 2: // Низ
      positions = [
        // 2 башни по бокам центрального барака
        { x: centerBarrackPos.x - towerOffset, y: centerBarrackPos.y }, // Левая
        { x: centerBarrackPos.x + towerOffset, y: centerBarrackPos.y }, // Правая
        // 4 башни возле боковых бараков
        { x: castlePos.x - sideOffset, y: castlePos.y - towerOffset },
        { x: castlePos.x - sideOffset, y: castlePos.y + towerOffset },
        { x: castlePos.x + sideOffset, y: castlePos.y - towerOffset },
        { x: castlePos.x + sideOffset, y: castlePos.y + towerOffset },
      ];
      break;
    case 3: // Лево
      positions = [
        // 2 башни по бокам центрального барака
        { x: centerBarrackPos.x, y: centerBarrackPos.y - towerOffset }, // Верхняя
        { x: centerBarrackPos.x, y: centerBarrackPos.y + towerOffset }, // Нижняя
        // 4 башни возле боковых бараков
        { x: castlePos.x - towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x - towerOffset, y: castlePos.y + sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y + sideOffset },
      ];
      break;
  }

  positions.forEach((pos, index) => {
    towers.push({
      id: `tower-${playerId}-${index}`,
      type: "tower",
      playerId,
      position: pos,
      health: 800,
      maxHealth: 800,
      level: 1,
      attack: 50, // Урон башни
      attackRange: 100,
      defense: 12,
    });
  });

  return towers;
}

// Создание начального игрока
export function createPlayer(playerId: PlayerId, mapSize: number): Player {
  const castlePos = getPlayerPosition(playerId, mapSize);

  return {
    id: playerId,
    gold: 500,
    goldIncome: 10, // Золото в секунду
    castle: createCastle(playerId, castlePos),
    barracks: createBarracks(playerId, castlePos, mapSize),
    towers: createTowers(playerId, castlePos, mapSize),
    units: [],
    upgrades: {
      attack: 0,
      defense: 0,
      health: 0,
      magic: 0,
      goldIncome: 0,
      buildingHealth: 0,
      buildingAttack: 0,
    },
    isActive: true,
    stats: {
      unitsKilled: 0,
      unitsLost: 0,
      buildingsDestroyed: 0,
      buildingsLost: 0,
      damageDealt: 0,
      damageTaken: 0,
      goldEarned: 0,
    },
  };
}

// Получение соседних игроков (слева и справа)
export function getNeighborPlayers(playerId: PlayerId): PlayerId[] {
  const neighbors: PlayerId[] = [];

  // Сосед слева
  const leftNeighbor = ((playerId - 1 + 4) % 4) as PlayerId;
  neighbors.push(leftNeighbor);

  // Сосед справа
  const rightNeighbor = ((playerId + 1) % 4) as PlayerId;
  neighbors.push(rightNeighbor);

  return neighbors;
}

// Получение целевой позиции для юнита из барака
export function getUnitTarget(
  playerId: PlayerId,
  barrackIndex: number,
  mapSize: number
): { target: Position; intermediateTargets?: Position[] } {
  const center = mapSize / 2;
  // Координаты сетки (колонки A-J = 0-9, строки 1-10 = 0-9)
  // Центр клетки = индекс * 80 + 40
  const B2 = { x: 80 * 1 + 40, y: 80 * 1 + 40 }; // B2 (колонка 1, строка 2) - центр клетки
  const I2 = { x: 80 * 8 + 40, y: 80 * 1 + 40 }; // I2 (колонка 8, строка 2) - центр клетки
  const B9 = { x: 80 * 1 + 40, y: 80 * 8 + 40 }; // B9 (колонка 1, строка 9) - центр клетки
  const H9 = { x: 80 * 7 + 40, y: 80 * 8 + 40 }; // H9 (колонка 7, строка 9) - центр клетки
  const I9 = { x: 80 * 8 + 40, y: 80 * 8 + 40 }; // I9 (колонка 8, строка 9) - центр клетки
  const I8 = { x: 80 * 8 + 40, y: 80 * 7 + 40 }; // I8 (колонка 8, строка 8) - центр клетки
  const I7 = { x: 80 * 8 + 40, y: 80 * 6 + 40 }; // I7 (колонка 8, строка 7) - центр клетки

  if (barrackIndex === 0) {
    // Центральный барак - сначала в центр карты, потом к противнику напротив
    const oppositePlayerId = ((playerId + 2) % 4) as PlayerId; // Противник напротив
    const oppositeTarget = getPlayerPosition(oppositePlayerId, mapSize);
    return {
      target: oppositeTarget,
      intermediateTargets: [{ x: center, y: center }],
    };
  } else {
    // Боковые бараки (1 и 2) - к соседним игрокам
    // Барак 1 идет к соседу слева (против часовой), барак 2 к соседу справа (по часовой)
    const targetNeighbor =
      barrackIndex === 1
        ? (((playerId - 1 + 4) % 4) as PlayerId) // Против часовой
        : (((playerId + 1) % 4) as PlayerId); // По часовой
    const finalTarget = getPlayerPosition(targetNeighbor, mapSize);

    // Юниты из боковых бараков идут только по промежуточным точкам B2, I2, I9, B9
    // Выбираем промежуточную точку в зависимости от позиции игрока и барака

    // Игрок 0 (верхний), левый барак (barrackIndex=1) → B2
    if (playerId === 0 && barrackIndex === 1) {
      return { target: finalTarget, intermediateTargets: [B2] };
    }

    // Игрок 0 (верхний), правый барак (barrackIndex=2) → I2
    if (playerId === 0 && barrackIndex === 2) {
      return { target: finalTarget, intermediateTargets: [I2] };
    }

    // Игрок 1 (правый), верхний барак (barrackIndex=1) → I2
    if (playerId === 1 && barrackIndex === 1) {
      return { target: finalTarget, intermediateTargets: [I2] };
    }

    // Игрок 1 (правый), нижний барак (barrackIndex=2) → I9
    if (playerId === 1 && barrackIndex === 2) {
      return { target: finalTarget, intermediateTargets: [I9] };
    }

    // Игрок 2 (нижний), правый барак (barrackIndex=1) → I9
    if (playerId === 2 && barrackIndex === 1) {
      return { target: finalTarget, intermediateTargets: [I9] };
    }

    // Игрок 2 (нижний), левый барак (barrackIndex=2) → B9
    if (playerId === 2 && barrackIndex === 2) {
      return { target: finalTarget, intermediateTargets: [B9] };
    }

    // Игрок 3 (левый), нижний барак (barrackIndex=1) → B9
    if (playerId === 3 && barrackIndex === 1) {
      return { target: finalTarget, intermediateTargets: [B9] };
    }

    // Игрок 3 (левый), верхний барак (barrackIndex=2) → B2
    if (playerId === 3 && barrackIndex === 2) {
      return { target: finalTarget, intermediateTargets: [B2] };
    }

    return { target: finalTarget };
  }
}

// Получение следующей цели для юнита из бокового барака по кругу (если текущая цель разрушена)
export function getNextCircularTarget(
  playerId: PlayerId,
  barrackIndex: number,
  currentTarget: Position | undefined,
  allEnemyBuildings: Building[],
  mapSize: number
): Position {
  if (!currentTarget) {
    // Если нет текущей цели, устанавливаем начальную цель
    const targetNeighbor =
      barrackIndex === 1
        ? (((playerId - 1 + 4) % 4) as PlayerId) // Против часовой
        : (((playerId + 1) % 4) as PlayerId); // По часовой
    return getPlayerPosition(targetNeighbor, mapSize);
  }

  // Если есть живые вражеские здания у текущей цели, находим ближайшее
  if (allEnemyBuildings.length > 0) {
    // Определяем, какой игрок был целью
    const distances = [
      getDistance(currentTarget, getPlayerPosition(0, mapSize)),
      getDistance(currentTarget, getPlayerPosition(1, mapSize)),
      getDistance(currentTarget, getPlayerPosition(2, mapSize)),
      getDistance(currentTarget, getPlayerPosition(3, mapSize)),
    ];
    const minDistIndex = distances.indexOf(Math.min(...distances));
    const targetPlayerId = minDistIndex as PlayerId;

    // Проверяем, есть ли живые здания у этого игрока
    const targetPlayerBuildings: Building[] = allEnemyBuildings.filter(
      (b) => b.playerId === targetPlayerId
    );
    if (targetPlayerBuildings.length > 0) {
      // Если есть, идем к ближайшему зданию этого игрока
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

    // Если зданий у текущего игрока нет, идем дальше по кругу
    if (barrackIndex === 1) {
      // Против часовой стрелки
      let nextPlayer = ((targetPlayerId - 1 + 4) % 4) as PlayerId;
      // Пропускаем себя, если дошли до себя - идем в центр
      if (nextPlayer === playerId) {
        const center = mapSize / 2;
        return { x: center, y: center };
      }
      return getPlayerPosition(nextPlayer, mapSize);
    } else {
      // По часовой стрелке
      let nextPlayer = ((targetPlayerId + 1) % 4) as PlayerId;
      // Пропускаем себя, если дошли до себя - идем в центр
      if (nextPlayer === playerId) {
        const center = mapSize / 2;
        return { x: center, y: center };
      }
      return getPlayerPosition(nextPlayer, mapSize);
    }
  }

  // Если нет вражеских зданий, идем в центр
  const center = mapSize / 2;
  return { x: center, y: center };
}

// Получение следующей цели для юнита из центрального барака, если цель разрушена
// Движение по часовой стрелке по углам карты
function getNextCornerTarget(
  playerId: PlayerId,
  currentTarget: Position | undefined,
  mapSize: number
): Position {
  // Углы карты по часовой стрелке (центры клеток)
  const corners = [
    { x: 40, y: 40 }, // A1 - верхний левый
    { x: mapSize - 40, y: 40 }, // J1 - верхний правый
    { x: mapSize - 40, y: mapSize - 40 }, // J10 - нижний правый
    { x: 40, y: mapSize - 40 }, // A10 - нижний левый
  ];

  // Начальный угол зависит от позиции игрока
  // Верхний игрок (0) начинает с верхнего левого угла, правый (1) - с верхнего правого и т.д.
  const startCornerIndex = playerId;

  // Если есть текущая цель, находим ближайший угол и следующий по часовой стрелке
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

    // Следующий угол по часовой стрелке
    const nextCornerIndex = (nearestCornerIndex + 1) % 4;
    return corners[nextCornerIndex];
  }

  // Если нет текущей цели, начинаем с угла, соответствующего позиции игрока
  return corners[startCornerIndex];
}

// Получение следующей цели для юнита, если текущая разрушена
export function getNextTarget(
  playerId: PlayerId,
  currentTarget: Position | undefined,
  allEnemyBuildings: Building[],
  mapSize: number,
  barrackIndex?: number
): Position {
  // Если это юнит из центрального барака (barrackIndex === 0), используем логику движения по углам
  if (barrackIndex === 0) {
    // Сначала проверяем, есть ли живые здания противника напротив
    const oppositePlayerId = ((playerId + 2) % 4) as PlayerId;
    const oppositeBuildings = allEnemyBuildings.filter(
      (b) => b.playerId === oppositePlayerId && b.health > 0
    );

    if (oppositeBuildings.length > 0) {
      // Если есть живые здания противника напротив, идем к ближайшему
      const referencePos =
        currentTarget || getPlayerPosition(playerId, mapSize);
      let nearest: Building | null = null;
      let minDistance = Infinity;

      const buildingPriority = { castle: 3, barracks: 2, tower: 1 };

      for (const building of oppositeBuildings) {
        const distance = getDistance(referencePos, building.position);
        const priority = buildingPriority[building.type] || 0;
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

    // Если нет живых зданий противника напротив, идем по углам карты по часовой стрелке
    return getNextCornerTarget(playerId, currentTarget, mapSize);
  }

  // Если это юнит из бокового барака (1 или 2), используем логику движения по кругу
  if (barrackIndex !== undefined && barrackIndex !== 0) {
    return getNextCircularTarget(
      playerId,
      barrackIndex,
      currentTarget,
      allEnemyBuildings,
      mapSize
    );
  }

  // Если есть живые вражеские здания, находим ближайшее
  if (allEnemyBuildings.length > 0) {
    // Находим ближайшее здание к текущей цели или к позиции игрока
    const referencePos = currentTarget || getPlayerPosition(playerId, mapSize);
    let nearest: Building | null = null;
    let minDistance = Infinity;

    // Приоритет: замки > бараки > башни
    const buildingPriority = { castle: 3, barracks: 2, tower: 1 };

    for (const building of allEnemyBuildings) {
      const distance = getDistance(referencePos, building.position);
      const priority = buildingPriority[building.type] || 0;
      // Учитываем приоритет: более важные здания предпочтительнее, даже если немного дальше
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

  // Если нет вражеских зданий, идем в центр
  const center = mapSize / 2;
  return { x: center, y: center };
}

// Получение типа юнита для спавна в зависимости от уровня барака
export function getSpawnUnitType(barrackLevel: number): UnitType {
  // Временно только воины
  return "warrior";
}

// Получение времени спавна в зависимости от уровня барака
export function getSpawnInterval(barrackLevel: number): number {
  const baseInterval = GAME_CONFIG.unitSpawnInterval; // 15 секунд
  // Каждый уровень уменьшает время спавна на 10%
  const reduction = 1 - (barrackLevel - 1) * 0.1;
  return Math.max(baseInterval * reduction, baseInterval * 0.5); // Минимум 50% от базового времени (7.5 секунд)
}

// Создание юнита
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
    }, // Только вплотную
    archer: { health: 60, attack: 25, defense: 5, speed: 35, attackRange: 180 }, // Самый большой радиус
    mage: { health: 50, attack: 30, defense: 3, speed: 25, attackRange: 100 }, // Средний радиус
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

// Проверка, находится ли точка в непроходимой зоне
// Отключено, так как ландшафт убран
export function isImpassable(position: Position): boolean {
  return false; // Ландшафт убран, все зоны проходимы
}

// Проверка, пересекает ли линия непроходимую зону (для атаки)
// Отключено, так как ландшафт убран
export function lineCrossesImpassable(
  from: Position,
  to: Position,
  steps: number = 20
): boolean {
  return false; // Ландшафт убран, линии атаки не блокируются
}

// Расстояние между двумя точками
export function getDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

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

// Урон юниту
export function damageUnit(unit: Unit, damage: number): Unit {
  // Защита уменьшает урон: урон = базовый_урон - защита, минимум 1 урон
  const actualDamage = Math.max(1, Math.floor(damage - unit.defense));
  const newHealth = Math.max(0, unit.health - actualDamage);

  return {
    ...unit,
    health: newHealth,
  };
}

// Отталкивание юнитов друг от друга
const UNIT_RADIUS = 12; // Радиус юнита (диаметр 24px)
const MIN_DISTANCE = UNIT_RADIUS * 2 + 2; // Минимальное расстояние между юнитами

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
    if (distance < MIN_DISTANCE && distance > 0) {
      // Вычисляем вектор отталкивания
      const dx = unit.position.x - other.position.x;
      const dy = unit.position.y - other.position.y;
      const normalizedDistance = Math.max(distance, 1); // Избегаем деления на ноль

      // Сила отталкивания зависит от близости (чем ближе, тем сильнее)
      const separationForce = (MIN_DISTANCE - distance) / MIN_DISTANCE;
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
      const separationSpeed = 50; // пикселей в секунду
      const moveDistance = (separationSpeed * deltaTime) / 1000;

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
      // Пробуем перпендикулярные направления
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

// Поиск ближайшего вражеского юнита
export function findNearestEnemy(unit: Unit, allUnits: Unit[]): Unit | null {
  const enemies = allUnits.filter(
    (u) => u.playerId !== unit.playerId && u.health > 0
  );

  if (enemies.length === 0) return null;

  let nearest: Unit | null = null;
  let minDistance = Infinity;

  enemies.forEach((enemy) => {
    const distance = getDistance(unit.position, enemy.position);
    if (distance < minDistance && distance < 150) {
      // Радиус обнаружения вражеских юнитов
      minDistance = distance;
      nearest = enemy;
    }
  });

  return nearest;
}

// Поиск ближайшего вражеского здания
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
    if (distance < minDistance && distance < 200) {
      // Радиус обнаружения вражеских зданий
      minDistance = distance;
      nearest = building;
    }
  });

  return nearest;
}

// Поиск ближайшего вражеского юнита для здания
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
  const attackRange = building.attackRange || 200;

  enemyUnits.forEach((unit) => {
    const distance = getDistance(building.position, unit.position);
    if (distance < minDistance && distance <= attackRange) {
      minDistance = distance;
      nearest = unit;
    }
  });

  return nearest;
}

// Урон зданию
export function damageBuilding(building: Building, damage: number): Building {
  const defense = building.defense || 0;
  const actualDamage = Math.max(1, Math.floor(damage - defense)); // Учитываем защиту здания
  const newHealth = Math.max(0, building.health - actualDamage);

  return {
    ...building,
    health: newHealth,
  };
}
