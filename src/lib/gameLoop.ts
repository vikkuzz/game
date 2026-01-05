/**
 * Серверный игровой цикл
 * Обновляет состояние игры на сервере
 */

import type { GameState } from "@/types/game";
import { gameServer } from "./gameServer";
import type { Server as SocketIOServer } from "socket.io";
import { startGameSync } from "./gameSync";

// Импортируем функции игровой логики
// ВАЖНО: Эти функции должны быть доступны на сервере
// Если они используют браузерные API, нужно будет создать серверные версии

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
    // ПРИМЕЧАНИЕ: Для полной реализации нужно перенести всю логику из useGameState
    // Пока что просто обновляем gameTime
    const newGameState: GameState = {
      ...room.gameState,
      gameTime: room.gameState.gameTime + deltaTime,
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

