/**
 * Типы и интерфейсы для игры Survival Chaos
 */

export type PlayerId = 0 | 1 | 2 | 3;
export type BuildingType = "castle" | "barracks" | "tower";
export type UnitType = "warrior" | "mage" | "archer";

export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  playerId: PlayerId;
  position: Position;
  targetPosition?: Position;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  attackRange: number; // Радиус атаки юнита
  target?: string; // ID цели
  isMoving: boolean;
  isAttacking?: boolean; // Флаг атаки
  lastAttackTime?: number; // Время последней атаки
  attackTarget?: Position; // Позиция цели атаки для визуализации
  barrackIndex?: number; // Индекс барака, из которого был спавнен юнит (0 - центральный, 1-2 - боковые)
  intermediateTargets?: Position[]; // Массив промежуточных целей (например, [H9, I9])
  currentIntermediateIndex?: number; // Индекс текущей промежуточной цели в массиве
  finalTarget?: Position; // Финальная цель после всех промежуточных
  hasReachedIntermediate?: boolean; // Достиг ли промежуточную цель (устаревшее, используем currentIntermediateIndex)
  lastIntermediateDistance?: number; // Предыдущее расстояние до промежуточной цели для определения прохождения через точку
}

export interface Building {
  id: string;
  type: BuildingType;
  playerId: PlayerId;
  position: Position;
  health: number;
  maxHealth: number;
  level: number;
  upgradeCooldown?: number; // Время до следующего улучшения
  repairCooldown?: number; // Время до следующей починки
  spawnCooldown?: number; // Время до следующего спавна юнита
  availableUnits?: number; // Доступные юниты для покупки
  maxAvailableUnits?: number; // Максимум доступных юнитов
  unitRestoreTime?: number; // Время восстановления юнита
  attack?: number; // Урон (для башен и замков)
  attackRange?: number; // Радиус атаки
  lastAttackTime?: number; // Время последней атаки
  attackTarget?: Position; // Позиция цели атаки для визуализации
  defense?: number; // Защита здания
  lastUnitPurchaseTime?: number; // Время последней покупки юнита (кулдаун 5 секунд)
}

export interface CastleUpgrades {
  attack: number; // Уровень прокачки атаки
  defense: number; // Уровень прокачки защиты
  health: number; // Уровень прокачки здоровья
  magic: number; // Уровень прокачки магии
  goldIncome: number; // Уровень прокачки дохода золота
  buildingHealth: number; // Уровень прокачки здоровья зданий
  buildingAttack: number; // Уровень прокачки атаки зданий
}

export interface PlayerStats {
  unitsKilled: number; // Количество убитых юнитов
  unitsLost: number; // Количество потерянных юнитов
  buildingsDestroyed: number; // Количество разрушенных зданий
  buildingsLost: number; // Количество потерянных зданий
  damageDealt: number; // Нанесенный урон
  damageTaken: number; // Полученный урон
  goldEarned: number; // Заработанное золото (включая награды за убийства)
}

export interface Player {
  id: PlayerId;
  gold: number;
  goldIncome: number; // Золото в секунду
  castle: Building;
  barracks: Building[];
  towers: Building[];
  units: Unit[];
  upgrades: CastleUpgrades;
  isActive: boolean;
  stats: PlayerStats;
}

export interface GameState {
  players: Player[];
  gameTime: number; // Время игры в секундах
  isPaused: boolean;
  gameSpeed: number; // Множитель скорости игры
  selectedPlayer: PlayerId | null;
  selectedBuilding: string | null;
  gameOver: boolean; // Игра окончена
  winner: PlayerId | null; // Победитель
  autoUpgrade: boolean; // Автоматическое развитие
}

export interface GameConfig {
  mapSize: number; // Размер карты
  unitSpawnInterval: number; // Интервал спавна юнитов (мс)
  goldIncomeInterval: number; // Интервал получения золота (мс)
  gameLoopInterval: number; // Интервал игрового цикла (мс)
}
