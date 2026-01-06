/**
 * Модуль автоматического развития игроков
 * Отвечает за автоматическое улучшение статов игроков с использованием 3 веток логики
 */

import type { GameState, PlayerId } from "@/types/game";
import type { GameRoom } from "../gameServer";
import type { GameAction } from "@/types/gameActions";
import { handleGameAction } from "../gameActionHandler";

/**
 * Типы веток авторазвития
 */
export type AutoUpgradeBranch = "economic" | "offensive" | "defensive";

/**
 * Определяет ветку авторазвития для игрока на основе текущей ситуации
 */
export function determineAutoUpgradeBranch(
  player: GameState["players"][0],
  allPlayers: GameState["players"],
  isAI: boolean = false
): AutoUpgradeBranch {
  // Анализируем ситуацию игрока
  const totalUnits = player.units.length;
  const totalEnemyUnits = allPlayers
    .filter((p) => p.id !== player.id && p.isActive)
    .reduce((sum, p) => sum + p.units.length, 0);

  const playerHealth = player.castle.health / player.castle.maxHealth;
  const avgEnemyHealth = allPlayers
    .filter((p) => p.id !== player.id && p.isActive)
    .map((p) => p.castle.health / p.castle.maxHealth)
    .reduce((sum, h, _, arr) => sum + h / arr.length, 0);

  const goldRatio = player.gold / 1000; // Нормализуем золото

  // Агрессивная стратегия для ИИ
  if (isAI) {
    // ИИ всегда предпочитает атакующую ветку, если есть хотя бы минимальный доход
    if (player.upgrades.goldIncome >= 1 && goldRatio >= 0.3) {
      // Если атака еще не на высоком уровне, приоритет атаке
      if (player.upgrades.attack < 5) {
        return "offensive";
      }
      // Если атака уже хорошая, но атака зданий слабая - улучшаем здания
      if (player.upgrades.buildingAttack < 3) {
        return "offensive";
      }
      // Если все атакующие статы хорошие, но защита слабая - немного защиты
      if (player.upgrades.defense < 3 && playerHealth < 0.5) {
        return "defensive";
      }
      // По умолчанию продолжаем атаку
      return "offensive";
    }
    
    // Только если очень мало золота - экономика
    if (player.upgrades.goldIncome < 1 || goldRatio < 0.2) {
      return "economic";
    }
    
    // В остальных случаях - атака
    return "offensive";
  }

  // Обычная логика для людей
  // Экономическая ветка: если мало золота или низкий доход
  if (player.upgrades.goldIncome < 2 || goldRatio < 0.5) {
    return "economic";
  }

  // Атакующая ветка: если больше юнитов у врагов или низкое здоровье врагов
  if (totalEnemyUnits > totalUnits * 1.2 || avgEnemyHealth < 0.7) {
    return "offensive";
  }

  // Защитная ветка: если здоровье игрока низкое или враги сильнее
  if (playerHealth < 0.6 || totalEnemyUnits > totalUnits) {
    return "defensive";
  }

  // По умолчанию - экономическая ветка
  return "economic";
}

/**
 * Получает максимальный уровень бараков игрока
 */
function getMaxBarrackLevel(player: GameState["players"][0]): number {
  if (player.barracks.length === 0) return 1;
  return Math.max(...player.barracks.map(b => b.level));
}

/**
 * Получает приоритетный стат для улучшения в зависимости от ветки
 */
