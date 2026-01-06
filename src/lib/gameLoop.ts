/**
 * Серверный игровой цикл
 * Обновляет состояние игры на сервере
 * 
 * Использует модульную архитектуру для соблюдения принципов SOLID:
 * - goldIncome.ts - начисление золота
 * - unitAutoSpawn.ts - автоматический спавн юнитов
 * - cooldowns.ts - обновление кулдаунов
 * - unitRestore.ts - восстановление доступных юнитов
 * - autoUpgrade.ts - автоматическое развитие
 * - ai.ts - решения ИИ
 * - serverUnitMovement.ts - движение юнитов
 * - serverCombat.ts - бой
 */

import type { GameState } from "@/types/game";
import { gameServer, type GameRoom } from "./gameServer";
import type { Server as SocketIOServer } from "socket.io";
import { GAME_CONFIG } from "@/lib/gameLogic";

// Импортируем модули игрового цикла
import { applyGoldIncomeTick } from "./game/goldIncome";
import { applySpawnTick } from "./game/unitAutoSpawn";
import { applyCooldownTick } from "./game/cooldowns";
import { applyUnitRestoreTick } from "./game/unitRestore";
import { applyAutoUpgradeTick } from "./game/autoUpgrade";
import { applyAiTick } from "./game/ai";
import { applyUnitMovementTick } from "./game/serverUnitMovement";
import { applyCombatTick } from "./game/serverCombat";

const GAME_LOOP_INTERVAL = 50; // 50мс, как в клиентской версии
const gameLoopTimers: Map<string, NodeJS.Timeout> = new Map();

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
    newGameState = applyGoldIncomeTick(room, deltaTime);
    // 2) Автоматический спавн юнитов из бараков
    newGameState = applySpawnTick(newGameState);
    // 3) Кулдауны ремонта зданий
    room.gameState = newGameState;
    newGameState = applyCooldownTick(room, deltaTime);
    // 4) Восстановление доступных юнитов в бараках
    room.gameState = newGameState;
    newGameState = applyUnitRestoreTick(room, deltaTime);
    // 5) Авторазвитие (простая версия на сервере)
    room.gameState = newGameState;
    newGameState = applyAutoUpgradeTick(room, deltaTime);
    // 6) ИИ для слотов из aiSlots
    room.gameState = newGameState;
    newGameState = applyAiTick(room, deltaTime);
    // 7) Движение юнитов
    room.gameState = newGameState;
    newGameState = applyUnitMovementTick(room, deltaTime);
    // 8) Бой (атаки между юнитами, атаки зданий по юнитам, атаки юнитов по зданиям)
    room.gameState = newGameState;
    newGameState = applyCombatTick(room, deltaTime);

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
