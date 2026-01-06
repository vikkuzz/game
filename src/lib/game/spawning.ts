/**
 * Модуль спавна юнитов
 */

import type { UnitType } from "@/types/game";
import { GAME_CONFIG } from "./config";

/**
 * Получение типа юнита для спавна в зависимости от уровня барака
 */
export function getSpawnUnitType(barrackLevel: number): UnitType {
  // Временно только воины
  return "warrior";
}

/**
 * Получение времени спавна в зависимости от уровня барака
 */
export function getSpawnInterval(barrackLevel: number): number {
  const baseInterval = GAME_CONFIG.unitSpawnInterval; // 15 секунд
  // Каждый уровень уменьшает время спавна на 10%
  const reduction = 1 - (barrackLevel - 1) * 0.1;
  return Math.max(baseInterval * reduction, baseInterval * 0.5); // Минимум 50% от базового времени (7.5 секунд)
}

