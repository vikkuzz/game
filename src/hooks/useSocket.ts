/**
 * Хук для работы с Socket.IO
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Lobby, GameMode } from "@/types/lobby";
import type { PlayerId } from "@/types/game";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  lobby: Lobby | null;
  error: string | null;
  activeLobbies: Lobby[];
  createLobby: (mode: GameMode, playerName: string) => void;
  joinLobby: (lobbyId: string, playerName: string) => void;
  leaveLobby: (lobbyId: string) => void;
  toggleReady: (lobbyId: string) => void;
  refreshLobbyList: () => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLobbies, setActiveLobbies] = useState<Lobby[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Если socket уже существует и подключен, не создаем новый
    if (socketRef.current && socketRef.current.connected) {
      console.log("[useSocket] Socket already exists and connected, reusing:", socketRef.current.id);
      setSocket(socketRef.current);
      return;
    }
    
    // Если socket существует, но не подключен, пытаемся переподключиться
    if (socketRef.current && !socketRef.current.connected) {
      console.log("[useSocket] Socket exists but not connected, attempting reconnect");
      socketRef.current.connect();
      setSocket(socketRef.current);
      return;
    }
    
    // Создаем подключение к серверу
    // В продакшене используем NEXT_PUBLIC_SOCKET_URL (отдельный Socket.IO сервер)
    // В разработке используем текущий origin (локальный сервер)
    const socketUrl =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
        : process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
    
    console.log("[useSocket] Creating new Socket.IO connection to:", socketUrl);
    
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Бесконечные попытки переподключения
      timeout: 20000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Обработчики событий подключения
    newSocket.on("connect", () => {
      console.log("[useSocket] Connected to server, socket.id:", newSocket.id);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[useSocket] Disconnected from server, reason:", reason, "socket.id:", newSocket.id);
      setIsConnected(false);
      
      // Если это не инициированное отключение (transport close, ping timeout и т.д.), 
      // Socket.IO автоматически попытается переподключиться
      if (reason === "io server disconnect") {
        // Сервер принудительно отключил клиента, нужно переподключиться вручную
        console.log("[useSocket] Server disconnected, will reconnect manually");
        newSocket.connect();
      }
    });
    
    newSocket.on("reconnect", (attemptNumber) => {
      console.log("[useSocket] Reconnected to server after", attemptNumber, "attempts, new socket.id:", newSocket.id);
      setIsConnected(true);
      setError(null);
    });
    
    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log("[useSocket] Reconnection attempt", attemptNumber);
    });
    
    newSocket.on("reconnect_error", (error) => {
      console.error("[useSocket] Reconnection error:", error);
    });
    
    newSocket.on("reconnect_failed", () => {
      console.error("[useSocket] Reconnection failed after all attempts");
      setError("Не удалось переподключиться к серверу");
    });

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Ошибка подключения к серверу");
    });

    // Обработчики событий лобби
    newSocket.on("lobby:created", (data: { lobby: Lobby }) => {
      console.log("Lobby created:", data.lobby);
      setLobby(data.lobby);
      setError(null);
    });

    newSocket.on("lobby:updated", (data: { lobby: Lobby }) => {
      console.log("[useSocket] Lobby updated:", data.lobby);
      console.log("[useSocket] Lobby isStarting:", data.lobby.isStarting, "countdown:", data.lobby.countdown);
      setLobby(data.lobby);
    });

    newSocket.on("lobby:info", (data: { lobby: Lobby }) => {
      console.log("Lobby info:", data.lobby);
      setLobby(data.lobby);
    });

    newSocket.on("lobby:left", (data: { lobbyId: string }) => {
      console.log("Left lobby:", data.lobbyId);
      setLobby(null);
    });

    newSocket.on("lobby:error", (data: { message: string }) => {
      console.error("Lobby error:", data.message);
      setError(data.message);
    });

    // Обработчик начала игры
    newSocket.on("game:start", (data: { lobby: Lobby; playerSlotMap: Record<string, PlayerId> }) => {
      console.log("Game started:", data);
      // После получения game:start, отправляем game:init для инициализации игры на сервере
      newSocket.emit("game:init", data);
      // Это событие будет обработано в компоненте игры
    });

    // Обработчик получения состояния игры
    newSocket.on("game:state", (data: { gameState: any }) => {
      console.log("Game state received:", data);
      // Это событие будет обработано в компоненте игры
    });

    // Обработчик игровых действий
    newSocket.on("game:action", (data: { action: any }) => {
      console.log("Game action received:", data);
      // Это событие будет обработано в компоненте игры
    });

    // Обработчик списка активных лобби
    newSocket.on("lobby:list", (data: { lobbies: Lobby[] }) => {
      console.log("Active lobbies received:", data.lobbies);
      setActiveLobbies(data.lobbies);
    });

    // Очистка при размонтировании
    return () => {
      newSocket.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  const createLobby = useCallback(
    (mode: GameMode, playerName: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("lobby:create", { mode, playerName });
    },
    []
  );

  const joinLobby = useCallback(
    (lobbyId: string, playerName: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("lobby:join", { lobbyId, playerName });
    },
    []
  );

  const leaveLobby = useCallback(
    (lobbyId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit("lobby:leave", { lobbyId });
    },
    []
  );

  const toggleReady = useCallback(
    (lobbyId: string) => {
      if (!socketRef.current) {
        console.warn("[useSocket] Cannot toggle ready - socket not connected");
        return;
      }
      if (!socketRef.current.connected) {
        console.warn("[useSocket] Cannot toggle ready - socket not connected (connected: false)");
        return;
      }
      console.log(`[useSocket] Emitting lobby:ready for lobby ${lobbyId}, socket.id: ${socketRef.current.id}, connected: ${socketRef.current.connected}`);
      socketRef.current.emit("lobby:ready", { lobbyId }, (response: any) => {
        console.log("[useSocket] lobby:ready response:", response);
      });
    },
    []
  );

  const refreshLobbyList = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      return;
    }
    socketRef.current.emit("lobby:list");
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    lobby,
    error,
    activeLobbies,
    createLobby,
    joinLobby,
    leaveLobby,
    toggleReady,
    refreshLobbyList,
  };
}

