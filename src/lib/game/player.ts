/**
 * Модуль работы с игроками
 */

import type { Player, PlayerId } from "@/types/game";
import { getPlayerPosition } from "./positions";
import { createCastle, createBarracks, createTowers } from "./buildings";

/**
 * Создание начального игрока
 */
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
    autoUpgrade: false, // Индивидуальный флаг авторазвития (по умолчанию выключен)
  };
}

/**
 * Получение соседних игроков (слева и справа)
 */
export function getNeighborPlayers(playerId: PlayerId): PlayerId[] {
  const leftNeighbor = ((playerId - 1 + 4) % 4) as PlayerId;
  const rightNeighbor = ((playerId + 1) % 4) as PlayerId;
  return [leftNeighbor, rightNeighbor];
}

