/**
 * Модуль обновления состояния игры
 * Отвечает за применение всех изменений к состоянию игры
 */

import { GameState, Player, Unit, Building, PlayerId } from "@/types/game";
import { CombatStats } from "./unitCombat";

export interface StateUpdates {
  unitsMap: Map<string, Unit>;
  buildingsMap: Map<string, Building>;
  killRewards: Map<PlayerId, number>;
  statsUpdates: Map<PlayerId, CombatStats>;
}

/**
 * Применяет обновления к состоянию игры
 */
export function applyStateUpdates(
  gameState: GameState,
  updates: StateUpdates
): GameState {
  const { unitsMap, buildingsMap, killRewards, statsUpdates } = updates;

  // Проверяем, есть ли изменения
  const hasChanges =
    unitsMap.size > 0 ||
    buildingsMap.size > 0 ||
    killRewards.size > 0 ||
    Array.from(statsUpdates.values()).some(
      (stats) =>
        stats.unitsKilled > 0 ||
        stats.unitsLost > 0 ||
        stats.damageDealt > 0 ||
        stats.damageTaken > 0 ||
        stats.goldEarned > 0
    );

  if (!hasChanges) {
    return gameState;
  }

  return {
    ...gameState,
    players: gameState.players.map((player) => {
      if (!player.isActive) return player;

      const reward = killRewards.get(player.id) || 0;
      const statsUpdate = statsUpdates.get(player.id) || {
        unitsKilled: 0,
        unitsLost: 0,
        damageDealt: 0,
        damageTaken: 0,
        goldEarned: 0,
      };

      // Обновляем юниты
      const updatedUnits = player.units
        .map((unit) => {
          const updated = unitsMap.get(unit.id);
          return updated || unit;
        })
        .filter((u) => u.health > 0);

      // Обновляем здания
      const updatedCastle = buildingsMap.get(player.castle.id) || player.castle;
      const updatedBarracks = player.barracks.map(
        (b) => buildingsMap.get(b.id) || b
      );
      const updatedTowers = player.towers.map(
        (t) => buildingsMap.get(t.id) || t
      );

      return {
        ...player,
        gold: player.gold + reward,
        stats: {
          unitsKilled: player.stats.unitsKilled + statsUpdate.unitsKilled,
          unitsLost: player.stats.unitsLost + statsUpdate.unitsLost,
          buildingsDestroyed: player.stats.buildingsDestroyed,
          buildingsLost: player.stats.buildingsLost,
          damageDealt: player.stats.damageDealt + statsUpdate.damageDealt,
          damageTaken: player.stats.damageTaken + statsUpdate.damageTaken,
          goldEarned: player.stats.goldEarned + statsUpdate.goldEarned,
        },
        units: updatedUnits,
        castle: updatedCastle,
        barracks: updatedBarracks,
        towers: updatedTowers,
      };
    }),
  };
}

