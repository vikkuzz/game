/**
 * Модуль обработки кулдаунов зданий
 * Отвечает за обновление кулдаунов ремонта и улучшения зданий
 */

import type { GameState, Building as BuildingType } from "@/types/game";
import type { GameRoom } from "../gameServer";
import { GAME_CONFIG } from "../gameLogic";

/**
 * Обновление кулдаунов зданий (ремонт и улучшение)
 * @param room - Игровая комната
 * @param deltaTime - Время, прошедшее с последнего обновления (мс)
 * @returns Обновленное состояние игры
 */
export function applyCooldownTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  const interval = GAME_CONFIG.gameLoopInterval; // мс
  room.cooldownTimer += deltaTime;

  if (room.cooldownTimer < interval) {
    return room.gameState;
  }

  const ticks = Math.floor(room.cooldownTimer / interval);
  room.cooldownTimer = room.cooldownTimer % interval;

  let state: GameState = room.gameState;

  for (let i = 0; i < ticks; i++) {
    state = {
      ...state,
      players: state.players.map((player) => {
        const updateBuilding = (building: BuildingType) => {
          const updated: BuildingType = { ...building };
          if (updated.repairCooldown && updated.repairCooldown > 0) {
            updated.repairCooldown = Math.max(
              0,
              updated.repairCooldown - GAME_CONFIG.gameLoopInterval
            );
          }
          // Обновляем кулдаун улучшения зданий
          if (updated.upgradeCooldown && updated.upgradeCooldown > 0) {
            updated.upgradeCooldown = Math.max(
              0,
              updated.upgradeCooldown - GAME_CONFIG.gameLoopInterval
            );
          }
          return updated;
        };

        return {
          ...player,
          castle: updateBuilding(player.castle),
          barracks: player.barracks.map(updateBuilding),
          towers: player.towers.map(updateBuilding),
        };
      }),
    };
  }

  return state;
}

