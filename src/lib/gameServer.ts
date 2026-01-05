/**
 * Серверная логика для сетевой игры
 * Управляет состоянием игры на сервере
 */

import type { GameState, Player, PlayerId } from "@/types/game";
import { createPlayer, GAME_CONFIG } from "@/lib/gameLogic";
import type { Lobby, GameMode } from "@/types/lobby";

interface GameRoom {
  id: string; // ID лобби
  gameState: GameState;
  playerSlotMap: Map<string, PlayerId>; // socket.id -> PlayerId
  mode: string;
  lastUpdate: number;
  aiSlots: Set<PlayerId>; // Слоты, занятые ИИ игроками
}

class GameServer {
  private games: Map<string, GameRoom> = new Map();

  /**
   * Создает новую игровую комнату
   */
  createGame(lobbyId: string, lobby: Lobby, playerSlotMap: Map<string, PlayerId>): GameRoom {
    // Определяем, какие слоты заняты ИИ игроками
    const aiSlots = this.determineAISlots(lobby.mode, playerSlotMap);
    
    // Создаем игроков
    const players = Array.from({ length: 4 }, (_, i) => {
      const slot = i as PlayerId;
      const player = createPlayer(slot, GAME_CONFIG.mapSize);
      // ИИ игроки автоматически активны и имеют автопрокачку
      if (aiSlots.has(slot)) {
        // ИИ игроки управляются автоматически
        // Можно добавить специальные флаги, если нужно
      }
      return player;
    });

    const gameState: GameState = {
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

    const room: GameRoom = {
      id: lobbyId,
      gameState,
      playerSlotMap,
      mode: lobby.mode,
      lastUpdate: Date.now(),
      aiSlots,
    };

    this.games.set(lobbyId, room);
    return room;
  }

  /**
   * Определяет, какие слоты заняты ИИ игроками в зависимости от режима игры
   */
  private determineAISlots(mode: GameMode, playerSlotMap: Map<string, PlayerId>): Set<PlayerId> {
    const aiSlots = new Set<PlayerId>();
    const humanSlots = new Set(playerSlotMap.values());
    
    // Все возможные слоты (0-3)
    const allSlots: PlayerId[] = [0, 1, 2, 3];
    
    // Для всех режимов кроме "1v1v1v1", все слоты, не занятые реальными игроками, - ИИ
    // В режиме "1v1v1v1" все 4 игрока - реальные
    if (mode !== "1v1v1v1") {
      allSlots.forEach(slot => {
        if (!humanSlots.has(slot)) {
          aiSlots.add(slot);
        }
      });
    }
    
    return aiSlots;
  }

  /**
   * Получает игровую комнату
   */
  getGame(roomId: string): GameRoom | null {
    return this.games.get(roomId) || null;
  }

  /**
   * Получает PlayerId игрока по его socket.id
   */
  getPlayerId(roomId: string, socketId: string): PlayerId | null {
    const room = this.games.get(roomId);
    if (!room) return null;
    return room.playerSlotMap.get(socketId) ?? null;
  }

  /**
   * Обновляет socket ID игрока при переподключении
   * Ищет старый socket ID по PlayerId и обновляет его на новый
   */
  updatePlayerSocketId(roomId: string, oldSocketId: string, newSocketId: string): boolean {
    const room = this.games.get(roomId);
    if (!room) return false;
    
    // Ищем PlayerId по старому socket ID
    const playerId = room.playerSlotMap.get(oldSocketId);
    if (playerId === undefined) {
      // Если старый socket ID не найден, возможно это новый игрок
      // Или игрок уже был обновлен
      return false;
    }
    
    // Удаляем старый socket ID и добавляем новый
    room.playerSlotMap.delete(oldSocketId);
    room.playerSlotMap.set(newSocketId, playerId);
    
    console.log(`[GameServer] Updated socket ID for player ${playerId} in room ${roomId}: ${oldSocketId} -> ${newSocketId}`);
    return true;
  }

  /**
   * Находит старый socket ID по PlayerId (для переподключения)
   */
  findSocketIdByPlayerId(roomId: string, playerId: PlayerId): string | null {
    const room = this.games.get(roomId);
    if (!room) return null;
    
    for (const [socketId, pid] of room.playerSlotMap.entries()) {
      if (pid === playerId) {
        return socketId;
      }
    }
    return null;
  }

  /**
   * Обновляет состояние игры
   */
  updateGameState(roomId: string, newState: GameState): void {
    const room = this.games.get(roomId);
    if (room) {
      room.gameState = newState;
      room.lastUpdate = Date.now();
    }
  }

  /**
   * Удаляет игровую комнату
   */
  deleteGame(roomId: string): void {
    this.games.delete(roomId);
    // Примечание: синхронизация должна быть остановлена отдельно через stopGameSync
  }

  /**
   * Получает текущее состояние игры
   */
  getGameState(roomId: string): GameState | null {
    const room = this.games.get(roomId);
    return room ? room.gameState : null;
  }

  /**
   * Получает набор слотов, занятых ИИ игроками
   */
  getAISlots(roomId: string): Set<PlayerId> {
    const room = this.games.get(roomId);
    return room ? room.aiSlots : new Set();
  }

  /**
   * Проверяет, является ли слот ИИ игроком
   */
  isAISlot(roomId: string, playerId: PlayerId): boolean {
    const room = this.games.get(roomId);
    return room ? room.aiSlots.has(playerId) : false;
  }
}

// Singleton instance
export const gameServer = new GameServer();

