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
}

interface UseNetworkGameStateReturn {
  gameState: GameState | null;
  isConnected: boolean;
  myPlayerId: PlayerId | null;
  buyUnit: (playerId: PlayerId, barrackId: string, unitType: UnitType) => void;
  upgradeBuilding: (playerId: PlayerId, buildingId: string) => void;
  repairBuilding: (playerId: PlayerId, buildingId: string) => void;
  upgradeCastleStat: (playerId: PlayerId, stat: keyof CastleUpgrades) => void;
  togglePause: () => void;
  toggleAutoUpgrade: () => void;
  setGameSpeed: (speed: number) => void;
  selectPlayer: (playerId: PlayerId) => void;
  selectBuilding: (buildingId: string | null) => void;
}

export function useNetworkGameState({
  lobbyId,
  playerSlotMap: initialPlayerSlotMap,
  socketId,
  socket,
  isConnected,
}: UseNetworkGameStateProps): UseNetworkGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<PlayerId | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [currentPlayerSlotMap, setCurrentPlayerSlotMap] = useState<Record<string, PlayerId>>(initialPlayerSlotMap);
  
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
      console.log("[useNetworkGameState] Received game state from server");
      console.log("[useNetworkGameState] Game time:", data.gameState.gameTime);
      console.log("[useNetworkGameState] Players:", data.gameState.players.map(p => ({ id: p.id, gold: p.gold, castleLevel: p.castle.level })));
      if (data.aiSlots) {
        console.log("[useNetworkGameState] AI slots:", data.aiSlots);
      }
      if (data.playerSlotMap) {
        console.log("[useNetworkGameState] Player slot map:", data.playerSlotMap);
        // Обновляем playerSlotMap при получении обновления от сервера
        // Это важно при переподключении или если сервер обновил маппинг
        setCurrentPlayerSlotMap(data.playerSlotMap);
        
        // Если у нас есть socket ID, пытаемся определить playerId
        // Если socket ID не найден, используем сохраненный playerId
        if (socket?.id) {
          const playerIdFromMap = data.playerSlotMap[socket.id];
          if (playerIdFromMap !== undefined) {
            console.log(`[useNetworkGameState] Found playerId ${playerIdFromMap} for socket ${socket.id} in updated playerSlotMap`);
            setMyPlayerId(playerIdFromMap);
            setSelectedPlayer(playerIdFromMap);
            if (typeof window !== "undefined" && lobbyId) {
              sessionStorage.setItem(`playerId_${lobbyId}`, String(playerIdFromMap));
            }
          } else {
            // Если socket ID не найден, пытаемся использовать сохраненный playerId
            if (typeof window !== "undefined" && lobbyId) {
              const savedPlayerId = sessionStorage.getItem(`playerId_${lobbyId}`);
              if (savedPlayerId !== null) {
                const playerId = parseInt(savedPlayerId, 10) as PlayerId;
                console.log(`[useNetworkGameState] Using saved playerId ${playerId} (socket ${socket.id} not in playerSlotMap)`);
                setMyPlayerId(playerId);
                setSelectedPlayer(playerId);
              }
            }
          }
        }
      }
      // Обновляем состояние игры полностью от сервера (это источник истины)
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
      sendAction({
        type: "setGameSpeed",
        playerId: myPlayerId!,
        data: { speed },
        timestamp: Date.now(),
        actionId: `setGameSpeed-${Date.now()}-${Math.random()}`,
      });
    },
    [myPlayerId, sendAction]
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
    buyUnit,
    upgradeBuilding,
    repairBuilding,
    upgradeCastleStat,
    togglePause,
    toggleAutoUpgrade,
    setGameSpeed,
    selectPlayer,
    selectBuilding,
  };
}

