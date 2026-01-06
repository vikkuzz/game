/**
 * Модуль создания и работы со зданиями
 */

import type { Building, Position, PlayerId, BuildingType } from "@/types/game";
import { GAME_CONFIG } from "./config";
import { getSpawnInterval } from "./spawning";

/**
 * Создание начального замка
 */
export function createCastle(playerId: PlayerId, position: Position): Building {
  return {
    id: `castle-${playerId}`,
    type: "castle",
    playerId,
    position,
    health: 2000,
    maxHealth: 2000,
    level: 1,
    attack: 20,
    attackRange: 175,
    defense: 15,
  };
}

/**
 * Получение позиций бараков для игрока
 */
function getBarrackPositions(
  playerId: PlayerId,
  castlePos: Position
): Position[] {
  const sideOffset = 90; // Расстояние по бокам от замка
  const centerOffset = 70; // Расстояние от замка к центру (для центрального барака)

  switch (playerId) {
    case 0: // Верх
      return [
        { x: castlePos.x, y: castlePos.y + centerOffset }, // Центральный
        { x: castlePos.x - sideOffset, y: castlePos.y }, // Левый
        { x: castlePos.x + sideOffset, y: castlePos.y }, // Правый
      ];
    case 1: // Право
      return [
        { x: castlePos.x - centerOffset, y: castlePos.y }, // Центральный
        { x: castlePos.x, y: castlePos.y - sideOffset }, // Верхний
        { x: castlePos.x, y: castlePos.y + sideOffset }, // Нижний
      ];
    case 2: // Низ
      return [
        { x: castlePos.x, y: castlePos.y - centerOffset }, // Центральный
        { x: castlePos.x + sideOffset, y: castlePos.y }, // Правый
        { x: castlePos.x - sideOffset, y: castlePos.y }, // Левый
      ];
    case 3: // Лево
      return [
        { x: castlePos.x + centerOffset, y: castlePos.y }, // Центральный
        { x: castlePos.x, y: castlePos.y + sideOffset }, // Нижний
        { x: castlePos.x, y: castlePos.y - sideOffset }, // Верхний
      ];
    default:
      return [];
  }
}

/**
 * Создание начальных бараков
 */
export function createBarracks(
  playerId: PlayerId,
  castlePos: Position,
  mapSize: number
): Building[] {
  const positions = getBarrackPositions(playerId, castlePos);
  const initialSpawnInterval = getSpawnInterval(1);

  return positions.map((pos, index) => ({
    id: `barracks-${playerId}-${index}`,
    type: "barracks" as BuildingType,
    playerId,
    position: pos,
    health: 1000,
    maxHealth: 1000,
    level: 1,
    spawnCooldown: initialSpawnInterval,
    availableUnits: 5,
    maxAvailableUnits: 5,
    defense: 10,
    unitRestoreTime: GAME_CONFIG.unitRestoreTime,
  }));
}

/**
 * Получение позиции центрального барака
 */
function getCenterBarrackPosition(
  playerId: PlayerId,
  castlePos: Position
): Position {
  const centerOffset = 70;
  switch (playerId) {
    case 0:
      return { x: castlePos.x, y: castlePos.y + centerOffset };
    case 1:
      return { x: castlePos.x - centerOffset, y: castlePos.y };
    case 2:
      return { x: castlePos.x, y: castlePos.y - centerOffset };
    case 3:
      return { x: castlePos.x + centerOffset, y: castlePos.y };
    default:
      return castlePos;
  }
}

/**
 * Получение позиций башен для игрока
 */
function getTowerPositions(
  playerId: PlayerId,
  castlePos: Position
): Position[] {
  const sideOffset = 90;
  const towerOffset = 60;
  const centerBarrackPos = getCenterBarrackPosition(playerId, castlePos);

  switch (playerId) {
    case 0: // Верх
      return [
        { x: centerBarrackPos.x - towerOffset, y: centerBarrackPos.y },
        { x: centerBarrackPos.x + towerOffset, y: centerBarrackPos.y },
        { x: castlePos.x - sideOffset, y: castlePos.y - towerOffset },
        { x: castlePos.x - sideOffset, y: castlePos.y + towerOffset },
        { x: castlePos.x + sideOffset, y: castlePos.y - towerOffset },
        { x: castlePos.x + sideOffset, y: castlePos.y + towerOffset },
      ];
    case 1: // Право
      return [
        { x: centerBarrackPos.x, y: centerBarrackPos.y - towerOffset },
        { x: centerBarrackPos.x, y: centerBarrackPos.y + towerOffset },
        { x: castlePos.x - towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x - towerOffset, y: castlePos.y + sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y + sideOffset },
      ];
    case 2: // Низ
      return [
        { x: centerBarrackPos.x - towerOffset, y: centerBarrackPos.y },
        { x: centerBarrackPos.x + towerOffset, y: centerBarrackPos.y },
        { x: castlePos.x - sideOffset, y: castlePos.y - towerOffset },
        { x: castlePos.x - sideOffset, y: castlePos.y + towerOffset },
        { x: castlePos.x + sideOffset, y: castlePos.y - towerOffset },
        { x: castlePos.x + sideOffset, y: castlePos.y + towerOffset },
      ];
    case 3: // Лево
      return [
        { x: centerBarrackPos.x, y: centerBarrackPos.y - towerOffset },
        { x: centerBarrackPos.x, y: centerBarrackPos.y + towerOffset },
        { x: castlePos.x - towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y - sideOffset },
        { x: castlePos.x - towerOffset, y: castlePos.y + sideOffset },
        { x: castlePos.x + towerOffset, y: castlePos.y + sideOffset },
      ];
    default:
      return [];
  }
}

/**
 * Создание начальных башен
 */
export function createTowers(
  playerId: PlayerId,
  castlePos: Position,
  mapSize: number
): Building[] {
  const positions = getTowerPositions(playerId, castlePos);

  return positions.map((pos, index) => ({
    id: `tower-${playerId}-${index}`,
    type: "tower" as BuildingType,
    playerId,
    position: pos,
    health: 500,
    maxHealth: 500,
    level: 1,
    attack: 30,
    attackRange: 100,
    defense: 12,
  }));
}

/**
 * Нанесение урона зданию
 */
export function damageBuilding(building: Building, damage: number): Building {
  const actualDamage = Math.max(1, Math.floor(damage - (building.defense || 0)));
  const newHealth = Math.max(0, building.health - actualDamage);

  return {
    ...building,
    health: newHealth,
  };
}

