/**
 * Сервер для управления лобби игры
 */

import { Server as SocketIOServer } from "socket.io";
import type { Lobby, LobbyPlayer, GameMode, PlayerId } from "@/types/lobby";

interface LobbyStore {
  [lobbyId: string]: Lobby;
}

const LOBBY_COUNTDOWN = 15; // 15 секунд до старта

class LobbyManager {
  private lobbies: LobbyStore = {};
  private lobbyTimers: Map<string, NodeJS.Timeout> = new Map();
  private io: any = null; // Socket.IO server instance

  /**
   * Устанавливает экземпляр Socket.IO для отправки обновлений
   */
  setIO(io: any): void {
    this.io = io;
  }

  /**
   * Создает новое лобби
   */
  createLobby(hostId: string, hostName: string, mode: GameMode): Lobby {
    const lobbyId = this.generateLobbyId();
    const maxPlayers = this.getMaxPlayers(mode);

    const lobby: Lobby = {
      id: lobbyId,
      hostId,
      mode,
      players: [
        {
          id: hostId,
          name: hostName,
          isHost: true,
          isReady: false,
        },
      ],
      maxPlayers,
      isStarting: false,
      gameStarted: false,
    };

    this.lobbies[lobbyId] = lobby;
    return lobby;
  }

  /**
   * Присоединяет игрока к лобби
   */
  joinLobby(lobbyId: string, playerId: string, playerName: string): Lobby | null {
    const lobby = this.lobbies[lobbyId];
    if (!lobby) return null;

    if (lobby.players.length >= lobby.maxPlayers) return null;
    if (lobby.gameStarted) return null;

    // Проверяем, не присоединен ли уже игрок
    if (lobby.players.some((p) => p.id === playerId)) return lobby;

    lobby.players.push({
      id: playerId,
      name: playerName,
      isHost: false,
      isReady: false,
    });

    // Если лобби заполнено, запускаем таймер через 15 секунд
    if (lobby.players.length === lobby.maxPlayers && !lobby.isStarting) {
      // Запускаем таймер через небольшую задержку, чтобы дать время клиентам обновиться
      setTimeout(() => {
        this.startCountdown(lobbyId);
      }, 100);
    }

    return lobby;
  }

  /**
   * Удаляет игрока из лобби
   */
  leaveLobby(lobbyId: string, playerId: string): Lobby | null {
    const lobby = this.lobbies[lobbyId];
    if (!lobby) return null;

    lobby.players = lobby.players.filter((p) => p.id !== playerId);

    // Если вышел хост, передаем хостство другому игроку
    if (lobby.hostId === playerId && lobby.players.length > 0) {
      lobby.hostId = lobby.players[0].id;
      lobby.players[0].isHost = true;
    }

    // Останавливаем таймер, если игрок вышел
    if (lobby.isStarting) {
      this.stopCountdown(lobbyId);
      lobby.isStarting = false;
      lobby.countdown = undefined;
    }

    // Удаляем лобби, если оно пустое
    if (lobby.players.length === 0) {
      delete this.lobbies[lobbyId];
      return null;
    }

    return lobby;
  }

  /**
   * Получает лобби по ID
   */
  getLobby(lobbyId: string): Lobby | null {
    return this.lobbies[lobbyId] || null;
  }

  /**
   * Переключает готовность игрока
   * Возвращает объект с лобби и флагом, нужно ли отправлять обновление
   */
  toggleReady(lobbyId: string, playerId: string): { lobby: Lobby; shouldBroadcast: boolean } | null {
    const lobby = this.lobbies[lobbyId];
    if (!lobby) return null;

    const player = lobby.players.find((p) => p.id === playerId);
    if (!player) return null;

    const oldReadyState = player.isReady;
    player.isReady = !player.isReady;
    
    console.log(`[LobbyManager] toggleReady - lobbyId: ${lobbyId}, playerId: ${playerId}, oldReady: ${oldReadyState}, newReady: ${player.isReady}`);
    console.log(`[LobbyManager] Lobby players:`, lobby.players.map(p => ({ id: p.id, name: p.name, isReady: p.isReady })));
    
    // Проверяем, все ли игроки готовы и лобби заполнено
    const allPlayersReady = lobby.players.every((p) => p.isReady);
    const lobbyFull = lobby.players.length === lobby.maxPlayers;
    
    console.log(`[LobbyManager] toggleReady - lobbyId: ${lobbyId}, allReady: ${allPlayersReady}, full: ${lobbyFull}, players.length: ${lobby.players.length}, maxPlayers: ${lobby.maxPlayers}, isStarting: ${lobby.isStarting}, gameStarted: ${lobby.gameStarted}`);
    
    // Если все готовы и лобби заполнено, запускаем таймер
    if (allPlayersReady && lobbyFull && !lobby.isStarting && !lobby.gameStarted) {
      console.log(`[LobbyManager] ✅ Conditions met! Starting countdown for lobby ${lobbyId}`);
      // Запускаем таймер немедленно, без задержки
      // startCountdown сам отправит обновление, поэтому не нужно отправлять здесь
      this.startCountdown(lobbyId);
      return { lobby, shouldBroadcast: false };
    } else {
      console.log(`[LobbyManager] ❌ Conditions NOT met: allReady=${allPlayersReady}, full=${lobbyFull}, isStarting=${lobby.isStarting}, gameStarted=${lobby.gameStarted}`);
      if (!allPlayersReady && lobby.isStarting) {
        // Если кто-то отменил готовность, останавливаем таймер
        console.log(`[LobbyManager] Stopping countdown for lobby ${lobbyId} - player not ready`);
        this.stopCountdown(lobbyId);
      }
      // Нужно отправить обновление, так как таймер не запускается
      return { lobby, shouldBroadcast: true };
    }
  }

