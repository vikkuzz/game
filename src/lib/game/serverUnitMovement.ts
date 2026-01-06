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

      // Сначала применяем отталкивание, чтобы предотвратить скопление
      // Это важно делать ДО движения, чтобы юниты не собирались в кучу
      let updatedUnits = player.units.map((unit) => {
        if (unit.health <= 0) return unit;
        return unit;
      });

      // Применяем отталкивание несколько раз для лучшего результата
      // Используем полный deltaTime для каждой итерации, чтобы разделение было более эффективным
      const SEPARATION_ITERATIONS = 5; // Увеличено количество итераций
      for (let i = 0; i < SEPARATION_ITERATIONS; i++) {
        updatedUnits = updatedUnits.map((unit) => {
          if (unit.health <= 0) return unit;
          // Обновляем список всех юнитов для каждой итерации
          const currentAllUnits = [
            ...state.players
              .filter((p) => p.id !== player.id)
              .flatMap((p) => p.units),
            ...updatedUnits,
          ];
          // Используем полный deltaTime для каждой итерации
          return separateUnits(unit, currentAllUnits, deltaTime);
        });
      }

      // Теперь применяем движение после разделения
      updatedUnits = updatedUnits.map((unit) => {
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

