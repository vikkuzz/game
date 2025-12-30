"use client";

import React, { useState, useEffect, useRef } from "react";
import { GameMap } from "@/components/game/GameMap";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { UnitType, BuildingType, PlayerId, Position, Unit, Building, GameState } from "@/types/game";
import { createUnit, createCastle, GAME_CONFIG, damageUnit, damageBuilding, findNearestEnemy, findNearestEnemyBuilding, findNearestEnemyUnitForBuilding, getDistance, lineCrossesImpassable, moveUnit } from "@/lib/gameLogic";

/**
 * Тестовая страница для игры
 * Позволяет размещать юнитов и здания на карте для тестирования
 */
export default function TestPage() {
  const mapSize = GAME_CONFIG.mapSize;
  const center = mapSize / 2;

  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(0);
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [gameTime, setGameTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const lastUpdateRef = useRef<number>(Date.now());
  const gameLoopRef = useRef<number | null>(null);
  const unitsRef = useRef<Unit[]>([]);
  const buildingsRef = useRef<Building[]>([]);

  // Синхронизируем refs с state
  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  useEffect(() => {
    buildingsRef.current = buildings;
  }, [buildings]);

  // Создаем mock игроков для отображения
  const mockPlayers = [0, 1, 2, 3].map((id) => ({
    id: id as PlayerId,
    gold: 9999,
    goldIncome: 100,
    castle: buildings.find((b) => b.type === "castle" && b.playerId === id) || {
      id: `castle-${id}`,
      type: "castle" as BuildingType,
      playerId: id as PlayerId,
      position: { x: center, y: center },
      health: 0,
      maxHealth: 3000,
      level: 1,
      attack: 30,
      attackRange: 50,
      defense: 15,
    },
    barracks: buildings.filter((b) => b.type === "barracks" && b.playerId === id),
    towers: buildings.filter((b) => b.type === "tower" && b.playerId === id),
    units: units.filter((u) => u.playerId === id),
    upgrades: {
      attack: 0,
      defense: 0,
      health: 0,
      magic: 0,
      goldIncome: 0,
      buildingHealth: 0,
      buildingAttack: 0,
    },
    isActive: true,
    stats: {
      unitsKilled: 0,
      unitsLost: 0,
      buildingsDestroyed: 0,
      buildingsLost: 0,
      damageDealt: 0,
      damageTaken: 0,
      goldEarned: 0,
    },
  }));

  const mockGameState: GameState = {
    players: mockPlayers,
    gameTime,
    isPaused: false,
    gameSpeed: 1,
    selectedPlayer: null,
    selectedBuilding: null,
    gameOver: false,
    winner: null,
    autoUpgrade: false,
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Находим карту внутри контейнера
    const mapElement = event.currentTarget.querySelector('[style*="width"]') as HTMLElement;
    if (!mapElement) return;
    
    const rect = mapElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Проверяем, что клик внутри карты
    if (x < 0 || y < 0 || x > mapSize || y > mapSize) return;

    const position: Position = { x, y };

    if (selectedUnitType) {
      // Создаем юнита (без движения)
      const unit = createUnit(
        selectedUnitType,
        selectedPlayer,
        position,
        position, // Цель - текущая позиция (не двигается)
        {
          attack: 0,
          defense: 0,
          health: 0,
          magic: 0,
          goldIncome: 0,
          buildingHealth: 0,
          buildingAttack: 0,
        }
      );
      // Делаем юнита неподвижным для тестирования
      unit.isMoving = false;
      unit.targetPosition = undefined;
      setUnits((prev) => [...prev, unit]);
      setSelectedUnitType(null);
    } else if (selectedBuildingType) {
      // Создаем здание
      let building: Building;
      
      if (selectedBuildingType === "castle") {
        building = createCastle(selectedPlayer, position);
      } else if (selectedBuildingType === "barracks") {
        building = {
          id: `barracks-test-${Date.now()}-${Math.random()}`,
          type: "barracks",
          playerId: selectedPlayer,
          position,
          health: 1500,
          maxHealth: 1500,
          level: 1,
          defense: 10,
          availableUnits: 5,
          maxAvailableUnits: 5,
        };
      } else {
        // tower
        building = {
          id: `tower-test-${Date.now()}-${Math.random()}`,
          type: "tower",
          playerId: selectedPlayer,
          position,
          health: 800,
          maxHealth: 800,
          level: 1,
          attack: 50,
          attackRange: 250,
          defense: 12,
        };
      }
      
      setBuildings((prev) => [...prev, building]);
      setSelectedBuildingType(null);
    }
  };

  const handleBuildingClick = (buildingId: string) => {
    // Просто для совместимости с GameMap
  };

  // Игровой цикл для обработки атак
  useEffect(() => {
    if (isPaused) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Используем refs для получения актуального состояния
      const currentUnits = unitsRef.current;
      const currentBuildings = buildingsRef.current;
      const attackInterval = 1500; // 1.5 секунды между атаками
      const buildingAttackInterval = 1000; // 1 секунда для зданий

      const newUnits = [...currentUnits];
      const newBuildings = [...currentBuildings];
      const attackedUnits = new Set<string>();
      const unitsMap = new Map<string, Unit>();
      const unitsAttackingBuildings = new Map<string, Unit>();
      let unitsUpdated = false;
      let buildingsUpdated = false;

      // Движение юнитов и поиск целей
      const allEnemyBuildings = newBuildings.filter((b) => b.health > 0);
      newUnits.forEach((unit) => {
        if (unit.health <= 0) return;

        let updatedUnit = unit;
        
        // Сбрасываем флаг атаки через 300мс
        if (
          updatedUnit.isAttacking &&
          updatedUnit.lastAttackTime &&
          now - updatedUnit.lastAttackTime > 300
        ) {
          updatedUnit = {
            ...updatedUnit,
            isAttacking: false,
            attackTarget: undefined,
          };
        }

        // Ищем ближайшего врага (используем исходные юниты для первого прохода)
        const enemyUnits = newUnits.filter(
          (u) => u.playerId !== updatedUnit.playerId && u.health > 0
        );
        const enemyUnit = findNearestEnemy(updatedUnit, enemyUnits);
        const enemyBuilding = findNearestEnemyBuilding(updatedUnit, allEnemyBuildings);

        // Приоритет атаке юнитов
        if (enemyUnit) {
          const distance = getDistance(updatedUnit.position, enemyUnit.position);
          
          if (distance <= updatedUnit.attackRange) {
            // В радиусе атаки
            // Для дальнобойных (attackRange > 80) - останавливаемся на оптимальной дистанции
            // Для ближних (attackRange <= 50) - подходим вплотную
            const isRanged = updatedUnit.attackRange > 80;
            const meleeDistance = 20; // Дистанция для ближнего боя

            if (isRanged) {
              // Дальнобойный - останавливаемся на оптимальной дистанции
              const optimalDistance = updatedUnit.attackRange * 0.6; // 60% от максимального радиуса
              if (distance > optimalDistance) {
                // Подходим ближе к оптимальной дистанции
                updatedUnit = moveUnit(
                  {
                    ...updatedUnit,
                    targetPosition: enemyUnit.position,
                    isMoving: true,
                  },
                  deltaTime
                );
              } else {
                // На оптимальной дистанции - останавливаемся
                updatedUnit = {
                  ...updatedUnit,
                  isMoving: false,
                  targetPosition: undefined,
                };
              }
            } else {
              // Ближний бой - подходим вплотную
              if (distance > meleeDistance) {
                updatedUnit = moveUnit(
                  {
                    ...updatedUnit,
                    targetPosition: enemyUnit.position,
                    isMoving: true,
                  },
                  deltaTime
                );
              } else {
                // Вплотную - останавливаемся
                updatedUnit = {
                  ...updatedUnit,
                  isMoving: false,
                  targetPosition: undefined,
                };
              }
            }
          } else {
            // Вне радиуса атаки - двигаемся к врагу
            updatedUnit = moveUnit(
              {
                ...updatedUnit,
                targetPosition: enemyUnit.position,
                isMoving: true,
              },
              deltaTime
            );
          }
        } else if (enemyBuilding) {
          // Нет врагов-юнитов, атакуем здания
          const distance = getDistance(updatedUnit.position, enemyBuilding.position);
          
          if (distance <= updatedUnit.attackRange) {
            // В радиусе атаки здания - останавливаемся
            updatedUnit = {
              ...updatedUnit,
              isMoving: false,
              targetPosition: undefined,
            };
          } else {
            // Двигаемся к зданию
            updatedUnit = moveUnit(
              {
                ...updatedUnit,
                targetPosition: enemyBuilding.position,
                isMoving: true,
              },
              deltaTime
            );
          }
        } else {
          // Нет целей - останавливаемся
          updatedUnit = {
            ...updatedUnit,
            isMoving: false,
            targetPosition: undefined,
          };
        }

        unitsMap.set(unit.id, updatedUnit);
        unitsUpdated = true;
      });

      // Атаки между юнитами (только для тех, кто в радиусе атаки и не двигается)
      // Используем обновленные юниты из unitsMap
      Array.from(unitsMap.values()).forEach((updatedUnit) => {
        if (updatedUnit.health <= 0 || attackedUnits.has(updatedUnit.id)) return;
        if (updatedUnit.isMoving) return; // Не атакуем, если двигаемся

        const canAttack =
          !updatedUnit.lastAttackTime ||
          now - updatedUnit.lastAttackTime >= attackInterval;
        if (!canAttack) return;

        // Используем обновленные позиции для поиска врагов
        const updatedEnemyUnits = Array.from(unitsMap.values()).filter(
          (u) =>
            u.playerId !== updatedUnit.playerId &&
            !attackedUnits.has(u.id) &&
            u.health > 0
        );
        const enemy = findNearestEnemy(updatedUnit, updatedEnemyUnits);

        if (enemy) {
          // ВАЖНО: Используем исходные позиции из currentUnits для проверки дистанции
          // Это гарантирует, что каждый юнит проверяет дистанцию по состоянию на начало кадра,
          // а не по обновленным позициям, что предотвращает одновременные атаки
          const originalUnit = currentUnits.find((u) => u.id === updatedUnit.id) || updatedUnit;
          const originalEnemy = currentUnits.find((u) => u.id === enemy.id) || enemy;
          const attackDistance = getDistance(originalUnit.position, originalEnemy.position);
          
          // Проверяем, можем ли МЫ атаковать (в своем радиусе атаки)
          // Для дальнобойных (лучники, маги) используем attackRange
          // Для ближних (воины) используем meleeDistance (20px)
          const isRanged = originalUnit.attackRange > 80;
          const meleeDistance = 20;
          const canWeAttack = isRanged 
            ? attackDistance <= originalUnit.attackRange
            : attackDistance <= meleeDistance;

          // НЕ атакуем, если не в своей дистанции атаки
          if (!canWeAttack) return;

          if (lineCrossesImpassable(originalUnit.position, originalEnemy.position)) {
            return;
          }
          
          // Проверяем, может ли ВРАГ также атаковать нас (в его радиусе атаки)
          const enemyIsRanged = originalEnemy.attackRange > 80;
          const enemyMeleeDistance = 20;
          const canEnemyAttack = enemyIsRanged
            ? attackDistance <= originalEnemy.attackRange
            : attackDistance <= enemyMeleeDistance;

          // Применяем урон врагу (используем обновленные версии из unitsMap, если есть)
          const currentEnemyForDamage = unitsMap.get(enemy.id) || enemy;
          const damagedEnemy = damageUnit(currentEnemyForDamage, updatedUnit.attack);
          
          // Взаимный урон применяем только если ВРАГ тоже может атаковать в СВОЕМ радиусе
          // Если враг не может атаковать (например, воин на расстоянии 100px от лучника),
          // то урон наносит только атакующий юнит
          const currentUnitForDamage = unitsMap.get(updatedUnit.id) || updatedUnit;
          const damagedUnit = canEnemyAttack 
            ? damageUnit(currentUnitForDamage, originalEnemy.attack)
            : currentUnitForDamage;

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
          unitsUpdated = true;
        }
      });

      // Применяем обновления позиций юнитов
      if (unitsUpdated) {
        newUnits.forEach((unit, index) => {
          const updated = unitsMap.get(unit.id);
          if (updated) {
            newUnits[index] = updated;
          }
        });
      }

      // Атаки зданий по юнитам
      newBuildings.forEach((building, buildingIndex) => {
        if (
          building.health <= 0 ||
          !building.attack ||
          !building.attackRange
        ) {
          return;
        }

        const canAttack =
          !building.lastAttackTime ||
          now - building.lastAttackTime >= buildingAttackInterval;
        if (!canAttack) return;

        // Используем обновленные позиции юнитов из unitsMap (если есть), иначе исходные
        const allUnitsForAttack = unitsMap.size > 0
          ? Array.from(unitsMap.values()).filter((u) => u.health > 0)
          : newUnits.filter((u) => u.health > 0);
        const nearestEnemy = findNearestEnemyUnitForBuilding(
          building,
          allUnitsForAttack
        );

        if (nearestEnemy) {
          const distance = getDistance(
            building.position,
            nearestEnemy.position
          );
          if (
            distance <= building.attackRange &&
            !lineCrossesImpassable(building.position, nearestEnemy.position)
          ) {
            const currentEnemy = unitsMap.get(nearestEnemy.id) || nearestEnemy;
            const damagedEnemy = damageUnit(currentEnemy, building.attack);
            unitsMap.set(nearestEnemy.id, {
              ...damagedEnemy,
              health: Math.max(0, damagedEnemy.health),
            });

            newBuildings[buildingIndex] = {
              ...building,
              lastAttackTime: now,
              attackTarget: nearestEnemy.position,
            };
            buildingsUpdated = true;
            unitsUpdated = true;
          } else {
            newBuildings[buildingIndex] = {
              ...building,
              attackTarget: undefined,
            };
          }
        } else {
          newBuildings[buildingIndex] = {
            ...building,
            attackTarget: undefined,
          };
        }
      });

      // Атаки юнитов по зданиям
      // Логика такая же, как в основной игре
      newBuildings.forEach((building, buildingIndex) => {
        if (building.health <= 0) return;

        // Используем обновленных юнитов из unitsMap, но также учитываем unitsAttackingBuildings
        // для последующих зданий (как в основной игре)
        // Сначала получаем всех вражеских юнитов из текущего состояния
        const allEnemyUnits = currentUnits
          .filter((u) => u.playerId !== building.playerId && u.health > 0)
          .map((u) => {
            // Используем цепочку как в основной игре: unitsAttackingBuildings || unitsMap || исходный
            // Это позволяет учитывать обновления lastAttackTime для предыдущих зданий
            return unitsAttackingBuildings.get(u.id) || unitsMap.get(u.id) || u;
          });

        allEnemyUnits.forEach((enemyUnit) => {
          // Проверяем, может ли юнит атаковать (прошло достаточно времени с последней атаки)
          const canAttack =
            !enemyUnit.lastAttackTime ||
            now - enemyUnit.lastAttackTime >= attackInterval;
          if (!canAttack) return;

          const distance = getDistance(
            enemyUnit.position,
            building.position
          );
          if (
            distance < 60 &&
            !lineCrossesImpassable(enemyUnit.position, building.position)
          ) {
            const oldHealth = newBuildings[buildingIndex].health;
            newBuildings[buildingIndex] = damageBuilding(
              newBuildings[buildingIndex],
              enemyUnit.attack
            );
            const damage = Math.max(0, oldHealth - newBuildings[buildingIndex].health);

            // Сохраняем статистику урона и обновляем lastAttackTime
            if (damage > 0) {
              // Обновляем lastAttackTime для этого юнита
              unitsAttackingBuildings.set(enemyUnit.id, {
                ...enemyUnit,
                lastAttackTime: now,
              });
              buildingsUpdated = true;
              unitsUpdated = true;
            }
          }
        });
      });

      // Применяем обновления lastAttackTime для юнитов, атаковавших здания
      // Логика такая же, как в основной игре
      if (unitsAttackingBuildings.size > 0) {
        newUnits.forEach((unit, index) => {
          const updated = unitsAttackingBuildings.get(unit.id);
          if (updated) {
            // Объединяем обновления из unitsMap (позиция) и unitsAttackingBuildings (lastAttackTime)
            const fromMap = unitsMap.get(unit.id);
            if (fromMap) {
              newUnits[index] = {
                ...fromMap,
                lastAttackTime: updated.lastAttackTime,
              };
            } else {
              newUnits[index] = updated;
            }
          } else {
            // Если нет обновления в unitsAttackingBuildings, применяем обновление из unitsMap
            const fromMap = unitsMap.get(unit.id);
            if (fromMap) {
              newUnits[index] = fromMap;
            }
          }
        });
        unitsUpdated = true;
      } else if (unitsMap.size > 0) {
        // Если нет обновлений в unitsAttackingBuildings, применяем только обновления из unitsMap
        newUnits.forEach((unit, index) => {
          const fromMap = unitsMap.get(unit.id);
          if (fromMap) {
            newUnits[index] = fromMap;
          }
        });
        unitsUpdated = true;
      }

      // Применяем все обновления
      if (unitsUpdated || buildingsUpdated) {
        const updatedUnits = newUnits.filter((u) => u.health > 0);

        if (unitsUpdated) {
          setUnits(updatedUnits);
        }
        if (buildingsUpdated) {
          setBuildings(newBuildings);
        }
      }

      // Обновляем время игры
      setGameTime((prev) => prev + deltaTime / 1000);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPaused]);

  const clearAll = () => {
    setUnits([]);
    setBuildings([]);
  };

  const getPlayerColor = (playerId: PlayerId) => {
    switch (playerId) {
      case 0: return "bg-blue-600";
      case 1: return "bg-red-600";
      case 2: return "bg-green-600";
      case 3: return "bg-yellow-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Section padding="lg">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Тестовое поле</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsPaused(!isPaused)}
              variant={isPaused ? "success" : "warning"}
              size="sm">
              {isPaused ? "▶ Продолжить" : "⏸ Пауза"}
            </Button>
            <Button onClick={clearAll} variant="error" size="sm">
              Очистить всё
            </Button>
          </div>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Карта */}
          <div className="flex-1 flex justify-center">
            <div onClick={handleMapClick} className="cursor-crosshair inline-block">
              <GameMap
                gameState={mockGameState}
                selectedBuilding={null}
                onBuildingClick={handleBuildingClick}
              />
            </div>
          </div>

          {/* Панель управления */}
          <div className="w-full lg:w-96 space-y-4">
            {/* Выбор игрока */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-2">Выбор игрока</h3>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((id) => (
                  <Button
                    key={id}
                    onClick={() => setSelectedPlayer(id as PlayerId)}
                    variant={selectedPlayer === id ? "primary" : "secondary"}
                    size="sm"
                    className={selectedPlayer === id ? getPlayerColor(id as PlayerId) : ""}>
                    {id + 1}
                  </Button>
                ))}
              </div>
            </div>

            {/* Размещение юнитов */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-2">Разместить юнита</h3>
              <p className="text-sm text-gray-600 mb-2">
                Выберите тип и кликните на карту
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setSelectedUnitType("warrior");
                    setSelectedBuildingType(null);
                  }}
                  variant={selectedUnitType === "warrior" ? "primary" : "secondary"}
                  size="sm"
                  className="w-full">
                  ⚔️ Воин
                </Button>
                <Button
                  onClick={() => {
                    setSelectedUnitType("archer");
                    setSelectedBuildingType(null);
                  }}
                  variant={selectedUnitType === "archer" ? "primary" : "secondary"}
                  size="sm"
                  className="w-full">
                  🏹 Лучник
                </Button>
                <Button
                  onClick={() => {
                    setSelectedUnitType("mage");
                    setSelectedBuildingType(null);
                  }}
                  variant={selectedUnitType === "mage" ? "primary" : "secondary"}
                  size="sm"
                  className="w-full">
                  🔮 Маг
                </Button>
              </div>
              {selectedUnitType && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Выбран: {selectedUnitType === "warrior" ? "Воин" : selectedUnitType === "archer" ? "Лучник" : "Маг"}
                </p>
              )}
            </div>

            {/* Размещение зданий */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-2">Разместить здание</h3>
              <p className="text-sm text-gray-600 mb-2">
                Выберите тип и кликните на карту
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setSelectedBuildingType("castle");
                    setSelectedUnitType(null);
                  }}
                  variant={selectedBuildingType === "castle" ? "primary" : "secondary"}
                  size="sm"
                  className="w-full">
                  🏰 Замок
                </Button>
                <Button
                  onClick={() => {
                    setSelectedBuildingType("barracks");
                    setSelectedUnitType(null);
                  }}
                  variant={selectedBuildingType === "barracks" ? "primary" : "secondary"}
                  size="sm"
                  className="w-full">
                  🏛️ Барак
                </Button>
                <Button
                  onClick={() => {
                    setSelectedBuildingType("tower");
                    setSelectedUnitType(null);
                  }}
                  variant={selectedBuildingType === "tower" ? "primary" : "secondary"}
                  size="sm"
                  className="w-full">
                  🗼 Башня
                </Button>
              </div>
              {selectedBuildingType && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Выбран: {selectedBuildingType === "castle" ? "Замок" : selectedBuildingType === "barracks" ? "Барак" : "Башня"}
                </p>
              )}
            </div>

            {/* Статистика */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold mb-2">Статистика</h3>
              <div className="space-y-1 text-sm">
                <div>Юнитов на карте: <span className="font-bold">{units.length}</span></div>
                <div>Зданий на карте: <span className="font-bold">{buildings.length}</span></div>
                <div className="mt-2">
                  <div>Игрок {selectedPlayer + 1}:</div>
                  <div className="ml-2">
                    Юнитов: {units.filter((u) => u.playerId === selectedPlayer).length}
                  </div>
                  <div className="ml-2">
                    Зданий: {buildings.filter((b) => b.playerId === selectedPlayer).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

