/**
 * Серверный игровой цикл
 * Обновляет состояние игры на сервере
 */

import type { GameState, PlayerId, Unit, Building as BuildingType } from "@/types/game";
import { gameServer, type GameRoom } from "./gameServer";
import type { Server as SocketIOServer } from "socket.io";
import {
  GAME_CONFIG,
  getSpawnInterval,
  getUnitTarget,
  createUnit,
  getDistance,
} from "@/lib/gameLogic";
import type { GameAction } from "@/types/gameActions";
import { handleGameAction } from "./gameActionHandler";
import { processUnitMovement } from "./game/unitMovement";
import { separateUnits } from "./gameLogic";
import { processUnitCombat } from "./game/unitCombat";
import {
  processBuildingAttacks,
  processUnitAttacksOnBuildings,
} from "./game/buildingCombat";
import { COMBAT_CONSTANTS } from "./game/constants";

const GAME_LOOP_INTERVAL = 50; // 50мс, как в клиентской версии
const gameLoopTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Начисление пассивного дохода золота
 * (инком считается только на сервере для сетевой игры)
 */
function applyGoldIncomeTick(room: GameRoom, deltaTime: number): GameState {
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

/**
 * Один тик автоматического спавна юнитов из бараков
 * (аналог клиентской логики, завязанной на GAME_CONFIG.gameLoopInterval)
 */
function applySpawnTick(state: GameState): GameState {
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

/**
 * Один тик обновления кулдаунов ремонта зданий
 */
function applyCooldownTick(room: GameRoom, deltaTime: number): GameState {
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

/**
 * Один тик восстановления доступных юнитов в бараках
 */
function applyUnitRestoreTick(room: GameRoom, deltaTime: number): GameState {
  const interval = GAME_CONFIG.unitRestoreTime; // мс
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
      players: state.players.map((player) => ({
        ...player,
        barracks: player.barracks.map((barrack) => {
          if (
            barrack.availableUnits !== undefined &&
            barrack.availableUnits < (barrack.maxAvailableUnits || 5)
          ) {
            return {
              ...barrack,
              availableUnits: Math.min(
                barrack.maxAvailableUnits || 5,
                (barrack.availableUnits || 0) + 1
              ),
            };
          }
          return barrack;
        }),
      })),
    };
  }

  return state;
}

/**
 * Типы веток авторазвития
 */
type AutoUpgradeBranch = "economic" | "offensive" | "defensive";

/**
 * Определяет ветку авторазвития для игрока на основе текущей ситуации
 */
function determineAutoUpgradeBranch(
  player: GameState["players"][0],
  allPlayers: GameState["players"]
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
 * Получает приоритетный стат для улучшения в зависимости от ветки
 */
function getUpgradeStatForBranch(
  branch: AutoUpgradeBranch,
  player: GameState["players"][0]
): keyof GameState["players"][0]["upgrades"] | null {
  const upgrades = player.upgrades;
  const gold = player.gold;

  switch (branch) {
    case "economic":
      // Экономическая ветка: доход > здоровье зданий > здоровье замка
      if (gold >= (upgrades.goldIncome + 1) * 150) {
        if (upgrades.goldIncome < 3) return "goldIncome";
        if (upgrades.buildingHealth < 2 && gold >= (upgrades.buildingHealth + 1) * 150) {
          return "buildingHealth";
        }
        if (upgrades.health < 2 && gold >= (upgrades.health + 1) * 150) {
          return "health";
        }
      }
      break;

    case "offensive":
      // Атакующая ветка: атака > атака зданий > доход
      if (gold >= (upgrades.attack + 1) * 150) {
        if (upgrades.attack < 3) return "attack";
        if (upgrades.buildingAttack < 2 && gold >= (upgrades.buildingAttack + 1) * 150) {
          return "buildingAttack";
        }
        if (upgrades.goldIncome < 2 && gold >= (upgrades.goldIncome + 1) * 150) {
          return "goldIncome";
        }
      }
      break;

    case "defensive":
      // Защитная ветка: защита > здоровье > здоровье зданий
      if (gold >= (upgrades.defense + 1) * 150) {
        if (upgrades.defense < 3) return "defense";
        if (upgrades.health < 2 && gold >= (upgrades.health + 1) * 150) {
          return "health";
        }
        if (upgrades.buildingHealth < 2 && gold >= (upgrades.buildingHealth + 1) * 150) {
          return "buildingHealth";
        }
      }
      break;
  }

  return null;
}

/**
 * Улучшенное серверное авторазвитие с 3 ветками логики
 * - ИИ-игроки (aiSlots) всегда получают автоапгрейд
 * - Реальные игроки получают автоапгрейд только если включён их индивидуальный флаг player.autoUpgrade
 * 
 * Ветки развития:
 * 1. Экономическая - фокус на доход и экономику (goldIncome, buildingHealth, health)
 * 2. Атакующая - фокус на атаку и урон (attack, buildingAttack, goldIncome)
 * 3. Защитная - фокус на защиту и выживание (defense, health, buildingHealth)
 */
function applyAutoUpgradeTick(room: GameRoom, deltaTime: number): GameState {
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
        const isHuman = !isAI;
        if (isAI) return true; // ИИ-игроки всегда получают автоапгрейд
        // Для людей смотрим индивидуальный флаг авторазвития
        return p.autoUpgrade && isHuman;
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

      // Определяем ветку развития на основе текущей ситуации
      const branch = determineAutoUpgradeBranch(player, newState.players);

      // Получаем приоритетный стат для улучшения
      const statToUpgrade = getUpgradeStatForBranch(branch, player);

      if (!statToUpgrade) {
        continue; // Нет доступных улучшений для этой ветки
      }

      // Проверяем ограничения (например, некоторые статы требуют уровень замка >= 2)
      const cost = (player.upgrades[statToUpgrade] + 1) * 150;
      if (player.gold < cost) {
        continue;
      }

      // Проверяем ограничения по уровню замка
      if (
        (statToUpgrade === "defense" ||
          statToUpgrade === "health" ||
          statToUpgrade === "goldIncome" ||
          statToUpgrade === "buildingHealth" ||
          statToUpgrade === "buildingAttack") &&
        player.upgrades[statToUpgrade] >= 2 &&
        player.castle.level < 2
      ) {
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

/**
 * Простейший серверный ИИ для игроков из aiSlots
 * - Раз в 3 секунды пытается сделать одно из действий:
 *   - купить юнита
 *   - улучшить здание
 *   - починить здание
 */
function applyAiTick(room: GameRoom, deltaTime: number): GameState {
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

      // 40% шанс — попытаться купить юнита
      if (actionRand < 0.4) {
        const aliveBarracks = player.barracks.filter((b) => b.health > 0);
        if (aliveBarracks.length === 0) return;
        const barrack =
          aliveBarracks[Math.floor(Math.random() * aliveBarracks.length)];

        const action: GameAction = {
          type: "buyUnit",
          playerId,
          timestamp: Date.now(),
          actionId: `ai-buyUnit-${playerId}-${Date.now()}-${Math.random()}`,
          data: {
            barrackId: barrack.id,
            unitType: "warrior",
          },
        };

        const updated = handleGameAction(newState, action, playerId);
        if (updated) {
          newState = updated;
        }
        return;
      }

      // 30% — попытка улучшить здание
      if (actionRand < 0.7) {
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

        if (upgradableIds.length === 0) return;

        const buildingId =
          upgradableIds[Math.floor(Math.random() * upgradableIds.length)];

        const action: GameAction = {
          type: "upgradeBuilding",
          playerId,
          timestamp: Date.now(),
          actionId: `ai-upgradeBuilding-${playerId}-${Date.now()}-${Math.random()}`,
          data: { buildingId },
        };

        const updated = handleGameAction(newState, action, playerId);
        if (updated) {
          newState = updated;
        }
        return;
      }

      // 30% — попытка починить здание
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

      if (damagedIds.length === 0) return;

      const buildingId =
        damagedIds[Math.floor(Math.random() * damagedIds.length)];

      const action: GameAction = {
        type: "repairBuilding",
        playerId,
        timestamp: Date.now(),
        actionId: `ai-repairBuilding-${playerId}-${Date.now()}-${Math.random()}`,
        data: { buildingId },
      };

      const updated = handleGameAction(newState, action, playerId);
      if (updated) {
        newState = updated;
      }
    });

    state = newState;
  }

  return state;
}

/**
 * Обработка движения юнитов на сервере
 */
function applyUnitMovementTick(
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

/**
 * Обработка боя на сервере
 * (атаки между юнитами, атаки зданий по юнитам, атаки юнитов по зданиям)
 */
function applyCombatTick(
  room: GameRoom,
  deltaTime: number
): GameState {
  let state: GameState = room.gameState;
  const now = Date.now();

  // Получаем все юниты и здания
  const allUnitsList = state.players
    .flatMap((p) => p.units)
    .filter((u) => u.health > 0);

  // Сохраняем исходные юниты ДО обновления для проверки дистанции атаки
  const originalUnitsList = [...allUnitsList];

  // Обрабатываем атаки между юнитами
  const combatResult = processUnitCombat(
    allUnitsList,
    originalUnitsList,
    now
  );

  // Обрабатываем атаки зданий по юнитам
  const allBuildings = state.players.flatMap((p) => [
    p.castle,
    ...p.barracks,
    ...p.towers,
  ]);
  const buildingAttacks = processBuildingAttacks(
    allBuildings,
    allUnitsList,
    now
  );

  // Объединяем обновления юнитов из боевой системы и атак зданий
  buildingAttacks.updatedUnits.forEach((unit, id) => {
    combatResult.unitsMap.set(id, unit);
  });

  // Обрабатываем атаки юнитов по зданиям
  const unitsAttackingBuildings = new Map<string, Unit>();
  combatResult.unitsMap.forEach((unit, id) => {
    unitsAttackingBuildings.set(id, unit);
  });
  const unitBuildingAttacks = processUnitAttacksOnBuildings(
    allBuildings,
    allUnitsList,
    unitsAttackingBuildings,
    now
  );

  // Объединяем все обновления зданий
  const buildingsMap = new Map<string, BuildingType>();
  buildingAttacks.updatedBuildings.forEach((building, id) => {
    buildingsMap.set(id, building);
  });
  unitBuildingAttacks.updatedBuildings.forEach((building, id) => {
    buildingsMap.set(id, building);
  });

  // Объединяем обновления юнитов из атак по зданиям
  unitBuildingAttacks.updatedUnits.forEach((unit, id) => {
    const existing = combatResult.unitsMap.get(id);
    if (existing) {
      combatResult.unitsMap.set(id, { ...existing, ...unit });
    } else {
      combatResult.unitsMap.set(id, unit);
    }
  });

  // Применяем обновления к состоянию
  state = {
    ...state,
    players: state.players.map((player) => {
      // Обновляем юниты
      const updatedUnits = player.units.map((unit) => {
        const updated = combatResult.unitsMap.get(unit.id);
        return updated || unit;
      }).filter((u) => u.health > 0);

      // Обновляем здания
      let updatedCastle = player.castle;
      const castleUpdate = buildingsMap.get(player.castle.id);
      if (castleUpdate) {
        updatedCastle = castleUpdate as BuildingType;
      }

      const updatedBarracks = player.barracks.map((barrack) => {
        const updated = buildingsMap.get(barrack.id);
        return (updated || barrack) as BuildingType;
      });

      const updatedTowers = player.towers.map((tower) => {
        const updated = buildingsMap.get(tower.id);
        return (updated || tower) as BuildingType;
      });

      // Начисляем награды за убийства
      const killReward = combatResult.killRewards.get(player.id) || 0;
      const newGold = player.gold + killReward;

      // Обновляем статистику
      const statsUpdate = combatResult.statsUpdates.get(player.id);
      const newStats = statsUpdate
        ? {
            ...player.stats,
            unitsKilled: player.stats.unitsKilled + statsUpdate.unitsKilled,
            unitsLost: player.stats.unitsLost + statsUpdate.unitsLost,
            damageDealt: player.stats.damageDealt + statsUpdate.damageDealt,
            damageTaken: player.stats.damageTaken + statsUpdate.damageTaken,
            goldEarned: player.stats.goldEarned + killReward,
          }
        : player.stats;

      // Обрабатываем разрушенные здания
      const prevBuildings = [
        player.castle,
        ...player.barracks,
        ...player.towers,
      ];
      let buildingsDestroyed = 0;
      let buildingsLost = 0;
      let buildingReward = 0;

      prevBuildings.forEach((prevBuilding) => {
        const currentBuilding = buildingsMap.get(prevBuilding.id);
        if (
          prevBuilding.health > 0 &&
          currentBuilding &&
          currentBuilding.health <= 0
        ) {
          // Здание было разрушено
          if (player.id === prevBuilding.playerId) {
            buildingsLost += 1;
          }

          // Находим атакующих для награды (юниты, которые атаковали это здание)
          const attackers = new Set<PlayerId>();
          // Используем обновленные юниты из результата боя
          const allUpdatedUnits = state.players.flatMap((p) => p.units);
          allUpdatedUnits.forEach((unit) => {
            if (unit.playerId !== prevBuilding.playerId) {
              const distance = getDistance(
                unit.position,
                prevBuilding.position
              );
              if (distance < COMBAT_CONSTANTS.UNIT_ATTACK_BUILDING_DISTANCE) {
                attackers.add(unit.playerId);
              }
            }
          });

          if (attackers.size > 0) {
            const reward =
              GAME_CONFIG.buildingDestroyReward[prevBuilding.type] || 0;
            const rewardPerPlayer = Math.floor(reward / attackers.size);
            if (attackers.has(player.id)) {
              // Игрок атаковал здание другого игрока
              buildingsDestroyed += 1;
              buildingReward += rewardPerPlayer;
            }
          }
        }
      });

      return {
        ...player,
        units: updatedUnits,
        castle: updatedCastle,
        barracks: updatedBarracks,
        towers: updatedTowers,
        gold: newGold + buildingReward,
        stats: {
          ...newStats,
          buildingsDestroyed: player.stats.buildingsDestroyed + buildingsDestroyed,
          buildingsLost: player.stats.buildingsLost + buildingsLost,
          goldEarned: player.stats.goldEarned + buildingReward,
        },
      };
    }),
  };

  return state;
}

/**
 * Запускает игровой цикл для игровой комнаты
 */
export function startGameLoop(io: SocketIOServer, roomId: string): void {
  // Останавливаем предыдущий цикл, если есть
  stopGameLoop(roomId);

  let lastUpdate = Date.now();

  const timer = setInterval(() => {
    const room = gameServer.getGame(roomId);
    if (!room) {
      // Комната не существует, останавливаем цикл
      stopGameLoop(roomId);
      return;
    }

    const now = Date.now();
    const deltaTime = (now - lastUpdate) * room.gameState.gameSpeed;
    lastUpdate = now;

    // Пропускаем обновление, если игра на паузе
    if (room.gameState.isPaused) {
      return;
    }

    // Обновляем состояние игры
    let newGameState: GameState = room.gameState;

    // 1) Пассивный доход золота (инком)
    newGameState = applyGoldIncomeTick(room as GameRoom, deltaTime);
    // 2) Автоматический спавн юнитов из бараков
    newGameState = applySpawnTick(newGameState);
    // 3) Кулдауны ремонта зданий
    room.gameState = newGameState;
    newGameState = applyCooldownTick(room as GameRoom, deltaTime);
    // 4) Восстановление доступных юнитов в бараках
    room.gameState = newGameState;
    newGameState = applyUnitRestoreTick(room as GameRoom, deltaTime);
    // 5) Авторазвитие (простая версия на сервере)
    room.gameState = newGameState;
    newGameState = applyAutoUpgradeTick(room as GameRoom, deltaTime);
    // 6) ИИ для слотов из aiSlots
    room.gameState = newGameState;
    newGameState = applyAiTick(room as GameRoom, deltaTime);
    // 7) Движение юнитов
    room.gameState = newGameState;
    newGameState = applyUnitMovementTick(room as GameRoom, deltaTime);
    // 8) Бой (атаки между юнитами, атаки зданий по юнитам, атаки юнитов по зданиям)
    room.gameState = newGameState;
    newGameState = applyCombatTick(room as GameRoom, deltaTime);

    // 9) Обновляем игровое время (для отображения, в секундах)
    newGameState = {
      ...newGameState,
      gameTime: newGameState.gameTime + deltaTime / 1000,
    };

    // Обновляем состояние на сервере
    gameServer.updateGameState(roomId, newGameState);

    // Синхронизация будет отправлена через gameSync
  }, GAME_LOOP_INTERVAL);

  gameLoopTimers.set(roomId, timer);
}

/**
 * Останавливает игровой цикл для игровой комнаты
 */
export function stopGameLoop(roomId: string): void {
  const timer = gameLoopTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    gameLoopTimers.delete(roomId);
  }
}

/**
 * Останавливает все активные игровые циклы
 */
export function stopAllGameLoops(): void {
  gameLoopTimers.forEach((timer, roomId) => {
    clearInterval(timer);
  });
  gameLoopTimers.clear();
}

