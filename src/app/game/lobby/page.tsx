"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import type { GameMode } from "@/types/lobby";
import type { PlayerId } from "@/types/game";
import { generatePlayerName } from "@/lib/playerNameGenerator";

/**
 * Страница лобби для сетевой игры
 */
const PLAYER_NAME_STORAGE_KEY = "gamePlayerName";

export default function LobbyPage() {
  const router = useRouter();
  const { socket, isConnected, lobby, error, activeLobbies, createLobby, joinLobby, leaveLobby, toggleReady, refreshLobbyList } = useSocket();
  const [playerName, setPlayerName] = useState("");
  const [lobbyIdInput, setLobbyIdInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<GameMode>("1v1v1v1");
  const [gameStartData, setGameStartData] = useState<{
    lobby: any;
    playerSlotMap: Record<string, PlayerId>;
  } | null>(null);

  // Загружаем сохраненное имя или генерируем новое
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
      if (savedName) {
        setPlayerName(savedName);
      } else {
        const generatedName = generatePlayerName();
        setPlayerName(generatedName);
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, generatedName);
      }
    }
  }, []);

  // Сохраняем имя при изменении
  useEffect(() => {
    if (playerName && typeof window !== "undefined") {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
    }
  }, [playerName]);

  // Запрашиваем список активных лобби при подключении
  useEffect(() => {
    if (isConnected && !lobby) {
      refreshLobbyList();
      // Обновляем список каждые 5 секунд
      const interval = setInterval(() => {
        refreshLobbyList();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, lobby, refreshLobbyList]);

  // Обработка начала игры
  useEffect(() => {
    if (!socket) return;

    const handleGameStart = (data: { lobby: any; playerSlotMap: Record<string, PlayerId>; aiSlots?: PlayerId[] }) => {
      console.log("Game starting, redirecting...", data);
      setGameStartData(data);
      // Сохраняем данные игры в sessionStorage для использования на странице игры
      // Включаем aiSlots в сохраненные данные
      const gameData = {
        ...data,
        aiSlots: data.aiSlots || [],
      };
      sessionStorage.setItem("networkGameData", JSON.stringify(gameData));
      // Сохраняем playerId текущего игрока для использования при переподключении
      if (socket?.id && data.playerSlotMap[socket.id] !== undefined) {
        const myPlayerId = data.playerSlotMap[socket.id];
        sessionStorage.setItem(`playerId_${data.lobby.id}`, String(myPlayerId));
        console.log(`[LobbyPage] Saved playerId ${myPlayerId} for lobby ${data.lobby.id}`);
      }
      // Перенаправляем на игровую страницу с небольшой задержкой, чтобы показать экран загрузки
      setTimeout(() => {
        router.push(`/game?network=true&lobbyId=${data.lobby.id}`);
      }, 500);
    };

    socket.on("game:start", handleGameStart);

    return () => {
      socket.off("game:start", handleGameStart);
    };
  }, [socket, router]);

  const handleCreateLobby = () => {
    const name = playerName.trim() || generatePlayerName();
    if (!name) {
      const generatedName = generatePlayerName();
      setPlayerName(generatedName);
      createLobby(selectedMode, generatedName);
      return;
    }
    createLobby(selectedMode, name);
  };

  const handleJoinLobby = (lobbyId?: string) => {
    const name = playerName.trim() || generatePlayerName();
    if (!name) {
      const generatedName = generatePlayerName();
      setPlayerName(generatedName);
      if (lobbyId) {
        joinLobby(lobbyId, generatedName);
      } else if (lobbyIdInput.trim()) {
        joinLobby(lobbyIdInput.trim().toUpperCase(), generatedName);
      }
      return;
    }
    const targetLobbyId = lobbyId || lobbyIdInput.trim().toUpperCase();
    if (!targetLobbyId) {
      alert("Введите ID лобби");
      return;
    }
    joinLobby(targetLobbyId, name);
  };

  const handleLeaveLobby = () => {
    if (lobby) {
      leaveLobby(lobby.id);
    }
  };

  const handleToggleReady = () => {
    console.log("[LobbyPage] handleToggleReady called, lobby:", lobby);
    if (lobby) {
      console.log(`[LobbyPage] Calling toggleReady for lobby ${lobby.id}`);
      toggleReady(lobby.id);
    } else {
      console.warn("[LobbyPage] Cannot toggle ready - no lobby");
    }
  };

  // Если игра началась, показываем экран загрузки
  if (gameStartData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          </div>
          <Heading level={1} className="text-white mb-2">
            Загрузка игры...
          </Heading>
          <p className="text-gray-400 text-sm">
            Подготовка игрового мира
          </p>
        </div>
      </div>
    );
  }

  // Если в лобби, показываем интерфейс лобби
  if (lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Section padding="xl" className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-6">
              <Heading level={1} className="text-white">
                Лобби: {lobby.id}
              </Heading>
              {isConnected && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm">Подключено</span>
                </div>
              )}
            </div>

            {/* Режим игры */}
            <div className="mb-6">
              <div className="text-gray-400 text-sm mb-2">Режим игры:</div>
              <div className="text-white font-semibold">
                {getGameModeName(lobby.mode)}
              </div>
            </div>

            {/* Список игроков */}
            <div className="mb-6">
              <div className="text-gray-400 text-sm mb-3">Игроки ({lobby.players.length}/{lobby.maxPlayers}):</div>
              <div className="space-y-2">
                {lobby.players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-lg border-2 ${
                      player.isHost
                        ? "bg-blue-900/30 border-blue-600"
                        : "bg-gray-700/30 border-gray-600"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {player.isHost && (
                          <span className="text-blue-400 text-sm">👑</span>
                        )}
                        <span className="text-white font-semibold">{player.name}</span>
                        {player.assignedSlot !== undefined && (
                          <span className="text-gray-400 text-sm">
                            (Слот {player.assignedSlot + 1})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {player.isReady ? (
                          <span className="text-green-400 text-sm">✓ Готов</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Не готов</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Таймер обратного отсчета */}
            {lobby.isStarting && lobby.countdown !== undefined && (
              <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg text-center">
                <div className="text-yellow-400 text-sm mb-2">Игра начнется через:</div>
                <div className="text-yellow-300 text-4xl font-bold">{lobby.countdown}</div>
              </div>
            )}

            {/* Кнопки управления */}
            <div className="flex gap-3">
              <Button
                onClick={handleToggleReady}
                variant={lobby.players.find((p) => p.id === socket?.id)?.isReady ? "warning" : "success"}
                className="flex-1">
                {lobby.players.find((p) => p.id === socket?.id)?.isReady ? "Не готов" : "Готов"}
              </Button>
              <Button onClick={handleLeaveLobby} variant="secondary" className="flex-1">
                Покинуть лобби
              </Button>
            </div>

            {/* Ошибки */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </Section>
      </div>
    );
  }

  // Форма создания/присоединения к лобби
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Section padding="xl" className="max-w-2xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          {/* Заголовок */}
          <div className="mb-6">
            <Heading level={1} className="text-white mb-2">
              Сетевая игра
            </Heading>
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                Подключено к серверу
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                Подключение...
              </div>
            )}
          </div>

          {/* Имя игрока */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Ваше имя:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Введите имя игрока"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={20}
            />
          </div>

          {/* Создание лобби */}
          <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <Heading level={2} className="text-white text-lg mb-4">
              Создать лобби
            </Heading>

            {/* Выбор режима игры */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Режим игры:</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as GameMode)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="1v3ai">1 игрок + 3 ИИ</option>
                <option value="1v1+2ai">1 на 1 + 2 ИИ</option>
                <option value="1v1v1+1ai">1+1+1 + 1 ИИ</option>
                <option value="1v1v1v1">1+1+1+1 (все игроки)</option>
              </select>
            </div>

            <Button
              onClick={handleCreateLobby}
              variant="primary"
              className="w-full"
              disabled={!isConnected}>
              Создать лобби
            </Button>
          </div>

          {/* Список активных лобби */}
          {activeLobbies.length > 0 && (
            <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
              <Heading level={2} className="text-white text-lg mb-4">
                Активные лобби ({activeLobbies.length})
              </Heading>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeLobbies.map((activeLobby) => (
                  <div
                    key={activeLobby.id}
                    onClick={() => handleJoinLobby(activeLobby.id)}
                    className="p-3 bg-gray-600/50 rounded-lg border border-gray-500 hover:bg-gray-600/70 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">
                          {activeLobby.id}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {getGameModeName(activeLobby.mode)} • {activeLobby.players.length}/{activeLobby.maxPlayers} игроков
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 text-sm font-semibold">
                          Присоединиться
                        </div>
                        {activeLobby.players.length > 0 && (
                          <div className="text-gray-400 text-xs mt-1">
                            {activeLobby.players.map(p => p.name).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={refreshLobbyList}
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                disabled={!isConnected}>
                Обновить список
              </Button>
            </div>
          )}

          {/* Присоединение к лобби по ID */}
          <div className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <Heading level={2} className="text-white text-lg mb-4">
              Присоединиться по ID
            </Heading>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">ID лобби:</label>
              <input
                type="text"
                value={lobbyIdInput}
                onChange={(e) => setLobbyIdInput(e.target.value.toUpperCase())}
                placeholder="Введите ID лобби"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                maxLength={10}
              />
            </div>

            <Button
              onClick={() => handleJoinLobby()}
              variant="secondary"
              className="w-full"
              disabled={!isConnected}>
              Присоединиться
            </Button>
          </div>

          {/* Ошибки */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

/**
 * Получает название режима игры
 */
function getGameModeName(mode: GameMode): string {
  switch (mode) {
    case "1v3ai":
      return "1 игрок + 3 ИИ";
    case "1v1+2ai":
      return "1 на 1 + 2 ИИ";
    case "1v1v1+1ai":
      return "1+1+1 + 1 ИИ";
    case "1v1v1v1":
      return "1+1+1+1 (все игроки)";
    default:
      return mode;
  }
}

