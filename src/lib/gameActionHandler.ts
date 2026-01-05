/**
 * Обработчик игровых действий на сервере
 * Валидирует и применяет действия игроков
 */

import type { GameState, PlayerId, UnitType, CastleUpgrades } from "@/types/game";
import type { GameAction } from "@/types/gameActions";
import {
  GAME_CONFIG,
  getUnitTarget,
  createUnit,
  hasEnemyInBarrackCell,
  hasAllyWarriorInBarrackCell,
  getSpawnInterval,
} from "@/lib/gameLogic";

/**
 * Обрабатывает действие игрока
 * Возвращает новое состояние игры или null, если действие невалидно
 */
export function handleGameAction(
  gameState: GameState,
  action: GameAction,
  playerId: PlayerId
): GameState | null {
  // Проверяем, что действие от правильного игрока
  if (action.playerId !== playerId) {
    console.warn(`Action playerId mismatch: ${action.playerId} vs ${playerId}`);
    return null;
  }

  const player = gameState.players[playerId];
  if (!player || !player.isActive) {
    console.warn(`Player ${playerId} is not active`);
    return null;
  }

  switch (action.type) {
    case "buyUnit":
      return handleBuyUnit(gameState, playerId, action.data);
    case "upgradeBuilding":
      return handleUpgradeBuilding(gameState, playerId, action.data);
    case "repairBuilding":
      return handleRepairBuilding(gameState, playerId, action.data);
    case "upgradeCastleStat":
      return handleUpgradeCastleStat(gameState, playerId, action.data);
    case "togglePause":
      // Пауза - глобальное действие, применяется сразу
      return {
        ...gameState,
        isPaused: !gameState.isPaused,
      };
    case "setGameSpeed":
      // Скорость игры - глобальное действие
      return {
        ...gameState,
        gameSpeed: action.data.speed,
      };
    case "toggleAutoUpgrade":
      // Автопрокачка - локальное действие игрока, не требует обработки на сервере
      return gameState;
    default:
      console.warn(`Unknown action type: ${(action as any).type}`);
      return null;
  }
}

/**
 * Обработка покупки юнита
 * Полная логика с проверкой всех условий
 */
function handleBuyUnit(
  gameState: GameState,
  playerId: PlayerId,
  data: { barrackId: string; unitType: UnitType }
): GameState | null {
  const player = gameState.players[playerId];
  if (!player || !player.isActive) {
    return null;
  }

  const barrack = player.barracks.find((b) => b.id === data.barrackId);
  if (!barrack || barrack.health <= 0) {
    return null;
  }

  const cost = GAME_CONFIG.unitCost[data.unitType];
  const availableUnits = barrack.availableUnits || 0;
  const now = Date.now();

  // Проверка кулдауна (5 секунд)
  if (
    barrack.lastUnitPurchaseTime &&
    now - barrack.lastUnitPurchaseTime < 5000
  ) {
    return null; // Кулдаун еще не прошел
  }

  // Собираем всех юнитов для проверки
  const allUnits = gameState.players
    .flatMap((p) => p.units)
    .filter((u) => u.health > 0);

  // Проверка: есть ли враг в клетке барака
  const hasEnemy = hasEnemyInBarrackCell(barrack, allUnits);
  if (!hasEnemy) {
    return null; // Нет врагов в клетке - не покупаем
  }

  // Проверка: нет ли союзного воина в клетке барака
  const hasAllyWarrior = hasAllyWarriorInBarrackCell(barrack, allUnits);
  if (hasAllyWarrior) {
    return null; // Есть союзный воин - не покупаем
  }

  if (player.gold >= cost && availableUnits > 0) {
    const barrackIndex = player.barracks.findIndex(
      (b) => b.id === data.barrackId
    );
    const targetData = getUnitTarget(
      playerId,
      barrackIndex,
      GAME_CONFIG.mapSize
    );
    const newUnit = createUnit(
      data.unitType,
      playerId,
      barrack.position,
      targetData,
      player.upgrades,
      barrackIndex
    );

    return {
      ...gameState,
      players: gameState.players.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            gold: p.gold - cost,
            units: [...p.units, newUnit],
            barracks: p.barracks.map((b) =>
              b.id === data.barrackId
                ? {
                    ...b,
                    availableUnits: availableUnits - 1,
                    lastUnitPurchaseTime: now,
                  }
                : b
            ),
          };
        }
        return p;
      }),
    };
  }

  return null;
}

