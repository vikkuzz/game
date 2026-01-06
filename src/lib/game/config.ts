/**
 * Конфигурация игры
 * Централизованное хранение всех игровых констант
 */

export const GAME_CONFIG = {
  mapSize: 800,
  unitSpawnInterval: 15000, // 15 секунд
  goldIncomeInterval: 1000, // 1 секунда
  gameLoopInterval: 50, // 50мс для плавной анимации
  unitSpeed: 30, // пикселей в секунду
  unitCost: {
    warrior: 50,
    archer: 75,
    mage: 100,
  },
  maxAvailableUnits: {
    warrior: 10,
    archer: 8,
    mage: 5,
  },
  unitRestoreTime: 60000, // 1 минута на восстановление одного юнита
  killReward: {
    warrior: 15, // Золото за убийство воина
    archer: 20, // Золото за убийство лучника
    mage: 25, // Золото за убийство мага
  },
  buildingDestroyReward: {
    castle: 500, // Золото за разрушение замка
    barracks: 150, // Золото за разрушение барака
    tower: 100, // Золото за разрушение башни
  },
} as const;

