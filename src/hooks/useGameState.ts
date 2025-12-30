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
  moveUnit,
  damageUnit,
  findNearestEnemy,
  findNearestEnemyBuilding,
  findNearestEnemyUnitForBuilding,
  damageBuilding,
  getDistance,
  getSpawnUnitType,
  getSpawnInterval,
  separateUnits,
  lineCrossesImpassable,
  GAME_CONFIG,
} from "@/lib/gameLogic";

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

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) * gameState.gameSpeed;
      lastUpdateRef.current = now;

      setGameState((prev) => {
        const newState = { ...prev };

        // Обновление юнитов
        const allUnits = prev.players.flatMap((p) => p.units);
        // Собираем все юниты всех игроков для отталкивания (используем prev для стабильности)
        const allUnitsForSeparation = prev.players.flatMap((p) => p.units);

        newState.players = prev.players.map((player) => {
          if (!player.isActive) return player;

          // Движение юнитов
          // Получаем все здания врагов для поиска целей
          const allEnemyBuildings = newState.players
            .filter((p) => p.id !== player.id && p.isActive)
            .flatMap((p) => [p.castle, ...p.barracks, ...p.towers])
            .filter((b) => b.health > 0);

          let updatedUnits = player.units.map((unit) => {
            if (unit.health <= 0) return unit;

            // Сбрасываем флаг атаки через 300мс
            let updatedUnit = { ...unit };
            if (
              unit.isAttacking &&
              unit.lastAttackTime &&
              now - unit.lastAttackTime > 300
            ) {
              updatedUnit.isAttacking = false;
              updatedUnit.attackTarget = undefined;
            }

            // СНАЧАЛА проверяем промежуточные цели - это имеет приоритет
            // Проверяем, есть ли промежуточные цели, которые еще не достигнуты
            const hasIntermediateTargets =
              updatedUnit.intermediateTargets &&
              updatedUnit.currentIntermediateIndex !== undefined &&
              updatedUnit.currentIntermediateIndex <
                updatedUnit.intermediateTargets.length;

            if (hasIntermediateTargets && updatedUnit.intermediateTargets) {
              // Восстанавливаем targetPosition из текущей промежуточной цели
              const currentIntermediateTarget =
                updatedUnit.intermediateTargets[
                  updatedUnit.currentIntermediateIndex!
                ];
              if (
                !updatedUnit.targetPosition ||
                updatedUnit.targetPosition.x !== currentIntermediateTarget.x ||
                updatedUnit.targetPosition.y !== currentIntermediateTarget.y
              ) {
                updatedUnit = {
                  ...updatedUnit,
                  targetPosition: currentIntermediateTarget,
                };
              }
            }

            // Проверка на ближайшего врага (юнит или здание) - используем все юниты игроков
            const allCurrentUnits = newState.players.flatMap((p) => p.units);
            const enemyUnit = findNearestEnemy(updatedUnit, allCurrentUnits);
            const enemyBuilding = findNearestEnemyBuilding(
              updatedUnit,
              allEnemyBuildings
            );

            // Если есть промежуточные цели, приоритет - дойти до них
            // Атакуем врагов только если они находятся в непосредственной близости (в радиусе атаки)
            if (hasIntermediateTargets) {
              const currentIntermediateTarget =
                updatedUnit.intermediateTargets![
                  updatedUnit.currentIntermediateIndex!
                ];

              // Проверяем, является ли текущая промежуточная цель позицией живого здания
              const buildingAtIntermediateTarget = allEnemyBuildings.find(
                (building) => {
                  const distance = getDistance(
                    building.position,
                    currentIntermediateTarget
                  );
                  return distance < 50; // Здание считается в этой позиции, если близко
                }
              );

              // Проверяем, близок ли юнит к текущей промежуточной цели
              const distanceToTarget = getDistance(
                updatedUnit.position,
                currentIntermediateTarget
              );

              // Если промежуточная цель - это позиция живого здания, и юнит близко к ней
              if (
                buildingAtIntermediateTarget &&
                distanceToTarget <= updatedUnit.attackRange
              ) {
                // Проверяем, можем ли мы атаковать здание (не блокирует ли ландшафт)
                if (
                  !lineCrossesImpassable(
                    updatedUnit.position,
                    buildingAtIntermediateTarget.position
                  )
                ) {
                  // Остаемся и атакуем здание, не переключаемся на следующую промежуточную цель
                  return { ...updatedUnit, isMoving: false };
                } else {
                  // Ландшафт блокирует, пытаемся подойти ближе
                  return moveUnit(updatedUnit, deltaTime);
                }
              }

              // Если здание разрушено (buildingAtIntermediateTarget не найден) и мы близки к цели,
              // принудительно переключаемся на следующую промежуточную цель
              if (
                !buildingAtIntermediateTarget &&
                distanceToTarget <= updatedUnit.attackRange
              ) {
                // Промежуточная цель была позицией здания, но здание разрушено
                // Переключаемся на следующую промежуточную цель
                const nextIndex = updatedUnit.currentIntermediateIndex! + 1;
                if (
                  updatedUnit.intermediateTargets &&
                  nextIndex < updatedUnit.intermediateTargets.length
                ) {
                  // Есть следующая промежуточная цель
                  return {
                    ...updatedUnit,
                    targetPosition: updatedUnit.intermediateTargets[nextIndex],
                    currentIntermediateIndex: nextIndex,
                  };
                } else if (updatedUnit.finalTarget) {
                  // Все промежуточные цели пройдены, переключаемся на финальную
                  return {
                    ...updatedUnit,
                    targetPosition: updatedUnit.finalTarget,
                    currentIntermediateIndex: undefined,
                    hasReachedIntermediate: true,
                  };
                }
                // Если нет ни промежуточных, ни финальной цели, продолжаем движение
              }

              // Если есть враг в радиусе атаки - атакуем его, но не меняем целевую позицию
              if (enemyUnit) {
                const distance = getDistance(
                  updatedUnit.position,
                  enemyUnit.position
                );
                if (distance <= updatedUnit.attackRange) {
                  // Враг в радиусе атаки - можем атаковать, но продолжаем двигаться к промежуточной цели
                  const optimalDistance = updatedUnit.attackRange * 0.6; // 60% от максимального радиуса
                  if (distance > optimalDistance) {
                    // Подходим ближе, но сохраняем промежуточную цель
                    // Временно двигаемся к врагу, но промежуточные цели сохранятся
                    return moveUnit(updatedUnit, deltaTime);
                  }
                  // На оптимальной дистанции - останавливаемся для атаки, но промежуточные цели сохраняются
                  const isRangedForIntermediate = updatedUnit.attackRange > 80;
                  const meleeDistanceForIntermediate = 35; // Увеличена с 20px до 35px
                  if (isRangedForIntermediate) {
                    return { ...updatedUnit, isMoving: false };
                  } else {
                    // Для ближнего боя проверяем, достигли ли meleeDistance
                    if (distance <= meleeDistanceForIntermediate) {
                      return { ...updatedUnit, isMoving: false };
                    } else {
                      // Еще не достигли meleeDistance, продолжаем движение
                      return moveUnit(updatedUnit, deltaTime);
                    }
                  }
                }
              }

              // Если есть здание в радиусе атаки - атакуем его
              if (enemyBuilding) {
                const distance = getDistance(
                  updatedUnit.position,
                  enemyBuilding.position
                );
                if (
                  distance <= updatedUnit.attackRange &&
                  !lineCrossesImpassable(
                    updatedUnit.position,
                    enemyBuilding.position
                  )
                ) {
                  // Здание в радиусе атаки - атакуем, но промежуточные цели сохраняются
                  return updatedUnit;
                }
              }

              // Продолжаем движение к промежуточной цели
              let movedUnit = moveUnit(updatedUnit, deltaTime);

              // Проверяем, не переключился ли юнит преждевременно на следующую промежуточную цель
              // Если текущая промежуточная цель была позицией живого здания, откатываем переключение
              if (
                hasIntermediateTargets &&
                movedUnit.currentIntermediateIndex !== undefined &&
                movedUnit.currentIntermediateIndex >
                  updatedUnit.currentIntermediateIndex! &&
                updatedUnit.currentIntermediateIndex !== undefined
              ) {
                const previousIntermediateIndex =
                  updatedUnit.currentIntermediateIndex;
                const previousIntermediateTarget =
                  updatedUnit.intermediateTargets![previousIntermediateIndex];

                // Проверяем, является ли предыдущая промежуточная цель позицией живого здания
                const buildingAtPreviousTarget = allEnemyBuildings.find(
                  (building) => {
                    const distance = getDistance(
                      building.position,
                      previousIntermediateTarget
                    );
                    return distance < 50;
                  }
                );

                // Если предыдущая промежуточная цель - это позиция живого здания, откатываем переключение
                // Но только если здание еще живое!
                if (buildingAtPreviousTarget) {
                  const distanceToPreviousTarget = getDistance(
                    movedUnit.position,
                    previousIntermediateTarget
                  );

                  // Если юнит все еще близко к предыдущей цели (в радиусе атаки), остаемся на ней
                  if (distanceToPreviousTarget <= movedUnit.attackRange) {
                    return {
                      ...movedUnit,
                      targetPosition: previousIntermediateTarget,
                      currentIntermediateIndex: previousIntermediateIndex,
                    };
                  }
                }
                // Если здание разрушено (buildingAtPreviousTarget не найден), разрешаем переключение
              }

              return movedUnit;
            }

            // Приоритет атаке юнитов (если нет промежуточных целей)
            if (enemyUnit) {
              const distance = getDistance(
                updatedUnit.position,
                enemyUnit.position
              );
              const isRanged = updatedUnit.attackRange > 80;
              const meleeDistance = 35; // Увеличена с 20px до 35px

              if (distance <= updatedUnit.attackRange) {
                // Находимся в радиусе атаки
                if (isRanged) {
                  // Дальнобойные юниты - останавливаемся на оптимальной дистанции
                  const optimalDistance = updatedUnit.attackRange * 0.6; // 60% от максимального радиуса
                  if (distance > optimalDistance) {
                    // Подходим ближе к врагу для атаки
                    return moveUnit(
                      {
                        ...updatedUnit,
                        targetPosition: enemyUnit.position,
                        isMoving: true,
                      },
                      deltaTime
                    );
                  }
                  // На оптимальной дистанции - останавливаемся
                  return { ...updatedUnit, isMoving: false };
                } else {
                  // Ближний бой - подходим вплотную до meleeDistance
                  if (distance > meleeDistance) {
                    // Подходим ближе
                    return moveUnit(
                      {
                        ...updatedUnit,
                        targetPosition: enemyUnit.position,
                        isMoving: true,
                      },
                      deltaTime
                    );
                  }
                  // Вплотную - останавливаемся
                  return { ...updatedUnit, isMoving: false };
                }
              } else {
                // Двигаемся к врагу
                return moveUnit(
                  {
                    ...updatedUnit,
                    targetPosition: enemyUnit.position,
                    isMoving: true,
                  },
                  deltaTime
                );
              }
            }

            // Если нет врагов-юнитов, атакуем здания
            if (enemyBuilding) {
              const distance = getDistance(
                updatedUnit.position,
                enemyBuilding.position
              );
              if (distance <= updatedUnit.attackRange) {
                // Проверяем, не блокирует ли непроходимый ландшафт линию атаки
                if (
                  !lineCrossesImpassable(
                    updatedUnit.position,
                    enemyBuilding.position
                  )
                ) {
                  // Находимся в радиусе атаки здания и можем атаковать
                  return updatedUnit;
                } else {
                  // Ландшафт блокирует атаку, пытаемся подойти ближе
                  return moveUnit(
                    {
                      ...updatedUnit,
                      targetPosition: enemyBuilding.position,
                    },
                    deltaTime
                  );
                }
              } else {
                // Двигаемся к зданию
                return moveUnit(
                  {
                    ...updatedUnit,
                    targetPosition: enemyBuilding.position,
                  },
                  deltaTime
                );
              }
            }

            // Если нет вражеских юнитов и зданий, проверяем текущую цель
            if (updatedUnit.targetPosition) {
              // Проверяем, есть ли живое здание в текущей цели
              const buildingAtTarget = allEnemyBuildings.find((building) => {
                const distance = getDistance(
                  building.position,
                  updatedUnit.targetPosition!
                );
                return distance < 50; // Здание считается в этой позиции, если близко
              });

              if (buildingAtTarget) {
                // Цель еще существует, идем к ней
                return moveUnit(updatedUnit, deltaTime);
              } else {
                // Цель разрушена, находим новую
                const nextTarget = getNextTarget(
                  updatedUnit.playerId,
                  updatedUnit.targetPosition,
                  allEnemyBuildings,
                  GAME_CONFIG.mapSize,
                  updatedUnit.barrackIndex
                );
                return moveUnit(
                  { ...updatedUnit, targetPosition: nextTarget },
                  deltaTime
                );
              }
            } else {
              // Нет цели, находим новую
              const nextTarget = getNextTarget(
                updatedUnit.playerId,
                undefined,
                allEnemyBuildings,
                GAME_CONFIG.mapSize,
                updatedUnit.barrackIndex
              );
              return moveUnit(
                { ...updatedUnit, targetPosition: nextTarget },
                deltaTime
              );
            }

            return updatedUnit;
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

        // Применяем урон от атак (проверяем каждый кадр для каждого юнита отдельно)
        const attackInterval = 1500; // 1.5 секунды между атаками

        // Сохраняем исходные юниты ДО обновления движения для проверки дистанции атаки
        const originalUnitsList = prev.players
          .flatMap((p) => p.units)
          .filter((u) => u.health > 0);

        // Создаем карту всех юнитов для быстрого доступа
        // allUnitsList содержит юниты ПОСЛЕ обновления движения (с isMoving: false, если они остановились)
        const allUnitsList = newState.players
          .flatMap((p) => p.units)
          .filter((u) => u.health > 0);
        const attackedUnits = new Set<string>(); // Отслеживаем атакованные юниты

        // Создаем карту обновленных юнитов (для хранения изменений в секции атаки)
        const unitsMap = new Map<string, Unit>();
        // Отслеживаем убийства для начисления золота: Map<playerId, totalGold>
        const killRewards = new Map<PlayerId, number>();

        // Собираем статистику боя отдельно, чтобы применять её корректно
        const statsUpdates = new Map<
          PlayerId,
          {
            unitsKilled: number;
            unitsLost: number;
            damageDealt: number;
            damageTaken: number;
            goldEarned: number;
          }
        >();

        // Инициализируем статистику для всех игроков
        newState.players.forEach((player) => {
          statsUpdates.set(player.id, {
            unitsKilled: 0,
            unitsLost: 0,
            damageDealt: 0,
            damageTaken: 0,
            goldEarned: 0,
          });
        });

        // Обрабатываем атаки между юнитами (только для тех, кто в радиусе атаки и не двигается)
        // ВАЖНО: allUnitsList уже содержит обновленные юниты после движения (с isMoving: false, если остановились)
        // Используем обновленные юниты из allUnitsList для проверки isMoving и поиска врагов
        const allUnitsForAttack = allUnitsList;

        // Проходим по всем юнитам для проверки атак
        allUnitsForAttack.forEach((updatedUnit) => {
          if (updatedUnit.health <= 0 || attackedUnits.has(updatedUnit.id))
            return;
          if (updatedUnit.isMoving) return; // Не атакуем, если двигаемся

          const canAttack =
            !updatedUnit.lastAttackTime ||
            now - updatedUnit.lastAttackTime >= attackInterval;
          if (!canAttack) return;

          // Используем обновленные позиции для поиска врагов (из unitsMap, если есть)
          const updatedEnemyUnits = allUnitsForAttack.filter(
            (u) =>
              u.playerId !== updatedUnit.playerId &&
              !attackedUnits.has(u.id) &&
              u.health > 0
          );
          const enemy = findNearestEnemy(updatedUnit, updatedEnemyUnits);

          if (enemy) {
            // ВАЖНО: Используем обновленные позиции для проверки дистанции
            // Это гарантирует, что мы проверяем актуальную дистанцию после движения и отталкивания
            const attackDistance = getDistance(
              updatedUnit.position,
              enemy.position
            );

            // Для проверки "был ли жив" используем исходные версии
            const originalUnit =
              originalUnitsList.find((u) => u.id === updatedUnit.id) ||
              updatedUnit;
            const originalEnemy =
              originalUnitsList.find((u) => u.id === enemy.id) || enemy;

            // Проверяем, можем ли МЫ атаковать (в своем радиусе атаки)
            // Для дальнобойных (лучники, маги) используем attackRange
            // Для ближних (воины) используем meleeDistance (35px - увеличенная дистанция для компенсации отталкивания)
            const isRanged = originalUnit.attackRange > 80;
            const meleeDistance = 35; // Увеличена с 20px до 35px
            const canWeAttack = isRanged
              ? attackDistance <= originalUnit.attackRange
              : attackDistance <= meleeDistance;

            // НЕ атакуем, если не в своей дистанции атаки
            if (!canWeAttack) return;

            // Проверяем, не блокирует ли непроходимый ландшафт линию атаки
            if (
              lineCrossesImpassable(
                originalUnit.position,
                originalEnemy.position
              )
            ) {
              return;
            }

            // Проверяем, может ли ВРАГ также атаковать нас (в его радиусе атаки)
            const enemyIsRanged = originalEnemy.attackRange > 80;
            const enemyMeleeDistance = 35; // Увеличена с 20px до 35px
            const canEnemyAttack = enemyIsRanged
              ? attackDistance <= originalEnemy.attackRange
              : attackDistance <= enemyMeleeDistance;

            // Применяем урон врагу (используем обновленные версии из unitsMap, если есть)
            const currentEnemyForDamage = unitsMap.get(enemy.id) || enemy;
            const damagedEnemy = damageUnit(
              currentEnemyForDamage,
              updatedUnit.attack
            );

            // Взаимный урон применяем только если ВРАГ тоже может атаковать в СВОЕМ радиусе
            // Если враг не может атаковать (например, воин на расстоянии 100px от лучника),
            // то урон наносит только атакующий юнит
            const currentUnitForDamage =
              unitsMap.get(updatedUnit.id) || updatedUnit;
            const damagedUnit = canEnemyAttack
              ? damageUnit(currentUnitForDamage, originalEnemy.attack)
              : currentUnitForDamage;

            // Проверяем, были ли юниты живы ДО этой атаки (используем исходные версии)
            const enemyWasAlive = originalEnemy.health > 0;
            const unitWasAlive = originalUnit.health > 0;

            // Обновляем нанесенный/полученный урон
            const actualEnemyDamage = Math.max(
              1,
              Math.floor(
                updatedUnit.attack - (currentEnemyForDamage.defense || 0)
              )
            );
            // Урон по нашему юниту применяется только если враг может атаковать
            const actualUnitDamage = canEnemyAttack
              ? Math.max(
                  1,
                  Math.floor(
                    originalEnemy.attack - (currentUnitForDamage.defense || 0)
                  )
                )
              : 0;

            const attackerStats = statsUpdates.get(updatedUnit.playerId)!;
            attackerStats.damageDealt += actualEnemyDamage;
            attackerStats.damageTaken += actualUnitDamage;

            const defenderStats = statsUpdates.get(enemy.playerId)!;
            defenderStats.damageDealt += actualUnitDamage;
            defenderStats.damageTaken += actualEnemyDamage;

            // Если враг был жив до атаки, а теперь мертв - начисляем золото за убийство
            if (enemyWasAlive && damagedEnemy.health <= 0) {
              const reward = GAME_CONFIG.killReward[damagedEnemy.type];
              const currentReward = killRewards.get(updatedUnit.playerId) || 0;
              killRewards.set(updatedUnit.playerId, currentReward + reward);

              attackerStats.unitsKilled += 1;
              attackerStats.goldEarned += reward;
              defenderStats.unitsLost += 1;
            }

            // Если наш юнит был жив до атаки, а теперь мертв - начисляем золото врагу
            if (unitWasAlive && damagedUnit.health <= 0) {
              const reward = GAME_CONFIG.killReward[damagedUnit.type];
              const currentReward = killRewards.get(enemy.playerId) || 0;
              killRewards.set(enemy.playerId, currentReward + reward);

              defenderStats.unitsKilled += 1;
              defenderStats.goldEarned += reward;
              attackerStats.unitsLost += 1;
            }

            // Сохраняем обновленных юнитов
            unitsMap.set(enemy.id, {
              ...damagedEnemy,
              isAttacking: true,
              lastAttackTime: now,
              attackTarget: updatedUnit.position,
            });
            unitsMap.set(updatedUnit.id, {
              ...damagedUnit,
              isAttacking: canEnemyAttack, // isAttacking только если враг тоже атакует
              lastAttackTime: now,
              attackTarget: enemy.position,
            });

            // Помечаем обоих как атакованных, чтобы избежать двойной атаки в этом цикле
            attackedUnits.add(updatedUnit.id);
            attackedUnits.add(enemy.id);
          }
        });

        // Применяем обновления ко всем игрокам и начисляем золото за убийства
        // ВАЖНО: Применяем обновления всегда, даже если unitsMap пуст, чтобы обновить статистику и золото
        newState.players = newState.players.map((player) => {
          if (!player.isActive) return player;

          // Получаем награду за убийства для этого игрока
          const reward = killRewards.get(player.id) || 0;
          const statsUpdate = statsUpdates.get(player.id)!;

          // Применяем обновления юнитов из unitsMap (если есть)
          const updatedUnits = player.units
            .map((unit) => {
              const updated = unitsMap.get(unit.id);
              return updated || unit;
            })
            .filter((u) => u.health > 0); // Удаляем мертвых юнитов

          // Обновляем только если есть изменения (урон, золото, статистика)
          if (
            unitsMap.size > 0 ||
            reward > 0 ||
            statsUpdate.unitsKilled > 0 ||
            statsUpdate.unitsLost > 0 ||
            statsUpdate.damageDealt > 0 ||
            statsUpdate.damageTaken > 0 ||
            statsUpdate.goldEarned > 0
          ) {
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
            };
          }

          // Если нет изменений, возвращаем игрока как есть
          return player;
        });

        // Обрабатываем атаки зданий по юнитам (башни и замки атакуют вражеских юнитов)
        const buildingAttackInterval = 1000; // 1 секунда между атаками зданий

        newState.players = newState.players.map((player) => {
          if (!player.isActive) return player;

          const allUnitsForBuildingAttack = newState.players
            .flatMap((p) => p.units)
            .filter((u) => u.health > 0);

          return {
            ...player,
            castle: (() => {
              if (
                player.castle.health <= 0 ||
                !player.castle.attack ||
                !player.castle.attackRange
              ) {
                return { ...player.castle, attackTarget: undefined };
              }

              const canAttack =
                !player.castle.lastAttackTime ||
                now - player.castle.lastAttackTime >= buildingAttackInterval;
              if (!canAttack) return player.castle;

              const nearestEnemy = findNearestEnemyUnitForBuilding(
                player.castle,
                allUnitsForBuildingAttack
              );
              if (!nearestEnemy) {
                return { ...player.castle, attackTarget: undefined };
              }

              const distance = getDistance(
                player.castle.position,
                nearestEnemy.position
              );
              if (
                distance <= player.castle.attackRange &&
                !lineCrossesImpassable(
                  player.castle.position,
                  nearestEnemy.position
                )
              ) {
                // Наносим урон вражескому юниту
                const damagedEnemy = damageUnit(
                  nearestEnemy,
                  player.castle.attack
                );
                const actualDamage = Math.max(
                  1,
                  Math.floor(player.castle.attack - (nearestEnemy.defense || 0))
                );

                // Обновляем юнит напрямую
                const enemyPlayerIndex = newState.players.findIndex(
                  (p) => p.id === nearestEnemy.playerId
                );
                if (enemyPlayerIndex !== -1) {
                  const unitIndex = newState.players[
                    enemyPlayerIndex
                  ].units.findIndex((u) => u.id === nearestEnemy.id);
                  if (unitIndex !== -1) {
                    newState.players[enemyPlayerIndex].units[unitIndex] = {
                      ...damagedEnemy,
                      health: Math.max(0, damagedEnemy.health),
                    };
                  }
                }

                // Обновляем статистику
                const attackerStats = statsUpdates.get(player.id)!;
                attackerStats.damageDealt += actualDamage;
                const defenderStats = statsUpdates.get(nearestEnemy.playerId)!;
                defenderStats.damageTaken += actualDamage;

                return {
                  ...player.castle,
                  lastAttackTime: now,
                  attackTarget: nearestEnemy.position,
                };
              }

              return { ...player.castle, attackTarget: undefined };
            })(),
            towers: player.towers.map((tower) => {
              if (tower.health <= 0 || !tower.attack || !tower.attackRange) {
                return { ...tower, attackTarget: undefined };
              }

              const canAttack =
                !tower.lastAttackTime ||
                now - tower.lastAttackTime >= buildingAttackInterval;
              if (!canAttack) return tower;

              const nearestEnemy = findNearestEnemyUnitForBuilding(
                tower,
                allUnitsForBuildingAttack
              );
              if (!nearestEnemy) {
                return { ...tower, attackTarget: undefined };
              }

              const distance = getDistance(
                tower.position,
                nearestEnemy.position
              );
              if (
                distance <= tower.attackRange &&
                !lineCrossesImpassable(tower.position, nearestEnemy.position)
              ) {
                // Наносим урон вражескому юниту
                const damagedEnemy = damageUnit(nearestEnemy, tower.attack);
                const actualDamage = Math.max(
                  1,
                  Math.floor(tower.attack - (nearestEnemy.defense || 0))
                );

                // Обновляем юнит напрямую
                const enemyPlayerIndex = newState.players.findIndex(
                  (p) => p.id === nearestEnemy.playerId
                );
                if (enemyPlayerIndex !== -1) {
                  const unitIndex = newState.players[
                    enemyPlayerIndex
                  ].units.findIndex((u) => u.id === nearestEnemy.id);
                  if (unitIndex !== -1) {
                    newState.players[enemyPlayerIndex].units[unitIndex] = {
                      ...damagedEnemy,
                      health: Math.max(0, damagedEnemy.health),
                    };
                  }
                }

                // Обновляем статистику
                const attackerStats = statsUpdates.get(player.id)!;
                attackerStats.damageDealt += actualDamage;
                const defenderStats = statsUpdates.get(nearestEnemy.playerId)!;
                defenderStats.damageTaken += actualDamage;

                return {
                  ...tower,
                  lastAttackTime: now,
                  attackTarget: nearestEnemy.position,
                };
              }

              return { ...tower, attackTarget: undefined };
            }),
          };
        });

        // Обрабатываем атаки юнитов по зданиям
        // Собираем статистику разрушенных зданий и урона по зданиям
        const destroyedBuildings = new Map<
          string,
          {
            ownerId: PlayerId;
            attackerIds: Set<PlayerId>;
            buildingType: "castle" | "barracks" | "tower";
          }
        >();

        // Статистика урона по зданиям
        const buildingDamageStats = new Map<
          PlayerId,
          {
            damageDealt: number;
            damageTaken: number;
          }
        >();

        // Инициализируем статистику урона по зданиям
        newState.players.forEach((player) => {
          buildingDamageStats.set(player.id, {
            damageDealt: 0,
            damageTaken: 0,
          });
        });

        // Создаем карту для обновления lastAttackTime юнитов, атакующих здания
        const unitsAttackingBuildings = new Map<string, Unit>();

        newState.players = newState.players.map((player) => {
          if (!player.isActive) return player;

          return {
            ...player,
            castle: (() => {
              // Используем обновленных юнитов из unitsMap, если они там есть
              const allEnemyUnits = newState.players
                .filter((p) => p.id !== player.id && p.isActive)
                .flatMap((p) => p.units)
                .filter((u) => u.health > 0)
                .map((u) => unitsMap.get(u.id) || u);

              let castle = player.castle;
              const wasAlive = castle.health > 0;
              const buildingId = castle.id;

              allEnemyUnits.forEach((enemyUnit) => {
                // Проверяем, может ли юнит атаковать (прошло достаточно времени с последней атаки)
                const canAttack =
                  !enemyUnit.lastAttackTime ||
                  now - enemyUnit.lastAttackTime >= attackInterval;
                if (!canAttack) return;

                const distance = getDistance(
                  enemyUnit.position,
                  castle.position
                );
                if (
                  distance < 60 &&
                  !lineCrossesImpassable(enemyUnit.position, castle.position)
                ) {
                  const oldHealth = castle.health;
                  castle = damageBuilding(castle, enemyUnit.attack);
                  const damage = Math.max(0, oldHealth - castle.health);

                  // Сохраняем статистику урона и обновляем lastAttackTime
                  if (damage > 0) {
                    const attackerStats = buildingDamageStats.get(
                      enemyUnit.playerId
                    )!;
                    attackerStats.damageDealt += damage;
                    const defenderStats = buildingDamageStats.get(player.id)!;
                    defenderStats.damageTaken += damage;

                    // Обновляем lastAttackTime для этого юнита
                    unitsAttackingBuildings.set(enemyUnit.id, {
                      ...enemyUnit,
                      lastAttackTime: now,
                    });
                  }
                }
              });

              // Если замок был жив, а теперь разрушен - запоминаем для статистики
              if (wasAlive && castle.health <= 0) {
                const attackers = new Set<PlayerId>();
                allEnemyUnits.forEach((enemyUnit) => {
                  const distance = getDistance(
                    enemyUnit.position,
                    castle.position
                  );
                  if (distance < 60) {
                    attackers.add(enemyUnit.playerId);
                  }
                });
                destroyedBuildings.set(buildingId, {
                  ownerId: player.id,
                  attackerIds: attackers,
                  buildingType: "castle",
                });
              }

              return castle;
            })(),
            barracks: player.barracks.map((barrack) => {
              // Используем обновленных юнитов из unitsMap, если они там есть
              const allEnemyUnits = newState.players
                .filter((p) => p.id !== player.id && p.isActive)
                .flatMap((p) => p.units)
                .filter((u) => u.health > 0)
                .map(
                  (u) =>
                    unitsAttackingBuildings.get(u.id) || unitsMap.get(u.id) || u
                );

              let updatedBarrack = barrack;
              const wasAlive = barrack.health > 0;
              const buildingId = barrack.id;

              allEnemyUnits.forEach((enemyUnit) => {
                // Проверяем, может ли юнит атаковать (прошло достаточно времени с последней атаки)
                const canAttack =
                  !enemyUnit.lastAttackTime ||
                  now - enemyUnit.lastAttackTime >= attackInterval;
                if (!canAttack) return;

                const distance = getDistance(
                  enemyUnit.position,
                  barrack.position
                );
                if (
                  distance < 60 &&
                  !lineCrossesImpassable(enemyUnit.position, barrack.position)
                ) {
                  const oldHealth = updatedBarrack.health;
                  updatedBarrack = damageBuilding(
                    updatedBarrack,
                    enemyUnit.attack
                  );
                  const damage = Math.max(0, oldHealth - updatedBarrack.health);

                  // Сохраняем статистику урона и обновляем lastAttackTime
                  if (damage > 0) {
                    const attackerStats = buildingDamageStats.get(
                      enemyUnit.playerId
                    )!;
                    attackerStats.damageDealt += damage;
                    const defenderStats = buildingDamageStats.get(player.id)!;
                    defenderStats.damageTaken += damage;

                    // Обновляем lastAttackTime для этого юнита
                    unitsAttackingBuildings.set(enemyUnit.id, {
                      ...enemyUnit,
                      lastAttackTime: now,
                    });
                  }
                }
              });

              // Если барак был жив, а теперь разрушен - запоминаем для статистики
              if (wasAlive && updatedBarrack.health <= 0) {
                const attackers = new Set<PlayerId>();
                allEnemyUnits.forEach((enemyUnit) => {
                  const distance = getDistance(
                    enemyUnit.position,
                    barrack.position
                  );
                  if (distance < 60) {
                    attackers.add(enemyUnit.playerId);
                  }
                });
                destroyedBuildings.set(buildingId, {
                  ownerId: player.id,
                  attackerIds: attackers,
                  buildingType: "barracks",
                });
              }

              return updatedBarrack;
            }),
            towers: player.towers.map((tower) => {
              // Используем обновленных юнитов из unitsMap, если они там есть
              const allEnemyUnits = newState.players
                .filter((p) => p.id !== player.id && p.isActive)
                .flatMap((p) => p.units)
                .filter((u) => u.health > 0)
                .map(
                  (u) =>
                    unitsAttackingBuildings.get(u.id) || unitsMap.get(u.id) || u
                );

              let updatedTower = tower;
              const wasAlive = tower.health > 0;
              const buildingId = tower.id;

              allEnemyUnits.forEach((enemyUnit) => {
                // Проверяем, может ли юнит атаковать (прошло достаточно времени с последней атаки)
                const canAttack =
                  !enemyUnit.lastAttackTime ||
                  now - enemyUnit.lastAttackTime >= attackInterval;
                if (!canAttack) return;

                const distance = getDistance(
                  enemyUnit.position,
                  tower.position
                );
                if (
                  distance < 60 &&
                  !lineCrossesImpassable(enemyUnit.position, tower.position)
                ) {
                  const oldHealth = updatedTower.health;
                  updatedTower = damageBuilding(updatedTower, enemyUnit.attack);
                  const damage = Math.max(0, oldHealth - updatedTower.health);

                  // Сохраняем статистику урона и обновляем lastAttackTime
                  if (damage > 0) {
                    const attackerStats = buildingDamageStats.get(
                      enemyUnit.playerId
                    )!;
                    attackerStats.damageDealt += damage;
                    const defenderStats = buildingDamageStats.get(player.id)!;
                    defenderStats.damageTaken += damage;

                    // Обновляем lastAttackTime для этого юнита
                    unitsAttackingBuildings.set(enemyUnit.id, {
                      ...enemyUnit,
                      lastAttackTime: now,
                    });
                  }
                }
              });

              // Если башня была жива, а теперь разрушена - запоминаем для статистики
              if (wasAlive && updatedTower.health <= 0) {
                const attackers = new Set<PlayerId>();
                allEnemyUnits.forEach((enemyUnit) => {
                  const distance = getDistance(
                    enemyUnit.position,
                    tower.position
                  );
                  if (distance < 60) {
                    attackers.add(enemyUnit.playerId);
                  }
                });
                destroyedBuildings.set(buildingId, {
                  ownerId: player.id,
                  attackerIds: attackers,
                  buildingType: "tower",
                });
              }

              return updatedTower;
            }),
          };
        });

        // Применяем обновления lastAttackTime для юнитов, атаковавших здания
        if (unitsAttackingBuildings.size > 0) {
          newState.players = newState.players.map((player) => ({
            ...player,
            units: player.units.map((unit) => {
              const updated = unitsAttackingBuildings.get(unit.id);
              return updated || unit;
            }),
          }));
        }

        // Применяем статистику разрушенных зданий и урона по зданиям, начисляем золото
        if (destroyedBuildings.size > 0 || buildingDamageStats.size > 0) {
          // Создаем карту наград за разрушенные здания
          const buildingRewards = new Map<PlayerId, number>();

          // Собираем информацию о разрушенных зданиях для начисления наград
          destroyedBuildings.forEach(
            ({ ownerId, attackerIds, buildingType }) => {
              const reward = GAME_CONFIG.buildingDestroyReward[buildingType];
              if (reward) {
                // Награду получают все атакующие игроки (разделяем поровну)
                const attackerArray = Array.from(attackerIds);
                if (attackerArray.length > 0) {
                  const rewardPerPlayer = Math.floor(
                    reward / attackerArray.length
                  );
                  attackerArray.forEach((attackerId) => {
                    const currentReward = buildingRewards.get(attackerId) || 0;
                    buildingRewards.set(
                      attackerId,
                      currentReward + rewardPerPlayer
                    );
                  });
                }
              }
            }
          );

          newState.players = newState.players.map((player) => {
            if (!player.isActive) return player;

            let buildingsDestroyed = 0;
            let buildingsLost = 0;

            // Подсчитываем разрушенные здания для этого игрока
            destroyedBuildings.forEach(({ ownerId, attackerIds }) => {
              if (attackerIds.has(player.id)) {
                buildingsDestroyed += 1;
              }
              if (ownerId === player.id) {
                buildingsLost += 1;
              }
            });

            const buildingDamage = buildingDamageStats.get(player.id)!;
            const reward = buildingRewards.get(player.id) || 0;

            return {
              ...player,
              gold: player.gold + reward,
              stats: {
                ...player.stats,
                buildingsDestroyed:
                  player.stats.buildingsDestroyed + buildingsDestroyed,
                buildingsLost: player.stats.buildingsLost + buildingsLost,
                damageDealt:
                  player.stats.damageDealt + buildingDamage.damageDealt,
                damageTaken:
                  player.stats.damageTaken + buildingDamage.damageTaken,
                goldEarned: player.stats.goldEarned + reward,
              },
            };
          });
        }

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

  // Получение золота
  useEffect(() => {
    if (gameState.isPaused) return;

    const goldInterval = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((player) => {
          const earnedGold = (player.goldIncome * prev.gameSpeed) / 10;
          return {
            ...player,
            gold: player.gold + earnedGold,
            stats: {
              ...player.stats,
              goldEarned: player.stats.goldEarned + earnedGold,
            },
          };
        }),
      }));
    }, GAME_CONFIG.goldIncomeInterval / gameState.gameSpeed);

    return () => clearInterval(goldInterval);
  }, [gameState.isPaused, gameState.gameSpeed]);

  // Спавн юнитов из бараков (бесплатный автоматический спавн)
  useEffect(() => {
    if (gameState.isPaused) return;

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
  useEffect(() => {
    if (gameState.isPaused) return;

    const cooldownInterval = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((player) => {
          const updateBuilding = (building: BuildingType) => {
            let updated = { ...building };
            if (updated.upgradeCooldown && updated.upgradeCooldown > 0) {
              updated.upgradeCooldown = Math.max(
                0,
                updated.upgradeCooldown - GAME_CONFIG.gameLoopInterval
              );
            }
            if (updated.repairCooldown && updated.repairCooldown > 0) {
              updated.repairCooldown = Math.max(
                0,
                updated.repairCooldown - GAME_CONFIG.gameLoopInterval
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
  useEffect(() => {
    if (gameState.isPaused) return;

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
                      ? { ...b, availableUnits: availableUnits - 1 }
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

        if (
          player.gold >= upgradeCost &&
          (!building.upgradeCooldown || building.upgradeCooldown <= 0)
        ) {
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
                      upgradeCooldown: 5000,
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
                } else if (p.towers.some((t) => t.id === buildingId)) {
                  const upgradedTower = p.towers.find(
                    (t) => t.id === buildingId
                  );
                  if (upgradedTower) {
                    const newLevel = upgradedTower.level + 1;
                    // Башни можно улучшать до 5 уровня
                    if (newLevel > 5) {
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
                  repairCooldown: 10000,
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
                const baseCastleHealth = 3000;
                const baseCastleAttack = 30;
                const baseTowerHealth = 800;
                const baseTowerAttack = 50;
                const baseBarrackHealth = 1500;

                // Если улучшаем здоровье зданий, восстанавливаем здоровье
                const healthIncrease = stat === "buildingHealth" ? 200 : 0;

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
    setGameState((prev) => ({ ...prev, autoUpgrade: !prev.autoUpgrade }));
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
  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver) return;

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

          if (action < 0.4 && player.gold >= 200) {
            // 40% шанс - покупка юнита
            const aliveBarracks = player.barracks.filter((b) => b.health > 0);
            if (aliveBarracks.length > 0) {
              const barrack =
                aliveBarracks[Math.floor(Math.random() * aliveBarracks.length)];
              const availableUnits = barrack.availableUnits || 0;

              if (availableUnits > 0) {
                const unitType: UnitType = "warrior"; // Только воины
                const cost = GAME_CONFIG.unitCost[unitType];

                if (player.gold >= cost) {
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
                          }
                        : b
                    ),
                  };
                }
              }
            }
          } else if (action < 0.65 && player.gold >= 200) {
            // 25% шанс - улучшение здания
            const upgradeableBuildings: Array<{ id: string }> = [];

            if (
              player.castle.level < 5 &&
              (!player.castle.upgradeCooldown ||
                player.castle.upgradeCooldown <= 0)
            ) {
              upgradeableBuildings.push({ id: player.castle.id });
            }

            player.barracks.forEach((b) => {
              if (
                b.health > 0 &&
                b.level < 5 &&
                (!b.upgradeCooldown || b.upgradeCooldown <= 0) &&
                // Бараки можно улучшать до 3 уровня только если замок минимум 2 уровня
                !(b.level >= 2 && player.castle.level < 2)
              ) {
                upgradeableBuildings.push({ id: b.id });
              }
            });

            player.towers.forEach((t) => {
              if (
                t.health > 0 &&
                t.level < 5 &&
                (!t.upgradeCooldown || t.upgradeCooldown <= 0)
              ) {
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
                    upgradeCooldown: 5000,
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
                    repairCooldown: 10000,
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
  useEffect(() => {
    if (gameState.isPaused || gameState.gameOver) {
      return;
    }

    const autoUpgradeInterval = setInterval(() => {
      setGameState((prev) => {
        // Применяем автоматическое ра        звитие ко всем игрокам
        // Для выбранного игрока - только если autoUpgrade включен
        // Для AI игроков (id !== 0) - всегда

        const playersToUpgrade: PlayerId[] = [];

        // Добавляем выбранного игрока, если autoUpgrade включен
        if (prev.autoUpgrade && prev.selectedPlayer !== null) {
          const selectedPlayer = prev.players[prev.selectedPlayer];
          if (selectedPlayer && selectedPlayer.isActive) {
            playersToUpgrade.push(prev.selectedPlayer);
          }
        }

        // Добавляем всех AI игроков
        prev.players.forEach((p) => {
          if (p.id !== 0 && p.isActive && !playersToUpgrade.includes(p.id)) {
            playersToUpgrade.push(p.id);
          }
        });

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

                newState = {
                  ...newState,
                  players: newState.players.map((p) => {
                    if (p.id === playerId) {
                      const baseCastleHealth = 3000;
                      const baseCastleAttack = 30;
                      const baseTowerHealth = 800;
                      const baseTowerAttack = 50;
                      const baseBarrackHealth = 1500;

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
              if (
                currentPlayerForUpgrade.gold >= upgradeCost &&
                (!barrackToUpgrade.upgradeCooldown ||
                  barrackToUpgrade.upgradeCooldown <= 0)
              ) {
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
                                upgradeCooldown: 5000,
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
                        const baseCastleHealth = 3000;
                        const baseCastleAttack = 30;
                        const baseTowerHealth = 800;
                        const baseTowerAttack = 50;
                        const baseBarrackHealth = 1500;

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
                if (
                  currentPlayer.gold >= upgradeCost &&
                  (!currentPlayer.castle.upgradeCooldown ||
                    currentPlayer.castle.upgradeCooldown <= 0)
                ) {
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
                            upgradeCooldown: 5000,
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

          // Случайная прокачка: если все статы на уровне 2, все бараки на уровне 2, и замок на уровне 2
          if (
            allCastleStatsAtLevel1 &&
            (currentAliveBarracks.length === 0 || allBarracksAtLevel2Check) &&
            allCastleStatsAtLevel2Check &&
            currentPlayer.castle.level >= 2
          ) {
            // Потом случайно: статы замка, бараки или башни
            // Проверяем доступные варианты улучшения
            const upgradeableStats = castleStats.filter(
              (stat) =>
                currentPlayer.upgrades[stat] < 5 &&
                !(
                  currentPlayer.upgrades[stat] >= 2 &&
                  currentPlayer.castle.level < 2
                )
            );
            const upgradeableBarracks2 = currentPlayer.barracks.filter(
              (b) =>
                b.health > 0 &&
                b.level < 5 &&
                (!b.upgradeCooldown || b.upgradeCooldown <= 0) &&
                !(b.level >= 2 && currentPlayer.castle.level < 2)
            );
            const upgradeableTowers = currentPlayer.towers.filter(
              (t) =>
                t.health > 0 &&
                t.level < 5 &&
                (!t.upgradeCooldown || t.upgradeCooldown <= 0)
            );

            // Выбираем случайный доступный тип улучшения
            const availableOptions: string[] = [];
            if (upgradeableStats.length > 0) availableOptions.push("stat");
            if (upgradeableBarracks2.length > 0)
              availableOptions.push("barrack");
            if (upgradeableTowers.length > 0) availableOptions.push("tower");

            if (availableOptions.length === 0) {
              // Нет доступных улучшений
            } else {
              const action =
                availableOptions[
                  Math.floor(Math.random() * availableOptions.length)
                ];
              if (action === "stat") {
                // Прокачка стата замка
                const stat =
                  upgradeableStats[
                    Math.floor(Math.random() * upgradeableStats.length)
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
                        const baseCastleHealth = 3000;
                        const baseCastleAttack = 30;
                        const baseTowerHealth = 800;
                        const baseTowerAttack = 50;
                        const baseBarrackHealth = 1500;

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
              } else if (action === "barrack") {
                // Прокачка барака
                const barrack =
                  upgradeableBarracks2[
                    Math.floor(Math.random() * upgradeableBarracks2.length)
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
                                  upgradeCooldown: 5000,
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
              } else if (action === "tower") {
                // Прокачка башни
                const tower =
                  upgradeableTowers[
                    Math.floor(Math.random() * upgradeableTowers.length)
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
                                  upgradeCooldown: 5000,
                                }
                              : t
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
    gameState.autoUpgrade,
    gameState.selectedPlayer,
  ]);

  return {
    gameState,
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
