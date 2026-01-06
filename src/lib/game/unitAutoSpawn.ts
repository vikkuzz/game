/**
 * Модуль автоматического спавна юнитов из бараков
 * Отвечает за автоматическое создание юнитов из бараков по таймеру
 */

import type { GameState, Unit, PlayerId } from "@/types/game";
import { createUnit, getSpawnInterval, getUnitTarget, GAME_CONFIG } from "../gameLogic";

/**
 * Обработка автоматического спавна юнитов из бараков
 * @param state - Текущее состояние игры
 * @returns Обновленное состояние игры с новыми юнитами
 */
export function applySpawnTick(state: GameState): GameState {
  const newState: GameState = { ...state };
  const unitsToAdd: Array<{ playerId: PlayerId; unit: Unit }> = [];

  newState.players = newState.players.map((player) => {
    if (!player.isActive) return player;

    const updatedBarracks = player.barracks.map((barrack, index) => {
      if (barrack.health <= 0) return barrack;

      const spawnInterval = getSpawnInterval(barrack.level);
      const currentCooldown = barrack.spawnCooldown ?? spawnInterval;
      const newCooldown = currentCooldown - GAME_CONFIG.gameLoopInterval;

      if (newCooldown <= 0) {
        const targetData = getUnitTarget(
          player.id,
          index,
          GAME_CONFIG.mapSize
        );
        const unitType = "warrior"; // базовый тип для авто-спавна

        for (let i = 0; i < barrack.level; i++) {
          const offsetX = (Math.random() - 0.5) * 20;
          const offsetY = (Math.random() - 0.5) * 20;
          const spawnPosition = {
            x: barrack.position.x + offsetX,
            y: barrack.position.y + offsetY,
          };

          const newUnit = createUnit(
            unitType,
            player.id,
            spawnPosition,
            targetData,
            player.upgrades,
            index
          );

          unitsToAdd.push({ playerId: player.id, unit: newUnit });
        }

        return {
          ...barrack,
          spawnCooldown: spawnInterval,
        };
      }

      return {
        ...barrack,
        spawnCooldown: newCooldown,
      };
    });

    return {
      ...player,
      barracks: updatedBarracks,
    };
  });

  unitsToAdd.forEach(({ playerId, unit }) => {
    const playerIndex = newState.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== -1) {
      newState.players[playerIndex].units.push(unit);
    }
  });

  return newState;
}

