/**
 * Модуль ИИ для игроков
 * Отвечает за автоматические решения ИИ-игроков (покупка юнитов, улучшение зданий, ремонт)
 */

import type { GameState, PlayerId } from "@/types/game";
import type { GameRoom } from "../gameServer";
import type { GameAction } from "@/types/gameActions";
import { handleGameAction } from "../gameActionHandler";

/**
 * Вероятности действий ИИ
 */
const AI_ACTION_PROBABILITIES = {
  BUY_UNIT: 0.4, // 40%
  UPGRADE_BUILDING: 0.3, // 30%
  REPAIR_BUILDING: 0.3, // 30%
} as const;

/**
 * Получает список улучшаемых зданий игрока
 */
function getUpgradableBuildings(player: GameState["players"][0]): string[] {
  const upgradableIds: string[] = [];

  if (player.castle.health > 0) {
    upgradableIds.push(player.castle.id);
  }
  player.barracks.forEach((b) => {
    if (b.health > 0) upgradableIds.push(b.id);
  });
  player.towers.forEach((t) => {
    if (t.health > 0) upgradableIds.push(t.id);
  });

  return upgradableIds;
}

/**
 * Получает список поврежденных зданий игрока
 */
function getDamagedBuildings(player: GameState["players"][0]): string[] {
  const damagedIds: string[] = [];

  if (
    player.castle.health > 0 &&
    player.castle.health < player.castle.maxHealth
  ) {
    damagedIds.push(player.castle.id);
  }
  player.barracks.forEach((b) => {
    if (b.health > 0 && b.health < b.maxHealth) damagedIds.push(b.id);
  });
  player.towers.forEach((t) => {
    if (t.health > 0 && t.health < t.maxHealth) damagedIds.push(t.id);
  });

  return damagedIds;
}

/**
 * Обработка решений ИИ для игроков из aiSlots
 */
export function applyAiTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  const interval = 3000; // 3 секунды между решениями
  room.aiDecisionTimer += deltaTime;

  if (room.aiDecisionTimer < interval) {
    return room.gameState;
  }

  const ticks = Math.floor(room.aiDecisionTimer / interval);
  room.aiDecisionTimer = room.aiDecisionTimer % interval;

  let state: GameState = room.gameState;

  for (let i = 0; i < ticks; i++) {
    const current = state;
    let newState = current;

    room.aiSlots.forEach((playerId) => {
      const player = newState.players[playerId];
      if (!player || !player.isActive) return;

      const actionRand = Math.random();
      let action: GameAction | null = null;

      // 40% шанс — попытаться купить юнита
      if (actionRand < AI_ACTION_PROBABILITIES.BUY_UNIT) {
        const aliveBarracks = player.barracks.filter((b) => b.health > 0);
        if (aliveBarracks.length > 0) {
          const barrack =
            aliveBarracks[Math.floor(Math.random() * aliveBarracks.length)];

          action = {
            type: "buyUnit",
            playerId,
            timestamp: Date.now(),
            actionId: `ai-buyUnit-${playerId}-${Date.now()}-${Math.random()}`,
            data: {
              barrackId: barrack.id,
              unitType: "warrior",
            },
          };
        }
      }
      // 30% — попытка улучшить здание
      else if (actionRand < AI_ACTION_PROBABILITIES.BUY_UNIT + AI_ACTION_PROBABILITIES.UPGRADE_BUILDING) {
        const upgradableIds = getUpgradableBuildings(player);
        if (upgradableIds.length > 0) {
          const buildingId =
            upgradableIds[Math.floor(Math.random() * upgradableIds.length)];

          action = {
            type: "upgradeBuilding",
            playerId,
            timestamp: Date.now(),
            actionId: `ai-upgradeBuilding-${playerId}-${Date.now()}-${Math.random()}`,
            data: { buildingId },
          };
        }
      }
      // 30% — попытка починить здание
      else {
        const damagedIds = getDamagedBuildings(player);
        if (damagedIds.length > 0) {
          const buildingId =
            damagedIds[Math.floor(Math.random() * damagedIds.length)];

          action = {
            type: "repairBuilding",
            playerId,
            timestamp: Date.now(),
            actionId: `ai-repairBuilding-${playerId}-${Date.now()}-${Math.random()}`,
            data: { buildingId },
          };
        }
      }

      if (action) {
        const updated = handleGameAction(newState, action, playerId);
        if (updated) {
          newState = updated;
        }
      }
    });

    state = newState;
  }

  return state;
}

