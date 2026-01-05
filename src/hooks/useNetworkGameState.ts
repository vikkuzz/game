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
  playerSlotMap,
  socketId,
  socket,
  isConnected,
}: UseNetworkGameStateProps): UseNetworkGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<PlayerId | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  
  // Определяем PlayerId текущего игрока
  useEffect(() => {
    if (socketId && playerSlotMap[socketId] !== undefined) {
      setMyPlayerId(playerSlotMap[socketId]);
      setSelectedPlayer(playerSlotMap[socketId]);
    }
  }, [socketId, playerSlotMap]);

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
      console.log("[useNetworkGameState] Received game state from server:", data.gameState);
      if (data.aiSlots) {
        console.log("[useNetworkGameState] AI slots:", data.aiSlots);
      }
      // Обновляем состояние игры, но сохраняем локальные selectedPlayer и selectedBuilding
      setGameState((prevState) => {
        if (!prevState) {
          return data.gameState;
        }
        // Объединяем состояние от сервера с локальными значениями
        return {
          ...data.gameState,
          selectedPlayer: prevState.selectedPlayer ?? data.gameState.selectedPlayer,
          selectedBuilding: prevState.selectedBuilding ?? data.gameState.selectedBuilding,
        };
      });
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

