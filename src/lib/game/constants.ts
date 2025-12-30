/**
 * Константы игровых параметров
 * Централизованное хранение всех констант для соблюдения DRY
 */

export const COMBAT_CONSTANTS = {
  // Интервалы атак
  UNIT_ATTACK_INTERVAL: 1500, // 1.5 секунды между атаками юнитов
  BUILDING_ATTACK_INTERVAL: 1000, // 1 секунда между атаками зданий
  
  // Дистанции атаки
  MELEE_DISTANCE: 35, // Дистанция ближнего боя (увеличена для компенсации отталкивания)
  RANGED_THRESHOLD: 80, // Порог для определения дальнобойного юнита (attackRange > 80)
  OPTIMAL_RANGE_MULTIPLIER: 0.6, // 60% от максимального радиуса для оптимальной дистанции
  
  // Время анимации
  ATTACK_ANIMATION_DURATION: 300, // 300мс для анимации атаки
  
  // Дистанции для проверок
  BUILDING_TARGET_DISTANCE: 50, // Здание считается в позиции, если близко (50px)
  UNIT_ATTACK_BUILDING_DISTANCE: 60, // Дистанция атаки юнита по зданию
} as const;

export const UPGRADE_CONSTANTS = {
  STAT_UPGRADE_COST_MULTIPLIER: 150, // Стоимость улучшения стата = (уровень + 1) * 150
  BUILDING_UPGRADE_COST_MULTIPLIER: 200, // Стоимость улучшения здания = уровень * 200
  BUILDING_UPGRADE_COOLDOWN: 5000, // 5 секунд кулдаун на улучшение здания
  CASTLE_LEVEL_REQUIREMENT: 2, // Минимальный уровень замка для улучшения статов до 3 уровня
} as const;

export const BUILDING_CONSTANTS = {
  BASE_CASTLE_HEALTH: 3000,
  BASE_CASTLE_ATTACK: 30,
  BASE_TOWER_HEALTH: 800,
  BASE_TOWER_ATTACK: 50,
  BASE_BARRACK_HEALTH: 1500,
  HEALTH_BONUS_PER_LEVEL: 200, // Бонус здоровья за уровень buildingHealth
  ATTACK_BONUS_PER_LEVEL: 10, // Бонус атаки за уровень buildingAttack
  HEALTH_INCREASE_ON_UPGRADE: 200, // Увеличение здоровья при улучшении buildingHealth
} as const;

export const AI_CONSTANTS = {
  DECISION_INTERVAL: 3000, // ИИ принимает решения каждые 3 секунды
  AUTO_UPGRADE_CHECK_INTERVAL: 2000, // Проверка автоматического улучшения каждые 2 секунды
} as const;

