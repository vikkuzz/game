/**
 * Обработчик событий Socket.IO для сетевой игры
 */

import type { Server as SocketIOServer, Socket } from "socket.io";
import { lobbyManager } from "./lobbyServer";
import { gameServer } from "./gameServer";
import { handleGameAction } from "./gameActionHandler";
import { startGameSync, stopGameSync } from "./gameSync";
import { startGameLoop, stopGameLoop } from "./gameLoop";
import type { Lobby, GameMode, PlayerId } from "@/types/lobby";

export default function socketHandler(io: SocketIOServer) {
  // Устанавливаем Socket.IO в lobbyManager
  lobbyManager.setIO(io);

  io.on("connection", (socket: Socket) => {
    console.log(`[SocketHandler] Client connected: ${socket.id}`);
    
    // Логируем все входящие события для отладки
    socket.onAny((eventName, ...args) => {
      console.log(`[SocketHandler] Received event: ${eventName}`, args);
    });

    // Создание лобби
    socket.on("lobby:create", (data: { mode: GameMode; playerName: string }) => {
      try {
        const lobby = lobbyManager.createLobby(
          socket.id,
          data.playerName,
          data.mode
        );
        socket.join(lobby.id);
        socket.emit("lobby:created", { lobby });
        console.log(`Lobby created: ${lobby.id} by ${socket.id}`);
      } catch (error) {
        console.error("Error creating lobby:", error);
        socket.emit("lobby:error", { message: "Failed to create lobby" });
      }
    });

    // Присоединение к лобби
    socket.on("lobby:join", (data: { lobbyId: string; playerName: string }) => {
      try {
        const lobby = lobbyManager.joinLobby(
          data.lobbyId,
          socket.id,
          data.playerName
        );

        if (!lobby) {
          socket.emit("lobby:error", { message: "Lobby not found or full" });
          return;
        }

        socket.join(lobby.id);
        io.to(lobby.id).emit("lobby:updated", { lobby });
        console.log(`Player ${socket.id} joined lobby ${data.lobbyId}`);
      } catch (error) {
        console.error("Error joining lobby:", error);
        socket.emit("lobby:error", { message: "Failed to join lobby" });
      }
    });

    // Выход из лобби
    socket.on("lobby:leave", (data: { lobbyId: string }) => {
      try {
        const lobby = lobbyManager.leaveLobby(data.lobbyId, socket.id);
        socket.leave(data.lobbyId);

        if (lobby) {
          io.to(data.lobbyId).emit("lobby:updated", { lobby });
        } else {
          socket.emit("lobby:left", { lobbyId: data.lobbyId });
        }

        console.log(`Player ${socket.id} left lobby ${data.lobbyId}`);
      } catch (error) {
        console.error("Error leaving lobby:", error);
        socket.emit("lobby:error", { message: "Failed to leave lobby" });
      }
    });

    // Переключение готовности
    socket.on("lobby:ready", (data: { lobbyId: string }) => {
      try {
        console.log(`[SocketHandler] lobby:ready received from ${socket.id} for lobby ${data.lobbyId}`);
        const result = lobbyManager.toggleReady(data.lobbyId, socket.id);
        if (result) {
          // Отправляем обновление только если таймер не запускается
          // (если таймер запускается, startCountdown сам отправит обновление)
          if (result.shouldBroadcast) {
            console.log(`[SocketHandler] Lobby updated, broadcasting to lobby ${data.lobbyId}`);
            io.to(data.lobbyId).emit("lobby:updated", { lobby: result.lobby });
          } else {
            console.log(`[SocketHandler] Countdown started, update will be sent by startCountdown`);
          }
        } else {
          console.log(`[SocketHandler] Lobby not found for ${data.lobbyId}`);
        }
      } catch (error) {
        console.error("Error toggling ready:", error);
        socket.emit("lobby:error", { message: "Failed to toggle ready" });
      }
    });

    // Получение информации о лобби
    socket.on("lobby:get", (data: { lobbyId: string }) => {
      try {
        const lobby = lobbyManager.getLobby(data.lobbyId);
        if (lobby) {
          socket.emit("lobby:info", { lobby });
        } else {
          socket.emit("lobby:error", { message: "Lobby not found" });
        }
      } catch (error) {
        console.error("Error getting lobby:", error);
        socket.emit("lobby:error", { message: "Failed to get lobby" });
      }
    });

    // Игровые действия
    socket.on("game:action", (data: { roomId: string; action: any }) => {
      try {
        const room = gameServer.getGame(data.roomId);
        if (!room) {
          socket.emit("game:error", { message: "Game room not found" });
          return;
        }

        const playerId = gameServer.getPlayerId(data.roomId, socket.id);
        if (playerId === null) {
          socket.emit("game:error", { message: "Player not found in game" });
          return;
        }

        // Обрабатываем действие на сервере (валидация)
        const newGameState = handleGameAction(
          room.gameState,
          data.action,
          playerId
        );

        if (newGameState) {
          // Обновляем состояние игры на сервере
          gameServer.updateGameState(data.roomId, newGameState);
          
          // Отправляем обновленное состояние всем игрокам в комнате
          io.to(data.roomId).emit("game:state", { gameState: newGameState });
        } else {
          // Действие было отклонено (невалидно)
          // Можно отправить ошибку обратно игроку
          console.warn(`Invalid action from player ${playerId}:`, data.action);
        }

        // Также пересылаем действие другим игрокам для обработки на клиенте (если нужно)
        socket.to(data.roomId).emit("game:action", { action: data.action });
      } catch (error) {
        console.error("Error processing game action:", error);
        socket.emit("game:error", { message: "Failed to process action" });
      }
    });

    // Запрос состояния игры
    socket.on("game:state:request", (data: { roomId: string }) => {
      try {
        const room = gameServer.getGame(data.roomId);
        if (room) {
          const aiSlots = Array.from(room.aiSlots);
          const playerSlotMap = Object.fromEntries(room.playerSlotMap);
          socket.emit("game:state", { 
            gameState: room.gameState,
            aiSlots: aiSlots,
            playerSlotMap: playerSlotMap
          });
        }
      } catch (error) {
        console.error("Error getting game state:", error);
      }
    });

    // Обработка начала игры (вызывается после события game:start от лобби)
    socket.on("game:init", (data: { lobby: Lobby; playerSlotMap: Record<string, PlayerId> }) => {
      try {
        const slotMap = new Map<string, PlayerId>(Object.entries(data.playerSlotMap));
        const room = gameServer.createGame(data.lobby.id, data.lobby, slotMap);
        
        // Получаем ИИ слоты для отправки клиентам
        const aiSlots = Array.from(room.aiSlots);
        
        // Отправляем состояние игры и информацию об ИИ слотах всем игрокам
        io.to(data.lobby.id).emit("game:state", { 
          gameState: room.gameState,
          aiSlots: aiSlots, // Отправляем массив ИИ слотов
          playerSlotMap: data.playerSlotMap // Также отправляем маппинг слотов
        });

        // Запускаем периодическую синхронизацию состояния игры
        startGameSync(io, data.lobby.id);
        
        // Запускаем серверный игровой цикл
        startGameLoop(io, data.lobby.id);
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    });

    // Отключение клиента
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Находим все игры, где был игрок, и удаляем его
      // Останавливаем синхронизацию, если игра пуста
      // Это упрощенная версия - в реальности нужно хранить список игр по игроку
      
      // Также обрабатываем выход из лобби (это делается через lobby:leave)
    });
  });
}