/**
 * Обработка улучшения здания
 */
function handleUpgradeBuilding(
  gameState: GameState,
  playerId: PlayerId,
  data: { buildingId: string }
): GameState | null {
  const player = gameState.players[playerId];
  if (!player || !player.isActive) {
    return null;
  }

  const building =
    player.castle.id === data.buildingId
      ? player.castle
      : [...player.barracks, ...player.towers].find(
          (b) => b.id === data.buildingId
        );

  if (!building) {
    return null;
  }

  const upgradeCost = building.level * 200;

  if (
    player.gold >= upgradeCost &&
    (!building.upgradeCooldown || building.upgradeCooldown <= 0)
  ) {
    return {
      ...gameState,
      players: gameState.players.map((p) => {
        if (p.id === playerId) {
          if (p.castle.id === data.buildingId) {
            return {
              ...p,
              gold: p.gold - upgradeCost,
              castle: {
                ...p.castle,
                level: p.castle.level + 1,
                maxHealth: p.castle.maxHealth + 200,
                health: Math.min(
                  p.castle.health + 200,
                  p.castle.maxHealth + 200
                ),
                upgradeCooldown: 5000,
              },
            };
          } else if (p.barracks.some((b) => b.id === data.buildingId)) {
            const upgradedBarrack = p.barracks.find(
              (b) => b.id === data.buildingId
            );
            if (upgradedBarrack) {
              const newLevel = upgradedBarrack.level + 1;
              // Бараки можно улучшать до 3 уровня только если замок минимум 2 уровня
              if (newLevel >= 3 && p.castle.level < 2) {
                return p;
              }
              const newSpawnInterval = getSpawnInterval(newLevel);
              return {
                ...p,
                gold: p.gold - upgradeCost,
                barracks: p.barracks.map((b) =>
                  b.id === data.buildingId
                    ? {
                        ...b,
                        level: newLevel,
                        maxHealth: b.maxHealth + 100,
                        health: Math.min(
                          b.health + 100,
                          b.maxHealth + 100
                        ),
                        maxAvailableUnits: (b.maxAvailableUnits || 5) + 2,
                        upgradeCooldown: 5000,
                        spawnCooldown: Math.min(
                          b.spawnCooldown || newSpawnInterval,
                          newSpawnInterval
                        ), // Обновляем интервал спавна при улучшении
                      }
                    : b
                ),
              };
            }
          } else if (p.towers.some((t) => t.id === data.buildingId)) {
            const upgradedTower = p.towers.find(
              (t) => t.id === data.buildingId
            );
            if (upgradedTower) {
              const newLevel = upgradedTower.level + 1;
              // Башни можно улучшать до 50 уровня
              if (newLevel > 50) {
                return p;
              }
              return {
                ...p,
                gold: p.gold - upgradeCost,
                towers: p.towers.map((t) =>
                  t.id === data.buildingId
                    ? {
                        ...t,
                        level: newLevel,
                        maxHealth: t.maxHealth + 100,
                        health: Math.min(
                          t.health + 100,
                          t.maxHealth + 100
                        ),
                        attack: (t.attack || 50) + 10,
                        upgradeCooldown: 5000,
                      }
                    : t
                ),
              };
            }
          }
        }
        return p;
      }),
    };
  }

  return null;
}

/**
 * Обработка ремонта здания
 */
