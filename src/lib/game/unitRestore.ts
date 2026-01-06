/**
 * Модуль восстановления доступных юнитов в бараках
 * Отвечает за восстановление доступных слотов для покупки юнитов
 */

import type { GameState } from "@/types/game";
import type { GameRoom } from "../gameServer";
import { GAME_CONFIG } from "../gameLogic";

/**
 * Восстановление доступных юнитов в бараках
 * @param room - Игровая комната
 * @param deltaTime - Время, прошедшее с последнего обновления (мс)
 * @returns Обновленное состояние игры
 */
export function applyUnitRestoreTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  const interval = GAME_CONFIG.unitRestoreTime || 10000; // 10 секунд по умолчанию
  room.restoreTimer += deltaTime;

  if (room.restoreTimer < interval) {
    return room.gameState;
  }

  const ticks = Math.floor(room.restoreTimer / interval);
  room.restoreTimer = room.restoreTimer % interval;

  let state: GameState = room.gameState;

  for (let i = 0; i < ticks; i++) {
    state = {
      ...state,
      players: state.players.map((player) => {
        if (!player.isActive) return player;

        return {
          ...player,
          barracks: player.barracks.map((barrack) => {
            if (barrack.health <= 0) return barrack;

            return {
              ...barrack,
              availableUnits: Math.min(
                barrack.maxAvailableUnits || 5,
                (barrack.availableUnits || 0) + 1
              ),
            };
          }),
        };
      }),
    };
  }

  return state;
}

