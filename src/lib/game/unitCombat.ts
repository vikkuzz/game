/**
 * Модуль боевой логики между юнитами
 * Отвечает за обработку атак между юнитами
 */

import { Unit, PlayerId } from "@/types/game";
import { damageUnit, getDistance, lineCrossesImpassable, findNearestEnemy } from "../gameLogic";
import { COMBAT_CONSTANTS } from "./constants";
import { GAME_CONFIG } from "../gameLogic";

export interface CombatStats {
  unitsKilled: number;
  unitsLost: number;
  damageDealt: number;
  damageTaken: number;
  goldEarned: number;
}

export interface CombatResult {
  unitsMap: Map<string, Unit>;
  killRewards: Map<PlayerId, number>;
  statsUpdates: Map<PlayerId, CombatStats>;
  attackedUnits: Set<string>;
}

/**
 * Проверяет, может ли юнит атаковать
 */
export function canUnitAttack(unit: Unit, now: number): boolean {
  return (
    !unit.lastAttackTime ||
    now - unit.lastAttackTime >= COMBAT_CONSTANTS.UNIT_ATTACK_INTERVAL
  );
}

/**
 * Определяет эффективную дистанцию атаки для юнита
 */
export function getEffectiveAttackRange(unit: Unit): number {
  const isRanged = unit.attackRange > COMBAT_CONSTANTS.RANGED_THRESHOLD;
  return isRanged ? unit.attackRange : COMBAT_CONSTANTS.MELEE_DISTANCE;
}

/**
 * Проверяет, может ли юнит атаковать цель на дистанции
 */
export function canAttackAtDistance(
  attacker: Unit,
  distance: number
): boolean {
  return distance <= getEffectiveAttackRange(attacker);
}

/**
 * Обрабатывает атаку между двумя юнитами
 */
function processUnitAttack(
  attacker: Unit,
  defender: Unit,
  originalAttacker: Unit,
  originalDefender: Unit,
  unitsMap: Map<string, Unit>,
  now: number
): {
  damagedAttacker: Unit;
  damagedDefender: Unit;
  canEnemyAttack: boolean;
} {
  const attackDistance = getDistance(attacker.position, defender.position);

  // Проверяем, может ли атакующий атаковать
  const canWeAttack = canAttackAtDistance(originalAttacker, attackDistance);
  if (!canWeAttack) {
    return {
      damagedAttacker: attacker,
      damagedDefender: defender,
      canEnemyAttack: false,
    };
  }

  // Проверяем блокировку ландшафтом
  if (lineCrossesImpassable(attacker.position, defender.position)) {
    return {
      damagedAttacker: attacker,
      damagedDefender: defender,
      canEnemyAttack: false,
    };
  }

  // Проверяем, может ли защитник атаковать в ответ
  const defenderIsRanged =
    originalDefender.attackRange > COMBAT_CONSTANTS.RANGED_THRESHOLD;
  const canEnemyAttack = defenderIsRanged
    ? attackDistance <= originalDefender.attackRange
    : attackDistance <= COMBAT_CONSTANTS.MELEE_DISTANCE;

  // Применяем урон
  const currentDefender = unitsMap.get(defender.id) || defender;
  const damagedDefender = damageUnit(currentDefender, attacker.attack);

  const currentAttacker = unitsMap.get(attacker.id) || attacker;
  const damagedAttacker = canEnemyAttack
    ? damageUnit(currentAttacker, originalDefender.attack)
    : currentAttacker;

  return {
    damagedAttacker,
    damagedDefender,
    canEnemyAttack,
  };
}

/**
 * Обрабатывает все атаки между юнитами
 */
export function processUnitCombat(
  allUnits: Unit[],
  originalUnits: Unit[],
  now: number
): CombatResult {
  const unitsMap = new Map<string, Unit>();
  const killRewards = new Map<PlayerId, number>();
  const statsUpdates = new Map<PlayerId, CombatStats>();
  const attackedUnits = new Set<string>();

  // Инициализация статистики
  const playerIds = new Set(allUnits.map((u) => u.playerId));
  playerIds.forEach((playerId) => {
    statsUpdates.set(playerId, {
      unitsKilled: 0,
      unitsLost: 0,
      damageDealt: 0,
      damageTaken: 0,
      goldEarned: 0,
    });
  });

  // Обработка атак
  allUnits.forEach((unit) => {
    if (unit.health <= 0 || attackedUnits.has(unit.id) || unit.isMoving) {
      return;
    }

    if (!canUnitAttack(unit, now)) {
      return;
    }

    // Поиск врагов
    const enemyUnits = allUnits.filter(
      (u) =>
        u.playerId !== unit.playerId &&
        !attackedUnits.has(u.id) &&
        u.health > 0
    );
    const enemy = findNearestEnemy(unit, enemyUnits);

    if (!enemy) {
      return;
    }

    // Получаем исходные версии для проверки "был ли жив"
    const originalUnit =
      originalUnits.find((u) => u.id === unit.id) || unit;
    const originalEnemy =
      originalUnits.find((u) => u.id === enemy.id) || enemy;

    // Обрабатываем атаку
    const result = processUnitAttack(
      unit,
      enemy,
      originalUnit,
      originalEnemy,
      unitsMap,
      now
    );

    if (result.damagedAttacker === unit && result.damagedDefender === enemy) {
      // Атака не произошла
      return;
    }

    // Обновляем статистику
    const attackerStats = statsUpdates.get(unit.playerId)!;
    const defenderStats = statsUpdates.get(enemy.playerId)!;

    const enemyDamage = Math.max(
      1,
      Math.floor(unit.attack - (result.damagedDefender.defense || 0))
    );
    const attackerDamage = result.canEnemyAttack
      ? Math.max(1, Math.floor(enemy.attack - (result.damagedAttacker.defense || 0)))
      : 0;

    attackerStats.damageDealt += enemyDamage;
    attackerStats.damageTaken += attackerDamage;
    defenderStats.damageDealt += attackerDamage;
    defenderStats.damageTaken += enemyDamage;

    // Проверка убийств
    const enemyWasAlive = originalEnemy.health > 0;
    const unitWasAlive = originalUnit.health > 0;

    if (enemyWasAlive && result.damagedDefender.health <= 0) {
      const reward = GAME_CONFIG.killReward[result.damagedDefender.type];
      const currentReward = killRewards.get(unit.playerId) || 0;
      killRewards.set(unit.playerId, currentReward + reward);

      attackerStats.unitsKilled += 1;
      attackerStats.goldEarned += reward;
      defenderStats.unitsLost += 1;
    }

    if (unitWasAlive && result.damagedAttacker.health <= 0) {
      const reward = GAME_CONFIG.killReward[result.damagedAttacker.type];
      const currentReward = killRewards.get(enemy.playerId) || 0;
      killRewards.set(enemy.playerId, currentReward + reward);

      defenderStats.unitsKilled += 1;
      defenderStats.goldEarned += reward;
      attackerStats.unitsLost += 1;
    }

    // Сохраняем обновленных юнитов
    unitsMap.set(enemy.id, {
      ...result.damagedDefender,
      isAttacking: true,
      lastAttackTime: now,
      attackTarget: unit.position,
    });
    unitsMap.set(unit.id, {
      ...result.damagedAttacker,
      isAttacking: result.canEnemyAttack,
      lastAttackTime: now,
      attackTarget: enemy.position,
    });

    attackedUnits.add(unit.id);
    attackedUnits.add(enemy.id);
  });

  return {
    unitsMap,
    killRewards,
    statsUpdates,
    attackedUnits,
  };
}