export function getUpgradeStatForBranch(
  branch: AutoUpgradeBranch,
  player: GameState["players"][0],
  isAI: boolean = false
): keyof GameState["players"][0]["upgrades"] | null {
  const upgrades = player.upgrades;
  const gold = player.gold;
  const UPGRADE_COST_MULTIPLIER = 150;
  const maxBarrackLevel = getMaxBarrackLevel(player);
  
  // Минимальный уровень статов воинов должен быть равен уровню бараков
  const minWarriorStatsLevel = maxBarrackLevel;

  switch (branch) {
    case "economic":
      // Экономическая ветка: доход > здоровье зданий > здоровье замка
      // Но сначала убеждаемся, что статы воинов на уровне бараков
      if (upgrades.health < minWarriorStatsLevel && gold >= (upgrades.health + 1) * UPGRADE_COST_MULTIPLIER) {
        return "health";
      }
      if (upgrades.defense < minWarriorStatsLevel && gold >= (upgrades.defense + 1) * UPGRADE_COST_MULTIPLIER) {
        return "defense";
      }
      if (upgrades.attack < minWarriorStatsLevel && gold >= (upgrades.attack + 1) * UPGRADE_COST_MULTIPLIER) {
        return "attack";
      }
      if (gold >= (upgrades.goldIncome + 1) * UPGRADE_COST_MULTIPLIER) {
        if (upgrades.goldIncome < 5) return "goldIncome";
        if (upgrades.buildingHealth < 3 && gold >= (upgrades.buildingHealth + 1) * UPGRADE_COST_MULTIPLIER) {
          return "buildingHealth";
        }
        if (upgrades.health < 5 && gold >= (upgrades.health + 1) * UPGRADE_COST_MULTIPLIER) {
          return "health";
        }
      }
      break;

    case "offensive":
      // Атакующая ветка: атака > атака зданий > доход
      // Но сначала убеждаемся, что статы воинов на уровне бараков
      if (upgrades.attack < minWarriorStatsLevel && gold >= (upgrades.attack + 1) * UPGRADE_COST_MULTIPLIER) {
        return "attack";
      }
      if (upgrades.defense < minWarriorStatsLevel && gold >= (upgrades.defense + 1) * UPGRADE_COST_MULTIPLIER) {
        return "defense";
      }
      if (upgrades.health < minWarriorStatsLevel && gold >= (upgrades.health + 1) * UPGRADE_COST_MULTIPLIER) {
        return "health";
      }
      if (gold >= (upgrades.attack + 1) * UPGRADE_COST_MULTIPLIER) {
        // Для ИИ более агрессивная стратегия - приоритет атаке
        if (isAI) {
          // ИИ улучшает атаку до 15 уровня (вместо 10)
          if (upgrades.attack < 15) return "attack";
          // Атака зданий до 5 уровня (вместо 3)
          if (upgrades.buildingAttack < 5 && gold >= (upgrades.buildingAttack + 1) * UPGRADE_COST_MULTIPLIER) {
            return "buildingAttack";
          }
          // Только минимальный доход для ИИ
          if (upgrades.goldIncome < 2 && gold >= (upgrades.goldIncome + 1) * UPGRADE_COST_MULTIPLIER) {
            return "goldIncome";
          }
          // Продолжаем улучшать атаку даже после 15 уровня
          if (upgrades.attack < 20) return "attack";
        } else {
          // Обычная логика для людей
          if (upgrades.attack < 10) return "attack";
          if (upgrades.buildingAttack < 3 && gold >= (upgrades.buildingAttack + 1) * UPGRADE_COST_MULTIPLIER) {
            return "buildingAttack";
          }
          if (upgrades.goldIncome < 3 && gold >= (upgrades.goldIncome + 1) * UPGRADE_COST_MULTIPLIER) {
            return "goldIncome";
          }
        }
      }
      break;

    case "defensive":
      // Защитная ветка: защита > здоровье > здоровье зданий
      // Но сначала убеждаемся, что статы воинов на уровне бараков
      if (upgrades.defense < minWarriorStatsLevel && gold >= (upgrades.defense + 1) * UPGRADE_COST_MULTIPLIER) {
        return "defense";
      }
      if (upgrades.health < minWarriorStatsLevel && gold >= (upgrades.health + 1) * UPGRADE_COST_MULTIPLIER) {
        return "health";
      }
      if (upgrades.attack < minWarriorStatsLevel && gold >= (upgrades.attack + 1) * UPGRADE_COST_MULTIPLIER) {
        return "attack";
      }
      if (gold >= (upgrades.defense + 1) * UPGRADE_COST_MULTIPLIER) {
        if (upgrades.defense < 10) return "defense"; // Увеличиваем лимит до 10
        if (upgrades.health < 10 && gold >= (upgrades.health + 1) * UPGRADE_COST_MULTIPLIER) {
          return "health";
        }
        if (upgrades.buildingHealth < 3 && gold >= (upgrades.buildingHealth + 1) * UPGRADE_COST_MULTIPLIER) {
          return "buildingHealth";
        }
      }
      break;
  }

  return null;
}