  /**
   * Распределяет игроков по слотам случайным образом
   */
  assignPlayerSlots(lobby: Lobby): Map<string, PlayerId> {
    const slotMap = new Map<string, PlayerId>();
    const slots: PlayerId[] = [0, 1, 2, 3];
    
    // Перемешиваем слоты случайным образом
    const shuffledSlots = slots.sort(() => Math.random() - 0.5);
    
    // Назначаем слоты игрокам по порядку
    lobby.players.forEach((player, index) => {
      if (index < shuffledSlots.length) {
        const slot = shuffledSlots[index];
        player.assignedSlot = slot;
        slotMap.set(player.id, slot);
      }
    });

    return slotMap;
  }

  /**
   * Запускает таймер обратного отсчета
   */
  private startCountdown(lobbyId: string): void {
    const lobby = this.lobbies[lobbyId];
    if (!lobby || lobby.isStarting || lobby.gameStarted) {
      console.log(`[LobbyManager] Cannot start countdown for lobby ${lobbyId} - lobby: ${!!lobby}, isStarting: ${lobby?.isStarting}, gameStarted: ${lobby?.gameStarted}`);
      return;
    }

    console.log(`[LobbyManager] Starting countdown for lobby ${lobbyId}, countdown: ${LOBBY_COUNTDOWN}`);
    
    // Останавливаем предыдущий таймер, если есть (но не сбрасываем состояние)
    const oldTimer = this.lobbyTimers.get(lobbyId);
    if (oldTimer) {
      clearInterval(oldTimer);
      this.lobbyTimers.delete(lobbyId);
    }
    
    // Устанавливаем состояние ПОСЛЕ остановки предыдущего таймера
    lobby.isStarting = true;
    lobby.countdown = LOBBY_COUNTDOWN;

    // Отправляем начальное обновление
    console.log(`[LobbyManager] Broadcasting initial countdown update for lobby ${lobbyId}, isStarting: ${lobby.isStarting}, countdown: ${lobby.countdown}`);
    this.broadcastLobbyUpdate(lobbyId);

    // Запускаем новый таймер
    const timer = setInterval(() => {
      const currentLobby = this.lobbies[lobbyId];
      if (!currentLobby) {
        clearInterval(timer);
        return;
      }

      if (currentLobby.countdown !== undefined) {
        currentLobby.countdown--;
        
        // Отправляем обновление каждую секунду
        this.broadcastLobbyUpdate(lobbyId);
        
        if (currentLobby.countdown <= 0) {
          this.stopCountdown(lobbyId);
          currentLobby.gameStarted = true;
          currentLobby.isStarting = false;
          currentLobby.countdown = undefined;
          
          // Распределяем игроков по слотам
          const slotMap = this.assignPlayerSlots(currentLobby);
          
          // Отправляем событие начала игры
          this.broadcastGameStart(lobbyId, currentLobby, slotMap);
        }
      }
    }, 1000);

    this.lobbyTimers.set(lobbyId, timer);
  }

  /**
   * Отправляет обновление лобби всем игрокам
   */
  private broadcastLobbyUpdate(lobbyId: string): void {
    if (!this.io) {
      console.log(`[LobbyManager] Cannot broadcast - io not set`);
      return;
    }
    const lobby = this.lobbies[lobbyId];
    if (lobby) {
      console.log(`[LobbyManager] Broadcasting lobby update for ${lobbyId}, isStarting: ${lobby.isStarting}, countdown: ${lobby.countdown}`);
      this.io.to(lobbyId).emit("lobby:updated", { lobby });
    } else {
      console.log(`[LobbyManager] Cannot broadcast - lobby ${lobbyId} not found`);
    }
  }

  /**
   * Отправляет событие начала игры
   */
  private broadcastGameStart(lobbyId: string, lobby: Lobby, slotMap: Map<string, PlayerId>): void {
    if (!this.io) return;
    const slotMapObject = Object.fromEntries(slotMap);
    // Отправляем событие начала игры всем игрокам в лобби
    this.io.to(lobbyId).emit("game:start", { lobby, playerSlotMap: slotMapObject });
    
    // Также инициализируем игровой сервер
    // Это будет сделано через socketHandler при получении события game:start
  }

  /**
   * Останавливает таймер обратного отсчета
   */
  private stopCountdown(lobbyId: string): void {
    const timer = this.lobbyTimers.get(lobbyId);
    if (timer) {
      clearInterval(timer);
      this.lobbyTimers.delete(lobbyId);
    }

    const lobby = this.lobbies[lobbyId];
    if (lobby) {
      lobby.isStarting = false;
      lobby.countdown = undefined;
    }
  }

  /**
   * Генерирует уникальный ID лобби
   */
  private generateLobbyId(): string {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
  }

  /**
   * Получает максимальное количество реальных игроков для режима
   */
  private getMaxPlayers(mode: GameMode): number {
    switch (mode) {
      case "1v3ai":
        return 1; // 1 реальный игрок + 3 ИИ
      case "1v1+2ai":
        return 2; // 2 реальных игрока + 2 ИИ
      case "1v1v1+1ai":
        return 3; // 3 реальных игрока + 1 ИИ
      case "1v1v1v1":
        return 4; // 4 реальных игрока
      default:
        return 4;
    }
  }

  /**
   * Удаляет лобби
   */
  deleteLobby(lobbyId: string): void {
    this.stopCountdown(lobbyId);
    delete this.lobbies[lobbyId];
  }
}

// Singleton instance
export const lobbyManager = new LobbyManager();

