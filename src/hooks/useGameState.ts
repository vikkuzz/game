"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  GameState,
  Player,
  Unit,
  Building,
  PlayerId,
  UnitType,
} from "@/types/game";
import type { Building as BuildingType } from "@/types/game";
import {
  createPlayer,
  getUnitTarget,
  getNextTarget,
  createUnit,
  separateUnits,
  getSpawnUnitType,
  getSpawnInterval,
  getDistance,
  hasEnemyInBarrackCell,
  hasAllyWarriorInBarrackCell,
  GAME_CONFIG,
} from "@/lib/gameLogic";
import { COMBAT_CONSTANTS } from "@/lib/game/constants";
import { processUnitMovement, resetAttackFlag } from "@/lib/game/unitMovement";
import { processUnitCombat } from "@/lib/game/unitCombat";
import {
  processBuildingAttacks,
  processUnitAttacksOnBuildings,
} from "@/lib/game/buildingCombat";
import { applyStateUpdates } from "@/lib/game/gameStateUpdater";

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Инициализация игроков
    const players = Array.from({ length: 4 }, (_, i) =>
      createPlayer(i as PlayerId, GAME_CONFIG.mapSize)
    );

    return {
      players,
      gameTime: 0,
      isPaused: false,
      gameSpeed: 1,
      selectedPlayer: 0,
      selectedBuilding: null,
      gameOver: false,
      winner: null,
      autoUpgrade: false,
    };
  });

  const lastUpdateRef = useRef<number>(Date.now());
  const gameLoopRef = useRef<number | null>(null);

  // Игровой цикл
  useEffect(() => {
    if (gameState.isPaused) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    // Проверка сетевого режима - в сетевом режиме движение обрабатывается на сервере
    const isNetworkMode =
      typeof window !== "undefined" &&
      sessionStorage.getItem("networkGameData") !== null;
    if (isNetworkMode) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) * gameState.gameSpeed;
      lastUpdateRef.current = now;

      setGameState((prev) => {
        let newState = { ...prev };

        // Собираем все здания для поиска целей
        const getAllEnemyBuildings = (playerId: PlayerId): Building[] => {
          return newState.players
            .filter((p) => p.id !== playerId && p.isActive)
            .flatMap((p) => [p.castle, ...p.barracks, ...p.towers])
            .filter((b) => b.health > 0);
        };

        // Обновление движения юнитов
        newState.players = prev.players.map((player) => {
          if (!player.isActive) return player;

          const allEnemyBuildings = getAllEnemyBuildings(player.id);
          const allCurrentUnits = newState.players.flatMap((p) => p.units);

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
          // Используем все юниты из prev, но заменяем юниты текущего игрока на обновленные
          const allUnitsForSeparation = [
            ...prev.players
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
        });

        // Проверка сетевого режима - в сетевом режиме бой обрабатывается на сервере
        const isNetworkMode =
          typeof window !== "undefined" &&
          sessionStorage.getItem("networkGameData") !== null;
        
        if (!isNetworkMode) {
          // Сохраняем исходные юниты ДО обновления движения для проверки дистанции атаки
          const originalUnitsList = prev.players
            .flatMap((p) => p.units)
            .filter((u) => u.health > 0);

          // Получаем обновленные юниты после движения
          const allUnitsList = newState.players
            .flatMap((p) => p.units)
            .filter((u) => u.health > 0);

          // Обрабатываем атаки между юнитами
        const combatResult = processUnitCombat(
          allUnitsList,
          originalUnitsList,
          now
        );

        // Обрабатываем атаки зданий по юнитам
        const allBuildings = newState.players.flatMap((p) => [
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
        const buildingsMap = new Map<string, Building>();
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

        // Собираем статистику разрушенных зданий
        const destroyedBuildings = new Map<
          string,
          {
            ownerId: PlayerId;
            attackerIds: Set<PlayerId>;
            buildingType: "castle" | "barracks" | "tower";
          }
        >();

        // Проверяем разрушенные здания
        const prevBuildings = prev.players.flatMap((p) => [
          p.castle,
          ...p.barracks,
          ...p.towers,
        ]);
        prevBuildings.forEach((prevBuilding) => {
          const currentBuilding = buildingsMap.get(prevBuilding.id);
          if (
            prevBuilding.health > 0 &&
            currentBuilding &&
            currentBuilding.health <= 0
          ) {
            // Здание было разрушено
            const owner = newState.players.find(
              (p) =>
                p.castle.id === prevBuilding.id ||
                p.barracks.some((b) => b.id === prevBuilding.id) ||
                p.towers.some((t) => t.id === prevBuilding.id)
            );
            if (owner) {
              // Находим атакующих
              const attackers = new Set<PlayerId>();
              allUnitsList.forEach((unit) => {
                if (unit.playerId !== owner.id) {
                  const distance = getDistance(
                    unit.position,
                    prevBuilding.position
                  );
                  if (
                    distance < COMBAT_CONSTANTS.UNIT_ATTACK_BUILDING_DISTANCE
                  ) {
                    attackers.add(unit.playerId);
                  }
                }
              });
              destroyedBuildings.set(prevBuilding.id, {
                ownerId: owner.id,
                attackerIds: attackers,
                buildingType: prevBuilding.type,
              });
            }
          }
        });

        // Применяем все обновления к состоянию
        newState = applyStateUpdates(newState, {
          unitsMap: combatResult.unitsMap,
          buildingsMap,
          killRewards: combatResult.killRewards,
          statsUpdates: combatResult.statsUpdates,
        });

        // Обрабатываем статистику разрушенных зданий и начисляем золото
        if (destroyedBuildings.size > 0) {
          const buildingRewards = new Map<PlayerId, number>();

          destroyedBuildings.forEach(
            ({ ownerId, attackerIds, buildingType }) => {
              const reward = GAME_CONFIG.buildingDestroyReward[buildingType];
              if (reward && attackerIds.size > 0) {
                const rewardPerPlayer = Math.floor(reward / attackerIds.size);
                attackerIds.forEach((attackerId) => {
                  const currentReward = buildingRewards.get(attackerId) || 0;
                  buildingRewards.set(
                    attackerId,
                    currentReward + rewardPerPlayer
                  );
                });
              }
            }
          );

          newState.players = newState.players.map((player) => {
            if (!player.isActive) return player;

            let buildingsDestroyed = 0;
            let buildingsLost = 0;

            destroyedBuildings.forEach(({ ownerId, attackerIds }) => {
              if (attackerIds.has(player.id)) {
                buildingsDestroyed += 1;
              }
              if (ownerId === player.id) {
                buildingsLost += 1;
              }
            });

            const reward = buildingRewards.get(player.id) || 0;

            return {
              ...player,
              gold: player.gold + reward,
              stats: {
                ...player.stats,
                buildingsDestroyed:
                  player.stats.buildingsDestroyed + buildingsDestroyed,
                buildingsLost: player.stats.buildingsLost + buildingsLost,
                goldEarned: player.stats.goldEarned + reward,
              },
            };
          });
        }
        } // Конец проверки сетевого режима для боя

        // Обновление времени игры
        newState.gameTime += deltaTime / 1000;

        // Обновляем статус активности игроков
        newState.players = newState.players.map((player) => {
          // Проверяем, есть ли у игрока живые здания или юниты
          const hasAliveBuildings =
            player.castle.health > 0 ||
            player.barracks.some((b) => b.health > 0) ||
            player.towers.some((t) => t.health > 0);
          const hasAliveUnits = player.units.some((u) => u.health > 0);
          const isStillAlive = hasAliveBuildings || hasAliveUnits;

          return {
            ...player,
            isActive: isStillAlive,
          };
        });

        // Проверка условий победы (только если игра еще не окончена)
        if (!newState.gameOver) {
          const activePlayers = newState.players.filter((p) => p.isActive);

          if (activePlayers.length === 1) {
            // Остался только один активный игрок - он победитель
            newState.gameOver = true;
            newState.winner = activePlayers[0].id;
            newState.isPaused = true; // Ставим игру на паузу
          } else if (activePlayers.length === 0) {
            // Никого не осталось - ничья
            newState.gameOver = true;
            newState.winner = null;
            newState.isPaused = true;
          }
        }

        return newState;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPaused, gameState.gameSpeed]);

  // Получение золота (только в локальном режиме, в сетевой игре это делает сервер)
  useEffect(() => {
    if (gameState.isPaused) return;

    // В сетевом режиме инком считается на сервере
    const isNetworkMode =
      typeof window !== "undefined" &&
      sessionStorage.getItem("networkGameData") !== null;
    if (isNetworkMode) return;

    const goldInterval = setInterval(() => {
      setGameState((prev) => {
        // goldIncome - это золото в секунду реального времени
        // Интервал уже учитывает gameSpeed (делится на gameSpeed)
        // Базовый интервал = 1000мс = 1 секунда реального времени
        // При gameSpeed = 1: интервал = 1000мс, за 1 секунду начисляется goldIncome золота
        // При gameSpeed = 2: интервал = 500мс, функция вызывается в 2 раза чаще, за 1 секунду начисляется goldIncome * 2 золота
        const baseIntervalSeconds = GAME_CONFIG.goldIncomeInterval / 1000; // 1 секунда
        return {
          ...prev,
          players: prev.players.map((player) => {
            // Начисляем золото: доход в секунду * базовый интервал
            // Интервал уже учитывает gameSpeed (делится на gameSpeed), поэтому функция вызывается чаще
            // При gameSpeed = 1: 10 * 1 = 10 золота за интервал 1000мс = 10 золота в секунду
            // При gameSpeed = 2: 10 * 1 = 10 золота за интервал 500мс, за 1 секунду = 20 золота
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
      });
    }, GAME_CONFIG.goldIncomeInterval / gameState.gameSpeed);

    return () => clearInterval(goldInterval);
  }, [gameState.isPaused, gameState.gameSpeed]);

  // Спавн юнитов из бараков (бесплатный автоматический спавн)
  // В сетевом режиме этим занимается сервер
  useEffect(() => {
    if (gameState.isPaused) return;

    const isNetworkMode =
      typeof window !== "undefined" &&
      sessionStorage.getItem("networkGameData") !== null;
    if (isNetworkMode) return;

    const spawnInterval = setInterval(() => {
      setGameState((prev) => {
        const newState = { ...prev };

        const unitsToAdd: Array<{ playerId: PlayerId; unit: Unit }> = [];

        newState.players = prev.players.map((player) => {
          if (!player.isActive) return player;

          const updatedBarracks = player.barracks.map((barrack, index) => {
            if (barrack.health <= 0) return barrack;

            // Получаем интервал спавна в зависимости от уровня
            const spawnInterval = getSpawnInterval(barrack.level);
            const currentCooldown = barrack.spawnCooldown ?? spawnInterval;
            const newCooldown = currentCooldown - GAME_CONFIG.gameLoopInterval;

            // Если кулдаун закончился, спавним юнитов (количество = уровень барака)
            if (newCooldown <= 0) {
              const targetData = getUnitTarget(
                player.id,
                index,
                GAME_CONFIG.mapSize
              );
              // Определяем тип юнита в зависимости от уровня барака
              const unitType = getSpawnUnitType(barrack.level);

              // Спавним столько юнитов, сколько уровень барака
              for (let i = 0; i < barrack.level; i++) {
                // Немного разносим позиции, чтобы юниты не появлялись в одной точке
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

                // Сохраняем для добавления после обновления всех игроков
                unitsToAdd.push({ playerId: player.id, unit: newUnit });
              }

              // Сбрасываем кулдаун
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

        // Добавляем спавненных юнитов
        unitsToAdd.forEach(({ playerId, unit }) => {
          const playerIndex = newState.players.findIndex(
            (p) => p.id === playerId
          );
          if (playerIndex !== -1) {
            newState.players[playerIndex].units.push(unit);
          }
        });

        return newState;
      });
    }, GAME_CONFIG.gameLoopInterval);

    return () => clearInterval(spawnInterval);
  }, [gameState.isPaused, gameState.gameSpeed]);

  // Обновление кулдаунов улучшений и починки
  // В сетевом режиме этим занимается сервер
  useEffect(() => {
    if (gameState.isPaused) return;

    const isNetworkMode =
      typeof window !== "undefined" &&
      sessionStorage.getItem("networkGameData") !== null;
    if (isNetworkMode) return;

    const cooldownInterval = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((player) => {
          const updateBuilding = (building: BuildingType) => {
            let updated = { ...building };
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
      }));
    }, GAME_CONFIG.gameLoopInterval);

    return () => clearInterval(cooldownInterval);
  }, [gameState.isPaused]);

  // Восстановление доступных юнитов в бараках
  // В сетевом режиме восстанавливает сервер
  useEffect(() => {
    if (gameState.isPaused) return;

    const isNetworkMode =
      typeof window !== "undefined" &&
      sessionStorage.getItem("networkGameData") !== null;
    if (isNetworkMode) return;

    const restoreInterval = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((player) => ({
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
      }));
    }, GAME_CONFIG.unitRestoreTime);

    return () => clearInterval(restoreInterval);
  }, [gameState.isPaused]);

  // Действия игрока
  const buyUnit = useCallback(
    (playerId: PlayerId, barrackId: string, unitType: UnitType) => {
      setGameState((prev) => {
        const player = prev.players[playerId];
        if (!player.isActive) return prev;

        const barrack = player.barracks.find((b) => b.id === barrackId);
        if (!barrack || barrack.health <= 0) return prev;

        const cost = GAME_CONFIG.unitCost[unitType];
        const availableUnits = barrack.availableUnits || 0;
        const now = Date.now();

        // Проверка кулдауна (5 секунд)
        if (
          barrack.lastUnitPurchaseTime &&
          now - barrack.lastUnitPurchaseTime < 5000
        ) {
          return prev; // Кулдаун еще не прошел
        }

        // Собираем всех юнитов для проверки
        const allUnits = prev.players
          .flatMap((p) => p.units)
          .filter((u) => u.health > 0);

        // Проверка: есть ли враг в клетке барака
        const hasEnemy = hasEnemyInBarrackCell(barrack, allUnits);
        if (!hasEnemy) {
          return prev; // Нет врагов в клетке - не покупаем
        }

        // Проверка: нет ли союзного воина в клетке барака
        const hasAllyWarrior = hasAllyWarriorInBarrackCell(barrack, allUnits);
        if (hasAllyWarrior) {
          return prev; // Есть союзный воин - не покупаем
        }

        if (player.gold >= cost && availableUnits > 0) {
          const barrackIndex = player.barracks.findIndex(
            (b) => b.id === barrackId
          );
          const targetData = getUnitTarget(
            playerId,
            barrackIndex,
            GAME_CONFIG.mapSize
          );
          const newUnit = createUnit(
            unitType,
            playerId,
            barrack.position,
            targetData,
            player.upgrades,
            barrackIndex
          );

          return {
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === playerId) {
                return {
                  ...p,
                  gold: p.gold - cost,
                  units: [...p.units, newUnit],
                  barracks: p.barracks.map((b) =>
                    b.id === barrackId
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
        return prev;
      });
    },
    []
  );

  const upgradeBuilding = useCallback(
    (playerId: PlayerId, buildingId: string) => {
      setGameState((prev) => {
        const player = prev.players[playerId];
        if (!player.isActive) return prev;

        const building =
          player.castle.id === buildingId
            ? player.castle
            : [...player.barracks, ...player.towers].find(
                (b) => b.id === buildingId
              );

        if (!building) return prev;

        const upgradeCost = building.level * 200;

        if (player.gold >= upgradeCost) {
          return {
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === playerId) {
                if (p.castle.id === buildingId) {
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
                    },
                  };
                } else if (p.barracks.some((b) => b.id === buildingId)) {
                  const upgradedBarrack = p.barracks.find(
                    (b) => b.id === buildingId
                  );
                  if (upgradedBarrack) {
                    const newLevel = upgradedBarrack.level + 1;
                    // Бараки можно улучшать до 3 уровня только если замок минимум 2 уровня
                    if (newLevel >= 3 && p.castle.level < 2) {
                      // Показываем сообщение пользователю
                      if (typeof window !== "undefined") {
                        alert("Сначала нужно улучшить замок до 2 уровня, чтобы улучшить барак до 3 уровня");
                      }
                      return p;
                    }
                    const newSpawnInterval = getSpawnInterval(newLevel);
                    return {
                      ...p,
                      gold: p.gold - upgradeCost,
                      barracks: p.barracks.map((b) =>
                        b.id === buildingId
                          ? {
                              ...b,
                              level: newLevel,
                              maxHealth: b.maxHealth + 100,
                              health: Math.min(
                                b.health + 100,
                                b.maxHealth + 100
                              ),
                              maxAvailableUnits: (b.maxAvailableUnits || 5) + 2,
                              spawnCooldown: Math.min(
                                b.spawnCooldown || newSpawnInterval,
                                newSpawnInterval
                              ), // Обновляем интервал спавна при улучшении
                            }
                          : b
                      ),
                    };
                  }
                } else if (p.towers.some((t) => t.id === buildingId)) {
                  const upgradedTower = p.towers.find(
                    (t) => t.id === buildingId
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
                        t.id === buildingId
                          ? {
                              ...t,
                              level: newLevel,
                              maxHealth: t.maxHealth + 100,
                              health: Math.min(
                                t.health + 100,
                                t.maxHealth + 100
                              ),
                              attack: (t.attack || 50) + 10,
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
        return prev;
      });
    },
    []
  );

  const repairBuilding = useCallback(
    (playerId: PlayerId, buildingId: string) => {
      setGameState((prev) => {
        const player = prev.players[playerId];
        if (!player.isActive) return prev;

        const building =
          player.castle.id === buildingId
            ? player.castle
            : [...player.barracks, ...player.towers].find(
                (b) => b.id === buildingId
              );

        if (!building || building.health >= building.maxHealth) return prev;

        const repairCost = 100;
        const repairAmount = building.maxHealth * 0.3;

        if (
          player.gold >= repairCost &&
          (!building.repairCooldown || building.repairCooldown <= 0)
        ) {
          return {
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === playerId) {
                const repairedHealth = Math.min(
                  building.maxHealth,
                  building.health + repairAmount
                );
                const updatedBuilding = {
                  ...building,
                  health: repairedHealth,
                  repairCooldown: 300000, // 5 минут кулдаун на ремонт
                };

                if (p.castle.id === buildingId) {
                  return {
                    ...p,
                    gold: p.gold - repairCost,
                    castle: updatedBuilding,
                  };
                } else if (p.barracks.some((b) => b.id === buildingId)) {
                  return {
                    ...p,
                    gold: p.gold - repairCost,
                    barracks: p.barracks.map((b) =>
                      b.id === buildingId ? updatedBuilding : b
                    ),
                  };
                } else {
                  return {
                    ...p,
                    gold: p.gold - repairCost,
                    towers: p.towers.map((t) =>
                      t.id === buildingId ? updatedBuilding : t
                    ),
                  };
                }
              }
              return p;
            }),
          };
        }
        return prev;
      });
    },
    []
  );

  const upgradeCastleStat = useCallback(
    (playerId: PlayerId, stat: keyof Player["upgrades"]) => {
      setGameState((prev) => {
        const player = prev.players[playerId];
        if (!player.isActive) return prev;

        const cost = (player.upgrades[stat] + 1) * 150;
        const newLevel = player.upgrades[stat] + 1;

        // Статы замка можно улучшать до 3 уровня только если замок минимум 2 уровня
        if (newLevel >= 3 && player.castle.level < 2) {
          // Показываем сообщение пользователю
          if (typeof window !== "undefined") {
            alert("Сначала нужно улучшить замок до 2 уровня, чтобы улучшить статы до 3 уровня");
          }
          return prev;
        }

        if (player.gold >= cost) {
          const newUpgrades = { ...player.upgrades };
          newUpgrades[stat] += 1;

          let newGoldIncome = player.goldIncome;
          if (stat === "goldIncome") {
            newGoldIncome += 5;
          }

          // Применяем улучшения к зданиям
          const buildingHealthBonus = newUpgrades.buildingHealth * 200; // +200 HP за уровень
          const buildingAttackBonus = newUpgrades.buildingAttack * 10; // +10 атаки за уровень

          return {
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === playerId) {
                // Рассчитываем базовые значения (без улучшений)
                const baseCastleHealth = 2000; // Уменьшено с 3000
                const baseCastleAttack = 20; // Уменьшено с 30
                const baseTowerHealth = 500; // Уменьшено с 800
                const baseTowerAttack = 30; // Уменьшено с 50
                const baseBarrackHealth = 1000; // Уменьшено с 1500

                // Базовые значения защиты для каждого типа юнита
                const baseDefenseStats = {
                  warrior: 10,
                  archer: 5,
                  mage: 3,
                };

                // Если улучшаем здоровье зданий, восстанавливаем здоровье
                const healthIncrease = stat === "buildingHealth" ? 200 : 0;

                // Рассчитываем множитель защиты для юнитов
                const defenseMultiplier = 1 + newUpgrades.defense * 0.1; // +10% за уровень

                return {
                  ...p,
                  gold: p.gold - cost,
                  goldIncome: newGoldIncome,
                  upgrades: newUpgrades,
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
        return prev;
      });
    },
    []
  );

  const togglePause = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const toggleAutoUpgrade = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === prev.selectedPlayer
          ? { ...p, autoUpgrade: !p.autoUpgrade }
          : p
      ),
    }));
  }, []);

  const setGameSpeed = useCallback((speed: number) => {
    setGameState((prev) => ({ ...prev, gameSpeed: speed }));
  }, []);

  const selectPlayer = useCallback((playerId: PlayerId) => {
    setGameState((prev) => ({ ...prev, selectedPlayer: playerId }));
  }, []);

  const selectBuilding = useCallback((buildingId: string | null) => {
    setGameState((prev) => ({ ...prev, selectedBuilding: buildingId }));
  }, []);

  const restartGame = useCallback(() => {
    const players = Array.from({ length: 4 }, (_, i) =>
      createPlayer(i as PlayerId, GAME_CONFIG.mapSize)
    );

    setGameState({
      players,
      gameTime: 0,
      isPaused: false,
      gameSpeed: 1,
      selectedPlayer: 0,
      selectedBuilding: null,
      gameOver: false,
      winner: null,
      autoUpgrade: false,
    });
  }, []);

  // ИИ для автоматических игроков (все кроме игрока 0)
  // В сетевом режиме сервер будет управлять ИИ, поэтому на клиенте ИИ отключаем
  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver) return;

    const isNetworkMode =
      typeof window !== "undefined" &&
      sessionStorage.getItem("networkGameData") !== null;
    if (isNetworkMode) return;

    const aiInterval = setInterval(() => {
      setGameState((prev) => {
        // Игрок 0 - человек, остальные - ИИ
        const aiPlayers = prev.players.filter((p) => p.id !== 0 && p.isActive);

        if (aiPlayers.length === 0) return prev;

        let updated = false;

        const newPlayers = prev.players.map((player) => {
          // Пропускаем игрока 0 (человека) и неактивных игроков
          if (player.id === 0 || !player.isActive) return player;

          // Случайное решение ИИ
          const action = Math.random();

          if (action < 0.4) {
            // 40% шанс - покупка юнита
            const aliveBarracks = player.barracks.filter((b) => b.health > 0);
            if (aliveBarracks.length > 0) {
              const barrack =
                aliveBarracks[Math.floor(Math.random() * aliveBarracks.length)];
              const availableUnits = barrack.availableUnits || 0;
              const now = Date.now();

              // Проверка кулдауна (5 секунд)
              if (
                barrack.lastUnitPurchaseTime &&
                now - barrack.lastUnitPurchaseTime < 5000
              ) {
                // Кулдаун еще не прошел - пропускаем покупку
              } else if (availableUnits > 0) {
                // Собираем всех юнитов для проверки
                const allUnits = prev.players
                  .flatMap((p) => p.units)
                  .filter((u) => u.health > 0);

                // Проверка: есть ли враг в клетке барака
                const hasEnemy = hasEnemyInBarrackCell(barrack, allUnits);

                // Проверка: нет ли союзного воина в клетке барака
                const hasAllyWarrior = hasAllyWarriorInBarrackCell(
                  barrack,
                  allUnits
                );

                if (hasEnemy && !hasAllyWarrior) {
                  const unitType: UnitType = "warrior"; // Только воины
                  const cost = GAME_CONFIG.unitCost[unitType];

                  // Проверяем стоимость конкретного юнита и наличие резерва для улучшений
                  // ИИ должен иметь минимум 200 золота в резерве после покупки для улучшений
                  if (player.gold >= cost + 200) {
                    updated = true;
                    const barrackIndex = player.barracks.findIndex(
                      (b) => b.id === barrack.id
                    );
                    const targetPos = getUnitTarget(
                      player.id,
                      barrackIndex,
                      GAME_CONFIG.mapSize
                    );
                    const newUnit = createUnit(
                      unitType,
                      player.id,
                      barrack.position,
                      targetPos,
                      player.upgrades,
                      barrackIndex
                    );

                    return {
                      ...player,
                      gold: player.gold - cost,
                      units: [...player.units, newUnit],
                      barracks: player.barracks.map((b) =>
                        b.id === barrack.id
                          ? {
                              ...b,
                              availableUnits: (b.availableUnits || 0) - 1,
                              lastUnitPurchaseTime: now,
                            }
                          : b
                      ),
                    };
                  }
                }
              }
            }
          } else if (action < 0.65 && player.gold >= 200) {
            // 25% шанс - улучшение здания
            const upgradeableBuildings: Array<{ id: string }> = [];

            if (player.castle.level < 50) {
              upgradeableBuildings.push({ id: player.castle.id });
            }

            player.barracks.forEach((b) => {
              if (
                b.health > 0 &&
                b.level < 50 &&
                // Бараки можно улучшать до 3 уровня только если замок минимум 2 уровня
                !(b.level >= 2 && player.castle.level < 2)
              ) {
                upgradeableBuildings.push({ id: b.id });
              }
            });

            player.towers.forEach((t) => {
              if (t.health > 0 && t.level < 50) {
                upgradeableBuildings.push({ id: t.id });
              }
            });

            if (upgradeableBuildings.length > 0) {
              const building =
                upgradeableBuildings[
                  Math.floor(Math.random() * upgradeableBuildings.length)
                ];
              const buildingObj =
                player.castle.id === building.id
                  ? player.castle
                  : [...player.barracks, ...player.towers].find(
                      (b) => b.id === building.id
                    );

              if (buildingObj) {
                const cost = (buildingObj.level + 1) * 200;
                const newLevel = buildingObj.level + 1;
                // Бараки можно улучшать до 3 уровня только если замок минимум 2 уровня
                if (
                  buildingObj.type === "barracks" &&
                  newLevel >= 3 &&
                  player.castle.level < 2
                ) {
                  // Пропускаем это здание
                } else if (player.gold >= cost) {
                  updated = true;
                  const updatedBuilding = {
                    ...buildingObj,
                    level: newLevel,
                    maxHealth: buildingObj.maxHealth + 200,
                    health: buildingObj.health + 200,
                  };

                  if (player.castle.id === building.id) {
                    return {
                      ...player,
                      gold: player.gold - cost,
                      castle: updatedBuilding,
                    };
                  } else if (
                    player.barracks.some((b) => b.id === building.id)
                  ) {
                    return {
                      ...player,
                      gold: player.gold - cost,
                      barracks: player.barracks.map((b) =>
                        b.id === building.id ? updatedBuilding : b
                      ),
                    };
                  } else {
                    return {
                      ...player,
                      gold: player.gold - cost,
                      towers: player.towers.map((t) =>
                        t.id === building.id ? updatedBuilding : t
                      ),
                    };
                  }
                }
              }
            }
          } else if (action < 0.8 && player.gold >= 100) {
            // 15% шанс - починка здания
            const repairableBuildings: string[] = [];

            if (
              player.castle.health < player.castle.maxHealth &&
              (!player.castle.repairCooldown ||
                player.castle.repairCooldown <= 0)
            ) {
              repairableBuildings.push(player.castle.id);
            }

            player.barracks.forEach((b) => {
              if (
                b.health > 0 &&
                b.health < b.maxHealth &&
                (!b.repairCooldown || b.repairCooldown <= 0)
              ) {
                repairableBuildings.push(b.id);
              }
            });

            player.towers.forEach((t) => {
              if (
                t.health > 0 &&
                t.health < t.maxHealth &&
                (!t.repairCooldown || t.repairCooldown <= 0)
              ) {
                repairableBuildings.push(t.id);
              }
            });

            if (repairableBuildings.length > 0) {
              const buildingId =
                repairableBuildings[
                  Math.floor(Math.random() * repairableBuildings.length)
                ];
              const building =
                player.castle.id === buildingId
                  ? player.castle
                  : [...player.barracks, ...player.towers].find(
                      (b) => b.id === buildingId
                    );

              if (building && building.health < building.maxHealth) {
                const repairCost = 100;
                const repairAmount = building.maxHealth * 0.3;

                if (player.gold >= repairCost) {
                  updated = true;
                  const repairedHealth = Math.min(
                    building.maxHealth,
                    building.health + repairAmount
                  );
                  const updatedBuilding = {
                    ...building,
                    health: repairedHealth,
                    repairCooldown: 300000, // 5 минут кулдаун на ремонт
                  };

                  if (player.castle.id === buildingId) {
                    return {
                      ...player,
                      gold: player.gold - repairCost,
                      castle: updatedBuilding,
                    };
                  } else if (player.barracks.some((b) => b.id === buildingId)) {
                    return {
                      ...player,
                      gold: player.gold - repairCost,
                      barracks: player.barracks.map((b) =>
                        b.id === buildingId ? updatedBuilding : b
                      ),
                    };
                  } else {
                    return {
                      ...player,
                      gold: player.gold - repairCost,
                      towers: player.towers.map((t) =>
                        t.id === buildingId ? updatedBuilding : t
                      ),
                    };
                  }
                }
              }
            }
          } else if (action < 1.0 && player.gold >= 150) {
            // 20% шанс - прокачка статов замка
            const upgradeableStats: Array<keyof Player["upgrades"]> = [];
            const stats: Array<keyof Player["upgrades"]> = [
              "attack",
              "defense",
              "health",
              // "magic", // Временно закомментировано - магов убрали
              "goldIncome",
            ];

            stats.forEach((stat) => {
              const cost = (player.upgrades[stat] + 1) * 150;
              const newLevel = player.upgrades[stat] + 1;
              if (
                player.gold >= cost &&
                // Статы замка можно улучшать до 3 уровня только если замок минимум 2 уровня
                !(newLevel >= 3 && player.castle.level < 2)
              ) {
                upgradeableStats.push(stat);
              }
            });

            if (upgradeableStats.length > 0) {
              const stat =
                upgradeableStats[
                  Math.floor(Math.random() * upgradeableStats.length)
                ];
              const cost = (player.upgrades[stat] + 1) * 150;

              if (player.gold >= cost) {
                updated = true;
                const newUpgrades = { ...player.upgrades };
                newUpgrades[stat] += 1;

                let newGoldIncome = player.goldIncome;
                if (stat === "goldIncome") {
                  newGoldIncome += 5;
                }

                return {
                  ...player,
                  gold: player.gold - cost,
                  upgrades: newUpgrades,
                  goldIncome: newGoldIncome,
                };
              }
            }
          }

          return player;
        });

        return updated ? { ...prev, players: newPlayers } : prev;
      });
    }, 3000); // ИИ принимает решения каждые 3 секунды

    return () => clearInterval(aiInterval);
  }, [gameState.isPaused, gameState.gameOver]);

  // Автоматическое развитие
  // В сетевом режиме логика авторазвития должна быть на сервере,
  // поэтому на клиенте выполняем её только в локальном режиме
  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver) {
      return;
    }

    const autoUpgradeInterval = setInterval(() => {
      setGameState((prev) => {
        // Определяем, находимся ли мы в сетевом режиме
        const isNetworkMode = typeof window !== "undefined" && 
          sessionStorage.getItem("networkGameData") !== null;

        // В сетевом режиме авторазвитие должен считать сервер — выходим
        if (isNetworkMode) {
          return prev;
        }
        
        // Получаем aiSlots из sessionStorage, если они там есть
        let aiSlots: PlayerId[] = [];
        if (isNetworkMode && typeof window !== "undefined") {
          try {
            const networkData = sessionStorage.getItem("networkGameData");
            if (networkData) {
              const parsed = JSON.parse(networkData);
              aiSlots = Array.isArray(parsed.aiSlots) ? parsed.aiSlots : [];
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
            console.warn("[useGameState] Error parsing networkGameData:", e);
          }
        }
        
        // Применяем автоматическое развитие только к ИИ игрокам
        // В сетевом режиме используем aiSlots для определения ИИ
        // В локальном режиме: игрок 0 - только если autoUpgrade включен, остальные - всегда ИИ
        
        // В сетевом режиме, если aiSlots не загружен или пуст, не выполняем авторазвитие вообще
        // Это важно: если aiSlots пуст, значит либо данные не загружены, либо нет ИИ игроков
        // В любом случае, не выполняем авторазвитие для безопасности
        const playersToUpgrade: PlayerId[] = prev.players
          .filter((p) => {
            if (!p.isActive) return false;
            // В локальном режиме: игрок 0 — только если autoUpgrade включен,
            // остальные игроки считаются ИИ и всегда получают авторазвитие
            if (p.id === 0) {
              return p.autoUpgrade;
            }
            return true;
          })
          .map((p) => p.id);

        if (playersToUpgrade.length === 0) return prev;

        // Применяем логику автоматического развития для каждого игрока
        let stateChanged = false;
        let newState = { ...prev };

        for (const playerId of playersToUpgrade) {
          const player = newState.players[playerId];
          if (!player || !player.isActive) continue;

          // Определяем минимальные уровни
          const castleStats: Array<keyof Player["upgrades"]> = [
            "attack",
            "defense",
            "health",
            "goldIncome",
            "buildingHealth",
            "buildingAttack",
          ];
          const minCastleLevel = Math.min(
            ...castleStats.map((stat) => player.upgrades[stat])
          );
          const maxCastleLevel = Math.max(
            ...castleStats.map((stat) => player.upgrades[stat])
          );
          // Проверяем, все ли статы замка уже на уровне 1
          const allCastleStatsAtLevel1 = castleStats.every(
            (stat) => player.upgrades[stat] >= 1
          );
          // Получаем актуальное состояние игрока из newState
          const currentPlayerForBarracks = newState.players[playerId];
          const aliveBarracks = currentPlayerForBarracks.barracks.filter(
            (b) => b.health > 0
          );
          const minBarrackLevel =
            aliveBarracks.length > 0
              ? Math.min(...aliveBarracks.map((b) => b.level))
              : Infinity;
          // Проверяем, все ли бараки уже на уровне 2
          // Бараки начинаются с уровня 1, поэтому проверяем уровень 2
          const allBarracksAtLevel2 =
            aliveBarracks.length > 0 &&
            aliveBarracks.every((b) => b.level >= 2);

          // Логика приоритетов
          if (!allCastleStatsAtLevel1) {
            // Сначала все статы замка до уровня 1
            const currentPlayerForCastle = newState.players[playerId];
            const statToUpgrade = castleStats.find(
              (stat) => currentPlayerForCastle.upgrades[stat] < 1
            );
            if (statToUpgrade) {
              const cost =
                (currentPlayerForCastle.upgrades[statToUpgrade] + 1) * 150;
              if (currentPlayerForCastle.gold >= cost) {
                // Вызываем upgradeCastleStat через setState
                const newUpgrades = { ...currentPlayerForCastle.upgrades };
                newUpgrades[statToUpgrade] += 1;
                let newGoldIncome = currentPlayerForCastle.goldIncome;
                if (statToUpgrade === "goldIncome") {
                  newGoldIncome += 5;
                }
                const buildingHealthBonus = newUpgrades.buildingHealth * 200;
                const buildingAttackBonus = newUpgrades.buildingAttack * 10;
                const healthIncrease =
                  statToUpgrade === "buildingHealth" ? 200 : 0;

                // Базовые значения защиты для каждого типа юнита
                const baseDefenseStats = {
                  warrior: 10,
                  archer: 5,
                  mage: 3,
                };

                // Рассчитываем множитель защиты для юнитов (если улучшаем защиту)
                const defenseMultiplier = 1 + newUpgrades.defense * 0.1; // +10% за уровень

                newState = {
                  ...newState,
                  players: newState.players.map((p) => {
                    if (p.id === playerId) {
                      const baseCastleHealth = 2000; // Уменьшено с 3000
                      const baseCastleAttack = 20; // Уменьшено с 30
                      const baseTowerHealth = 500; // Уменьшено с 800
                      const baseTowerAttack = 30; // Уменьшено с 50
                      const baseBarrackHealth = 1000; // Уменьшено с 1500

                      return {
                        ...p,
                        gold: p.gold - cost,
                        goldIncome: newGoldIncome,
                        upgrades: newUpgrades,
                        castle: {
                          ...p.castle,
                          maxHealth: baseCastleHealth + buildingHealthBonus,
                          health: Math.min(
                            p.castle.health + healthIncrease,
                            baseCastleHealth + buildingHealthBonus
                          ),
                          attack: baseCastleAttack + buildingAttackBonus,
                        },
                        barracks: p.barracks.map((b) => ({
                          ...b,
                          maxHealth: baseBarrackHealth + buildingHealthBonus,
                          health: Math.min(
                            b.health + healthIncrease,
                            baseBarrackHealth + buildingHealthBonus
                          ),
                        })),
                        towers: p.towers.map((t) => ({
                          ...t,
                          maxHealth: baseTowerHealth + buildingHealthBonus,
                          health: Math.min(
                            t.health + healthIncrease,
                            baseTowerHealth + buildingHealthBonus
                          ),
                          attack: baseTowerAttack + buildingAttackBonus,
                        })),
                        // Обновляем защиту всех существующих юнитов (если улучшаем защиту)
                        units:
                          statToUpgrade === "defense"
                            ? p.units.map((unit) => {
                                const baseDefense = baseDefenseStats[unit.type];
                                return {
                                  ...unit,
                                  defense: Math.floor(
                                    baseDefense * defenseMultiplier
                                  ),
                                };
                              })
                            : p.units,
                      };
                    }
                    return p;
                  }),
                };
                stateChanged = true;
                continue; // Переходим к следующему игроку после одного улучшения
              }
            }
            continue; // Если не удалось улучшить, переходим к следующему игроку
          }

          // Приоритет 2: Прокачка бараков до уровня 2 (только если все статы замка уже на уровне 1)
          // Бараки начинаются с уровня 1, поэтому прокачиваем их до уровня 2
          if (allCastleStatsAtLevel1 && !allBarracksAtLevel2) {
            // Затем все бараки до уровня 2
            const currentPlayerForUpgrade = newState.players[playerId];
            const barrackToUpgrade = currentPlayerForUpgrade.barracks.find(
              (b) => b.health > 0 && b.level < 2
            );
            if (barrackToUpgrade) {
              const upgradeCost = barrackToUpgrade.level * 200;
              if (currentPlayerForUpgrade.gold >= upgradeCost) {
                const newSpawnInterval = getSpawnInterval(
                  barrackToUpgrade.level + 1
                );
                newState = {
                  ...newState,
                  players: newState.players.map((p) => {
                    if (p.id === playerId) {
                      return {
                        ...p,
                        gold: p.gold - upgradeCost,
                        barracks: p.barracks.map((b) =>
                          b.id === barrackToUpgrade.id
                            ? {
                                ...b,
                                level: b.level + 1,
                                maxHealth: b.maxHealth + 100,
                                health: Math.min(
                                  b.health + 100,
                                  b.maxHealth + 100
                                ),
                                maxAvailableUnits:
                                  (b.maxAvailableUnits || 5) + 2,
                                spawnCooldown: Math.min(
                                  b.spawnCooldown || newSpawnInterval,
                                  newSpawnInterval
                                ),
                              }
                            : b
                        ),
                      };
                    }
                    return p;
                  }),
                };
                stateChanged = true;
                continue;
              }
            }
            continue;
          }

          // Приоритет 3: Прокачка статов замка до уровня 2
          if (allCastleStatsAtLevel1 && allBarracksAtLevel2) {
            // Проверяем, все ли статы замка уже на уровне 2
            const allCastleStatsAtLevel2 = castleStats.every(
              (stat) => player.upgrades[stat] >= 2
            );
            if (!allCastleStatsAtLevel2) {
              // Прокачиваем статы замка до уровня 2
              const statToUpgrade = castleStats.find(
                (stat) => player.upgrades[stat] < 2
              );
              if (statToUpgrade) {
                const cost = (player.upgrades[statToUpgrade] + 1) * 150;
                const currentPlayer = newState.players[playerId];
                if (currentPlayer.gold >= cost) {
                  const newUpgrades = { ...currentPlayer.upgrades };
                  newUpgrades[statToUpgrade] += 1;
                  let newGoldIncome = currentPlayer.goldIncome;
                  if (statToUpgrade === "goldIncome") {
                    newGoldIncome += 5;
                  }
                  const buildingHealthBonus = newUpgrades.buildingHealth * 200;
                  const buildingAttackBonus = newUpgrades.buildingAttack * 10;
                  const healthIncrease =
                    statToUpgrade === "buildingHealth" ? 200 : 0;

                  newState = {
                    ...newState,
                    players: newState.players.map((p) => {
                      if (p.id === playerId) {
                        const baseCastleHealth = 2000; // Исправлено с 3000
                        const baseCastleAttack = 20; // Исправлено с 30
                        const baseTowerHealth = 500; // Исправлено с 800
                        const baseTowerAttack = 30; // Исправлено с 50
                        const baseBarrackHealth = 1000; // Исправлено с 1500

                        return {
                          ...p,
                          gold: p.gold - cost,
                          goldIncome: newGoldIncome,
                          upgrades: newUpgrades,
                          castle: {
                            ...p.castle,
                            maxHealth: baseCastleHealth + buildingHealthBonus,
                            health: Math.min(
                              p.castle.health + healthIncrease,
                              baseCastleHealth + buildingHealthBonus
                            ),
                            attack: baseCastleAttack + buildingAttackBonus,
                          },
                          barracks: p.barracks.map((b) => ({
                            ...b,
                            maxHealth: baseBarrackHealth + buildingHealthBonus,
                            health: Math.min(
                              b.health + healthIncrease,
                              baseBarrackHealth + buildingHealthBonus
                            ),
                          })),
                          towers: p.towers.map((t) => ({
                            ...t,
                            maxHealth: baseTowerHealth + buildingHealthBonus,
                            health: Math.min(
                              t.health + healthIncrease,
                              baseTowerHealth + buildingHealthBonus
                            ),
                            attack: baseTowerAttack + buildingAttackBonus,
                          })),
                        };
                      }
                      return p;
                    }),
                  };
                  stateChanged = true;
                  continue;
                }
              }
              continue;
            } else {
              // Если все статы замка уже на уровне 2 и все бараки на уровне 2,
              // но замок еще на уровне 1, улучшаем замок до уровня 2
              const currentPlayer = newState.players[playerId];
              if (currentPlayer.castle.level < 2) {
                const upgradeCost = currentPlayer.castle.level * 200;
                if (currentPlayer.gold >= upgradeCost) {
                  newState = {
                    ...newState,
                    players: newState.players.map((p) => {
                      if (p.id === playerId) {
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
                          },
                        };
                      }
                      return p;
                    }),
                  };
                  stateChanged = true;
                  continue;
                }
              }
              // Если замок уже на уровне 2, переходим к случайной прокачке
            }
          }

          // Если дошли сюда и все базовые прокачки завершены, переходим к случайной прокачке
          // Проверяем, все ли базовые прокачки завершены
          const currentPlayer = newState.players[playerId];
          const currentAliveBarracks = currentPlayer.barracks.filter(
            (b) => b.health > 0
          );
          const allCastleStatsAtLevel2Check = castleStats.every(
            (stat) => currentPlayer.upgrades[stat] >= 2
          );
          const allBarracksAtLevel2Check =
            currentAliveBarracks.length > 0 &&
            currentAliveBarracks.every((b) => b.level >= 2);

          // В сетевом режиме случайная прокачка доступна для всех (ИИ и реальных игроков)
          // Используем ту же логику, что и для синего игрока в локальном режиме
          let canPerformRandomUpgrade = true;

          // Случайная прокачка: если все статы на уровне 2, все бараки на уровне 2, и замок на уровне 2
          // И только если это ИИ игрок в сетевом режиме (или локальный режим)
          if (
            canPerformRandomUpgrade &&
            allCastleStatsAtLevel1 &&
            (currentAliveBarracks.length === 0 || allBarracksAtLevel2Check) &&
            allCastleStatsAtLevel2Check &&
            currentPlayer.castle.level >= 2
          ) {
            // Потом случайно: статы замка, замок, бараки или башни
            // Проверяем доступные варианты улучшения с учетом стоимости
            const affordableStats = castleStats.filter(
              (stat) => {
                const cost = (currentPlayer.upgrades[stat] + 1) * 150;
                return (
                  currentPlayer.upgrades[stat] < 50 &&
                  currentPlayer.gold >= cost &&
                  !(
                    currentPlayer.upgrades[stat] >= 2 &&
                    currentPlayer.castle.level < 2
                  )
                );
              }
            );
            
            const affordableBarracks = currentPlayer.barracks.filter(
              (b) => {
                const upgradeCost = b.level * 200;
                return (
                  b.health > 0 &&
                  b.level < 50 &&
                  currentPlayer.gold >= upgradeCost &&
                  !(b.level >= 2 && currentPlayer.castle.level < 2)
                );
              }
            );
            
            const affordableTowers = currentPlayer.towers.filter(
              (t) => {
                const upgradeCost = t.level * 200;
                return (
                  t.health > 0 &&
                  t.level < 50 &&
                  currentPlayer.gold >= upgradeCost
                );
              }
            );
            
            const canUpgradeCastle =
              currentPlayer.castle.level < 50 &&
              currentPlayer.gold >= currentPlayer.castle.level * 200;

            // Выбираем случайный доступный тип улучшения
            const availableOptions: string[] = [];
            if (affordableStats.length > 0) availableOptions.push("stat");
            if (canUpgradeCastle) availableOptions.push("castle");
            if (affordableBarracks.length > 0)
              availableOptions.push("barrack");
            if (affordableTowers.length > 0) availableOptions.push("tower");

            if (availableOptions.length === 0) {
              // Нет доступных улучшений
            } else {
              // Перемешиваем опции для более случайного выбора
              const shuffledOptions = availableOptions.sort(
                () => Math.random() - 0.5
              );
              let upgradePerformed = false;

              for (const action of shuffledOptions) {
                if (upgradePerformed) break;

                if (action === "stat") {
                  // Прокачка стата замка
                  const stat =
                    affordableStats[
                      Math.floor(Math.random() * affordableStats.length)
                    ];
                  const cost = (currentPlayer.upgrades[stat] + 1) * 150;
                  if (currentPlayer.gold >= cost) {
                    const newUpgrades = { ...currentPlayer.upgrades };
                    newUpgrades[stat] += 1;
                    let newGoldIncome = currentPlayer.goldIncome;
                    if (stat === "goldIncome") {
                      newGoldIncome += 5;
                    }
                    const buildingHealthBonus = newUpgrades.buildingHealth * 200;
                    const buildingAttackBonus = newUpgrades.buildingAttack * 10;
                    const healthIncrease = stat === "buildingHealth" ? 200 : 0;

                    newState = {
                      ...newState,
                      players: newState.players.map((p) => {
                        if (p.id === playerId) {
                          const baseCastleHealth = 2000; // Исправлено с 3000
                          const baseCastleAttack = 20; // Исправлено с 30
                          const baseTowerHealth = 500; // Исправлено с 800
                          const baseTowerAttack = 30; // Исправлено с 50
                          const baseBarrackHealth = 1000; // Исправлено с 1500

                          return {
                            ...p,
                            gold: p.gold - cost,
                            goldIncome: newGoldIncome,
                            upgrades: newUpgrades,
                            castle: {
                              ...p.castle,
                              maxHealth: baseCastleHealth + buildingHealthBonus,
                              health: Math.min(
                                p.castle.health + healthIncrease,
                                baseCastleHealth + buildingHealthBonus
                              ),
                              attack: baseCastleAttack + buildingAttackBonus,
                            },
                            barracks: p.barracks.map((b) => ({
                              ...b,
                              maxHealth: baseBarrackHealth + buildingHealthBonus,
                              health: Math.min(
                                b.health + healthIncrease,
                                baseBarrackHealth + buildingHealthBonus
                              ),
                            })),
                            towers: p.towers.map((t) => ({
                              ...t,
                              maxHealth: baseTowerHealth + buildingHealthBonus,
                              health: Math.min(
                                t.health + healthIncrease,
                                baseTowerHealth + buildingHealthBonus
                              ),
                              attack: baseTowerAttack + buildingAttackBonus,
                            })),
                          };
                        }
                        return p;
                      }),
                    };
                    stateChanged = true;
                    upgradePerformed = true;
                    continue;
                  }
                } else if (action === "castle") {
                  // Прокачка замка
                  const upgradeCost = currentPlayer.castle.level * 200;
                  if (currentPlayer.gold >= upgradeCost) {
                    newState = {
                      ...newState,
                      players: newState.players.map((p) => {
                        if (p.id === playerId) {
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
                            },
                          };
                        }
                        return p;
                      }),
                    };
                    stateChanged = true;
                    upgradePerformed = true;
                    continue;
                  }
                } else if (action === "barrack") {
                  // Прокачка барака
                  const barrack =
                    affordableBarracks[
                      Math.floor(Math.random() * affordableBarracks.length)
                    ];
                  const upgradeCost = barrack.level * 200;
                  if (currentPlayer.gold >= upgradeCost) {
                    const newSpawnInterval = getSpawnInterval(barrack.level + 1);
                    newState = {
                      ...newState,
                      players: newState.players.map((p) => {
                        if (p.id === playerId) {
                          return {
                            ...p,
                            gold: p.gold - upgradeCost,
                            barracks: p.barracks.map((b) =>
                              b.id === barrack.id
                                ? {
                                    ...b,
                                    level: b.level + 1,
                                    maxHealth: b.maxHealth + 100,
                                    health: Math.min(
                                      b.health + 100,
                                      b.maxHealth + 100
                                    ),
                                    maxAvailableUnits:
                                      (b.maxAvailableUnits || 5) + 2,
                                    spawnCooldown: Math.min(
                                      b.spawnCooldown || newSpawnInterval,
                                      newSpawnInterval
                                    ),
                                  }
                                : b
                            ),
                          };
                        }
                        return p;
                      }),
                    };
                    stateChanged = true;
                    upgradePerformed = true;
                    continue;
                  }
                } else if (action === "tower") {
                  // Прокачка башни
                  const tower =
                    affordableTowers[
                      Math.floor(Math.random() * affordableTowers.length)
                    ];
                  const upgradeCost = tower.level * 200;
                  if (currentPlayer.gold >= upgradeCost) {
                    newState = {
                      ...newState,
                      players: newState.players.map((p) => {
                        if (p.id === playerId) {
                          return {
                            ...p,
                            gold: p.gold - upgradeCost,
                            towers: p.towers.map((t) =>
                              t.id === tower.id
                                ? {
                                    ...t,
                                    level: t.level + 1,
                                    maxHealth: t.maxHealth + 100,
                                    health: Math.min(
                                      t.health + 100,
                                      t.maxHealth + 100
                                    ),
                                    attack: (t.attack || 50) + 10,
                                  }
                                : t
                            ),
                          };
                        }
                        return p;
                      }),
                    };
                    stateChanged = true;
                    upgradePerformed = true;
                    continue;
                  }
                }
              }
            }
          }
        }
        // конец циклаor - закрываая скобка цикла for
        return stateChanged ? newState : prev;
      });
    }, 2000); // Проверка каждые 2 секунды

    return () => clearInterval(autoUpgradeInterval);
  }, [
    gameState.isPaused,
    gameState.gameOver,
    gameState.selectedPlayer,
  ]);

  return {
    gameState,
    setGameState, // Экспортируем setGameState для прямого обновления состояния
    buyUnit,
    upgradeBuilding,
    repairBuilding,
    upgradeCastleStat,
    togglePause,
    toggleAutoUpgrade,
    setGameSpeed,
    selectPlayer,
    selectBuilding,
    restartGame,
  };
}