/**
 * Проверяет ограничения по уровню замка для улучшения стата
 */
function canUpgradeStat(
  stat: keyof GameState["players"][0]["upgrades"],
  player: GameState["players"][0]
): boolean {
  const UPGRADE_COST_MULTIPLIER = 150;
  const cost = (player.upgrades[stat] + 1) * UPGRADE_COST_MULTIPLIER;

  if (player.gold < cost) {
    return false;
  }

  // Некоторые статы требуют уровень замка >= 2 для улучшения выше 2 уровня
  const statsRequiringCastleLevel2 = [
    "defense",
    "health",
    "goldIncome",
    "buildingHealth",
    "buildingAttack",
  ] as const;

  if (
    statsRequiringCastleLevel2.includes(stat as any) &&
    player.upgrades[stat] >= 2 &&
    player.castle.level < 2
  ) {
    return false;
  }

  return true;
}

/**
 * Улучшенное серверное авторазвитие с 3 ветками логики
 * - ИИ-игроки (aiSlots) всегда получают автоапгрейд
 * - Реальные игроки получают автоапгрейд только если включён их индивидуальный флаг player.autoUpgrade
 */
export function applyAutoUpgradeTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  const interval = 2000; // проверка каждые 2 секунды
  room.autoUpgradeTimer += deltaTime;

  if (room.autoUpgradeTimer < interval) {
    return room.gameState;
  }

  const ticks = Math.floor(room.autoUpgradeTimer / interval);
  room.autoUpgradeTimer = room.autoUpgradeTimer % interval;

  let state: GameState = room.gameState;

  for (let i = 0; i < ticks; i++) {
    const current = state;

    const playersToUpgrade: PlayerId[] = current.players
      .filter((p) => {
        if (!p.isActive) return false;
        const isAI = room.aiSlots.has(p.id);
        if (isAI) return true; // ИИ-игроки всегда получают автоапгрейд
        // Для людей смотрим индивидуальный флаг авторазвития
        return p.autoUpgrade;
      })
      .map((p) => p.id as PlayerId);

    if (playersToUpgrade.length === 0) {
      continue;
    }

    let newState = current;

    // Для каждого игрока определяем ветку и улучшаем соответствующий стат
    for (const playerId of playersToUpgrade) {
      const player = newState.players[playerId];
      if (!player || !player.isActive) continue;

      // Определяем, является ли игрок ИИ
      const isAI = room.aiSlots.has(playerId);

      // Определяем ветку развития на основе текущей ситуации
      const branch = determineAutoUpgradeBranch(player, newState.players, isAI);

      // Получаем приоритетный стат для улучшения
      const statToUpgrade = getUpgradeStatForBranch(branch, player, isAI);

      if (!statToUpgrade || !canUpgradeStat(statToUpgrade, player)) {
        continue;
      }

      // Применяем улучшение
      const action: GameAction = {
        type: "upgradeCastleStat",
        playerId,
        timestamp: Date.now(),
        actionId: `autoUpgrade-${branch}-${statToUpgrade}-${playerId}-${Date.now()}-${Math.random()}`,
        data: { stat: statToUpgrade },
      };

      const updated = handleGameAction(newState, action, playerId);
      if (updated) {
        newState = updated;
      }
    }

    state = newState;
  }

  return state;
}

