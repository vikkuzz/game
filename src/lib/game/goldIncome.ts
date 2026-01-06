/**
 * Модуль обработки пассивного дохода золота
 * Отвечает за начисление золота игрокам на основе их goldIncome
 */

import type { GameState } from "@/types/game";
import type { GameRoom } from "../gameServer";
import { GAME_CONFIG } from "../gameLogic";

/**
 * Начисление пассивного дохода золота
 * @param room - Игровая комната
 * @param deltaTime - Время, прошедшее с последнего обновления (мс)
 * @returns Обновленное состояние игры
 */
export function applyGoldIncomeTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  const interval = GAME_CONFIG.goldIncomeInterval; // мс
  room.goldTimer += deltaTime;

  if (room.goldTimer < interval) {
    return room.gameState;
  }

  const ticks = Math.floor(room.goldTimer / interval);
  room.goldTimer = room.goldTimer % interval;

  let state: GameState = room.gameState;
  const baseIntervalSeconds = interval / 1000;

  for (let i = 0; i < ticks; i++) {
    state = {
      ...state,
      players: state.players.map((player) => {
        const earnedGold = player.goldIncome * baseIntervalSeconds;
        return {
          ...player,
          gold: player.gold + earnedGold,
          stats: {
            ...player.stats,
            goldEarned: player.stats.goldEarned + earnedGold,
          },
        };
      }),
    };
  }

  return state;
}

