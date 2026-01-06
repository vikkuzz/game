/**
 * Модуль работы с позициями на карте
 */

import type { Position, PlayerId } from "@/types/game";

/**
 * Создание начальной позиции игрока на карте (замок в центре стороны квадрата)
 */
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

/**
 * Вычисление расстояния между двумя точками
 */
export function getDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Получение координат ячейки сетки для позиции
 */
export function getCellCoordinates(position: Position): { cellX: number; cellY: number } {
  const CELL_SIZE = 50;
  return {
    cellX: Math.floor(position.x / CELL_SIZE),
    cellY: Math.floor(position.y / CELL_SIZE),
  };
}

/**
 * Проверка, находятся ли две позиции в одной ячейке
 */
export function isInSameCell(pos1: Position, pos2: Position): boolean {
  const cell1 = getCellCoordinates(pos1);
  const cell2 = getCellCoordinates(pos2);
  return cell1.cellX === cell2.cellX && cell1.cellY === cell2.cellY;
}

/**
 * Проверка, является ли позиция непроходимой (река, препятствие)
 */
export function isImpassable(position: Position): boolean {
  const center = 400; // центр карты
  const riverWidth = 60; // ширина реки
  const riverY = center; // река проходит по центру по горизонтали

  // Проверяем, находится ли позиция в реке
  return Math.abs(position.y - riverY) < riverWidth / 2;
}

/**
 * Проверка, пересекает ли линия между двумя точками непроходимую область
 */
export function lineCrossesImpassable(
  pos1: Position,
  pos2: Position,
  steps?: number
): boolean {
  // Упрощенная проверка: если обе точки не в непроходимой области,
  // проверяем промежуточные точки
  if (!isImpassable(pos1) && !isImpassable(pos2)) {
    // Проверяем несколько промежуточных точек
    const checkSteps = steps || 10;
    for (let i = 1; i < checkSteps; i++) {
      const t = i / checkSteps;
      const intermediatePos: Position = {
        x: pos1.x + (pos2.x - pos1.x) * t,
        y: pos1.y + (pos2.y - pos1.y) * t,
      };
      if (isImpassable(intermediatePos)) {
        return true;
      }
    }
  }
  return isImpassable(pos1) || isImpassable(pos2);
}

