/**
 * Обработчик событий Socket.IO для сетевой игры
 */

import type { Server as SocketIOServer, Socket } from "socket.io";
import { lobbyManager } from "./lobbyServer";
import { gameServer } from "./gameServer";
import { handleGameAction } from "./gameActionHandler";
import { startGameSync, stopGameSync } from "./gameSync";
import { startGameLoop, stopGameLoop } from "./gameLoop";
import type { Lobby, GameMode } from "@/types/lobby";
import type { PlayerId } from "@/types/game";

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

    // Получение списка активных лобби
    socket.on("lobby:list", () => {
      try {
        const activeLobbies = lobbyManager.getActiveLobbies();
        socket.emit("lobby:list", { lobbies: activeLobbies });
      } catch (error) {
        console.error("Error getting lobby list:", error);
        socket.emit("lobby:error", { message: "Failed to get lobby list" });
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

        // Специальная обработка голосования за скорость
        if (data.action.type === "voteForSpeed") {
          const speed = data.action.data.speed;
          const voted = gameServer.voteForSpeed(data.roomId, playerId, speed);
          
          if (voted) {
            // Проверяем, все ли проголосовали
            const voteResult = gameServer.checkAndApplySpeedVote(data.roomId);
            
            // Отправляем обновление голосов всем игрокам
            const speedVotes = gameServer.getSpeedVotes(data.roomId);
            io.to(data.roomId).emit("game:speedVotes", {
              votes: Object.fromEntries(speedVotes),
              applied: voteResult.applied,
              newSpeed: voteResult.speed,
            });
            
            // Если скорость применена, отправляем обновленное состояние
            if (voteResult.applied) {
              const updatedRoom = gameServer.getGame(data.roomId);
              if (updatedRoom) {
                const aiSlots = Array.from(updatedRoom.aiSlots);
                const playerSlotMap = Object.fromEntries(updatedRoom.playerSlotMap);
                io.to(data.roomId).emit("game:state", {
                  gameState: updatedRoom.gameState,
                  aiSlots: aiSlots,
                  playerSlotMap: playerSlotMap,
                });
              }
            }
          }
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
          
          // Получаем актуальные данные комнаты для отправки
          const room = gameServer.getGame(data.roomId);
          const aiSlots = room ? Array.from(room.aiSlots) : [];
          const playerSlotMap = room ? Object.fromEntries(room.playerSlotMap) : {};
          
          // Отправляем обновленное состояние всем игрокам в комнате
          console.log(`[SocketHandler] Broadcasting game state update after action from player ${playerId}`);
          io.to(data.roomId).emit("game:state", { 
            gameState: newGameState,
            aiSlots: aiSlots,
            playerSlotMap: playerSlotMap
          });
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
        console.log(`[SocketHandler] game:init - lobby: ${data.lobby.id}, playerSlotMap:`, data.playerSlotMap);
        const slotMap = new Map<string, PlayerId>(Object.entries(data.playerSlotMap));
        const room = gameServer.createGame(data.lobby.id, data.lobby, slotMap);
        
        // Получаем ИИ слоты для отправки клиентам
        const aiSlots = Array.from(room.aiSlots);
        
        console.log(`[SocketHandler] Game room created - roomId: ${room.id}, aiSlots:`, aiSlots, "playerSlotMap:", Object.fromEntries(room.playerSlotMap));
        
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

    // Обработка переподключения игрока к игре
    socket.on("game:reconnect", (data: { roomId: string; previousSocketId?: string; playerId?: PlayerId }) => {
      try {
        const room = gameServer.getGame(data.roomId);
        if (!room) {
          socket.emit("game:error", { message: "Game room not found" });
          return;
        }

        let playerId: PlayerId | null = null;

        // Если передан playerId напрямую, используем его
        if (data.playerId !== undefined) {
          playerId = data.playerId;
          // Используем новый метод для установки socket ID
          gameServer.setPlayerSocketId(data.roomId, socket.id, playerId);
          console.log(`[SocketHandler] Set socket ID for player ${playerId} in room ${data.roomId}: ${socket.id}`);
        } else if (data.previousSocketId) {
          // Если передан предыдущий socket ID, обновляем маппинг
          playerId = gameServer.getPlayerId(data.roomId, data.previousSocketId);
          if (playerId !== null) {
            gameServer.updatePlayerSocketId(data.roomId, data.previousSocketId, socket.id);
            console.log(`[SocketHandler] Updated socket ID for player ${playerId} in room ${data.roomId}: ${data.previousSocketId} -> ${socket.id}`);
          }
        }

        if (playerId !== null) {
          socket.join(data.roomId);
          
          // Отправляем текущее состояние игры переподключившемуся игроку
          const aiSlots = Array.from(room.aiSlots);
          const playerSlotMap = Object.fromEntries(room.playerSlotMap);
          
          socket.emit("game:state", {
            gameState: room.gameState,
            aiSlots: aiSlots,
            playerSlotMap: playerSlotMap,
          });
          
          console.log(`[SocketHandler] Sent game state to reconnected player ${playerId} in room ${data.roomId}`);
          
          console.log(`[SocketHandler] Player ${playerId} reconnected to game ${data.roomId}`);
        } else {
          // Если не удалось определить playerId, отправляем текущее состояние
          const aiSlots = Array.from(room.aiSlots);
          const playerSlotMap = Object.fromEntries(room.playerSlotMap);
          socket.emit("game:state", {
            gameState: room.gameState,
            aiSlots: aiSlots,
            playerSlotMap: playerSlotMap
          });
          console.warn(`[SocketHandler] Could not determine playerId for reconnection in room ${data.roomId}`);
        }
      } catch (error) {
        console.error("Error handling reconnection:", error);
        socket.emit("game:error", { message: "Failed to reconnect" });
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

