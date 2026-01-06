/**
 * Модуль обработки движения юнитов на сервере
 * Отвечает за обновление позиций юнитов и их отталкивание друг от друга
 */

import type { GameState, PlayerId, Building as BuildingType } from "@/types/game";
import type { GameRoom } from "../gameServer";
import { processUnitMovement } from "./unitMovement";
import { separateUnits, GAME_CONFIG } from "../gameLogic";

/**
 * Обработка движения юнитов на сервере
 */
export function applyUnitMovementTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  let state: GameState = room.gameState;
  const now = Date.now();

  // Собираем все здания для поиска целей
  const getAllEnemyBuildings = (playerId: PlayerId): BuildingType[] => {
    return state.players
      .filter((p) => p.id !== playerId && p.isActive)
      .flatMap((p) => [p.castle, ...p.barracks, ...p.towers])
      .filter((b) => b.health > 0);
  };

  // Обновление движения юнитов для каждого игрока
  state = {
    ...state,
    players: state.players.map((player) => {
      if (!player.isActive) return player;

      const allEnemyBuildings = getAllEnemyBuildings(player.id);
      const allCurrentUnits = state.players.flatMap((p) => p.units);

      let updatedUnits = player.units.map((unit) => {
        if (unit.health <= 0) return unit;

        // Используем модуль движения
        return processUnitMovement({
          unit,
          allUnits: allCurrentUnits,
          allEnemyBuildings,
          deltaTime,
          now,
        });
      });

      // Применяем отталкивание юнитов друг от друга
      const allUnitsForSeparation = [
        ...state.players
          .filter((p) => p.id !== player.id)
          .flatMap((p) => p.units),
        ...updatedUnits,
      ];
      updatedUnits = updatedUnits.map((unit) => {
        return separateUnits(unit, allUnitsForSeparation, deltaTime);
      });

      // Удаляем мертвых юнитов
      updatedUnits = updatedUnits.filter((u) => u.health > 0);

      return {
        ...player,
        units: updatedUnits,
      };
    }),
  };

  return state;
}

