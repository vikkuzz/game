/**
 * Модуль синхронизации состояния игры между клиентами
 * Отправляет периодические обновления состояния игры
 */

import type { Server as SocketIOServer } from "socket.io";
import { gameServer } from "./gameServer";

const SYNC_INTERVAL = 2000; // 2 секунды между синхронизациями
const syncTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Запускает периодическую синхронизацию для игровой комнаты
 */
export function startGameSync(io: SocketIOServer, roomId: string): void {
  // Останавливаем предыдущий таймер, если есть
  stopGameSync(roomId);

  const timer = setInterval(() => {
    const room = gameServer.getGame(roomId);
    if (!room) {
      // Комната не существует, останавливаем синхронизацию
      stopGameSync(roomId);
      return;
    }

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

