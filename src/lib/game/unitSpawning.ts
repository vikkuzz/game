/**
 * Модуль спавна юнитов
 * Отвечает за автоматическое создание юнитов из бараков
 */

import { Player, Unit, PlayerId, Building } from "@/types/game";
import { createUnit, getUnitTarget, getSpawnUnitType, getSpawnInterval, GAME_CONFIG } from "../gameLogic";

export interface SpawnResult {
  unitsToAdd: Array<{ playerId: PlayerId; unit: Unit }>;
  updatedBarracks: Building[];
}

/**
 * Обрабатывает спавн юнитов из бараков
 */
export function processUnitSpawning(
  players: Player[],
  gameTime: number
): SpawnResult {
  const unitsToAdd: Array<{ playerId: PlayerId; unit: Unit }> = [];
  const updatedBarracks: Building[] = [];

  players.forEach((player) => {
    if (!player.isActive) return;

    player.barracks.forEach((barrack, index) => {
      if (barrack.health <= 0) return;

      const spawnInterval = getSpawnInterval(barrack.level);
      const lastSpawnTime = barrack.spawnCooldown || 0;

      if (gameTime - lastSpawnTime >= spawnInterval) {
        const unitType = getSpawnUnitType(barrack.level);
        const targetData = getUnitTarget(player.id, index, GAME_CONFIG.mapSize);

        const newUnit = createUnit(
          unitType,
          player.id,
          barrack.position,
          targetData,
          player.upgrades,
          index
        );

        unitsToAdd.push({ playerId: player.id, unit: newUnit });

        updatedBarracks.push({
          ...barrack,
          spawnCooldown: gameTime,
        });
      }
    });
  });

  return { unitsToAdd, updatedBarracks };
}