function handleRepairBuilding(
  gameState: GameState,
  playerId: PlayerId,
  data: { buildingId: string }
): GameState | null {
  const player = gameState.players[playerId];
  if (!player || !player.isActive) {
    return null;
  }

  const building =
    player.castle.id === data.buildingId
      ? player.castle
      : [...player.barracks, ...player.towers].find(
          (b) => b.id === data.buildingId
        );

  if (!building || building.health >= building.maxHealth) {
    return null;
  }

  const repairCost = 100;
  const repairAmount = building.maxHealth * 0.3;

  if (
    player.gold >= repairCost &&
    (!building.repairCooldown || building.repairCooldown <= 0)
  ) {
    const repairedHealth = Math.min(
      building.maxHealth,
      building.health + repairAmount
    );
    const updatedBuilding = {
      ...building,
      health: repairedHealth,
      repairCooldown: 300000, // 5 минут кулдаун на ремонт
    };

    return {
      ...gameState,
      players: gameState.players.map((p) => {
        if (p.id === playerId) {
          if (p.castle.id === data.buildingId) {
            return {
              ...p,
              gold: p.gold - repairCost,
              castle: updatedBuilding,
            };
          } else if (p.barracks.some((b) => b.id === data.buildingId)) {
            return {
              ...p,
              gold: p.gold - repairCost,
              barracks: p.barracks.map((b) =>
                b.id === data.buildingId ? updatedBuilding : b
              ),
            };
          } else {
            return {
              ...p,
              gold: p.gold - repairCost,
              towers: p.towers.map((t) =>
                t.id === data.buildingId ? updatedBuilding : t
              ),
            };
          }
        }
        return p;
      }),
    };
  }

  return null;
}

/**
 * Обработка улучшения параметра замка
 */
function handleUpgradeCastleStat(
  gameState: GameState,
  playerId: PlayerId,
  data: { stat: keyof CastleUpgrades }
): GameState | null {
  const player = gameState.players[playerId];
  if (!player || !player.isActive) {
    return null;
  }

  const cost = (player.upgrades[data.stat] + 1) * 150;
  const newLevel = player.upgrades[data.stat] + 1;

  // Статы замка можно улучшать до 3 уровня только если замок минимум 2 уровня
  if (newLevel >= 3 && player.castle.level < 2) {
    return null;
  }

  if (player.gold >= cost) {
    const newUpgrades = { ...player.upgrades };
    newUpgrades[data.stat] += 1;

    let newGoldIncome = player.goldIncome;
    if (data.stat === "goldIncome") {
      newGoldIncome += 5;
    }

    // Применяем улучшения к зданиям
    const buildingHealthBonus = newUpgrades.buildingHealth * 200; // +200 HP за уровень
    const buildingAttackBonus = newUpgrades.buildingAttack * 10; // +10 атаки за уровень

    // Базовые значения (без улучшений)
    const baseCastleHealth = 2000;
    const baseCastleAttack = 20;
    const baseTowerHealth = 500;
    const baseTowerAttack = 30;
    const baseBarrackHealth = 1000;

    // Базовые значения защиты для каждого типа юнита
    const baseDefenseStats = {
      warrior: 10,
      archer: 5,
      mage: 3,
    };

    // Если улучшаем здоровье зданий, восстанавливаем здоровье
    const healthIncrease = data.stat === "buildingHealth" ? 200 : 0;

    // Рассчитываем множитель защиты для юнитов
    const defenseMultiplier = 1 + newUpgrades.defense * 0.1; // +10% за уровень

    return {
      ...gameState,
      players: gameState.players.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            gold: p.gold - cost,
            upgrades: newUpgrades,
            goldIncome: newGoldIncome,
            castle: {
              ...p.castle,
              maxHealth: baseCastleHealth + buildingHealthBonus,
              health: Math.min(
                p.castle.health + healthIncrease,
                baseCastleHealth + buildingHealthBonus
              ),
              attack: baseCastleAttack + buildingAttackBonus,
            },
            towers: p.towers.map((tower) => ({
              ...tower,
              maxHealth: baseTowerHealth + buildingHealthBonus,
              health: Math.min(
                tower.health + healthIncrease,
                baseTowerHealth + buildingHealthBonus
              ),
              attack: baseTowerAttack + buildingAttackBonus,
            })),
            barracks: p.barracks.map((barrack) => ({
              ...barrack,
              maxHealth: baseBarrackHealth + buildingHealthBonus,
              health: Math.min(
                barrack.health + healthIncrease,
                baseBarrackHealth + buildingHealthBonus
              ),
            })),
            // Обновляем защиту всех существующих юнитов
            units: p.units.map((unit) => {
              const baseDefense = baseDefenseStats[unit.type];
              return {
                ...unit,
                defense: Math.floor(baseDefense * defenseMultiplier),
              };
            }),
          };
        }
        return p;
      }),
    };
  }

  return null;
}

