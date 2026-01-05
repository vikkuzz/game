/**
 * Хук для сетевой игры через WebSocket
 * Расширяет useGameState для работы в сетевом режиме
 */

import { useState, useEffect, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type { GameState, PlayerId, UnitType, CastleUpgrades } from "@/types/game";

interface UseNetworkGameStateProps {
  lobbyId: string;
  playerSlotMap: Record<string, PlayerId>;
  socketId: string | null;
  socket: Socket | null;
  isConnected: boolean;
  aiSlots?: PlayerId[];
}

interface UseNetworkGameStateReturn {
  gameState: GameState | null;
  isConnected: boolean;
  myPlayerId: PlayerId | null;
  aiSlots: PlayerId[];
  speedVotes: Record<PlayerId, number>;
  buyUnit: (playerId: PlayerId, barrackId: string, unitType: UnitType) => void;
  upgradeBuilding: (playerId: PlayerId, buildingId: string) => void;
  repairBuilding: (playerId: PlayerId, buildingId: string) => void;
  upgradeCastleStat: (playerId: PlayerId, stat: keyof CastleUpgrades) => void;
  togglePause: () => void;
  toggleAutoUpgrade: () => void;
  setGameSpeed: (speed: number) => void;
  voteForSpeed?: (speed: number) => void;
  selectPlayer: (playerId: PlayerId) => void;
  selectBuilding: (buildingId: string | null) => void;
}

export function useNetworkGameState({
  lobbyId,
  playerSlotMap: initialPlayerSlotMap,
  socketId,
  socket,
  isConnected,
  aiSlots: initialAiSlots = [],
}: UseNetworkGameStateProps): UseNetworkGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<PlayerId | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [currentPlayerSlotMap, setCurrentPlayerSlotMap] = useState<Record<string, PlayerId>>(initialPlayerSlotMap);
  const [aiSlots, setAiSlots] = useState<PlayerId[]>(initialAiSlots);
  const [speedVotes, setSpeedVotes] = useState<Record<PlayerId, number>>({} as Record<PlayerId, number>);
  
  // Обновляем playerSlotMap при получении обновлений от сервера
  useEffect(() => {
    setCurrentPlayerSlotMap(initialPlayerSlotMap);
  }, [initialPlayerSlotMap]);
  
  // Определяем PlayerId текущего игрока
  useEffect(() => {
    // Сначала пытаемся найти playerId по текущему socket ID
    if (socketId && currentPlayerSlotMap[socketId] !== undefined) {
      const assignedPlayerId = currentPlayerSlotMap[socketId];
      console.log(`[useNetworkGameState] Player slot assignment - socketId: ${socketId}, playerId: ${assignedPlayerId}, playerSlotMap:`, currentPlayerSlotMap);
      setMyPlayerId(assignedPlayerId);
      setSelectedPlayer(assignedPlayerId);
      // Сохраняем playerId в sessionStorage для использования при переподключении
      if (typeof window !== "undefined" && lobbyId) {
        sessionStorage.setItem(`playerId_${lobbyId}`, String(assignedPlayerId));
      }
    } else {
      // Если socket ID не найден, пытаемся восстановить playerId из sessionStorage
      // Это важно при переподключении, когда socket ID меняется
      if (typeof window !== "undefined" && lobbyId) {
        const savedPlayerId = sessionStorage.getItem(`playerId_${lobbyId}`);
        if (savedPlayerId !== null) {
          const playerId = parseInt(savedPlayerId, 10) as PlayerId;
          console.log(`[useNetworkGameState] Restored playerId from sessionStorage: ${playerId} (socketId: ${socketId}, playerSlotMap:`, currentPlayerSlotMap, ")");
          setMyPlayerId(playerId);
          setSelectedPlayer(playerId);
          
          // Пытаемся обновить playerSlotMap на сервере при переподключении
          if (socket && isConnected && socketId) {
            // Находим старый socket ID по playerId
            const oldSocketId = Object.keys(currentPlayerSlotMap).find(
              key => currentPlayerSlotMap[key] === playerId
            );
            
            if (oldSocketId && oldSocketId !== socketId) {
              console.log(`[useNetworkGameState] Attempting to reconnect - oldSocketId: ${oldSocketId}, newSocketId: ${socketId}, playerId: ${playerId}`);
              socket.emit("game:reconnect", { 
                roomId: lobbyId,
                previousSocketId: oldSocketId,
                playerId: playerId
              });
            }
          }
        } else {
          console.warn(`[useNetworkGameState] Cannot determine playerId - socketId: ${socketId}, playerSlotMap:`, currentPlayerSlotMap, "no saved playerId in sessionStorage");
        }
      }
    }
  }, [socketId, currentPlayerSlotMap, lobbyId, socket, isConnected]);

  // Запрос начального состояния игры
  useEffect(() => {
    if (socket && isConnected && lobbyId && !gameState) {
      socket.emit("game:state:request", { roomId: lobbyId });
    }
  }, [socket, isConnected, lobbyId, gameState]);

  // Обработка получения состояния игры от сервера
  useEffect(() => {
    if (!socket) return;

    const handleGameState = (data: { 
      gameState: GameState; 
      aiSlots?: PlayerId[];
      playerSlotMap?: Record<string, PlayerId>;
    }) => {
      // Уменьшаем количество логов - логируем только при значительных изменениях
      const shouldLog = !gameState || Math.abs(data.gameState.gameTime - (gameState?.gameTime || 0)) > 1000;
      
      if (shouldLog) {
        console.log("[useNetworkGameState] Received game state from server");
        console.log("[useNetworkGameState] Game time:", data.gameState.gameTime);
      }
      
      if (data.aiSlots) {
        setAiSlots(data.aiSlots);
      }
      
      if (data.playerSlotMap) {
        // Обновляем playerSlotMap при получении обновления от сервера
        // Это важно при переподключении или если сервер обновил маппинг
        const playerSlotMapChanged = JSON.stringify(data.playerSlotMap) !== JSON.stringify(currentPlayerSlotMap);
        
        if (playerSlotMapChanged) {
          setCurrentPlayerSlotMap(data.playerSlotMap);
          
          // Если у нас есть socket ID, пытаемся определить playerId
          // Если socket ID не найден, используем сохраненный playerId
          if (socket?.id) {
            const playerIdFromMap = data.playerSlotMap[socket.id];
            if (playerIdFromMap !== undefined && playerIdFromMap !== myPlayerId) {
              console.log(`[useNetworkGameState] Player slot assignment - socketId: ${socket.id}, playerId: ${playerIdFromMap}`);
              setMyPlayerId(playerIdFromMap);
              setSelectedPlayer(playerIdFromMap);
              if (typeof window !== "undefined" && lobbyId) {
                sessionStorage.setItem(`playerId_${lobbyId}`, String(playerIdFromMap));
              }
            } else if (playerIdFromMap === undefined) {
              // Если socket ID не найден, пытаемся использовать сохраненный playerId
              if (typeof window !== "undefined" && lobbyId) {
                const savedPlayerId = sessionStorage.getItem(`playerId_${lobbyId}`);
                if (savedPlayerId !== null) {
                  const playerId = parseInt(savedPlayerId, 10) as PlayerId;
                  if (playerId !== myPlayerId) {
                    console.log(`[useNetworkGameState] Using saved playerId ${playerId} (socket ${socket.id} not in playerSlotMap)`);
                    setMyPlayerId(playerId);
                    setSelectedPlayer(playerId);
                  }
                }
              }
            }
          }
        }
      }
      // В сетевом режиме состояние от сервера используется для синхронизации действий
      // Но игровой цикл работает локально, поэтому мы не перезаписываем gameState полностью
      // Вместо этого мы сохраняем его для использования в синхронизации
      // Но не устанавливаем как основной источник, чтобы локальный цикл продолжал работать
      setGameState(data.gameState);
    };

    socket.on("game:state", handleGameState);

    return () => {
      socket.off("game:state", handleGameState);
    };
  }, [socket]);

  // Отправка действия на сервер
  const sendAction = useCallback(
    (action: any) => {
      if (!socket || !isConnected || !lobbyId) {
        console.warn("Cannot send action: socket not connected or no lobbyId");
        return;
      }
      socket.emit("game:action", { roomId: lobbyId, action });
    },
    [socket, isConnected, lobbyId]
  );

  // Обработка действий от других игроков
  useEffect(() => {
    if (!socket) return;

    const handleGameAction = (data: { action: any }) => {
      console.log("Received game action from server:", data.action);
      // В будущем здесь будет обработка действий от других игроков
      // Пока просто логируем
    };

    socket.on("game:action", handleGameAction);

    return () => {
      socket.off("game:action", handleGameAction);
    };
  }, [socket]);

  // Обработка обновлений голосования за скорость
  useEffect(() => {
    if (!socket) return;

    const handleSpeedVotes = (data: { 
      votes: Record<PlayerId, number>; 
      applied: boolean; 
      newSpeed?: number;
    }) => {
      setSpeedVotes(data.votes);
      if (data.applied && data.newSpeed !== undefined) {
        // Скорость применена - обновляем локальное состояние
        setGameState((prev) => prev ? { ...prev, gameSpeed: data.newSpeed! } : null);
      }
    };

    socket.on("game:speedVotes", handleSpeedVotes);

    return () => {
      socket.off("game:speedVotes", handleSpeedVotes);
    };
  }, [socket]);

  const buyUnit = useCallback(
    (playerId: PlayerId, barrackId: string, unitType: UnitType) => {
      if (playerId !== myPlayerId) {
        console.warn("Cannot buy unit: not your player");
        return;
      }
      sendAction({
        type: "buyUnit",
        playerId,
        data: { barrackId, unitType },
        timestamp: Date.now(),
        actionId: `buyUnit-${Date.now()}-${Math.random()}`,
      });
    },
    [myPlayerId, sendAction]
  );

  const upgradeBuilding = useCallback(
    (playerId: PlayerId, buildingId: string) => {
      if (playerId !== myPlayerId) {
        console.warn("Cannot upgrade building: not your player");
        return;
      }
      sendAction({
        type: "upgradeBuilding",
        playerId,
        data: { buildingId },
        timestamp: Date.now(),
        actionId: `upgradeBuilding-${Date.now()}-${Math.random()}`,
      });
    },
    [myPlayerId, sendAction]
  );

  const repairBuilding = useCallback(
    (playerId: PlayerId, buildingId: string) => {
      if (playerId !== myPlayerId) {
        console.warn("Cannot repair building: not your player");
        return;
      }
      sendAction({
        type: "repairBuilding",
        playerId,
        data: { buildingId },
        timestamp: Date.now(),
        actionId: `repairBuilding-${Date.now()}-${Math.random()}`,
      });
    },
    [myPlayerId, sendAction]
  );

  const upgradeCastleStat = useCallback(
    (playerId: PlayerId, stat: keyof CastleUpgrades) => {
      if (playerId !== myPlayerId) {
        console.warn("Cannot upgrade stat: not your player");
        return;
      }
      sendAction({
        type: "upgradeCastleStat",
        playerId,
        data: { stat },
        timestamp: Date.now(),
        actionId: `upgradeCastleStat-${Date.now()}-${Math.random()}`,
      });
    },
    [myPlayerId, sendAction]
  );

  const togglePause = useCallback(() => {
    sendAction({
      type: "togglePause",
      playerId: myPlayerId!,
      data: {},
      timestamp: Date.now(),
      actionId: `togglePause-${Date.now()}-${Math.random()}`,
    });
  }, [myPlayerId, sendAction]);

  const toggleAutoUpgrade = useCallback(() => {
    sendAction({
      type: "toggleAutoUpgrade",
      playerId: myPlayerId!,
      data: {},
      timestamp: Date.now(),
      actionId: `toggleAutoUpgrade-${Date.now()}-${Math.random()}`,
    });
  }, [myPlayerId, sendAction]);

  const setGameSpeed = useCallback(
    (speed: number) => {
      // В сетевом режиме отправляем голос вместо прямого изменения
      sendAction({
        type: "voteForSpeed",
        playerId: myPlayerId!,
        data: { speed },
        timestamp: Date.now(),
        actionId: `voteForSpeed-${Date.now()}-${Math.random()}`,
      });
    },
    [myPlayerId, sendAction]
  );

  const voteForSpeed = useCallback(
    (speed: number) => {
      // Публичный метод для голосования за скорость
      setGameSpeed(speed);
    },
    [setGameSpeed]
  );

  const selectPlayer = useCallback((playerId: PlayerId) => {
    // Выбор игрока - локальное действие, не отправляется на сервер
    setSelectedPlayer(playerId);
  }, []);

  const selectBuilding = useCallback((buildingId: string | null) => {
    // Выбор здания - локальное действие, не отправляется на сервер
    setSelectedBuilding(buildingId);
  }, []);

  // Объединяем локальное состояние (selectedPlayer, selectedBuilding) с состоянием игры от сервера
  const finalGameState: GameState | null = gameState
    ? {
        ...gameState,
        selectedPlayer: selectedPlayer ?? gameState.selectedPlayer,
        selectedBuilding: selectedBuilding ?? gameState.selectedBuilding,
      }
    : null;

  return {
    gameState: finalGameState,
    isConnected,
    myPlayerId,
    aiSlots,
    speedVotes,
    buyUnit,
    upgradeBuilding,
    repairBuilding,
    upgradeCastleStat,
    togglePause,
    toggleAutoUpgrade,
    setGameSpeed,
    voteForSpeed,
    selectPlayer,
    selectBuilding,
  };
}

