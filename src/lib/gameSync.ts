/**
 * Модуль синхронизации состояния игры между клиентами
 * Отправляет периодические обновления состояния игры
 */

import type { Server as SocketIOServer } from "socket.io";
import { gameServer } from "./gameServer";

// Периодическая синхронизация полного состояния игры для всех клиентов.
// 200 мс обеспечивает хорошую плавность (5 обновлений в секунду) без излишней нагрузки на сеть.
const SYNC_INTERVAL = 200; // 200 мс между синхронизациями (5 раз в секунду)
const syncTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Запускает периодическую синхронизацию для игровой комнаты
 */
export function startGameSync(io: SocketIOServer, roomId: string): void {
  // Останавливаем предыдущий таймер, если есть
  stopGameSync(roomId);

  const timer = setInterval(() => {
    try {
      const room = gameServer.getGame(roomId);
      if (!room) {
        // Комната не существует, останавливаем синхронизацию
        stopGameSync(roomId);
        return;
      }

      try {
        // Отправляем текущее состояние игры всем игрокам в комнате
        const aiSlots = Array.from(room.aiSlots);
        const playerSlotMap = Object.fromEntries(room.playerSlotMap);
        
        io.to(roomId).emit("game:state", {
          gameState: room.gameState,
          aiSlots: aiSlots,
          playerSlotMap: playerSlotMap,
        });

        // Обновляем время последнего обновления
        room.lastUpdate = Date.now();
      } catch (error) {
        console.error(`[GameSync] Error syncing game state for room ${roomId}:`, error);
        // Продолжаем работу, не останавливая синхронизацию
      }
    } catch (error) {
      console.error(`[GameSync] Critical error in sync for room ${roomId}:`, error);
      // В критической ошибке останавливаем синхронизацию
      stopGameSync(roomId);
    }
  }, SYNC_INTERVAL);

  syncTimers.set(roomId, timer);
}

/**
 * Останавливает периодическую синхронизацию для игровой комнаты
 */
export function stopGameSync(roomId: string): void {
  const timer = syncTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    syncTimers.delete(roomId);
  }
}

/**
 * Останавливает все активные синхронизации
 */
export function stopAllGameSync(): void {
  syncTimers.forEach((timer, roomId) => {
    clearInterval(timer);
  });
  syncTimers.clear();
}

